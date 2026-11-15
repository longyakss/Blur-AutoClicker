import "./UiScaleControl.css";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  UI_SCALE_DEFAULT,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
} from "../settingsSchema";
import { formatUiScale, stepUiScale } from "../uiScale";

interface Props {
  scale: number;
  onChange: (next: number) => void;
  className?: string;
}

const STEP_HINT = "每次点击 10%，按住 Shift 为 25%，Ctrl+Shift 为 50%";

export default function UiScaleControl({ scale, onChange, className }: Props) {
  const adjust = (direction: 1 | -1) => (event: ReactMouseEvent) => {
    onChange(
      stepUiScale(scale, direction, {
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
      }),
    );
  };

  return (
    <div className={className ? `ui-scale ${className}` : "ui-scale"}>
      <button
        type="button"
        className="ui-scale-btn"
        onClick={adjust(-1)}
        disabled={scale <= UI_SCALE_MIN}
        title={`缩小：${STEP_HINT}`}
        aria-label="减小界面缩放"
      >
        &minus;
      </button>
      <button
        type="button"
        className="ui-scale-value"
        onClick={() => onChange(UI_SCALE_DEFAULT)}
        title={`界面缩放：${STEP_HINT}。点击重置为 100%。`}
        aria-label={`界面缩放 ${formatUiScale(scale)}。重置为 100%`}
      >
        {formatUiScale(scale)}
      </button>
      <button
        type="button"
        className="ui-scale-btn"
        onClick={adjust(1)}
        disabled={scale >= UI_SCALE_MAX}
        title={`放大：${STEP_HINT}`}
        aria-label="增大界面缩放"
      >
        +
      </button>
    </div>
  );
}
