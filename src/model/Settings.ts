export type Settings = {
  // Clock settings
  ticksPerSecond: number;
  framesPerSecond: number;
  saveFrequencySecs: number;

  // Time tracking
  lastReset: number;
  lastUpdate: number;
  lastSaved: number;
  lastLoaded: number;

  // Resource updates
  rateUpdateSecs: number;
  rateHistoryWindow: number;
  minResourceUpdateSecs: number;
  maxResourceUpdateSecs: number;
  maxResourceTickSecs: number;

  // Popup settings
  offlineSummaryMinSecs: number;
  offlineSummaryMaxUpdates: number;

  // Game settings
  sellRatio: number;
  timeDilation: number;
  buyAmount: string;
  numberFormat: string;
  theme: string;
};

export const defaultSettings: Settings = {
  ticksPerSecond: 50,
  framesPerSecond: 10,
  saveFrequencySecs: 60,

  lastReset: Date.now(),
  lastUpdate: Date.now(),
  lastSaved: 0,
  lastLoaded: Date.now(),

  rateUpdateSecs: 0.1,
  rateHistoryWindow: 10,
  minResourceUpdateSecs: 0.001,
  maxResourceUpdateSecs: 24 * 60 * 60,
  maxResourceTickSecs: 1,

  offlineSummaryMinSecs: 60,
  offlineSummaryMaxUpdates: 12,

  sellRatio: 0.8,
  timeDilation: 1.0,
  buyAmount: "+1",
  numberFormat: "Standard",
  theme: "light",
};
