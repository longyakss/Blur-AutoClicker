import { memo, useCallback, type CSSProperties } from "react";
import {
  INDICATOR_BACKGROUND_MODE_OPTIONS,
  INDICATOR_COLOR_MODE_OPTIONS,
  INDICATOR_COUNTDOWN_MODE_OPTIONS,
  INDICATOR_CORNER_OPTIONS,
} from "../../../../settingsSchema";
import type {
  IndicatorBackgroundMode,
  IndicatorColorMode,
  IndicatorCorner,
  IndicatorCountdownMode,
} from "../../../../settingsSchema";
import type { Settings } from "../../../../store";
import { AdvDropdown, NumInput } from "../../advanced/sections/shared";
import ColorPicker from "../../../ColorPicker";
import { SettingsCard } from "./shared";

const INDICATOR_CORNER_LABELS: Record<IndicatorCorner, string> = {
  "top-right": "右上",
  "top-left": "左上",
  "bottom-right": "右下",
  "bottom-left": "左下",
};

const INDICATOR_COLOR_MODE_LABELS: Record<IndicatorColorMode, string> = {
  theme: "主题",
  black: "黑色",
  white: "白色",
  custom: "自定义",
};

const INDICATOR_COUNTDOWN_LABELS: Record<IndicatorCountdownMode, string> = {
  plain: "时间",
  short: "按/等",
  words: "按住/等待",
};

const INDICATOR_BACKGROUND_LABELS: Record<IndicatorBackgroundMode, string> = {
  off: "无",
  card: "卡片",
  shadow: "阴影",
};

const INDICATOR_CORNER_DROPDOWN_OPTIONS = INDICATOR_CORNER_OPTIONS.map(
  (value) => ({ value, label: INDICATOR_CORNER_LABELS[value] }),
);

const INDICATOR_UNIT_ROW_STYLE: CSSProperties = { gap: "0.25rem" };
const INDICATOR_UNIT_STYLE: CSSProperties = {
  minWidth: "0.5rem",
  textAlign: "left",
};
const INDICATOR_INPUT_STYLE: CSSProperties = {
  width: "6ch",
  textAlign: "right",
};
const INDICATOR_DIM_INPUT_STYLE: CSSProperties = {
  width: "4ch",
  textAlign: "right",
};

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

