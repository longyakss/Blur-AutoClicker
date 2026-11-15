import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logDiagnostic } from "../diagnostics";
import { playClickerSound, type ClickerSoundKind } from "../soundPlayback";
import { SETTINGS_LIMITS } from "../settingsSchema";
import type { Settings } from "../store";
import "./FirstRunSetup.css";

const OVERLAY_SIZE_MIN = SETTINGS_LIMITS.indicatorSize.min;
const OVERLAY_SIZE_MAX = SETTINGS_LIMITS.indicatorSize.max;

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onFinish: () => void;
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`first-run-toggle ${checked ? "on" : "off"}`}
      onClick={onChange}
    >
      <span className="first-run-toggle-knob" />
    </button>
  );
}

function VolumeRow({
  label,
  hint,
  volume,
  onVolumeChange,
  onPreview,
}: {
  label: string;
  hint: string;
  volume: number;
  onVolumeChange: (value: number) => void;
  onPreview: () => void;
}) {
  return (
    <div className="first-run-row">
      <div className="first-run-row-text">
        <span className="first-run-row-label">{label}</span>
        <span className="first-run-row-hint">{hint}</span>
      </div>
      <div className="first-run-row-controls">
        <input
          type="range"
          className="first-run-slider"
          min="0"
          max="100"
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          aria-label={`${label}音量`}
        />
        <span className="first-run-value">{volume}%</span>
        <button type="button" className="first-run-btn" onClick={onPreview}>
          试听
        </button>
      </div>
    </div>
  );
}

export default function FirstRunSetup({ settings, update, onFinish }: Props) {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const soundsOn = settings.enableSoundEnabled && settings.disableSoundEnabled;

  const toggleSounds = useCallback(() => {
    const next = !soundsOn;
    update({ enableSoundEnabled: next, disableSoundEnabled: next });
  }, [soundsOn, update]);

  const previewSound = useCallback(
    (kind: ClickerSoundKind) => {
      void playClickerSound(kind, {
        ...settings,
        soundMuted: false,
        enableSoundEnabled: true,
        disableSoundEnabled: true,
      });
    },
    [settings],
  );

  const previewOverlay = useCallback(() => {
    invoke("preview_indicator").catch((err) => {
      logDiagnostic("FirstRunSetup.previewOverlay", {
        error: String(err),
      });
    });
  }, []);

  const lastStep = step === 1;

  return (
    <section className="first-run" aria-label="首次设置">
      <header className="first-run-header">
        <div className="first-run-topline">
          <div className="first-run-steps" aria-hidden="true">
            <span className={`first-run-dot ${step === 0 ? "active" : ""}`} />
            <span className={`first-run-dot ${step === 1 ? "active" : ""}`} />
          </div>
          <span className="first-run-eyebrow">首次设置</span>
          <span className="first-run-step">第 {step + 1} 步，共 2 步</span>
        </div>
        <h2 className="first-run-title" tabIndex={-1} ref={headingRef}>
          {step === 0 ? "声音" : "悬浮窗"}
        </h2>
        <p className="first-run-lede">
          {step === 0
            ? "开始与停止音效"
            : `位于 ${settings.indicatorCorner} 角落的小型悬浮窗`}
        </p>
        <p className="first-run-note">
          所有内容都可以稍后在设置中更改。
        </p>
      </header>

      <div className="first-run-body">
        {step === 0 ? (
          <div className="first-run-card">
            <div className="first-run-row first-run-row--inline">
              <div className="first-run-row-text">
                <span className="first-run-row-label">播放声音</span>
                <span className="first-run-row-hint">
                  同时开启或关闭开始与停止音效。
                </span>
              </div>
              <Toggle
                checked={soundsOn}
                label="播放声音"
                onChange={toggleSounds}
              />
            </div>

            <VolumeRow
              label="开始点击时"
              hint="在开始点击时播放。"
              volume={settings.enableSoundVolume}
              onVolumeChange={(value) => update({ enableSoundVolume: value })}
              onPreview={() => previewSound("enable")}
            />

            <VolumeRow
              label="停止点击时"
              hint="在停止点击时播放，包括紧急停止。"
              volume={settings.disableSoundVolume}
              onVolumeChange={(value) => update({ disableSoundVolume: value })}
              onPreview={() => previewSound("disable")}
            />
          </div>
        ) : (
          <div className="first-run-card">
            <div className="first-run-row first-run-row--inline">
              <div className="first-run-row-text">
                <span className="first-run-row-label">显示悬浮窗</span>
                <span className="first-run-row-hint">
                  显示在你在设置中选择的角落。
                </span>
              </div>
              <Toggle
                checked={settings.indicatorEnabled}
                label="显示悬浮窗"
                onChange={() =>
                  update({ indicatorEnabled: !settings.indicatorEnabled })
                }
              />
            </div>

            <div className="first-run-row">
              <div className="first-run-row-text">
                <span className="first-run-row-label">悬浮窗大小</span>
                <span className="first-run-row-hint">
                  以像素为单位。更改时会在屏幕上显示预览。
                </span>
              </div>
              <div className="first-run-row-controls">
                <input
                  type="range"
                  className="first-run-slider"
                  min={OVERLAY_SIZE_MIN}
                  max={OVERLAY_SIZE_MAX}
                  value={settings.indicatorSize}
                  disabled={!settings.indicatorEnabled}
                  onChange={(event) =>
                    update({ indicatorSize: Number(event.target.value) })
                  }
                  aria-label="悬浮窗大小"
                />
                <span className="first-run-value">
                  {settings.indicatorSize} px
                </span>
                <button
                  type="button"
                  className="first-run-btn"
                  disabled={!settings.indicatorEnabled}
                  onClick={previewOverlay}
                >
                  预览
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="first-run-footer">
        <button type="button" className="first-run-skip" onClick={onFinish}>
          跳过设置
        </button>
        <div className="first-run-footer-actions">
          {step > 0 && (
            <button
              type="button"
              className="first-run-btn"
              onClick={() => setStep(0)}
            >
              上一步
            </button>
          )}
          <button
            type="button"
            className="first-run-btn first-run-btn--primary"
            onClick={lastStep ? onFinish : () => setStep(1)}
          >
            {lastStep ? "完成" : "继续"}
          </button>
        </div>
      </footer>
    </section>
  );
}
