use std::collections::VecDeque;

use crate::error::poisoned_inner;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Set once the frontend has signalled it booted.
static FRONTEND_READY: AtomicBool = AtomicBool::new(false);
static WATCHDOG_THREAD: Mutex<Option<std::thread::Thread>> = Mutex::new(None);
static WINDOW_CREATED: AtomicBool = AtomicBool::new(false);
static FATAL_REPORTED: AtomicBool = AtomicBool::new(false);
static HEARTBEAT: Mutex<Option<Instant>> = Mutex::new(None);
static BREADCRUMBS: Mutex<VecDeque<String>> = Mutex::new(VecDeque::new());
const BREADCRUMB_LIMIT: usize = 8;
const BREADCRUMB_CHARS: usize = 64;
const INTERFACE_TIMEOUT: Duration = Duration::from_secs(90);

fn poke_watchdog() {
    let thread = WATCHDOG_THREAD.lock().ok().and_then(|slot| slot.clone());
    if let Some(thread) = thread {
        thread.unpark();
    }
}
const READY_TIMEOUT: Duration = Duration::from_secs(20);
const WINDOW_TIMEOUT: Duration = Duration::from_secs(30);
const REVEAL_TIMEOUT: Duration = Duration::from_secs(10);
const REPORT_RETRY: Duration = Duration::from_secs(30);
const REPORT_RETRY_STEP: Duration = Duration::from_millis(500);

pub fn window_created() {
    WINDOW_CREATED.store(true, Ordering::SeqCst);
}

fn window_guard_expired(created: bool, elapsed: Duration) -> bool {
    !created && elapsed >= WINDOW_TIMEOUT
}

pub fn release_startup_report() {
    FATAL_REPORTED.store(false, Ordering::SeqCst);
}

pub fn claim_startup_report() -> bool {
    FATAL_REPORTED
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok()
}

pub fn fatal_exit() -> ! {
    crate::indicator::shutdown();
    crate::crash_handler::shutdown_crashpad();
    std::process::exit(1);
}

pub struct StartupFailure {
    pub code: &'static str,
    pub message: String,
}

impl StartupFailure {
    pub fn with_code(code: &'static str, body: String) -> Self {
        Self::new(code, body, &logs_path())
    }

    fn new(code: &'static str, body: String, logs: &str) -> Self {
        let log_line = if std::path::Path::new(logs).is_dir() {
            format!("\n\n日志文件位置：\n{logs}")
        } else {
            String::new()
        };
        Self {
            code,
            message: format!("{body}\n\n错误代码：{code}{log_line}"),
        }
    }
}

pub const E_POLICY: &str = "E001";
pub const E_BUSY: &str = "E002";
pub const E_WEBVIEW_OTHER: &str = "E003";
pub const E_MISSING_RUNTIME_INSTALLING: &str = "E004";
pub const E_MISSING_RUNTIME: &str = "E005";
pub const E_UNWRITABLE_FOLDER: &str = "E006";
pub const E_WINDOW_TIMEOUT: &str = "E007";
pub const E_INTERFACE_NOT_READY: &str = "E008";
pub const E_PANIC: &str = "E009";

