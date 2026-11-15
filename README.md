<div align="center">
  <p align="center">
    <a href="https://github.com/Blur009/Blur-AutoClicker/releases"><img src="https://img.shields.io/github/downloads/Blur009/Blur-AutoClicker/total?style=for-the-badge&label=downloads" alt="Downloads"></a>
    <img src="https://img.shields.io/github/package-json/v/Blur009/Blur-AutoClicker?style=for-the-badge&label=version" alt="Version">
    <img src="https://img.shields.io/github/license/Blur009/Blur-AutoClicker?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/github/stars/Blur009/Blur-AutoClicker?style=for-the-badge&label=stars" alt="Stars">
    <a href="https://discord.gg/jhWEW747x5"><img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
  </p>

  

  # Blur Auto Clicker


  <img src="https://github.com/Blur009/Blur-AutoClicker/blob/main/screenshots/advanced_dark.png" width="600"/>

  <p align="center"><em>An auto clicker that actually clicks at the speed you set.</em></p>
  
  <a href="https://ko-fi.com/blur009">
    <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Donate on Ko-fi" width="350">
  </a>

  ---

  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#faq">FAQ</a> ·
  <a href="#license">License</a>
  
  

</div>

> [!NOTE]
> **🇨🇳 简体中文汉化版（本 Fork）** — 本仓库是 [Blur009/Blur-AutoClicker](https://github.com/Blur009/Blur-AutoClicker) 的非官方简体中文汉化版，基于上游 **v3.10.2**，改动仅存在于 `zh-CN` 分支。以下为本次更新内容（2026-11-15）：
>
> - **全量界面汉化（约 950 条）**：主界面、设置面板（含设置搜索索引）、高级/区域/点击点面板、悬浮窗与点击指示器、主题自定义窗口、托盘菜单、系统通知、崩溃与 UAC 权限提示、首次运行向导
> - **术语全篇统一**：快捷键、悬浮窗、点击点、停止区域、紧急停止、占空比等；图表日期格式切换为 `zh-CN`
> - **功能零改动**：与后端交互的协议字符串（停止原因枚举、事件名、存储键等）保持英文，设置数据与上游完全兼容
> - **新增构建流水线** `.github/workflows/build-zh.yml`：推送 `zh-CN` 分支自动构建绿色便携版（已关闭更新器签名，本版无自动更新）
>
> **获取中文版**：直接下载 → [BlurAutoClicker-v3.10.2-zh-portable.zip](https://github.com/longyakss/Blur-AutoClicker/releases/download/zh-v3.10.2/BlurAutoClicker-v3.10.2-zh-portable.zip)（绿色免安装，解压即用）；其他版本见 [Releases](https://github.com/longyakss/Blur-AutoClicker/releases)。
>
> **已知残留**：少数与设置值直接绑定的枚举文本（如部分位置的鼠标键 Left/Middle/Right）保留英文——汉化它们需改动设置存储结构，为保证与上游设置兼容而保留。
>
> 上游英文原版：[Blur009/Blur-AutoClicker](https://github.com/Blur009/Blur-AutoClicker)。本 Fork 遵循上游 **GPLv3** 许可。

---
Most auto clickers aren't accurate at high speeds. Set it to 50 CPS and you might get 40. Or 60. This one actually hits the speed you set. It also bundles the useful features from other auto clickers into one place, and adds a few extras. RAM is around 100mb and stays under 200mb (yes its a lot but sadly it cant be reduced due to Webview2).

---

## Features

**Simple Mode:**
- On/off indicator (logo turns green when running)
- Left, right, or middle mouse button
- Keyboard key pressing with case control
- Hold or toggle activation
- Customizable hotkeys

**Advanced Mode** (everything in Simple, plus):
- Adjustable click timing (duty cycle)
- Random CPS within a range
- Corner and edge stopping (auto-off near screen edges)
- Click and time limits
- Double clicks
- Position clicking (pick a spot, mouse moves and clicks there)
- Per second, minute, hour, or day


## Quick Start

<a href="https://github.com/Blur009/Blur-AutoClicker/releases/latest">
  <img src="https://github.com/machiav3lli/oandbackupx/blob/034b226cea5c1b30eb4f6a6f313e4dadcbb0ece4/badge_github.png" alt="Download from GitHub" height="50">
</a>

Installed to `%localappdata%/BlurAutoClicker/BlurAutoClicker.exe`.  
Config and stats are saved in `%appdata%/BlurAutoClicker`.


---

## FAQ

<details>
<summary><b>Why is CPS capped at 500?</b></summary>

Windows has a limit of around 500 CPS for mouse events. The timer resolution bottoms out at about 1ms (1000 CPS), but Windows also needs to do other things, so the practical limit is around 800 CPS. Since I can't guarantee that on every machine, it's set to 500. (A 1000 cps setting is available but not recommended.)
</details>

<details>
<summary><b>Windows SmartScreen warning?</b></summary>

The installer isn't signed, so Windows may show a SmartScreen warning. Tauri updater signing is separate from Windows Authenticode signing. See <a href="docs/windows-release-trust.md">docs/windows-release-trust.md</a> for details.
</details>

<details>
<summary><b>Can I build from source?</b></summary>

Yes — see <a href="BUILDING.md">BUILDING.md</a> for setup, build, and validation commands. For contributing guidelines, see <a href="CONTRIBUTING.md">CONTRIBUTING.md</a>.
</details>

---

## License

Licensed under the [GNU General Public License](LICENSE).

## Note
This project has been accepted into Windows Package Manager (winget). You can install it with the command:

```powershell
winget install -e --id Blur009.BlurAutoClicker --source winget --silent
```
---
It has also been accepted into **Chris Titus Tech's winutils**.
https://github.com/ChrisTitusTech/winutil/pull/4383

---
This project is not code signed, so Windows may show a SmartScreen warning. See [microsoft](https://learn.microsoft.com/en-us/windows/security/operating-system-security/virus-and-threat-protection/microsoft-defender-smartscreen/) for information on SmartScreen. Importantly, a SmartScreen warning does not mean the software is malicious, it just means it is not code signed which is an expensive process.