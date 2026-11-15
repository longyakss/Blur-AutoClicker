import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { logDiagnostic } from "../../../../diagnostics";
import { open } from "@tauri-apps/plugin-dialog";
import { applyAccentTheme } from "../../../../accentTheme";
import { themeBaseOf } from "../../../../themeModel";
import {
  getExtension,
  IMAGE_EXTENSIONS,
  isLegacyVideoExtension,
  PLAYABLE_VIDEO_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "../../../../backgroundMedia";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_FONT_FAMILY,
  DEFAULT_TITLE_FONT,
} from "../../../../settingsSchema";
import type { IconColor, IconTheme } from "../../../../settingsSchema";
import type { Settings } from "../../../../store";
import ColorPicker from "../../../ColorPicker";
import UiScaleControl from "../../../UiScaleControl";
import { AdvDropdown } from "../../advanced/sections/shared";
import { SettingsCard } from "./shared";

const MEDIA_FILTERS = [
  {
    name: "所有媒体",
    extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS] as string[],
  },
  {
    name: "图片",
    extensions: [...IMAGE_EXTENSIONS] as string[],
  },
  {
    name: "视频（稳定）",
    extensions: [...PLAYABLE_VIDEO_EXTENSIONS] as string[],
  },
];

const PAGES = [
  { suffix: "Simple", label: "简易页面" },
  { suffix: "Advanced", label: "高级页面" },
  { suffix: "Zones", label: "区域页面" },
  { suffix: "ClickPoints", label: "点击点页面" },
  { suffix: "Settings", label: "设置页面" },
] as const;

const THEME_SEG_OPTIONS = ["dark", "light", "custom"] as const;
const ICON_THEME_SEG_OPTIONS: IconTheme[] = ["auto", "dark", "light"];
const ICON_COLOR_SEG_OPTIONS: IconColor[] = ["theme", "default"];

const LEGACY_WARNING_ROW_STYLE: CSSProperties = { marginTop: "-0.5rem" };
const LEGACY_WARNING_TEXT_STYLE: CSSProperties = {
  color: "var(--accent-yellow)",
};

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onOpenCustomizer: () => void;
}