export default memo(function OverlaySection({ settings, update }: Props) {
  const indicatorEnabled = settings.indicatorEnabled;
  const indicatorRowClass = indicatorEnabled
    ? "settings-row"
    : "settings-row settings-row--disabled";

  const patchIndicator = useCallback(
    (patch: Partial<Settings>) => update(patch),
    [update],
  );

  const handleIndicatorToggle = useCallback(
    () => patchIndicator({ indicatorEnabled: !indicatorEnabled }),
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorCornerChange = useCallback(
    (value: string) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorCorner: value as IndicatorCorner });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorColorModeChange = useCallback(
    (mode: IndicatorColorMode) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorColorMode: mode });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorCustomColorChange = useCallback(
    (nextColor: string) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorCustomColor: nextColor });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorSizeChange = useCallback(
    (value: number) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorSize: value });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorOffsetXChange = useCallback(
    (value: number) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorOffsetX: value });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorOffsetYChange = useCallback(
    (value: number) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorOffsetY: value });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorFlashToggle = useCallback(() => {
    if (!indicatorEnabled) return;
    patchIndicator({ indicatorFlashEnabled: !settings.indicatorFlashEnabled });
  }, [patchIndicator, indicatorEnabled, settings.indicatorFlashEnabled]);

  const handleIndicatorFlashDimChange = useCallback(
    (value: number) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorFlashDim: value });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorCountdownToggle = useCallback(() => {
    if (!indicatorEnabled) return;
    patchIndicator({
      indicatorCountdownEnabled: !settings.indicatorCountdownEnabled,
    });
  }, [patchIndicator, indicatorEnabled, settings.indicatorCountdownEnabled]);

  const handleIndicatorCountdownMode = useCallback(
    (mode: IndicatorCountdownMode) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorCountdownMode: mode });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorBackgroundMode = useCallback(
    (mode: IndicatorBackgroundMode) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorBackgroundMode: mode });
    },
    [patchIndicator, indicatorEnabled],
  );

  const handleIndicatorBackgroundStrength = useCallback(
    (value: number) => {
      if (!indicatorEnabled) return;
      patchIndicator({ indicatorBackgroundStrength: value });
    },
    [patchIndicator, indicatorEnabled],
  );

  return (
    <SettingsCard
      title="点击指示器"
      description="连点器运行时在屏幕角落显示一个符号。"
    >
      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">连点时显示</span>
          <span className="settings-sublabel">
            会话开始时出现，停止时隐藏。
          </span>
        </div>
        <div className="settings-toggle-wrapper">
          <button
            className={`settings-toggle ${indicatorEnabled ? "on" : "off"}`}
            onClick={handleIndicatorToggle}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
      </div>

      <div className={indicatorRowClass}>
        <div className="settings-label-group">
          <span className="settings-label">位置</span>
          <span className="settings-sublabel">
            正在点击的显示器的一角。
          </span>
        </div>
        <AdvDropdown
          value={settings.indicatorCorner}
          options={INDICATOR_CORNER_DROPDOWN_OPTIONS}
          onChange={handleIndicatorCornerChange}
          allowWindowOverflow
        />
      </div>

      <div className={indicatorRowClass}>
        <div className="settings-label-group">
          <span className="settings-label">颜色</span>
          <span className="settings-sublabel">
            “主题”选项会跟随你的强调色。
          </span>
        </div>
        <div className="settings-seg-group">
          {INDICATOR_COLOR_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              className={`settings-seg-btn ${settings.indicatorColorMode === mode ? "active" : ""}`}
              onClick={() => handleIndicatorColorModeChange(mode)}
            >
              {INDICATOR_COLOR_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {settings.indicatorColorMode === "custom" && (
        <div className={indicatorRowClass}>
          <div className="settings-label-group">
            <span className="settings-label">自定义颜色</span>
            <span className="settings-sublabel">
              用来替代强调色。
            </span>
          </div>
          <div className="settings-color-controls">
            <ColorPicker
              value={settings.indicatorCustomColor}
              onChange={handleIndicatorCustomColorChange}
              label="指示器自定义颜色"
            />
            <span className="settings-value settings-value--mono">
              {settings.indicatorCustomColor.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      <div className={indicatorRowClass}>
        <div className="settings-label-group">
          <span className="settings-label">大小</span>
          <span className="settings-sublabel">符号大小（像素）。</span>
        </div>
        <div className="adv-numbox-sm" style={INDICATOR_UNIT_ROW_STYLE}>
          <span className="adv-unit" style={INDICATOR_UNIT_STYLE}>
            px
          </span>
          <NumInput
            hoverWheel={false}
            value={settings.indicatorSize}
            min={16}
            max={512}
            onChange={handleIndicatorSizeChange}
            style={INDICATOR_INPUT_STYLE}
          />
        </div>
      </div>

      <div className={indicatorRowClass}>
        <div className="settings-label-group">
          <span className="settings-label">距边缘距离 X</span>
          <span className="settings-sublabel">
            与最近一边的水平距离。
          </span>
        </div>
        <div className="adv-numbox-sm" style={INDICATOR_UNIT_ROW_STYLE}>
          <span className="adv-unit" style={INDICATOR_UNIT_STYLE}>
            px
          </span>
          <NumInput
            hoverWheel={false}
            value={settings.indicatorOffsetX}
            min={0}
            max={4000}
            onChange={handleIndicatorOffsetXChange}
            style={INDICATOR_INPUT_STYLE}
          />
        </div>
      </div>

      <div className={indicatorRowClass}>
        <div className="settings-label-group">
          <span className="settings-label">距边缘距离 Y</span>
          <span className="settings-sublabel">
            与最近一边的垂直距离。
          </span>
        </div>
        <div className="adv-numbox-sm" style={INDICATOR_UNIT_ROW_STYLE}>
          <span className="adv-unit" style={INDICATOR_UNIT_STYLE}>
            px
          </span>
          <NumInput
            hoverWheel={false}
            value={settings.indicatorOffsetY}
            min={0}
            max={4000}
            onChange={handleIndicatorOffsetYChange}
            style={INDICATOR_INPUT_STYLE}
          />
        </div>
      </div>

      <div className={indicatorRowClass}>
        <div className="settings-label-group">
          <span className="settings-label">点击时闪烁</span>
          <span className="settings-sublabel">
            按住期间变亮，之后保持较暗。
          </span>
        </div>
        <div className="settings-toggle-wrapper">
          <button
            className={`settings-toggle ${settings.indicatorFlashEnabled ? "on" : "off"}`}
            onClick={handleIndicatorFlashToggle}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
      </div>

      {settings.indicatorFlashEnabled && (
        <div className={indicatorRowClass}>
          <div className="settings-label-group">
            <span className="settings-label">闪烁暗度</span>
            <span className="settings-sublabel">
              点击间隙保持变暗的程度（%）。
            </span>
          </div>
          <div className="adv-numbox-sm" style={INDICATOR_UNIT_ROW_STYLE}>
            <span className="adv-unit" style={INDICATOR_UNIT_STYLE}>
              %
            </span>
            <NumInput
              hoverWheel={false}
              value={settings.indicatorFlashDim}
              min={0}
              max={100}
              onChange={handleIndicatorFlashDimChange}
              style={INDICATOR_DIM_INPUT_STYLE}
            />
          </div>
        </div>
      )}

      <div className={indicatorRowClass}>
        <div className="settings-label-group">
          <span className="settings-label">点击倒计时</span>
          <span className="settings-sublabel">
            在符号下方显示按住或等待时间。
          </span>
        </div>
        <div className="settings-toggle-wrapper">
          <button
            className={`settings-toggle ${settings.indicatorCountdownEnabled ? "on" : "off"}`}
            onClick={handleIndicatorCountdownToggle}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
      </div>

      {settings.indicatorCountdownEnabled && (
        <div className={indicatorRowClass}>
          <div className="settings-label-group">
            <span className="settings-label">倒计时文本</span>
            <span className="settings-sublabel">
              显示阶段名称、缩写或仅显示时间。
            </span>
          </div>
          <div className="settings-seg-group">
            {INDICATOR_COUNTDOWN_MODE_OPTIONS.map((mode) => (
              <button
                key={mode}
                className={`settings-seg-btn ${settings.indicatorCountdownMode === mode ? "active" : ""}`}
                onClick={() => handleIndicatorCountdownMode(mode)}
              >
                {INDICATOR_COUNTDOWN_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={indicatorRowClass}>
        <div className="settings-label-group">
          <span className="settings-label">背景</span>
          <span className="settings-sublabel">
            符号背后的卡片，或围绕符号的阴影。
          </span>
        </div>
        <div className="settings-seg-group">
          {INDICATOR_BACKGROUND_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              className={`settings-seg-btn ${settings.indicatorBackgroundMode === mode ? "active" : ""}`}
              onClick={() => handleIndicatorBackgroundMode(mode)}
            >
              {INDICATOR_BACKGROUND_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {settings.indicatorBackgroundMode !== "off" && (
        <div className={indicatorRowClass}>
          <div className="settings-label-group">
            <span className="settings-label">背景强度</span>
            <span className="settings-sublabel">
              卡片或阴影的强度（%）。
            </span>
          </div>
          <div className="adv-numbox-sm" style={INDICATOR_UNIT_ROW_STYLE}>
            <span className="adv-unit" style={INDICATOR_UNIT_STYLE}>
              %
            </span>
            <NumInput
              hoverWheel={false}
              value={settings.indicatorBackgroundStrength}
              min={0}
              max={100}
              onChange={handleIndicatorBackgroundStrength}
              style={INDICATOR_DIM_INPUT_STYLE}
            />
          </div>
        </div>
      )}
    </SettingsCard>
  );
});
