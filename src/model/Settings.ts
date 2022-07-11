export type Settings = {
  // Clock settings
  ticksPerSecond: number;
  framesPerSecond: number;
  saveFrequencySecs: number;

  // Resource updates
  rateUpdateSecs: number;
  rateHistoryWindow: number;
  minResourceUpdateSecs: number;
  maxResourceUpdateSecs: number;
  maxResourceTickSecs: number;

  // Time tracking
  lastReset: number;
  lastUpdate: number;
  lastSaved: number;
  lastLoaded: number;

  // Game settings
  sellRatio: number;
  timeDilation: number;
  buyAmount?: string;
  numberFormat?: string;
  theme?: string;
};

export const defaultSettings: Settings = {
  ticksPerSecond: 50,
  framesPerSecond: 10,
  saveFrequencySecs: 60,

  rateUpdateSecs: 1,
  rateHistoryWindow: 3,
  minResourceUpdateSecs: 0.001,
  maxResourceUpdateSecs: 24 * 60 * 40,
  maxResourceTickSecs: 1,

  lastReset: Date.now(),
  lastUpdate: Date.now(),
  lastSaved: 0,
  lastLoaded: Date.now(),

  sellRatio: 0.8,
  timeDilation: 1.0,
  buyAmount: "",
  numberFormat: "",
  theme: "",
};
