import { memo, useEffect, useRef, useState } from "react";
import { useIconHover } from "@animateicons/react";
import { Volume2Icon, VolumeXIcon } from "@animateicons/react/lucide";
import UiScaleControl from "./UiScaleControl";
import "./StatusBar.css";

interface Props {
  activePresetName: string | null;
  version: string;
  stopReason: string | null;
  warning: string | null;
  running: boolean;
  paused: boolean;
  clickCount: number;
  activeClickPointIndex: number | null;
  totalClickPoints: number;
  clickLimit: number;
  clickLimitEnabled: boolean;
  timeLimitMs: number;
  showPreset: boolean;
  showSoundToggle: boolean;
  soundMuted: boolean;
  onToggleSound: () => void;
  onOpenSoundSettings: () => void;
  onGoToPresets: () => void;
  onGoToVersionInfo: () => void;
  uiScale: number;
  onUiScaleChange: (next: number) => void;
  showScale: boolean;
}

function SoundToggle({
  muted,
  onToggle,
  onOpenSettings,
}: {
  muted: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}) {
  const { ref, triggerProps } = useIconHover();
  const Icon = muted ? VolumeXIcon : Volume2Icon;
  const label = muted
    ? "声音已静音。点击取消静音，右键打开声音设置。"
    : "声音已开启。点击静音，右键打开声音设置。";

  return (
    <button
      {...triggerProps}
      className="status-bar-sound-btn"
      data-muted={muted}
      onClick={onToggle}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenSettings();
      }}
      title={label}
      aria-label={label}
      aria-pressed={!muted}
    >
      <Icon
        ref={ref}
        size={14}
        isAnimated={false}
        className="status-bar-sound-icon"
        aria-hidden="true"
      />
    </button>
  );
}

const STOP_REASON_TEXTS: Record<string, string> = {
  "Stopped from UI": "已从界面停止",
  "Stopped from toggle": "已通过切换停止",
  "Stopped from hotkey": "已通过快捷键停止",
  "Stopped from hold hotkey": "已通过按住快捷键停止",
  Stopped: "已停止",
  "Top-left corner failsafe": "左上角紧急停止",
  "Top-right corner failsafe": "右上角紧急停止",
  "Bottom-left corner failsafe": "左下角紧急停止",
  "Bottom-right corner failsafe": "右下角紧急停止",
  "Top edge failsafe": "顶部边缘紧急停止",
  "Right edge failsafe": "右侧边缘紧急停止",
  "Bottom edge failsafe": "底部边缘紧急停止",
  "Left edge failsafe": "左侧边缘紧急停止",
  "Blocked by Alt+Tab": "已被 Alt+Tab 阻止",
  "Blocked by process list": "已被进程列表阻止",
  "Blocked by process list: foreground application could not be identified":
    "无法识别前台应用",
};

function translateStopReason(stopReason: string | null | undefined): string {
  if (!stopReason) return "";
  const staticText = STOP_REASON_TEXTS[stopReason];
  if (staticText) return staticText;

  const clickLimit = stopReason.match(/^Click limit reached \((.+)\)$/);
  if (clickLimit) {
    return `已达到点击次数上限（${clickLimit[1]}）`;
  }

  const timeLimit = stopReason.match(/^Time limit reached \((.+)\)$/);
  if (timeLimit) {
    return `已达到时间上限（${timeLimit[1]}）`;
  }

  return stopReason;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default memo(function StatusBar({
  activePresetName,
  version,
  stopReason,
  warning,
  running,
  paused,
  clickCount,
  activeClickPointIndex,
  totalClickPoints,
  clickLimit,
  clickLimitEnabled,
  timeLimitMs,
  showPreset,
  showSoundToggle,
  soundMuted,
  onToggleSound,
  onOpenSoundSettings,
  onGoToPresets,
  onGoToVersionInfo,
  uiScale,
  onUiScaleChange,
  showScale,
}: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baseElapsedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      segmentStartRef.current = Date.now();
      const tick = () => {
        setElapsedMs(
          baseElapsedRef.current + (Date.now() - segmentStartRef.current!),
        );
      };
      tick();
      intervalRef.current = setInterval(tick, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      baseElapsedRef.current = 0;
      segmentStartRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  let centerText = "";
  let hasWarning = false;

  if (warning) {
    centerText = `⚠ ${warning}`;
    hasWarning = true;
  } else if (running) {
    const parts: string[] = [];

    if (paused) {
      parts.push("已暂停");
    }

    if (totalClickPoints > 1 && activeClickPointIndex !== null) {
      parts.push(`点 ${activeClickPointIndex + 1}/${totalClickPoints}`);
    }

    const elapsed = formatElapsed(elapsedMs);
    if (timeLimitMs > 0) {
      parts.push(`${elapsed} / ${formatElapsed(timeLimitMs)}`);
    } else {
      parts.push(elapsed);
    }

    if (clickLimitEnabled && clickLimit > 0) {
      parts.push(`${clickCount} / ${clickLimit} 次`);
    } else if (clickCount > 0) {
      parts.push(`${clickCount} 次`);
    }

    if (paused && stopReason) {
      parts.push(translateStopReason(stopReason));
    }

    centerText = parts.join("\u00A0\u00A0•\u00A0\u00A0");
  } else if (stopReason) {
    const reason = translateStopReason(stopReason);
    centerText = clickCount > 0 ? `${reason} • ${clickCount} 次` : reason;
  }

  return (
    <div className="status-bar" data-running={running}>
      <div className="status-bar-left">
        {showSoundToggle && (
          <SoundToggle
            muted={soundMuted}
            onToggle={onToggleSound}
            onOpenSettings={onOpenSoundSettings}
          />
        )}
        {showPreset &&
          (activePresetName ? (
            <button
              className="status-bar-preset-btn"
              onClick={onGoToPresets}
              title="前往预设"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              </svg>
              {activePresetName}
            </button>
          ) : (
            <button
              className="status-bar-hint-btn"
              onClick={onGoToPresets}
              title="前往预设"
            >
              未使用预设
            </button>
          ))}
      </div>
      <div
        className={`status-bar-center ${hasWarning ? "status-bar-center--warning" : ""} ${centerText ? "" : "status-bar-center--empty"}`}
      >
        {centerText}
      </div>
      <div className="status-bar-right">
        {showScale && (
          <UiScaleControl
            className="status-bar-scale"
            scale={uiScale}
            onChange={onUiScaleChange}
          />
        )}
        <button
          className="status-bar-version-btn"
          onClick={onGoToVersionInfo}
          title="信息"
        >
          v{version}
        </button>
      </div>
    </div>
  );
});
