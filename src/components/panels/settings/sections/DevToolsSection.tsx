import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { KOFI_URL } from "../../../../donationReminders";
import type { ChangelogEntry } from "../../../../changelog";
import ElevationPrompt from "../../../ElevationPrompt";
import DonationPrompt from "../../../DonationPrompt";
import UpdateBanner from "../../../Updatebanner";
import UpdatePreviewModal from "../../../UpdatePreviewModal";
import {
  ExtendedSpeedDialog,
  ResetSettingsDialog,
  ResetUsageDialog,
  RestartAdminDialog,
} from "../settingsDialogs";
import { SettingsCard } from "./shared";
import "./DevToolsSection.css";

type PreviewId =
  | "reset-settings"
  | "reset-usage"
  | "extended-speed"
  | "restart-admin"
  | "elevation"
  | "donation"
  | "update-banner"
  | "update-preview";

const PREVIEWS: { id: PreviewId; label: string; description: string }[] = [
  {
    id: "reset-settings",
    label: "重置所有设置",
    description: "会清空设置和预设的确认对话框。",
  },
  {
    id: "reset-usage",
    label: "重置使用数据",
    description: "会删除已记录会话的确认对话框。",
  },
  {
    id: "extended-speed",
    label: "扩展点击速度上限",
    description: "将速度上限提升到 1000 前的确认对话框。",
  },
  {
    id: "restart-admin",
    label: "以管理员身份重启",
    description: "提供以管理员权限重新启动选项的确认对话框。",
  },
  {
    id: "elevation",
    label: "管理员窗口提示",
    description: "当提权窗口获得焦点时显示的阻塞式提示。",
  },
  {
    id: "donation",
    label: "捐赠提醒",
    description: "大量使用后显示的里程碑提醒。",
  },
  {
    id: "update-banner",
    label: "有可用更新横幅",
    description: "存在新版本时显示在面板上方的横幅。",
  },
  {
    id: "update-preview",
    label: "更新预览",
    description: "安装更新前显示的更新日志。",
  },
];

const SAMPLE_UPDATE: ChangelogEntry[] = [
  {
    version: "9.9.9",
    date: "1.1.2099",
    sections: [
      {
        heading: "新增",
        items: [
          {
            text: "预览用示例功能。",
            subitems: ["预览用示例子项。"],
          },
        ],
      },
      {
        heading: "修复",
        items: [{ text: "预览用示例修复项。", subitems: [] }],
      },
    ],
  },
];

export default function DevToolsSection({
  onOpenFirstRunSetup,
}: {
  onOpenFirstRunSetup: () => void;
}) {
  const [preview, setPreview] = useState<PreviewId | null>(null);
  const [promptToggle, setPromptToggle] = useState(false);
  const close = () => setPreview(null);

  useEffect(() => {
    if (preview !== "update-banner") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [preview]);

  return (
    <>
      <SettingsCard
        title="首次设置"
        description="重新运行真实的首次设置流程，并载入当前设置。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">再次运行设置向导</span>
            <span className="settings-sublabel">
              重新运行真实的声音和悬浮窗设置，所做选择会被保存。
            </span>
          </div>
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={onOpenFirstRunSetup}
          >
            打开
          </button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="开发者工具"
        description="仅开发版本可用。每行都会以预览模式打开一个对话框，不会保存、删除或重启任何内容。"
      >
        {PREVIEWS.map((entry) => (
          <div className="settings-row" key={entry.id}>
            <div className="settings-label-group">
              <span className="settings-label">{entry.label}</span>
              <span className="settings-sublabel">{entry.description}</span>
            </div>
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={() => setPreview(entry.id)}
            >
              打开
            </button>
          </div>
        ))}
      </SettingsCard>

      <DonationPrompt
        prompt={
          preview === "donation"
            ? {
                milestone: {
                  kind: "clicks",
                  threshold: 1_000_000,
                  label: "100 万次点击",
                },
                current: 1_247_301,
              }
            : null
        }
        onSupport={() => void openUrl(KOFI_URL)}
        onAcknowledge={() => {}}
        onClose={close}
      />

      <ResetSettingsDialog
        open={preview === "reset-settings"}
        onConfirm={close}
        onCancel={close}
      />

      <ResetUsageDialog
        open={preview === "reset-usage"}
        onConfirm={close}
        onCancel={close}
      />

      <ExtendedSpeedDialog
        open={preview === "extended-speed"}
        onConfirm={close}
        onCancel={close}
      />

      <RestartAdminDialog
        open={preview === "restart-admin"}
        onConfirm={close}
        onCancel={close}
      />

      <UpdatePreviewModal
        open={preview === "update-preview"}
        currentVersion="3.9.6"
        latestVersion="9.9.9"
        loading={false}
        error={false}
        entries={SAMPLE_UPDATE}
        onClose={close}
      />

      {preview === "update-banner"
        ? createPortal(
            <div
              className="dev-banner-layer"
              onClick={close}
              role="presentation"
            >
              <div
                className="dev-banner-bar"
                onClick={(event) => event.stopPropagation()}
              >
                <UpdateBanner
                  currentVersion="3.9.6"
                  latestVersion="9.9.9"
                  preview
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      {preview === "elevation"
        ? createPortal(
            <div className="dev-elevation-preview">
              <ElevationPrompt
                open
                canElevate
                alwaysRunAsAdmin={promptToggle}
                windowName="任务管理器"
                windowTitle="任务管理器"
                busy={false}
                onRestart={close}
                onAlwaysRunChange={setPromptToggle}
                onDismiss={close}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