pub fn creation_failure(error: &str) -> StartupFailure {
    let logs = logs_path();
    match classify(error) {
        WebviewFailure::BlockedByPolicy => StartupFailure::new(
            E_POLICY,
            format!(
                "BlurAutoClicker 无法启动。\n\n\
                 Windows 策略阻止了本应用绘制窗口所需的 Microsoft Edge WebView2 运行时。\n\n\
                 详细信息：{error}\n\n\
                 常见原因是软件限制策略、AppLocker，或某个“精简”/安全加固工具阻止了 \
                 msedgewebview2.exe。在你自己管理的电脑上，请删除该规则；\
                 在受管控或公司电脑上，请联系管理员放行 msedgewebview2.exe。"
            ),
            &logs,
        ),
        WebviewFailure::RuntimeBusy => StartupFailure::new(
            E_BUSY,
            format!(
                "BlurAutoClicker 无法启动。\n\n\
                 Microsoft Edge WebView2 运行时无法使用它需要的某个资源。\n\n\
                 详细信息：{error}\n\n\
                 另一个 BlurAutoClicker 实例，或上次崩溃遗留的 msedgewebview2.exe 进程，\
                 可能正占用该文件夹。请关闭其他实例，并在任务管理器中结束遗留的 \
                 msedgewebview2.exe 进程，然后重新启动 BlurAutoClicker。"
            ),
            &logs,
        ),
        WebviewFailure::Other => StartupFailure::new(
            E_WEBVIEW_OTHER,
            format!(
                "BlurAutoClicker 无法启动。\n\n\
                 Microsoft Edge WebView2 运行时启动失败。\n\n\
                 详细信息：{error}\n\n\
                 如果反复出现，请下载并运行 WebView2 Evergreen 安装程序（需要联网）：\n\
                 https://go.microsoft.com/fwlink/p/?LinkId=2124703"
            ),
            &logs,
        ),
    }
}

fn silent_startup_failure() -> StartupFailure {
    StartupFailure::new(
        E_INTERFACE_NOT_READY,
        String::from(
            "BlurAutoClicker 未能完成启动。\n\n\
             应用窗口已创建，但界面始终未报告就绪，因此应用必须关闭。\n\n\
             页面加载失败、界面启动前发生脚本错误、窗口出现后浏览器进程退出、\
             磁盘缓慢或被占用，或安全工具干扰应用文件，都可能导致此问题。\n\n\
             请重新启动 BlurAutoClicker。",
        ),
        &logs_path(),
    )
}

fn window_timeout() -> StartupFailure {
    StartupFailure::new(
        E_WINDOW_TIMEOUT,
        format!(
            "BlurAutoClicker 未能完成启动。\n\n\
             创建应用窗口的操作未能在 {} 秒内完成，若窗口仍未出现，应用将关闭。\n\n\
             磁盘缓慢或被占用、安全工具扫描应用自身文件，或 WebView2 进程停止响应，\
             都可能导致此问题。\n\n\
             请重新启动 BlurAutoClicker。",
            WINDOW_TIMEOUT.as_secs()
        ),
        &logs_path(),
    )
}

pub fn push_breadcrumb(action: &str) {
    let cleaned: String = action
        .chars()
        .map(|c| if c.is_control() { ' ' } else { c })
        .take(BREADCRUMB_CHARS)
        .collect();
    let cleaned = cleaned.trim();
    if cleaned.is_empty() {
        return;
    }
    let mut trail = BREADCRUMBS.lock().unwrap_or_else(poisoned_inner);
    if trail.len() >= BREADCRUMB_LIMIT {
        trail.pop_front();
    }
    trail.push_back(format!(
        "{} {}",
        chrono::Local::now().format("%H:%M:%S%.3f"),
        cleaned
    ));
}

#[tauri::command(async)]
pub fn breadcrumb(action: String) {
    push_breadcrumb(&action);
}

fn breadcrumb_trail() -> String {
    BREADCRUMBS
        .lock()
        .unwrap_or_else(poisoned_inner)
        .iter()
        .map(String::as_str)
        .collect::<Vec<_>>()
        .join(" -> ")
}

#[tauri::command]
pub fn frontend_heartbeat() {
    if let Ok(mut slot) = HEARTBEAT.lock() {
        *slot = Some(Instant::now());
    }
}

fn last_heartbeat() -> Option<Instant> {
    HEARTBEAT.lock().ok().and_then(|slot| *slot)
}

fn interface_is_stale(window_visible: bool, window_hung: bool, last: Option<Instant>) -> bool {
    if !window_visible || window_hung {
        return false;
    }
    match last {
        Some(at) => at.elapsed() > INTERFACE_TIMEOUT,
        None => false,
    }
}

