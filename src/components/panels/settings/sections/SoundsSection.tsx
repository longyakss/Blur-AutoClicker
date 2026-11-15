import { useCallback, useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useIconHover } from "@animateicons/react";
import {
  ChevronDownIcon,
  ClockIcon,
  FolderOpenIcon,
  RotateCcwIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from "@animateicons/react/lucide";
import type { AnimatedIcon } from "../../../animatedIcon";
import { logDiagnostic } from "../../../../diagnostics";
import {
  authorizeSoundPath,
  previewClickerSound,
  resolvedVolume,
  SOUND_FILE_EXTENSIONS,
  soundFileName,
  soundSrcFor,
  type ClickerSoundKind,
} from "../../../../soundPlayback";
import { soundTrimFor, soundTrimPatch } from "../../../../soundTrim";
import {
  clearSoundDurationCache,
  effectivePlayLength,
  formatCompactDuration,
  probeSoundDuration,
} from "../../../../soundDuration";
import {
  pushRecentSoundPath,
  removeRecentSoundPath,
} from "../../../../soundRecents";
import SoundRecentMenu from "../SoundRecentMenu";
import SoundWaveform from "../SoundWaveform";
import type { Settings } from "../../../../store";
import { SettingsCard } from "./shared";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SOUND_FILTERS = [
  { name: "音频", extensions: SOUND_FILE_EXTENSIONS },
  { name: "所有文件", extensions: ["*"] },
];

type SoundField = ClickerSoundKind;

const FIELDS: Record<
  SoundField,
  {
    enabledKey:
      "enableSoundEnabled" | "disableSoundEnabled" | "clickSoundEnabled";
    pathKey: "enableSoundPath" | "disableSoundPath" | "clickSoundPath";
    volumeKey: "enableSoundVolume" | "disableSoundVolume" | "clickSoundVolume";
  }
> = {
  enable: {
    enabledKey: "enableSoundEnabled",
    pathKey: "enableSoundPath",
    volumeKey: "enableSoundVolume",
  },
  disable: {
    enabledKey: "disableSoundEnabled",
    pathKey: "disableSoundPath",
    volumeKey: "disableSoundVolume",
  },
  click: {
    enabledKey: "clickSoundEnabled",
    pathKey: "clickSoundPath",
    volumeKey: "clickSoundVolume",
  },
};

function IconButton({
  label,
  ariaLabel,
  icon: Icon,
  onClick,
  disabled,
  variant,
}: {
  label: string;
  ariaLabel?: string;
  icon: AnimatedIcon;
  onClick: () => void;
  disabled?: boolean;
  variant: "text" | "icon";
}) {
  const { ref, triggerProps } = useIconHover();

  return (
    <button
      {...triggerProps}
      className={
        variant === "text"
          ? "settings-btn-secondary sounds-file-btn"
          : "settings-btn-quiet settings-btn-icon"
      }
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={ariaLabel ?? (variant === "icon" ? label : undefined)}
    >
      <Icon
        ref={ref}
        size={14}
        isAnimated={false}
        className="sounds-btn-icon"
        aria-hidden="true"
      />
      {variant === "text" ? label : null}
    </button>
  );
}

function SoundCard({
  field,
  label,
  description,
  settings,
  update,
  fastRateToggle = false,
}: {
  field: SoundField;
  label: string;
  description: string;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  fastRateToggle?: boolean;
}) {
  const kind = field;
  const { enabledKey, pathKey, volumeKey } = FIELDS[field];
  const enabled = settings[enabledKey];
  const path = settings[pathKey];
  const volume = settings[volumeKey];
  const isCustom = path.trim().length > 0;
  const fileName = soundFileName(path, kind);
  const trim = soundTrimFor(kind, settings);
  const [previewing, setPreviewing] = useState<{
    element: HTMLAudioElement;
    seq: number;
  } | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const aliveRef = useRef(true);
  const openRef = useRef(false);

  useEffect(() => {
    previewRef.current = previewing?.element ?? null;
  }, [previewing]);

  const stopPreview = useCallback(() => {
    previewing?.element.pause();
  }, [previewing]);

  const handleToggle = useCallback(
    () => update({ [enabledKey]: !enabled }),
    [enabled, enabledKey, update],
  );

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: SOUND_FILTERS,
      });
      if (typeof selected !== "string") return;
      clearSoundDurationCache();
      update({
        [pathKey]: selected,
        ...soundTrimPatch(kind, { start: 0, end: 0 }),
        recentSoundPaths: pushRecentSoundPath(
          settings.recentSoundPaths,
          selected,
        ),
      });
    } catch (err) {
      logDiagnostic("SoundsSection.pickSound", {
        error: String(err),
      });
    }
  }, [kind, pathKey, settings.recentSoundPaths, update]);

  const handleReset = useCallback(() => {
    clearSoundDurationCache();
    update({ [pathKey]: "", ...soundTrimPatch(kind, { start: 0, end: 0 }) });
  }, [kind, pathKey, update]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [volumeKey]: Number(e.target.value) }),
    [volumeKey, update],
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [probe, setProbe] = useState<{ src: string; ms: number } | null>(null);
  const [authorizedSrc, setAuthorizedSrc] = useState<string | null>(null);

  const src = soundSrcFor(kind, settings);
  const durationMs = probe?.src === src ? probe.ms : null;

  useEffect(() => {
    let cancelled = false;
    const custom = path.trim();
    void (custom ? authorizeSoundPath(custom) : Promise.resolve(true))
      .then(() => {
        if (cancelled) return null;
        setAuthorizedSrc(src);
        return probeSoundDuration(src);
      })
      .then((duration) => {
        if (!cancelled && duration !== null) setProbe({ src, ms: duration });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [src, path]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      previewRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    openRef.current = detailsOpen;
  }, [detailsOpen]);

  const toggleDetails = () => {
    if (!detailsOpen) {
      setDetailsOpen(true);
      return;
    }
    previewRef.current?.pause();
    setPreviewing(null);
    setDetailsOpen(false);
  };

  const playLength = formatCompactDuration(
    effectivePlayLength(trim.start, trim.end, durationMs),
  );
  const VolumeIcon =
    volume === 0 ? VolumeXIcon : volume < 50 ? Volume1Icon : Volume2Icon;
  const lengthId = `sound-length-${kind}`;
  const volumeId = `sound-volume-${kind}`;

  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!detailsOpen) return;
    const timer = window.setTimeout(() => {
      const node = detailsRef.current;
      const panel = node?.closest<HTMLElement>(".settings-panel");
      if (!node || !panel) return;
      if (typeof panel.scrollBy !== "function") return;
      const panelRect = panel.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const overflow = nodeRect.bottom - (panelRect.bottom - 8);
      if (overflow > 0) {
        panel.scrollBy({
          top: overflow + 12,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }
    }, 240);
    return () => window.clearTimeout(timer);
  }, [detailsOpen]);

  return (
    <SettingsCard
      title={label}
      description={description}
      actions={
        <div className="settings-toggle-wrapper">
          <button
            className={`settings-toggle ${enabled ? "on" : "off"}`}
            onClick={handleToggle}
            aria-pressed={enabled}
            aria-label={`${label}声音`}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
      }
    >
      <div className="settings-row settings-row--inline">
        <div className="settings-label-group">
          <span className="settings-label">声音文件</span>
          <span className="settings-sublabel sounds-file-name" title={path}>
            {isCustom ? fileName : `${fileName}（默认）`}
          </span>
        </div>
        <div className="settings-row-actions">
          <div className="sound-file-buttons">
            <IconButton
              label="选择声音"
              ariaLabel={`选择声音：${label.toLowerCase()}`}
              icon={FolderOpenIcon}
              variant="text"
              onClick={() => void handleBrowse()}
            />
            <SoundRecentMenu
              paths={settings.recentSoundPaths}
              label={label}
              onPick={(selected) =>
                update({
                  [pathKey]: selected,
                  ...soundTrimPatch(kind, { start: 0, end: 0 }),
                  recentSoundPaths: pushRecentSoundPath(
                    settings.recentSoundPaths,
                    selected,
                  ),
                })
              }
              onRemove={(selected) =>
                update({
                  recentSoundPaths: removeRecentSoundPath(
                    settings.recentSoundPaths,
                    selected,
                  ),
                })
              }
            />
          </div>
          <IconButton
            label="使用默认声音"
            ariaLabel={`使用${label.toLowerCase()}的默认声音`}
            icon={RotateCcwIcon}
            variant="icon"
            disabled={!isCustom}
            onClick={handleReset}
          />
        </div>
      </div>

      {fastRateToggle && (
        <div className="settings-row settings-row--inline">
          <div className="settings-label-group">
            <span className="settings-label">
              允许每秒超过 10 次
            </span>
            <span
              className={`settings-sublabel${
                settings.clickSoundAllowFastRate
                  ? " sound-fastrate-warning"
                  : ""
              }`}
            >
              {settings.clickSoundAllowFastRate
                ? "此速率下声音可能重叠或卡顿。"
                : "仅在极高速连点时才需要。"}
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${
                settings.clickSoundAllowFastRate ? "on" : "off"
              }`}
              aria-pressed={settings.clickSoundAllowFastRate}
              aria-label="允许每秒超过 10 次"
              onClick={() =>
                update({
                  clickSoundAllowFastRate: !settings.clickSoundAllowFastRate,
                })
              }
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>
      )}

      <div className="sound-details" data-open={detailsOpen} ref={detailsRef}>
        <button
          type="button"
          className="sound-details-toggle"
          aria-expanded={detailsOpen}
          aria-label={`${label}的裁剪与音量`}
          aria-describedby={`${lengthId} ${volumeId}`}
          onClick={toggleDetails}
        >
          <ChevronDownIcon
            className="sound-details-chevron"
            size={12}
            isAnimated={false}
            aria-hidden="true"
          />
          <span className="sound-details-title">裁剪与音量</span>
          <span className="sound-details-summary" id={lengthId}>
            <ClockIcon size={11} isAnimated={false} aria-hidden="true" />
            {playLength && <span>{playLength}</span>}
          </span>
          <span className="sound-details-volume" id={volumeId}>
            <VolumeIcon size={11} isAnimated={false} aria-hidden="true" />
            <span>{volume}%</span>
          </span>
        </button>

        <div className="sound-details-clip">
          <div className="sound-details-body" inert={!detailsOpen}>
            <SoundWaveform
              src={src}
              label={label}
              active={detailsOpen && authorizedSrc === src}
              trimStart={trim.start}
              trimEnd={trim.end}
              onTrimChange={(start, end) =>
                update(soundTrimPatch(kind, { start, end }))
              }
              volume={resolvedVolume(settings.soundVolume, volume) * 100}
              playback={previewing?.element ?? null}
              previewSeq={previewing?.seq ?? 0}
              onPreview={() => {
                void previewClickerSound(kind, settings).then((element) => {
                  if (!element) return;
                  if (!aliveRef.current || !openRef.current) {
                    element.pause();
                    return;
                  }
                  setPreviewing((current) => ({
                    element,
                    seq: (current?.seq ?? 0) + 1,
                  }));
                });
              }}
              onStop={stopPreview}
            />

            <div className="settings-row settings-row--inline">
              <div className="settings-label-group">
                <span className="settings-label">声音音量</span>
              </div>
              <div className="settings-opacity-controls">
                <input
                  type="range"
                  className="settings-opacity-slider"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  aria-label={`${label}声音音量`}
                />
                <span className="settings-slider-value">{volume}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}

export default function SoundsSection({ settings, update }: Props) {
  const handleMasterVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ soundVolume: Number(e.target.value) }),
    [update],
  );

  const handleMuteToggle = useCallback(
    () => update({ soundMuted: !settings.soundMuted }),
    [settings.soundMuted, update],
  );

  return (
    <>
      <SettingsCard
        title="音量"
        description="作用于所有声音。状态栏中的扬声器按钮会静音连点器的声音；此处的试听不受影响。"
      >
        <div className="settings-row settings-row--inline">
          <div className="settings-label-group">
            <span className="settings-label">主音量</span>
            <span className="settings-sublabel">
              调整所有声音的音量。
            </span>
          </div>
          <div className="settings-opacity-controls">
            <input
              type="range"
              className="settings-opacity-slider"
              min="0"
              max="100"
              value={settings.soundVolume}
              onChange={handleMasterVolumeChange}
              aria-label="主音量"
            />
            <span className="settings-slider-value">
              {settings.soundVolume}%
            </span>
          </div>
        </div>

        <div className="settings-row settings-row--inline">
          <div className="settings-label-group">
            <span className="settings-label">静音所有声音</span>
            <span className="settings-sublabel">
              与状态栏中扬声器图标为同一个开关。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.soundMuted ? "on" : "off"}`}
              onClick={handleMuteToggle}
              aria-pressed={settings.soundMuted}
              aria-label="静音所有声音"
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>
      </SettingsCard>

      <SoundCard
        field="enable"
        label="自动连点器开启"
        description="开始连点时。"
        settings={settings}
        update={update}
      />
      <SoundCard
        field="disable"
        label="自动连点器关闭"
        description="停止连点时，包括达到限制和紧急停止。"
        settings={settings}
        update={update}
      />
      <SoundCard
        field="click"
        fastRateToggle
        label="每次点击"
        description={
          settings.clickSoundAllowFastRate
            ? "连点期间，最多每秒 25 次。"
            : "连点期间，最多每秒 10 次。"
        }
        settings={settings}
        update={update}
      />
    </>
  );
}
