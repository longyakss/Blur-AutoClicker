use crate::elevation::BlockedWindow;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

pub fn elevation_body(name: &str) -> String {
    if name.is_empty() {
        String::from(
            "一个窗口正在以管理员身份运行。请以管理员身份重启 Blur Auto Clicker 才能对它进行点击。",
        )
    } else {
        format!(
            "{name} 正在以管理员身份运行。请以管理员身份重启 Blur Auto Clicker 才能对它进行点击。"
        )
    }
}

pub fn elevation_blocked(app: &AppHandle, window: &BlockedWindow) {
    let body = elevation_body(&window.name);
    let app = app.clone();
    std::thread::spawn(move || {
        let result = app
            .notification()
            .builder()
            .title("Blur Auto Clicker")
            .body(body)
            .show();
        if let Err(err) = result {
            log::warn!("[Notifications] elevation toast failed: {err}");
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn elevation_body_names_the_blocked_window() {
        assert_eq!(
            elevation_body("Task Manager"),
            "Task Manager 正在以管理员身份运行。请以管理员身份重启 Blur Auto Clicker 才能对它进行点击。"
        );
    }

    #[test]
    fn elevation_body_handles_an_unknown_window() {
        assert!(elevation_body("").starts_with("一个窗口正在以管理员身份运行。"));
    }
}
