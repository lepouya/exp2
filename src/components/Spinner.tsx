import { PropsWithChildren } from "react";

import Arr from "../utils/arrays";

export type SpinnerProps = {
  frames?: number;
  duration?: number;

  className?: string;
  style?: React.CSSProperties;
};

export default function Spinner({
  frames = 12,
  duration = 1,
  className,
  style,
  children,
}: PropsWithChildren<SpinnerProps>) {
  return (
    <svg
      className={Arr.className(["spinner", className])}
      style={style}
      width="128px"
      height="128px"
      viewBox="0 0 100 100"
    >
      {Array.from(Array(frames).keys()).map((num) => (
        <g transform={`rotate(${(num * 360) / frames} 50 50)`} key={`g-${num}`}>
          <rect
            x="47"
            y="24"
            rx="9.4"
            ry="4.8"
            width="6"
            height="12"
            fill="#32a0da"
          >
            <animate
              attributeName="opacity"
              values="1;0"
              keyTimes="0;1"
              dur={`${duration}s`}
              begin={`${(num - frames) * (duration / frames)}s`}
              repeatCount="indefinite"
            />
          </rect>
        </g>
      ))}
      {children}
    </svg>
  );
}
