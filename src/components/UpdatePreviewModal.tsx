import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { openUrl } from "@tauri-apps/plugin-opener";

import type { ChangelogEntry } from "../changelog";
import ChangelogContent from "./ChangelogContent";
import "./UpdatePreviewModal.css";

const GITHUB_RELEASES_URL =
  "https://github.com/Blur009/Blur-AutoClicker/releases/latest";

interface Props {
  open: boolean;
  currentVersion: string;
  latestVersion: string;
  loading: boolean;
  error: boolean;
  entries: ChangelogEntry[] | null;
  onClose: () => void;
}

export default function UpdatePreviewModal({
  open,
  currentVersion,
  latestVersion,
  loading,
  error,
  entries,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const host =
    document.querySelector<HTMLElement>(".app-root") ?? document.body;

  return createPortal(
    <div
      className="update-preview-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="update-preview-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-preview-title"
      >
        <div className="update-preview-header">
          <h2 id="update-preview-title" className="update-preview-title">
            从 v{currentVersion} 到 {latestVersion} 的更新
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="update-preview-close"
            onClick={onClose}
            aria-label="关闭更新日志预览"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1 1L11 11M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <style>{`@property --nyan-trail-y { syntax: "<length>"; inherits: true; initial-value: 0px; }
@property --nyan-bg-y { syntax: "<length>"; inherits: true; initial-value: 0px; }
@keyframes nyan-trail-scroll { from { --nyan-trail-y: 0px; } to { --nyan-trail-y: 20px; } }
@keyframes nyan-bg-scroll { from { --nyan-bg-y: 0px; } to { --nyan-bg-y: 60px; } }
.update-preview-body { animation: nyan-trail-scroll 1s linear infinite, nyan-bg-scroll 4s linear infinite; }
@media (prefers-reduced-motion: reduce) { .update-preview-body { animation: none; } }`}</style>
        <div className="update-preview-body">
          {loading ? (
            <span className="update-preview-status">正在加载更新日志…</span>
          ) : error ? (
            <div className="update-preview-error">
              <span className="update-preview-status">
                无法加载更新日志。
              </span>
              <button
                type="button"
                className="update-preview-github-btn"
                onClick={() => void openUrl(GITHUB_RELEASES_URL)}
              >
                在 GitHub 上查看
              </button>
            </div>
          ) : (
            entries && <ChangelogContent entries={entries} />
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
