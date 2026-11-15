import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logDiagnostic } from "../../../../diagnostics";
import { DEFAULT_MAX_CLICK_SPEED } from "../../../../settingsSchema";
import type { Settings } from "../../../../store";
import type { RestartOutcome } from "../../../../restart";
import { NumInput } from "../../advanced/sections/shared";
import {
  ExtendedSpeedDialog,
  RestartAdminDialog,
  RestartStandardDialog,
} from "../settingsDialogs";
import { SettingsCard } from "./shared";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onToggleAlwaysOnTop: () => Promise<void>;
  onRestartAsAdmin: () => Promise<RestartOutcome>;
  onRestartWithoutAdmin: () => Promise<RestartOutcome>;
  portable: boolean;
}

const UNIT_ROW_STYLE: CSSProperties = { gap: "0.25rem" };
const CLICKS_UNIT_STYLE: CSSProperties = {
  minWidth: "0.75rem",
  textAlign: "left",
};
const RADIUS_UNIT_STYLE: CSSProperties = {
  minWidth: "0.375rem",
  textAlign: "center",
};
const CLICKS_INPUT_STYLE: CSSProperties = {
  width: "7ch",
  textAlign: "right",
};
const RADIUS_INPUT_STYLE: CSSProperties = {
  width: "5ch",
  textAlign: "right",
};

