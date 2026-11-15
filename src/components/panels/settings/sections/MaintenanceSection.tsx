import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import DiscordIcon from "../../../DiscordIcon";
import { logDiagnostic } from "../../../../diagnostics";
import { ResetSettingsDialog, ResetUsageDialog } from "../settingsDialogs";
import { SettingsCard } from "./shared";

const DISCORD_URL = "https://discord.gg/jhWEW747x5";

interface CumulativeStats {
  totalClicks: number;
  totalTimeSecs: number;
  totalSessions: number;
  avgCpu: number;
}

interface Props {
  onReset: () => Promise<void>;
}

export default function MaintenanceSection({ onReset }: Props) {
  const [pendingAction, setPendingAction] = useState<
    "reset-settings" | "reset-usage" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [diagnosticsStatus, setDiagnosticsStatus] = useState<string | null>(
    null,
  );
  const [exporting, setExporting] = useState(false);

  const handleConfirmResetSettings = async () => {
    setBusy(true);
    try {
      await onReset();
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const handleConfirmResetUsage = async () => {
    setBusy(true);
    try {
      await invoke<CumulativeStats>("reset_stats");
    } catch {
      // ignore
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const handleDiscordClick = useCallback(() => {
    void openUrl(DISCORD_URL).catch((err) =>
      logDiagnostic("MaintenanceSection.openDiscord", {
        error: String(err),
      }),
    );
  }, []);

  return (
    <>
      <button
        type="button"
        className="maintenance-discord"
        onClick={handleDiscordClick}
      >
        <DiscordIcon className="maintenance-discord-icon" />
        <span className="maintenance-discord-copy">
          <span className="maintenance-discord-title">
            需要帮助？加入 Discord
          </span>
          <span className="maintenance-discord-text">
            提问或报告 bug，通常都有人在线。
          </span>
        </span>
        <span className="maintenance-discord-cta">加入</span>
      </button>

      <SettingsCard
        title="重置"
        description="重置所有设置或使用数据。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">重置所有设置</span>
            <span className="settings-sublabel">
              所有设置恢复默认，包括已保存的预设。
            </span>
          </div>
          <button
            className="settings-btn-danger"
            onClick={() => setPendingAction("reset-settings")}
          >
            重置
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">重置使用数据</span>
            <span className="settings-sublabel">
              删除使用统计卡片中记录的会话。
            </span>
          </div>
          <button
            className="settings-btn-danger"
            onClick={() => setPendingAction("reset-usage")}
          >
            重置
          </button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="诊断"
        description="保存在本机的日志和崩溃报告。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">诊断</span>
            <span className="settings-sublabel">
              打开文件夹或导出一份副本。
            </span>
          </div>
          <div className="settings-row-actions">
            <button
              className="settings-btn-secondary"
              onClick={async () => {
                try {
                  await invoke("open_diagnostics_folder");
                } catch (err) {
                  logDiagnostic("SettingsPanel.openDiagnostics", {
                    error: String(err),
                  });
                }
              }}
            >
              打开文件夹
            </button>
            <button
              className="settings-btn-secondary"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                setDiagnosticsStatus(null);
                try {
                  const path: string = await invoke(
                    "export_diagnostics_bundle",
                  );
                  setDiagnosticsStatus(`已导出到 ${path}`);
                } catch (err) {
                  setDiagnosticsStatus("导出失败");
                  logDiagnostic("SettingsPanel.exportDiagnostics", {
                    error: String(err),
                  });
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? "导出中..." : "导出"}
            </button>
          </div>
        </div>
        {diagnosticsStatus && (
          <span className="settings-note">{diagnosticsStatus}</span>
        )}
      </SettingsCard>

      <ResetSettingsDialog
        open={pendingAction === "reset-settings"}
        busy={busy}
        onConfirm={handleConfirmResetSettings}
        onCancel={() => setPendingAction(null)}
      />
      <ResetUsageDialog
        open={pendingAction === "reset-usage"}
        busy={busy}
        onConfirm={handleConfirmResetUsage}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
}
