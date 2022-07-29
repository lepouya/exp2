import Decimal from "break_eternity.js";

import clamp from "./clamp";

export default function tickTimer({
  kind = "",
  tickSource = "",

  minValue = 0.0,
  maxValue = +Infinity,
  direction = 1.0,

  streakKind = "current",
  maxStreakKind = "max",
  minStreakKind = "min",
  resetStreakSource = "",
} = {}) {
  return function (
    this: {
      count?: Decimal;
      extra?: Record<string, number>;
    },
    dt: number,
    src?: string,
  ) {
    if (!tickSource || src === tickSource) {
      let cur =
        (kind && this.extra ? this.extra[kind] : this.count?.toNumber()) ?? 0;
      if (
        (cur > minValue || direction > 0) &&
        (cur < maxValue || direction < 0)
      ) {
        cur = clamp(cur + direction * dt, minValue, maxValue);
        if (kind && this.extra) {
          this.extra[kind] = cur;
        } else {
          this.count = Decimal.fromNumber(cur);
        }

        if (streakKind && this.extra && this.extra[streakKind] != null) {
          this.extra[streakKind] = clamp(
            this.extra[streakKind] + direction * dt,
            minValue,
            maxValue,
          );

          if (
            maxStreakKind &&
            this.extra[maxStreakKind] != null &&
            this.extra[maxStreakKind] < this.extra[streakKind]
          ) {
            this.extra[maxStreakKind] = this.extra[streakKind];
          }

          if (
            minStreakKind &&
            this.extra[minStreakKind] != null &&
            this.extra[minStreakKind] > this.extra[streakKind]
          ) {
            this.extra[minStreakKind] = this.extra[streakKind];
          }
        }
      }
    } else if (!resetStreakSource || src === resetStreakSource) {
      if (streakKind && this.extra) {
        this.extra[streakKind] =
          direction > 0 ? minValue : direction < 0 ? maxValue : 0;
      }
    }

    return null;
  };
}
