import { PropsWithChildren } from "react";

import Arr from "../utils/arrays";
import clamp from "../utils/clamp";

export type ProgressCircleProps = {
  value: number;
  startValue?: number;
  minValue?: number;
  maxValue?: number;

  width?: string | number;
  height?: string | number;
  showPercent?: boolean;

  className?: string;
  style?: React.CSSProperties;
};

export default function ProgressCircle({
  value,
  startValue,
  minValue = 0.0,
  maxValue = 1.0,
  width = "100px",
  height = width,
  showPercent,
  className,
  style,
  children,
}: PropsWithChildren<ProgressCircleProps>) {
  const pct = clamp((value - minValue) / (maxValue - minValue));
  const startAngle =
    (clamp(((startValue ?? 0) - minValue) / (maxValue - minValue)) - 0.25) *
    (2 * Math.PI);
  const endAngle = startAngle + pct * 2 * Math.PI;

  return (
    <div
      className={Arr.className("progress-circle", className)}
      style={{ minWidth: width, minHeight: height, ...style }}
    >
      <div className="children">
        {showPercent && <span>{Math.floor(100 * pct)}%</span>}
        {children}
      </div>
      <svg viewBox="-55 -55 110 110" width={width} height={height}>
        <path
          className="secondary"
          d="M50,0 A50,50 0 1,1 -50,0 A50,50 0 1,1 50,0"
        />
        <path
          className="primary"
          d={`
            M ${50 * Math.cos(startAngle)} ${50 * Math.sin(startAngle)}
            A 50 50 0 ${pct <= 0.5 ? 0 : 1} 1
            ${50 * Math.cos(endAngle)} ${50 * Math.sin(endAngle)}
          `}
        />
      </svg>
    </div>
  );
}
