import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { openUrl } from "@tauri-apps/plugin-opener";
import { logDiagnostic } from "../diagnostics";
import { invoke } from "@tauri-apps/api/core";
import { useRef, useState } from "react";

import { isPortableMode } from "../store";
import {
  compareVersions,
  parseChangelog,
  type ChangelogEntry,
} from "../changelog";
import UpdatePreviewModal from "./UpdatePreviewModal";
import UnavailableReason from "./UnavailableReason";
import "./Updatebanner.css";

const GITHUB_RELEASES_URL =
  "https://github.com/Blur009/Blur-AutoClicker/releases/latest";

interface UpdateBannerProps {
  currentVersion: string;
  latestVersion: string;
  portable?: boolean;
  preview?: boolean;
}

type UpdateStage = "ready" | "installing" | "restart-required" | "error";

export default function UpdateBanner({
  currentVersion,
  latestVersion,
  portable = false,
  preview = false,
}: UpdateBannerProps) {
  const previewMode = preview;
  const [stage, setStage] = useState<UpdateStage>("ready");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEntries, setPreviewEntries] = useState<ChangelogEntry[] | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const previewFetchedRef = useRef(false);

  const handlePreview = async () => {
    if (previewMode) return;
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }
    setPreviewOpen(true);
    if (previewFetchedRef.current) return;

    setPreviewLoading(true);
    setPreviewError(false);
    try {
      const raw = await invoke<string>("fetch_changelog");
      const all = parseChangelog(raw);
      const newer = all.filter(
        (entry) => compareVersions(entry.version, currentVersion) > 0,
      );
      setPreviewEntries(newer.length > 0 ? newer : all.slice(0, 1));
      previewFetchedRef.current = true;
    } catch (err) {
      logDiagnostic("Updatebanner.changelogPreview", {
        error: String(err),
      });
      setPreviewError(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const openReleasePage = async () => {
    try {
      await openUrl(GITHUB_RELEASES_URL);
    } catch (err) {
      logDiagnostic("Updatebanner.openRelease", {
        error: String(err),
      });
      setStage("error");
      setStatusText("无法打开下载页面。");
    }
  };

  const handleUpdate = async () => {
    if (previewMode) return;
    if (portable) {
      await openReleasePage();
      return;
    }

    // Guard against the brief window where `portable` is still the false
    // default while the real get_app_info result is in flight.
    try {
      if (await isPortableMode()) {
        await openUrl(GITHUB_RELEASES_URL);
        return;
      }
    } catch (err) {
      logDiagnostic("Updatebanner.openRelease", {
        error: String(err),
      });
      setStage("error");
      setStatusText("更新检查失败，请重试。");
      return;
    }

    try {
      setStage("installing");
      setStatusText("正在准备更新…");

      const update = await check();
      if (!update) {
        setStage("ready");
        setStatusText("更新已不可用。");
        return;
      }

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            setStatusText("正在下载更新…");
            break;
          case "Progress":
            setStatusText("正在安装更新…");
            break;
          case "Finished":
            setStatusText("更新已安装，重启后生效。");
            break;
        }
      });

      setStage("restart-required");
      setStatusText("更新已安装，重启后生效。");
    } catch (err) {
      logDiagnostic("Updatebanner.install", {
        error: String(err),
      });
      setStage("error");
      setStatusText("更新安装失败。");
    }
  };

  const handleRestart = async () => {
    if (previewMode) return;
    try {
      await relaunch();
    } catch (err) {
      logDiagnostic("Updatebanner.relaunch", {
        error: String(err),
      });
      setStage("error");
      setStatusText("重启失败，请手动重新打开应用。");
    }
  };

  const installDisabledReason =
    stage === "installing"
      ? statusText === "正在安装更新…"
        ? "更新正在安装中，请等待完成后再试。"
        : statusText === "正在下载更新…"
          ? "更新正在下载中，请等待当前安装完成。"
          : "更新正在准备中，请等待完成后再试。"
      : undefined;

  return (
    <div className="update-banner">
      <span className="update-banner-text-old-version">v{currentVersion}</span>
      <span className="update-banner-text">至</span>
      {/* does not need v for version, gets it from gitHub ↓  */}
      <span className="update-banner-text-new-version">{latestVersion}</span>
      {statusText && (
        <span className="update-banner-status" data-stage={stage}>
          {statusText}
        </span>
      )}
      {stage === "restart-required" ? (
        <button className="update-banner-btn" onClick={handleRestart}>
          重启以应用更新
        </button>
      ) : (
        <UnavailableReason
          reason={portable ? undefined : installDisabledReason}
        >
          <button
            className="update-banner-btn"
            onClick={handleUpdate}
            disabled={!portable && stage === "installing"}
          >
            {portable
              ? "从 GitHub 下载"
              : stage === "installing"
                ? "安装中…"
                : "下载并安装"}
          </button>
        </UnavailableReason>
      )}
      {stage !== "restart-required" && (
        <button
          className="update-banner-btn update-banner-preview-btn"
          onClick={handlePreview}
        >
          预览更新内容
        </button>
      )}
      <UpdatePreviewModal
        open={previewOpen}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        loading={previewLoading}
        error={previewError}
        entries={previewEntries}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