export default function BehaviorSection({
  settings,
  update,
  onToggleAlwaysOnTop,
  onRestartAsAdmin,
  onRestartWithoutAdmin,
  portable,
}: Props) {
  const [pendingAction, setPendingAction] = useState<
    | "extended-click-speed-limit"
    | "restart-as-admin"
    | "restart-without-admin"
    | null
  >(null);
  const [autostartEnabled, setAutostartEnabled] = useState<boolean | null>(
    null,
  );
  const [elevation, setElevation] = useState<{
    elevated: boolean;
    canElevate: boolean;
  } | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [elevationFailed, setElevationFailed] = useState(false);

  useEffect(() => {
    invoke<boolean>("get_autostart_enabled")
      .then(setAutostartEnabled)
      .catch(() => setAutostartEnabled(false));
  }, []);

  useEffect(() => {
    invoke<{ elevated: boolean; canElevate: boolean }>("get_elevation_state")
      .then(setElevation)
      .catch((err) => {
        logDiagnostic("BehaviorSection.elevationState", {
          error: String(err),
        });
        setElevationFailed(true);
      });
  }, []);

  const handleAlwaysOnTopChange = useCallback(
    (nextValue: boolean) => {
      if (settings.alwaysOnTop === nextValue) return;
      void onToggleAlwaysOnTop();
    },
    [settings.alwaysOnTop, onToggleAlwaysOnTop],
  );

  const handleExtendedClickSpeedLimitChange = useCallback(
    (nextValue: boolean) => {
      if (settings.extendedClickSpeedLimit === nextValue) return;
      if (nextValue) {
        setPendingAction("extended-click-speed-limit");
        return;
      }
      update({
        extendedClickSpeedLimit: false,
        clickSpeed: Math.min(settings.clickSpeed, DEFAULT_MAX_CLICK_SPEED),
      });
    },
    [settings.extendedClickSpeedLimit, settings.clickSpeed, update],
  );

  const handleConfirmExtendedClickSpeedLimit = useCallback(() => {
    update({ extendedClickSpeedLimit: true });
    setPendingAction(null);
  }, [update]);

  const handleCancelPending = useCallback(() => setPendingAction(null), []);

  const handleShowStopOverlayToggle = useCallback(
    () => update({ showStopOverlay: !settings.showStopOverlay }),
    [update, settings.showStopOverlay],
  );

  const handleShowStopReasonToggle = useCallback(
    () => update({ showStopReason: !settings.showStopReason }),
    [update, settings.showStopReason],
  );

  const handleStrictHotkeyModifiersToggle = useCallback(
    () =>
      update({
        strictHotkeyModifiers: !settings.strictHotkeyModifiers,
      }),
    [update, settings.strictHotkeyModifiers],
  );

  const handleTaskSwitcherStopToggle = useCallback(
    () =>
      update({
        taskSwitcherStopEnabled: !settings.taskSwitcherStopEnabled,
      }),
    [update, settings.taskSwitcherStopEnabled],
  );

  const handleNewClickPointClicksChange = useCallback(
    (value: number) => update({ newClickPointClicks: value }),
    [update],
  );

  const handleNewClickPointRadiusChange = useCallback(
    (value: number) => update({ newClickPointRadius: value }),
    [update],
  );

  const handleMinimizeToTrayToggle = useCallback(
    () => update({ minimizeToTray: !settings.minimizeToTray }),
    [update, settings.minimizeToTray],
  );

  const handleRememberWindowPositionToggle = useCallback(
    () =>
      update({
        rememberWindowPosition: !settings.rememberWindowPosition,
      }),
    [update, settings.rememberWindowPosition],
  );

  const handleAlwaysRunAsAdminToggle = useCallback(() => {
    const next = !settings.alwaysRunAsAdmin;
    setRestartError(null);
    update({ alwaysRunAsAdmin: next });
    if (elevation === null) return;
    if (next && !elevation.elevated && elevation.canElevate) {
      setPendingAction("restart-as-admin");
      return;
    }
    if (!next && elevation.elevated) {
      setPendingAction("restart-without-admin");
    }
  }, [update, settings.alwaysRunAsAdmin, elevation]);

  const handleConfirmRestartWithoutAdmin = useCallback(async () => {
    setRestarting(true);
    let outcome: RestartOutcome = "refused";
    try {
      outcome = await onRestartWithoutAdmin();
    } catch (err) {
      logDiagnostic("BehaviorSection.restartWithoutAdmin", {
        error: String(err),
      });
    }
    if (outcome === "unsaved") {
      setRestartError(
        "无法保存该设置。未执行重启，本次运行仍保留管理员权限。",
      );
    } else if (outcome === "refused") {
      setRestartError(
        "无法以非管理员身份重启。请关闭并重新打开应用以失去管理员权限。",
      );
    }
    setRestarting(false);
    setPendingAction(null);
  }, [onRestartWithoutAdmin]);

  const handleConfirmRestartAsAdmin = useCallback(async () => {
    setRestarting(true);
    let outcome: RestartOutcome = "refused";
    try {
      outcome = await onRestartAsAdmin();
    } catch (err) {
      logDiagnostic("BehaviorSection.restartAsAdmin", {
        error: String(err),
      });
    }
    if (outcome === "unsaved") {
      setRestartError(
        "无法保存该设置。未执行重启，下次启动仍不会以管理员身份运行。",
      );
    } else if (outcome === "refused") {
      setRestartError(
        "无法重启。应用将在下次启动时以管理员身份运行。",
      );
    }
    setRestarting(false);
    setPendingAction(null);
  }, [onRestartAsAdmin]);

  const handleElevationNoticeToggle = useCallback(
    () => update({ elevationNoticeEnabled: !settings.elevationNoticeEnabled }),
    [update, settings.elevationNoticeEnabled],
  );

  const handleAutostartToggle = useCallback(() => {
    const newValue = !autostartEnabled;
    invoke("set_autostart_enabled", { enabled: newValue })
      .then(() => setAutostartEnabled(newValue))
      .catch((err) =>
        logDiagnostic("SettingsPanel.setAutostart", {
          error: String(err),
        }),
      );
  }, [autostartEnabled]);

  const elevationNote = () => {
    if (elevation === null) {
      return elevationFailed
        ? "无法读取管理员状态。该设置仍将在下次启动时生效。"
        : "正在检查管理员状态…";
    }
    if (restartError) return restartError;
    if (elevation.elevated) {
      return settings.alwaysRunAsAdmin
        ? "正在以管理员身份运行。关闭此项可不以管理员身份重启。"
        : "当前正以管理员身份运行。关闭应用即可失去该权限。";
    }
    if (settings.alwaysRunAsAdmin) {
      return elevation.canElevate
        ? "将在下次启动时以管理员身份运行。"
        : "此账户无法自动提升权限。请从 Windows 以管理员身份启动应用。";
    }
    return "未以管理员身份运行。";
  };

  return (
    <>
      <SettingsCard
        title="行为"
        description="更改自动连点器的运行方式。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">窗口置顶</span>
            <span className="settings-sublabel">
              让窗口始终保持在其他窗口之上。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.alwaysOnTop ? "on" : "off"}`}
              onClick={() => handleAlwaysOnTopChange(!settings.alwaysOnTop)}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">停止区域悬浮窗</span>
            <span className="settings-sublabel">
              停止区域发生变化时将其绘制在屏幕上。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.showStopOverlay ? "on" : "off"}`}
              onClick={handleShowStopOverlayToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">停止原因提醒</span>
            <span className="settings-sublabel">
              自动连点器停止时显示通知。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.showStopReason ? "on" : "off"}`}
              onClick={handleShowStopReasonToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">快捷键修饰键严格匹配</span>
            <span className="settings-sublabel">
              快捷键会忽略带有多余修饰键的按键。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.strictHotkeyModifiers ? "on" : "off"}`}
              onClick={handleStrictHotkeyModifiersToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">Alt+Tab 时停止</span>
            <span className="settings-sublabel">
              任务切换器打开时结束本次连点。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.taskSwitcherStopEnabled ? "on" : "off"}`}
              onClick={handleTaskSwitcherStopToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">扩展点击速度上限</span>
            <span className="settings-sublabel">
              将点击速度上限从 500 提升到 1000。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.extendedClickSpeedLimit ? "on" : "off"}`}
              onClick={() =>
                handleExtendedClickSpeedLimitChange(
                  !settings.extendedClickSpeedLimit,
                )
              }
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="点击点默认值"
        description="新选取点击点的默认值。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">默认点击次数</span>
            <span className="settings-sublabel">
              每个新点击点初始的点击次数。
            </span>
          </div>
          <div className="adv-numbox-sm" style={UNIT_ROW_STYLE}>
            <span className="adv-unit" style={CLICKS_UNIT_STYLE}>
              次
            </span>
            <NumInput
              hoverWheel={false}
              value={settings.newClickPointClicks}
              min={1}
              max={999999}
              onChange={handleNewClickPointClicksChange}
              style={CLICKS_INPUT_STYLE}
            />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">默认半径</span>
            <span className="settings-sublabel">
              新点击点散布点击的范围（像素）。
            </span>
          </div>
          <div className="adv-numbox-sm" style={UNIT_ROW_STYLE}>
            <span className="adv-unit" style={RADIUS_UNIT_STYLE}>
              r
            </span>
            <NumInput
              hoverWheel={false}
              value={settings.newClickPointRadius}
              min={0}
              max={9999}
              onChange={handleNewClickPointRadiusChange}
              style={RADIUS_INPUT_STYLE}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="开机自启"
        description="应用的启动方式，以及关闭窗口时的行为。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">以管理员身份运行</span>
            <span className="settings-sublabel">
              以管理员身份启动，让提权窗口也能接受点击。
            </span>
            <span className="settings-note">{elevationNote()}</span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.alwaysRunAsAdmin ? "on" : "off"}`}
              disabled={elevation === null && !elevationFailed}
              onClick={handleAlwaysRunAsAdminToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">关闭到托盘</span>
            <span className="settings-sublabel">
              关闭时隐藏到托盘而不是退出。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.minimizeToTray ? "on" : "off"}`}
              onClick={handleMinimizeToTrayToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">记住窗口位置</span>
            <span className="settings-sublabel">
              在上次的位置重新打开窗口。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.rememberWindowPosition ? "on" : "off"}`}
              onClick={handleRememberWindowPositionToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        {!portable && (
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">开机自启</span>
              <span className="settings-sublabel">
                随 Windows 启动，并隐藏在托盘中。
              </span>
            </div>
            <div className="settings-toggle-wrapper">
              <button
                className={`settings-toggle ${autostartEnabled ? "on" : "off"}`}
                disabled={autostartEnabled === null}
                onClick={handleAutostartToggle}
              >
                <span className="settings-toggle-knob" />
              </button>
            </div>
          </div>
        )}
      </SettingsCard>

      <SettingsCard title="通知">
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">管理员窗口提醒</span>
            <span className="settings-sublabel">
              当管理员窗口获得焦点时发出警告并提供重启选项。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.elevationNoticeEnabled ? "on" : "off"}`}
              onClick={handleElevationNoticeToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>
      </SettingsCard>

      <RestartAdminDialog
        open={pendingAction === "restart-as-admin"}
        busy={restarting}
        onConfirm={handleConfirmRestartAsAdmin}
        onCancel={handleCancelPending}
      />

      <RestartStandardDialog
        open={pendingAction === "restart-without-admin"}
        busy={restarting}
        onConfirm={handleConfirmRestartWithoutAdmin}
        onCancel={handleCancelPending}
      />

      <ExtendedSpeedDialog
        open={pendingAction === "extended-click-speed-limit"}
        onConfirm={handleConfirmExtendedClickSpeedLimit}
        onCancel={handleCancelPending}
      />
    </>
  );
}