pub fn frontend_ready() {
    FRONTEND_READY.store(true, Ordering::SeqCst);
    poke_watchdog();
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum WebviewFailure {
    /// Windows refused to run the runtime (Software Restriction Policy,
    /// AppLocker, or a similar control).
    BlockedByPolicy,
    RuntimeBusy,
    /// Anything else.
    Other,
}

fn classify(error: &str) -> WebviewFailure {
    let error = error.to_ascii_lowercase();
    if error.contains("0x800704ec") {
        WebviewFailure::BlockedByPolicy
    } else if error.contains("0x8007139f")
        || error.contains("0x800700aa")
        || error.contains("0x80070020")
    {
        WebviewFailure::RuntimeBusy
    } else {
        WebviewFailure::Other
    }
}

pub fn spawn_window_guard() {
    let spawned = std::thread::Builder::new()
        .name("window-guard".into())
        .spawn(|| {
            let started = Instant::now();
            while !window_guard_expired(WINDOW_CREATED.load(Ordering::SeqCst), started.elapsed()) {
                std::thread::sleep(Duration::from_millis(250));
            }
            if WINDOW_CREATED.load(Ordering::SeqCst) || !claim_startup_report() {
                return;
            }

            let failure = window_timeout();

            log::error!(
                "[WebView2] Window creation did not finish within {} s",
                WINDOW_TIMEOUT.as_secs()
            );

            #[cfg(target_os = "windows")]
            crate::portable::notify_fatal_error(failure.code, &failure.message);
            #[cfg(not(target_os = "windows"))]
            eprintln!("{}", failure.message);

            if WINDOW_CREATED.load(Ordering::SeqCst) {
                FATAL_REPORTED.store(false, Ordering::SeqCst);
                log::warn!("[WebView2] Window creation finished while the timeout dialog was open");
                return;
            }

            fatal_exit();
        });

    if let Err(error) = spawned {
        log::warn!("[WebView2] Window guard thread unavailable: {error}");
    }
}

pub fn spawn_watchdog(app: tauri::AppHandle) {
    std::thread::Builder::new()
        .name("webview-watchdog".into())
        .spawn(move || {
            if let Ok(mut slot) = WATCHDOG_THREAD.lock() {
                *slot = Some(std::thread::current());
            }
            let started = Instant::now();
            loop {
                if FRONTEND_READY.load(Ordering::SeqCst) {
                    break;
                }
                let elapsed = started.elapsed();
                if elapsed >= READY_TIMEOUT {
                    if report() || elapsed >= READY_TIMEOUT + REPORT_RETRY {
                        return;
                    }
                    std::thread::park_timeout(REPORT_RETRY_STEP);
                    continue;
                }
                match READY_TIMEOUT.checked_sub(elapsed) {
                    Some(remaining) if !remaining.is_zero() => {
                        std::thread::park_timeout(remaining);
                    }
                    _ => continue,
                }
            }

            reveal_if_hidden(&app);
        })
        .ok();
}

#[cfg(target_os = "windows")]
fn webview_cpu_100ns() -> Option<(u32, u32, u64)> {
    use windows_sys::Win32::Foundation::{CloseHandle, FILETIME};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::Threading::{
        GetProcessTimes, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
    };

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE {
            return None;
        }

        let mut entries: Vec<(u32, u32, String)> = Vec::new();
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let name = String::from_utf16_lossy(
                    &entry.szExeFile[..entry
                        .szExeFile
                        .iter()
                        .position(|&c| c == 0)
                        .unwrap_or(entry.szExeFile.len())],
                );
                entries.push((entry.th32ProcessID, entry.th32ParentProcessID, name));
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);

        let ours = std::process::id();
        let children: Vec<u32> = entries
            .iter()
            .filter(|(_, parent, _)| *parent == ours)
            .map(|(pid, _, _)| *pid)
            .collect();

        let mut found = 0u32;
        let mut browsers = 0u32;
        let mut cpu_100ns = 0u64;
        for (pid, parent, name) in &entries {
            if !name.eq_ignore_ascii_case("msedgewebview2.exe") {
                continue;
            }
            if *parent == ours {
                browsers += 1;
                continue;
            }
            if !children.contains(parent) {
                continue;
            }
            found += 1;
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, *pid);
            if process.is_null() {
                continue;
            }
            let mut creation: FILETIME = std::mem::zeroed();
            let mut exit: FILETIME = std::mem::zeroed();
            let mut kernel: FILETIME = std::mem::zeroed();
            let mut user: FILETIME = std::mem::zeroed();
            if GetProcessTimes(process, &mut creation, &mut exit, &mut kernel, &mut user) != 0 {
                let ticks =
                    |t: FILETIME| ((t.dwHighDateTime as u64) << 32) | t.dwLowDateTime as u64;
                cpu_100ns = cpu_100ns
                    .saturating_add(ticks(kernel))
                    .saturating_add(ticks(user));
            }
            CloseHandle(process);
        }

        Some((browsers, found, cpu_100ns))
    }
}

