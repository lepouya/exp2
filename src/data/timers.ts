import { Resource } from "../model/Resource";
import tickTimer from "../utils/tickTimer";

export const timers: Partial<Resource>[] = [
  {
    name: "totalTime",
    icon: "clock",
    display: "time",
    tick: tickTimer(),
  },
  {
    name: "activeTime",
    icon: "alarm",
    display: "time",
    extra: {
      current: 0,
      max: 0,
    },
    tick: tickTimer({ tickSource: "tick" }),
  },
  {
    name: "offlineTime",
    icon: "user-off",
    display: "time",
    extra: {
      current: 0,
      max: 0,
    },
    tick: tickTimer({ tickSource: "load" }),
  },
];
