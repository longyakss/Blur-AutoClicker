import { getCurrentWindow } from "@tauri-apps/api/window";
import type { CSSProperties } from "react";

const dragRegion = { WebkitAppRegion: "drag" } as CSSProperties;
const noDragRegion = { WebkitAppRegion: "no-drag" } as CSSProperties;

export default function ThemeTitleBar({ onClose }: { onClose: () => void }) {
  const handleMinimize = () => {
    void getCurrentWindow()
      .minimize()
      .catch(() => undefined);
  };

  return (
    <div className="theme-titlebar" data-tauri-drag-region style={dragRegion}>
      <span className="theme-titlebar-title">主题自定义</span>
      <div className="theme-titlebar-actions">
        <button
          type="button"
          className="theme-titlebar-button"
          aria-label="最小化窗口"
          title="最小化"
          onClick={handleMinimize}
          style={noDragRegion}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2 6h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="theme-titlebar-button theme-titlebar-button--close"
          aria-label="关闭窗口"
          title="关闭"
          onClick={onClose}
          style={noDragRegion}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2.5 2.5l7 7M9.5 2.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