#[cfg(target_os = "windows")]
fn renderer_snapshot() -> String {
    let Some((browsers, found, cpu)) = webview_cpu_100ns() else {
        return String::from("webview processes unknown");
    };
    let first = cpu;
    std::thread::sleep(Duration::from_millis(1000));
    let second = webview_cpu_100ns().map(|(_, _, cpu)| cpu).unwrap_or(first);
    let busy = second.saturating_sub(first) as f64 / 10_000_000.0;

    format!(
        "browsers={browsers} webview_children={found} cpu={:.1}s busy_last_second={busy:.2}s",
        cpu as f64 / 10_000_000.0
    )
}

#[cfg(not(target_os = "windows"))]
fn renderer_snapshot() -> String {
    String::from("webview processes unknown")
}

fn should_reveal(window_visible: bool, autostart_launch: bool) -> bool {
    !window_visible && !autostart_launch
}

fn window_visible(app: &tauri::AppHandle) -> bool {
    use tauri::Manager;

    app.get_webview_window("main")
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(false)
}

fn reveal_if_hidden(app: &tauri::AppHandle) {
    let started = Instant::now();
    while started.elapsed() < REVEAL_TIMEOUT {
        if !should_reveal(
            window_visible(app),
            crate::ui_commands::was_autostart_launch(),
        ) {
            return;
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    if !should_reveal(
        window_visible(app),
        crate::ui_commands::was_autostart_launch(),
    ) {
        return;
    }

    log::warn!("[UI] Window was never shown after the frontend booted; showing it now");

    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.show() {
            log::error!("[UI] Showing the window failed: {error}");
        }
    }
}

fn report() -> bool {
    if !claim_startup_report() {
        return false;
    }

    let failure = silent_startup_failure();

    log::error!("[WebView2] Startup watchdog triggered: the frontend never reported ready");

    #[cfg(target_os = "windows")]
    crate::portable::notify_fatal_error(failure.code, &failure.message);
    #[cfg(not(target_os = "windows"))]
    eprintln!("{}", failure.message);

    if FRONTEND_READY.load(Ordering::SeqCst) {
        FATAL_REPORTED.store(false, Ordering::SeqCst);
        log::warn!("[UI] The frontend reported ready while the startup dialog was open");
        return true;
    }

    fatal_exit();
}

fn logs_path() -> String {
    crate::diagnostics::logs_dir()
        .map(|p| p.display().to_string())
        .unwrap_or_else(|| "应用日志文件夹".to_string())
}

/// Pokes the main window every so often so an unresponsive interface leaves a
/// trace in the log instead of only a user report. A run-as-administrator bug
/// that leaves the window visible but deaf is otherwise invisible: the process
/// is alive, the clicker keeps working, and nothing is written down.
#[cfg(target_os = "windows")]
pub fn spawn_ui_watchdog(app: tauri::AppHandle) {
    use std::time::Duration;

    const INTERVAL: Duration = Duration::from_secs(20);
    /// Long enough that a slow frame does not count, short enough to catch a
    /// thread that is actually stuck.
    const PROBE_TIMEOUT_MS: u32 = 2_000;

    let spawned = std::thread::Builder::new()
        .name("ui-watchdog".into())
        .spawn(move || {
            let mut hung = false;
            let mut stale = false;
            let mut baseline_logged = false;
            loop {
                std::thread::sleep(INTERVAL);
                let Some(hwnd) = main_window_handle(&app) else {
                    continue;
                };
                // A hidden window is normal (autostart, minimized to tray), and
                // the startup watchdog already covers "never became visible".
                if !window_is_visible(hwnd) {
                    continue;
                }
                if !baseline_logged {
                    log_window_state(hwnd, "baseline");
                    baseline_logged = true;
                }
                let responding = responds_to_messages(hwnd, PROBE_TIMEOUT_MS);

                if interface_is_stale(true, !responding, last_heartbeat()) {
                    if !stale {
                        log::error!(
                            "[UI] The interface stopped talking to the backend; the window is still alive ({})",
                            renderer_snapshot()
                        );
                        log::error!("[UI] last actions: {}", breadcrumb_trail());
                    }
                    stale = true;
                } else if stale {
                    if responding {
                        log::info!("[UI] The interface is talking to the backend again");
                    }
                    stale = false;
                }

                if responding {
                    if hung {
                        log::info!("[UI] Main window responds again");
                        hung = false;
                    }
                } else {
                    if !hung {
                        log::error!("[UI] Main window stopped responding to window messages");
                    }
                    hung = true;
                    log_window_state(hwnd, "unresponsive");
                }
            }
        });

    if spawned.is_err() {
        log::warn!("[UI] Watchdog thread unavailable");
    }
}

#[cfg(not(target_os = "windows"))]
pub fn spawn_ui_watchdog(_app: tauri::AppHandle) {}

#[cfg(target_os = "windows")]
fn main_window_handle(app: &tauri::AppHandle) -> Option<*mut core::ffi::c_void> {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use tauri::Manager;

    let window = app.get_webview_window("main")?;
    let handle = window.window_handle().ok()?;
    let RawWindowHandle::Win32(raw) = handle.as_raw() else {
        return None;
    };
    Some(raw.hwnd.get() as *mut core::ffi::c_void)
}

#[cfg(target_os = "windows")]
fn window_is_visible(hwnd: *mut core::ffi::c_void) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::IsWindowVisible;

    unsafe { IsWindowVisible(hwnd) != 0 }
}

