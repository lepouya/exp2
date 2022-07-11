import { DecimalSource } from "break_eternity.js";

import formatWithNotation, { Notation } from "./notation";

export function number(
  num: DecimalSource,
  options?: {
    notation?: Notation | string;
    len?: "tiny" | "short" | "long";
    prec?: number;
  },
): string {
  const prec = options?.prec ?? 0;
  const expPrec = Math.max(
    prec,
    options?.len === "tiny" ? 0 : options?.len === "short" ? 2 : 3,
  );
  return formatWithNotation(num, options?.notation, prec, expPrec, prec);
}

export function time(
  time: number,
  options?: {
    len?: "tiny" | "short" | "long";
    millis?: boolean;
    epoch?: number;
    oxfordComma?: boolean;
  },
  words?: {
    sep?: string;
    lastSep?: string;
    now?: string;
    never?: string;
    ago?: string;
  },
): string {
  const len = options?.len ?? "long";
  const sep = words?.sep ?? len === "long" ? ", " : ":";
  const lastSep =
    (options?.oxfordComma ? sep : "") +
    (words?.lastSep ?? len === "long" ? " and " : sep);
  const now = words?.now ?? len === "long" ? "now" : "";
  const never = words?.never ?? len === "long" ? "never" : "";
  const ago = words?.ago ?? len === "long" ? "ago" : "";

  if (
    never != undefined &&
    (time < 0 ||
      (options?.epoch != undefined &&
        (options.epoch <= 0 || time - options.epoch < 0)))
  ) {
    return never;
  } else if (
    now != undefined &&
    (time === 0 || (options?.epoch != undefined && time === options.epoch))
  ) {
    return now;
  } else if (options?.epoch != undefined) {
    time -= options.epoch;
  }

  let secs = Math.floor(time / 1000);
  let msec = Math.floor(time - secs * 1000);

  let mins = Math.floor(secs / 60);
  secs -= mins * 60;

  let hours = Math.floor(mins / 60);
  mins -= hours * 60;

  let days = Math.floor(hours / 24);
  hours -= days * 24;

  let years = Math.floor(days / 365);
  days -= years * 365;

  if (!options?.millis) {
    msec = 0;
  }

  if (now != undefined && days + hours + mins + secs + msec === 0) {
    return now;
  }

  let parts = [];
  if (len !== "long") {
    parts = [
      years > 0 ? years.toFixed(0) : "",
      days > 0 ? days.toFixed(0) : "",
      hours > 0 || len === "short" ? hours.toFixed(0) : "",
      mins > 0 || len === "short" ? mins.toFixed(0) : "",
      (secs + msec / 1000).toFixed(
        !options?.millis || (len === "tiny" && msec === 0) ? 0 : 3,
      ),
    ].map((num) =>
      len === "short" && (num.length === 1 || num.indexOf(".") === 1)
        ? "0" + num
        : num,
    );
  } else {
    parts = [
      [years, "year"],
      [days, "day"],
      [hours, "hour"],
      [mins, "minute"],
      [secs, "second", years + days + hours + mins === 0, msec],
    ].map(([num, word, allowZeros = false, fraction = 0]) =>
      num > 0 || fraction > 0 || (allowZeros && num === 0)
        ? num.toString() +
          (fraction > 0 ? "." + fraction.toString() : "") +
          " " +
          word +
          (num === 1 ? "" : "s")
        : "",
    );
  }

  parts = parts.filter((word) => !!word);
  if (parts.length > 2) {
    const pop = parts.pop();
    parts = [parts.join(sep), pop];
  }

  return parts.join(lastSep) + (ago != undefined ? " " + ago : "");
}

export function word(
  word?: string,
  item?: {
    name?: string;
    count?: number;
    singularName?: string;
    pluralName?: string;
  },
  options?: {
    tolerance?: number;
    condition?: boolean;
    allowEmpties?: boolean;
    capitalize?: boolean;
  },
): string | undefined {
  if (!word) {
    word =
      (Math.abs(Math.abs(item?.count ?? 0) - 1) <= (options?.tolerance ?? 0.001)
        ? item?.singularName
        : item?.pluralName) ?? item?.name;
  }

  if (!(options?.condition ?? true)) {
    return undefined;
  } else if (!word && !(options?.allowEmpties ?? false)) {
    return undefined;
  } else if (!(options?.capitalize ?? true)) {
    return word;
  } else {
    return (word ?? "")
      .replace(/([a-z])([A-Z]|_\S)/g, (_, c1, c2) => `${c1} ${c2.slice(-1)}`)
      .replace(/(?<=^|\s)\w(?=\w)/g, (c) => c.toUpperCase());
  }
}
