import type { Settings } from "../../../../store";

import { SETTINGS_LIMITS } from "../../../../settingsSchema";
import {
  Disableable,
  NumInput,
  ToggleBtn,
  CardDivider,
} from "../../advanced/sections/shared";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  showInfo: boolean;
}

const CORNER_KEYS = {
  tl: "cornerStopTL",
  tr: "cornerStopTR",
  bl: "cornerStopBL",
  br: "cornerStopBR",
} as const;

const EDGE_KEYS = {
  top: "edgeStopTop",
  right: "edgeStopRight",
  left: "edgeStopLeft",
  bottom: "edgeStopBottom",
} as const;

export default function FailsafeSection({ settings, update }: Props) {
  return (
    <>
      <div className="adv-sectioncontainer">
        <div className="adv-card-header">
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span className="adv-card-title">角落停止</span>
          </div>
          <ToggleBtn
            value={settings.cornerStopEnabled}
            onChange={(v) => update({ cornerStopEnabled: v })}
          />
        </div>
        <CardDivider />
        <div className="adv-card-desc">
          当光标进入显示器角落时停止连点器。每个数值设置角落区域的大小（像素）。
        </div>
        <Disableable
          enabled={settings.cornerStopEnabled}
          disabledReason="启用角落停止后才能更改角落大小。"
        >
          <div className="adv-row" style={{ gap: 8 }}>
            <div className="adv-corner-grid">
              {(["tl", "tr", "bl", "br"] as const).map((cornerKey) => (
                <div
                  key={cornerKey}
                  className="adv-corner-box adv-stop-boundary-box"
                >
                  <div className={`adv-arc adv-arc-${cornerKey}`} />
                  <NumInput
                    value={settings[CORNER_KEYS[cornerKey]]}
                    onChange={(v) => update({ [CORNER_KEYS[cornerKey]]: v })}
                    min={SETTINGS_LIMITS.stopBoundary.min}
                    max={SETTINGS_LIMITS.stopBoundary.max}
                    hoverWheel={false}
                    style={{ width: "74px", textAlign: "right" }}
                  />
                  <span className="adv-unit">px</span>
                </div>
              ))}
            </div>
          </div>
        </Disableable>
      </div>

      <div className="adv-sectioncontainer">
        <div className="adv-card-header">
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span className="adv-card-title">边缘停止</span>
          </div>
          <ToggleBtn
            value={settings.edgeStopEnabled}
            onChange={(v) => update({ edgeStopEnabled: v })}
          />
        </div>
        <CardDivider />
        <div className="adv-card-desc">
          当光标到达显示器边缘时停止连点器。每个数值设置边缘条带的宽度（像素）。
        </div>
        <Disableable
          enabled={settings.edgeStopEnabled}
          disabledReason="启用边缘停止后才能更改边缘宽度。"
        >
          <div className="adv-row" style={{ gap: 8 }}>
            <div className="adv-corner-grid">
              {(["top", "right", "left", "bottom"] as const).map((edgeSide) => (
                <div
                  key={edgeSide}
                  className="adv-corner-box adv-stop-boundary-box"
                >
                  <div className={`adv-edge-bar adv-edge-bar-${edgeSide}`} />
                  <NumInput
                    value={settings[EDGE_KEYS[edgeSide]]}
                    onChange={(v) => update({ [EDGE_KEYS[edgeSide]]: v })}
                    min={SETTINGS_LIMITS.stopBoundary.min}
                    max={SETTINGS_LIMITS.stopBoundary.max}
                    hoverWheel={false}
                    style={{ width: "74px", textAlign: "right" }}
                  />
                  <span className="adv-unit">px</span>
                </div>
              ))}
            </div>
          </div>
        </Disableable>
      </div>
    </>
  );
}