const PageAppearanceControls = memo(function PageAppearanceControls({
  settings,
  update,
  suffix,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  suffix: string;
}) {
  const bgImageKey = `backgroundImage${suffix}` as keyof Settings;
  const bgOpacityKey = `backgroundOpacity${suffix}` as keyof Settings;
  const winOpacityKey = `windowOpacity${suffix}` as keyof Settings;
  const panelOpacityKey = `panelOpacity${suffix}` as keyof Settings;
  const panelBlurKey = `panelBlur${suffix}` as keyof Settings;
  const bgBlurKey = `backgroundBlur${suffix}` as keyof Settings;

  const bgImage = settings[bgImageKey] as string;
  const bgOpacity = settings[bgOpacityKey] as number;
  const winOpacity = settings[winOpacityKey] as number;
  const panelOpacity = settings[panelOpacityKey] as number;
  const panelBlur = settings[panelBlurKey] as number;
  const bgBlur = settings[bgBlurKey] as number;

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await open({ multiple: false, filters: MEDIA_FILTERS });
      if (selected) {
        update({ [bgImageKey]: selected as string });
      }
    } catch (err) {
      logDiagnostic("SettingsPanel.pickImage", {
        error: String(err),
      });
    }
  }, [bgImageKey, update]);

  const handleBgImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [bgImageKey]: e.target.value }),
    [bgImageKey, update],
  );

  const handleRemoveBgImage = useCallback(
    () => update({ [bgImageKey]: "" }),
    [bgImageKey, update],
  );

  const handleWinOpacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [winOpacityKey]: Number(e.target.value) }),
    [winOpacityKey, update],
  );

  const handleBgOpacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [bgOpacityKey]: Number(e.target.value) }),
    [bgOpacityKey, update],
  );

  const handlePanelOpacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [panelOpacityKey]: Number(e.target.value) }),
    [panelOpacityKey, update],
  );

  const handleBgBlurChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [bgBlurKey]: Number(e.target.value) }),
    [bgBlurKey, update],
  );

  const handlePanelBlurChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [panelBlurKey]: Number(e.target.value) }),
    [panelBlurKey, update],
  );

  const legacyVideoWarning = useMemo(() => {
    const ext = getExtension(bgImage);
    if (!isLegacyVideoExtension(ext)) return null;
    return (
      <div className="settings-row" style={LEGACY_WARNING_ROW_STYLE}>
        <span className="settings-sublabel" style={LEGACY_WARNING_TEXT_STYLE}>
          MOV/M4V/AVI/MKV 常常无法播放。如果视频一直黑屏，请将其转换为 mp4。
        </span>
      </div>
    );
  }, [bgImage]);

  return (
    <>
      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">背景媒体</span>
          <span className="settings-sublabel">
            图片或视频的路径或 URL。视频将静音循环播放。
          </span>
        </div>
        <div className="settings-bg-image-row">
          <input
            className="settings-bg-input"
            type="text"
            value={bgImage}
            onChange={handleBgImageChange}
            placeholder="https://example.com/image.png 或 C:\Videos\loop.mp4"
          />
          <div className="settings-bg-buttons">
            <button className="settings-btn-secondary" onClick={handleBrowse}>
              浏览
            </button>
            <button
              className="settings-btn-danger settings-btn-danger--compact"
              onClick={handleRemoveBgImage}
              disabled={!bgImage}
            >
              移除
            </button>
          </div>
        </div>
        {legacyVideoWarning}
      </div>

      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">背景不透明度</span>
          <span className="settings-sublabel">
            桌面透过窗口显示出来的程度。
          </span>
        </div>
        <div className="settings-opacity-controls">
          <input
            type="range"
            className="settings-opacity-slider"
            min="0"
            max="100"
            value={winOpacity}
            onChange={handleWinOpacityChange}
          />
          <span className="settings-slider-value">{winOpacity}%</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">背景媒体不透明度</span>
          <span className="settings-sublabel">
            面板后方图片或视频的淡化程度。
          </span>
        </div>
        <div className="settings-opacity-controls">
          <input
            type="range"
            className="settings-opacity-slider"
            min="0"
            max="100"
            value={bgOpacity}
            disabled={!bgImage}
            onChange={handleBgOpacityChange}
          />
          <span className="settings-slider-value">{bgOpacity}%</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">面板不透明度</span>
          <span className="settings-sublabel">
            面板、卡片和输入框的淡化程度。
          </span>
        </div>
        <div className="settings-opacity-controls">
          <input
            type="range"
            className="settings-opacity-slider"
            min="0"
            max="100"
            value={panelOpacity}
            onChange={handlePanelOpacityChange}
          />
          <span className="settings-slider-value">{panelOpacity}%</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">背景模糊</span>
          <span className="settings-sublabel">
            模糊图片或视频本身。
          </span>
        </div>
        <div className="settings-opacity-controls">
          <input
            type="range"
            className="settings-opacity-slider"
            min="0"
            max="20"
            value={bgBlur}
            disabled={!bgImage}
            onChange={handleBgBlurChange}
          />
          <span className="settings-slider-value">{bgBlur}px</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">面板模糊</span>
          <span className="settings-sublabel">
            模糊面板背后的内容。
          </span>
        </div>
        <div className="settings-opacity-controls">
          <input
            type="range"
            className="settings-opacity-slider"
            min="0"
            max="20"
            value={panelBlur}
            onChange={handlePanelBlurChange}
          />
          <span className="settings-slider-value">{panelBlur}px</span>
        </div>
      </div>
    </>
  );
});

let fontFamiliesPromise: Promise<string[] | null> | null = null;

function loadFontFamilies(): Promise<string[] | null> {
  if (!fontFamiliesPromise) {
    fontFamiliesPromise = invoke<string[]>("list_font_families").catch(
      (err) => {
        logDiagnostic("AppearanceSection.loadFontFamilies", {
          error: String(err),
        });
        fontFamiliesPromise = null;
        return null;
      },
    );
  }
  return fontFamiliesPromise;
}