#[cfg(target_os = "windows")]
fn responds_to_messages(hwnd: *mut core::ffi::c_void, timeout_ms: u32) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SendMessageTimeoutW, SMTO_ABORTIFHUNG, SMTO_BLOCK, WM_NULL,
    };

    let mut result: usize = 0;
    let ok = unsafe {
        SendMessageTimeoutW(
            hwnd,
            WM_NULL,
            0,
            0,
            SMTO_ABORTIFHUNG | SMTO_BLOCK,
            timeout_ms,
            &mut result,
        )
    };
    ok != 0
}

/// Writes the facts that separate the ways a window can be unreachable:
/// hidden, off-screen, not activatable, or owned by a hung thread.
#[cfg(target_os = "windows")]
fn log_window_state(hwnd: *mut core::ffi::c_void, phase: &str) {
    use windows_sys::Win32::Foundation::RECT;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetSystemMetrics, GetWindowLongPtrW, GetWindowRect, IsHungAppWindow,
        IsWindowVisible, GWL_EXSTYLE, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
        SM_YVIRTUALSCREEN, WS_EX_APPWINDOW, WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
        WS_EX_TRANSPARENT,
    };

    unsafe {
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        let mut flags: Vec<&str> = Vec::new();
        if ex_style & WS_EX_NOACTIVATE != 0 {
            flags.push("NOACTIVATE");
        }
        if ex_style & WS_EX_APPWINDOW != 0 {
            flags.push("APPWINDOW");
        }
        if ex_style & WS_EX_TOOLWINDOW != 0 {
            flags.push("TOOLWINDOW");
        }
        if ex_style & WS_EX_LAYERED != 0 {
            flags.push("LAYERED");
        }
        if ex_style & WS_EX_TRANSPARENT != 0 {
            flags.push("TRANSPARENT");
        }

        let mut rect: RECT = std::mem::zeroed();
        let has_rect = GetWindowRect(hwnd, &mut rect) != 0;
        let screen_w = GetSystemMetrics(SM_CXVIRTUALSCREEN);
        let screen_h = GetSystemMetrics(SM_CYVIRTUALSCREEN);
        let screen_x = GetSystemMetrics(SM_XVIRTUALSCREEN);
        let screen_y = GetSystemMetrics(SM_YVIRTUALSCREEN);
        let on_screen = has_rect
            && screen_w > 0
            && screen_h > 0
            && rect.right > screen_x
            && rect.left < screen_x + screen_w
            && rect.bottom > screen_y
            && rect.top < screen_y + screen_h;

        log::info!(
            "[UI] {phase}: visible={} foreground={} hung={} on_screen={} exstyle=0x{ex_style:08x} [{}] rect={}x{}+{},{} virtual_screen={}x{}+{},{} elevated={}",
            IsWindowVisible(hwnd) != 0,
            GetForegroundWindow() == hwnd,
            IsHungAppWindow(hwnd) != 0,
            on_screen,
            flags.join(","),
            rect.right - rect.left,
            rect.bottom - rect.top,
            rect.left,
            rect.top,
            screen_w,
            screen_h,
            screen_x,
            screen_y,
            crate::elevation::current_process_elevated(),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_window_without_a_heartbeat_only_looks_stale_when_it_was_ever_alive() {
        assert!(!interface_is_stale(true, false, None));
        assert!(interface_is_stale(
            true,
            false,
            Some(Instant::now() - INTERFACE_TIMEOUT - Duration::from_secs(10))
        ));
        assert!(!interface_is_stale(
            true,
            false,
            Some(Instant::now() - Duration::from_secs(60))
        ));
        assert!(!interface_is_stale(
            false,
            false,
            Some(Instant::now() - INTERFACE_TIMEOUT - Duration::from_secs(10))
        ));
        assert!(!interface_is_stale(
            true,
            true,
            Some(Instant::now() - INTERFACE_TIMEOUT - Duration::from_secs(10))
        ));
    }

    #[test]
    fn reveal_only_when_the_window_stayed_hidden() {
        assert!(should_reveal(false, false));
        assert!(!should_reveal(true, false));
        assert!(!should_reveal(false, true));
        assert!(!should_reveal(true, true));
    }

    #[test]
    fn classifies_policy_block() {
        let msg = "failed to create webview: WebView2 error: WindowsError(Error { code: HRESULT(0x800704EC), message: \"blocked by group policy\" })";
        assert_eq!(classify(msg), WebviewFailure::BlockedByPolicy);
    }

    #[test]
    fn classifies_runtime_busy_codes() {
        assert_eq!(
            classify("failed to create webview: HRESULT(0x8007139F) invalid state"),
            WebviewFailure::RuntimeBusy
        );
        assert_eq!(
            classify(
                "failed to create webview: HRESULT(0x800700AA) the requested resource is in use"
            ),
            WebviewFailure::RuntimeBusy
        );
        assert_eq!(
            classify("failed to create webview: HRESULT(0x80070020) sharing violation"),
            WebviewFailure::RuntimeBusy
        );
    }

    #[test]
    fn busy_errors_tell_the_user_to_close_the_other_copy() {
        let failure = creation_failure("failed to create webview: HRESULT(0x800700AA)");

        assert_eq!(failure.code, E_BUSY);
        assert!(
            failure
                .message
                .to_ascii_lowercase()
                .contains("另一个 blurautoclicker"),
            "{}",
            failure.message
        );
        assert!(failure.message.contains("msedgewebview2.exe"));
        assert!(!failure
            .message
            .to_ascii_lowercase()
            .contains("only one copy"));
    }

    #[test]
    fn the_guard_expires_only_when_the_window_is_still_missing() {
        let timeout = Duration::from_secs(30);

        assert!(!window_guard_expired(
            true,
            timeout + Duration::from_secs(5)
        ));
        assert!(!window_guard_expired(
            false,
            timeout - Duration::from_millis(1)
        ));
        assert!(window_guard_expired(false, timeout));
    }

    #[test]
    fn breadcrumbs_keep_the_last_eight_and_drop_the_oldest() {
        BREADCRUMBS.lock().unwrap_or_else(poisoned_inner).clear();

        for index in 0..12 {
            push_breadcrumb(&format!("action{index}"));
        }

        let trail = breadcrumb_trail();
        assert!(!trail.contains("action3"), "{trail}");
        assert!(trail.contains("action4"), "{trail}");
        assert!(trail.contains("action11"), "{trail}");
        assert_eq!(
            BREADCRUMBS.lock().unwrap_or_else(poisoned_inner).len(),
            BREADCRUMB_LIMIT
        );
    }

    #[test]
    fn a_control_character_cannot_forge_a_log_line() {
        BREADCRUMBS.lock().unwrap_or_else(poisoned_inner).clear();

        push_breadcrumb("tab:zones\n[ERROR] fake");

        let trail = breadcrumb_trail();
        assert!(!trail.contains('\n'), "{trail}");
        assert!(trail.contains("tab:zones"), "{trail}");
    }

    #[test]
    fn only_the_first_startup_dialog_can_be_claimed() {
        assert!(claim_startup_report());
        assert!(!claim_startup_report());
    }

    #[test]
    fn every_message_carries_its_code() {
        let failures = [
            creation_failure("failed to create webview: HRESULT(0x800704EC) policy"),
            creation_failure("failed to create webview: HRESULT(0x800700AA) busy"),
            creation_failure("failed to create webview: HRESULT(0x80070123) other"),
            silent_startup_failure(),
            window_timeout(),
            window_timeout(),
        ];

        for failure in failures {
            assert!(
                failure
                    .message
                    .contains(&format!("错误代码：{}", failure.code)),
                "{} missing its code",
                failure.code
            );
            assert!(failure.code.starts_with('E'), "{}", failure.code);
            assert_eq!(failure.code.len(), 4, "{}", failure.code);
        }
    }

    #[test]
    fn a_creation_failure_is_explained_by_its_error_code() {
        let failure = creation_failure(
            "runtime error: failed to create webview: WebView2 error: WindowsError(Error { code: HRESULT(0x800700AA), message: \"busy\" })",
        );

        assert!(failure.message.contains("msedgewebview2.exe"));
        assert!(failure.message.contains("0x800700AA"));
    }

    #[test]
    fn invalid_argument_is_not_reported_as_a_busy_data_folder() {
        assert_eq!(
            classify("failed to create webview: HRESULT(0x80070057) invalid arg"),
            WebviewFailure::Other
        );
    }

    #[test]
    fn a_creation_timeout_names_the_step_that_stalled() {
        let failure = window_timeout();

        assert!(failure.message.contains("未能在 30 秒内完成"));
        assert!(failure.message.contains("错误代码：E007"));
    }

    #[test]
    fn a_silent_startup_does_not_blame_the_webview_runtime() {
        let failure = silent_startup_failure();

        assert_eq!(failure.code, E_INTERFACE_NOT_READY);
        assert!(failure
            .message
            .contains("界面始终未报告就绪"));
        assert!(failure.message.contains("重新启动 BlurAutoClicker"));
        assert!(!failure.message.contains("blocked or broken"));
        assert!(!failure.message.contains("msedgewebview2"));
    }

    #[test]
    fn an_unknown_webview_error_points_at_the_runtime() {
        let failure = creation_failure("failed to create webview: HRESULT(0x80070123)");

        assert_eq!(failure.code, E_WEBVIEW_OTHER);
        assert!(failure.message.contains("WebView2 Evergreen 安装程序"));
        assert!(failure
            .message
            .contains("详细信息：failed to create webview"));
    }

    #[test]
    fn classifies_unknown_code_as_other() {
        assert_eq!(
            classify("failed to create webview: something unexpected"),
            WebviewFailure::Other
        );
    }
}
