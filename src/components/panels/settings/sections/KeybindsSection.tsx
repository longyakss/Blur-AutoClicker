import { memo, useCallback, useMemo } from "react";
import type { Settings } from "../../../../store";
import KeyCaptureInput from "../../../KeyCaptureInput";
import { SettingsCard } from "./shared";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const PAGES = [
  { key: "keybindSimple" as const, label: "简易" },
  { key: "keybindAdvanced" as const, label: "高级" },
  { key: "keybindZones" as const, label: "区域" },
  { key: "keybindClickPoints" as const, label: "点击点" },
  { key: "keybindSettings" as const, label: "设置" },
];

const TOGGLE_GROUPS: {
  title: string;
  items: { key: keyof Settings; label: string; sublabel: string }[];
}[] = [
  {
    title: "高级",
    items: [
      {
        key: "keybindMode",
        label: "点击模式",
        sublabel: "在“切换/按住”之间循环切换。",
      },
      {
        key: "keybindInputType",
        label: "输入类型",
        sublabel: "在“鼠标/键盘”之间循环切换。",
      },
      {
        key: "keybindDoubleClick",
        label: "双击",
        sublabel: "开启或关闭双击。",
      },
      {
        key: "keybindDutyCycleMode",
        label: "占空比",
        sublabel: "在“点击/按住”之间循环切换。",
      },
      {
        key: "keybindSpeedRandomization",
        label: "速度随机化",
        sublabel: "开启或关闭速度随机化。",
      },
      {
        key: "keybindLimits",
        label: "限制",
        sublabel: "开启或关闭生效的点击/时间限制。",
      },
    ],
  },
  {
    title: "区域",
    items: [
      {
        key: "keybindCornerStop",
        label: "角落停止",
        sublabel: "开启或关闭角落停止。",
      },
      {
        key: "keybindEdgeStop",
        label: "边缘停止",
        sublabel: "开启或关闭边缘停止。",
      },
      {
        key: "keybindStopZones",
        label: "自定义停止区域",
        sublabel: "开启或关闭自定义停止区域。",
      },
    ],
  },
  {
    title: "点击点",
    items: [
      {
        key: "keybindToggleClickPoints",
        label: "点击点",
        sublabel: "开启或关闭点击点。",
      },
      {
        key: "keybindStopWhenComplete",
        label: "完成后停止",
        sublabel: "开启或关闭完成后停止。",
      },
    ],
  },
];

interface KeybindRowProps {
  label: string;
  sublabel: string;
  value: string;
  onChange: (key: string) => void;
}

const KeybindRow = memo(function KeybindRow({
  label,
  sublabel,
  value,
  onChange,
}: KeybindRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-label-group">
        <span className="settings-label">{label}</span>
        <span className="settings-sublabel">{sublabel}</span>
      </div>
      <KeyCaptureInput
        className="settings-keybind-capture"
        value={value}
        onChange={onChange}
      />
    </div>
  );
});

export default function KeybindsSection({ settings, update }: Props) {
  const handleMasterKeyChange = useCallback(
    (key: string) => update({ keybindMaster: key }),
    [update],
  );

  const handleMasterModeToggle = useCallback(
    () => update({ masterKeybindMode: "toggle" }),
    [update],
  );

  const handleMasterModeHold = useCallback(
    () => update({ masterKeybindMode: "hold" }),
    [update],
  );

  const pageHandlers = useMemo(
    () =>
      Object.fromEntries(
        PAGES.map((page) => [
          page.key,
          (key: string) => update({ [page.key]: key }),
        ]),
      ) as Record<(typeof PAGES)[number]["key"], (key: string) => void>,
    [update],
  );

  const toggleHandlers = useMemo(() => {
    const handlers = {} as Record<string, (key: string) => void>;
    for (const group of TOGGLE_GROUPS) {
      for (const item of group.items) {
        handlers[item.key] = (key: string) => update({ [item.key]: key });
      }
    }
    return handlers;
  }, [update]);
  return (
    <>
      <SettingsCard
        title="总开关"
        description="一个可在 Windows 任意位置开启或关闭连点的按键。留空表示始终允许连点。"
      >
        <KeybindRow
          label="主快捷键"
          sublabel="开启或关闭连点的按键。"
          value={settings.keybindMaster}
          onChange={handleMasterKeyChange}
        />
        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-label">主快捷键模式</span>
            <span className="settings-sublabel">
              “切换”为按一下即切换；“按住”则仅在按住时允许连点。
            </span>
          </div>
          <div className="settings-seg-group">
            <button
              type="button"
              className={`settings-seg-btn ${settings.masterKeybindMode === "toggle" ? "active" : ""}`}
              onClick={handleMasterModeToggle}
            >
              切换
            </button>
            <button
              type="button"
              className={`settings-seg-btn ${settings.masterKeybindMode === "hold" ? "active" : ""}`}
              onClick={handleMasterModeHold}
            >
              按住
            </button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="按键绑定"
        description="为每个页面设置键盘快捷键。按下想要绑定的按键即可。"
      >
        {PAGES.map((page) => (
          <KeybindRow
            key={page.key}
            label={page.label}
            sublabel={`切换到${page.label}页面。`}
            value={settings[page.key]}
            onChange={pageHandlers[page.key]}
          />
        ))}
      </SettingsCard>

      {TOGGLE_GROUPS.map((group) => (
        <SettingsCard
          key={group.title}
          title={`${group.title}切换快捷键`}
          description="绑定一个按键，可在应用任意位置切换对应设置。默认留空。"
        >
          {group.items.map((item) => (
            <KeybindRow
              key={item.key}
              label={item.label}
              sublabel={item.sublabel}
              value={settings[item.key] as string}
              onChange={toggleHandlers[item.key]}
            />
          ))}
        </SettingsCard>
      ))}
    </>
  );
}