const FontPicker = memo(function FontPicker({
  value,
  fallback,
  onChange,
}: {
  value: string;
  fallback: string;
  onChange: (next: string) => void;
}) {
  const [families, setFamilies] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadFontFamilies().then((list) => {
      if (alive) setFamilies(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const options = useMemo(() => {
    const installed = families ?? [];
    const entries = [{ value: fallback, label: "默认" }];
    if (value !== fallback && !installed.includes(value)) {
      entries.push({
        value,
        label: `${value}（未安装）`,
      });
    }
    for (const family of installed) {
      if (family !== fallback) {
        entries.push({ value: family, label: family });
      }
    }
    return entries;
  }, [families, fallback, value]);

  return (
    <>
      <div className="font-dropdown">
        <AdvDropdown
          value={value}
          options={options}
          onChange={onChange}
          searchable
          hoverWheel={false}
        />
      </div>
      {value !== fallback && (
        <button
          type="button"
          className="settings-btn-secondary font-reset-btn"
          onClick={() => onChange(fallback)}
          aria-label="重置字体"
          title="重置为默认字体"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-rotate-ccw"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      )}
    </>
  );
});

const ThemeAccentCard = memo(function ThemeAccentCard({
  settings,
  update,
  onOpenCustomizer,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onOpenCustomizer: () => void;
}) {
  const theme = settings.theme;
  const activeProfile = useMemo(
    () =>
      settings.themeProfiles.find(
        (profile) => profile.id === settings.activeThemeProfileId,
      ) ?? null,
    [settings.activeThemeProfileId, settings.themeProfiles],
  );
  const accentColor =
    theme === "custom" && activeProfile
      ? activeProfile.tokens.accent.hex
      : settings.accentColor;
  const accentDisabled = theme === "custom";

  const handleThemeSelect = useCallback(
    (next: Settings["theme"]) => {
      if (next !== "custom") {
        update({ theme: next });
        return;
      }

      const profiles = settings.themeProfiles;
      if (profiles.length === 0) {
        onOpenCustomizer();
        return;
      }

      const activeThemeProfileId = profiles.some(
        (profile) => profile.id === settings.activeThemeProfileId,
      )
        ? settings.activeThemeProfileId
        : profiles[0].id;
      update({ theme: "custom", activeThemeProfileId });
    },
    [
      onOpenCustomizer,
      settings.activeThemeProfileId,
      settings.themeProfiles,
      update,
    ],
  );

  const handleAccentChange = useCallback(
    (nextColor: string) => update({ accentColor: nextColor }),
    [update],
  );

  const handleAccentPreview = useCallback(
    (nextColor: string) => {
      const base = themeBaseOf(theme, activeProfile);
      applyAccentTheme(nextColor, base);
      const root = document.querySelector<HTMLElement>(".app-root");
      if (root) applyAccentTheme(nextColor, base, root);
    },
    [activeProfile, theme],
  );

  const handleAccentReset = useCallback(
    () => update({ accentColor: DEFAULT_ACCENT_COLOR }),
    [update],
  );

  return (
    <SettingsCard title="主题与强调色" description="应用于所有页面。">
      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">主题</span>
          <span className="settings-sublabel">
            深色、浅色或自定义主题。
          </span>
        </div>
        <div className="settings-row-actions">
          <div className="settings-seg-group settings-seg-group--theme">
            {THEME_SEG_OPTIONS.map((option) => (
              <button
                key={option}
                className={`settings-seg-btn settings-seg-btn--${option} ${theme === option ? "active" : ""}`}
                onClick={() => handleThemeSelect(option)}
              >
                {option === "dark"
                  ? "深色"
                  : option === "light"
                    ? "浅色"
                    : "自定义"}
              </button>
            ))}
          </div>
          {theme === "custom" && settings.themeProfiles.length > 0 && (
            <button
              type="button"
              className="settings-btn-secondary settings-btn-icon"
              aria-label="编辑自定义主题"
              title="编辑自定义主题"
              onClick={onOpenCustomizer}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">强调色</span>
          <span className="settings-sublabel">
            {accentDisabled
              ? "属于你当前使用的自定义主题。"
              : "开关、滑块和活动标签页的颜色。"}
          </span>
        </div>
        <div
          className={`settings-color-controls${accentDisabled ? " settings-color-controls--disabled" : ""}`}
          aria-disabled={accentDisabled || undefined}
          inert={accentDisabled}
        >
          <ColorPicker
            value={accentColor}
            onChange={handleAccentChange}
            onPreview={handleAccentPreview}
            label="强调色"
          />
          <span className="settings-value settings-value--mono">
            {accentColor.toUpperCase()}
          </span>
          <button
            className="settings-btn-secondary"
            onClick={handleAccentReset}
            disabled={accentDisabled || accentColor === DEFAULT_ACCENT_COLOR}
          >
            重置
          </button>
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-label-group">
          <span className="settings-label">应用字体</span>
          <span className="settings-sublabel">
            可使用本机上的任意字体，但部分字体可能破坏布局。
          </span>
        </div>
        <div className="settings-row-actions">
          <FontPicker
            value={settings.fontFamily}
            fallback={DEFAULT_FONT_FAMILY}
            onChange={(next) => update({ fontFamily: next })}
          />
        </div>
      </div>
    </SettingsCard>
  );
});

export default function AppearanceSection({
  settings,
  update,
  onOpenCustomizer,
}: Props) {
  const isPerPage = settings.perPageAppearance;

  const handleModeChange = useCallback(
    (individual: boolean) => update({ perPageAppearance: individual }),
    [update],
  );

  const handleTaskbarIconToggle = useCallback(
    () => update({ taskbarIconEnabled: !settings.taskbarIconEnabled }),
    [update, settings.taskbarIconEnabled],
  );

  const handleIconThemeSelect = useCallback(
    (opt: IconTheme) => update({ taskbarIconTheme: opt }),
    [update],
  );

  const handleIconColorSelect = useCallback(
    (opt: IconColor) => {
      if (settings.taskbarIconEnabled) update({ taskbarIconColor: opt });
    },
    [update, settings.taskbarIconEnabled],
  );

  const handleStatusBarToggle = useCallback(
    () => update({ statusBarEnabled: !settings.statusBarEnabled }),
    [update, settings.statusBarEnabled],
  );

  const handleStatusBarPresetToggle = useCallback(
    () => update({ statusBarPresetEnabled: !settings.statusBarPresetEnabled }),
    [update, settings.statusBarPresetEnabled],
  );

  const handleStatusBarSoundToggle = useCallback(
    () => update({ statusBarSoundEnabled: !settings.statusBarSoundEnabled }),
    [update, settings.statusBarSoundEnabled],
  );

  const handleStatusBarScaleToggle = useCallback(
    () => update({ statusBarScaleEnabled: !settings.statusBarScaleEnabled }),
    [update, settings.statusBarScaleEnabled],
  );

  const handleUiScaleChange = useCallback(
    (next: number) => update({ uiScale: next }),
    [update],
  );

  const handleFancyTitleToggle = useCallback(
    () => update({ fancyTitle: !settings.fancyTitle }),
    [update, settings.fancyTitle],
  );

  const handleTitleFontChange = useCallback(
    (next: string) => update({ titleFont: next }),
    [update],
  );

  return (
    <>
      <ThemeAccentCard
        settings={settings}
        update={update}
        onOpenCustomizer={onOpenCustomizer}
      />

      <SettingsCard
        title="外观模式"
        description="所有页面使用同一风格，或逐页单独自定义。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">模式</span>
          </div>
          <div className="settings-seg-group">
            <button
              className={`settings-seg-btn ${!isPerPage ? "active" : ""}`}
              onClick={() => handleModeChange(false)}
            >
              全局
            </button>
            <button
              className={`settings-seg-btn ${isPerPage ? "active" : ""}`}
              onClick={() => handleModeChange(true)}
            >
              独立
            </button>
          </div>
        </div>
      </SettingsCard>

      {!isPerPage ? (
        <SettingsCard title="页面样式">
          <PageAppearanceControls
            settings={settings}
            update={update}
            suffix=""
          />
        </SettingsCard>
      ) : (
        PAGES.map((page) => (
          <section className="settings-card" key={page.suffix}>
            <span className="settings-page-header">{page.label}</span>
            <div className="settings-card-content">
              <PageAppearanceControls
                settings={settings}
                update={update}
                suffix={page.suffix}
              />
            </div>
          </section>
        ))
      )}

      <SettingsCard
        title="任务栏图标"
        description="更改任务栏和托盘中的图标。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">活动图标</span>
            <span className="settings-sublabel">
              连点时使用不同的图标。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.taskbarIconEnabled ? "on" : "off"}`}
              onClick={handleTaskbarIconToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">图标主题</span>
            <span className="settings-sublabel">
              自动跟随应用主题。
            </span>
          </div>
          <div className="settings-seg-group">
            {ICON_THEME_SEG_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`settings-seg-btn ${settings.taskbarIconTheme === opt ? "active" : ""}`}
                onClick={() => handleIconThemeSelect(opt)}
              >
                {opt === "auto" ? "自动" : opt === "dark" ? "深色" : "浅色"}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`settings-row ${!settings.taskbarIconEnabled ? "settings-row--disabled" : ""}`}
        >
          <div className="settings-label-group">
            <span className="settings-label">图标颜色</span>
            <span className="settings-sublabel">
              使用强调色为活动图标着色。
            </span>
          </div>
          <div className="settings-seg-group">
            {ICON_COLOR_SEG_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`settings-seg-btn ${settings.taskbarIconColor === opt ? "active" : ""}`}
                onClick={() => handleIconColorSelect(opt)}
              >
                {opt === "theme" ? "主题" : "默认"}
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="界面缩放"
        description="缩放整个窗口：文字、控件、间距以及窗口本身。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">缩放</span>
            <span className="settings-sublabel">
              同样的控件位于状态栏右下角。每次点击调整 10%，按住 Shift 为
              25%，按住 Ctrl+Shift 为 50%。点击数字可重置为 100%。
            </span>
          </div>
          <UiScaleControl
            scale={settings.uiScale}
            onChange={handleUiScaleChange}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="状态栏"
        description="在窗口底部显示状态栏。"
      >
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">启用</span>
            <span className="settings-sublabel">
              显示当前预设、版本和停止原因。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.statusBarEnabled ? "on" : "off"}`}
              onClick={handleStatusBarToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">预设名称</span>
            <span className="settings-sublabel">
              在状态栏左侧显示当前预设。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.statusBarPresetEnabled ? "on" : "off"}`}
              onClick={handleStatusBarPresetToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">声音图标</span>
            <span className="settings-sublabel">
              显示可静音所有声音的扬声器按钮。仅当“声音”页中至少开启一个声音时才会出现。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.statusBarSoundEnabled ? "on" : "off"}`}
              onClick={handleStatusBarSoundToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">界面缩放</span>
            <span className="settings-sublabel">
              在状态栏右侧显示缩放控件。缩放功能本身仍可在上方的“界面缩放”中使用。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.statusBarScaleEnabled ? "on" : "off"}`}
              onClick={handleStatusBarScaleToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="趣味">
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">花式标题</span>
            <span className="settings-sublabel">
              为窗口标题使用手写体字体。
            </span>
          </div>
          <div className="settings-toggle-wrapper">
            <button
              className={`settings-toggle ${settings.fancyTitle ? "on" : "off"}`}
              onClick={handleFancyTitleToggle}
            >
              <span className="settings-toggle-knob" />
            </button>
          </div>
        </div>
        {settings.fancyTitle && (
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">标题字体</span>
              <span className="settings-sublabel">
                默认为 Pristina，可使用任意已安装字体。
              </span>
            </div>
            <div className="settings-row-actions">
              <FontPicker
                value={settings.titleFont}
                fallback={DEFAULT_TITLE_FONT}
                onChange={handleTitleFontChange}
              />
            </div>
          </div>
        )}
      </SettingsCard>
    </>
  );
}
