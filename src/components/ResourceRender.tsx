import Decimal, { DecimalSource } from "break_eternity.js";

import { Resource } from "../model/Resource";
import * as Format from "../utils/format";
import useGameContext from "./GameContext";
import Icon from "./Icon";

const multipliers = { none: 0, number: 1, percentage: 1, time: 1000 };

export type ResourceRenderProps = {
  resource?: Partial<Resource>;
  name?: string;
  value?: DecimalSource;
  epoch?: number;
  display?: keyof typeof multipliers;
  length?: "tiny" | "short" | "long";
  round?: typeof Decimal.round;

  showLocked?: boolean;
  showIcon?: boolean;
  showName?: boolean;
  showValue?: boolean;
  showMaxValue?: boolean;
  showRawValue?: boolean;
  showRate?: boolean;
  showExtras?: boolean;

  showColors?: boolean;
  showRateColors?: boolean;
  showNegatives?: boolean;
  showZeros?: boolean;
  showPlusSign?: boolean;
  showZeroRates?: boolean;
  showRatePercentages?: boolean;
  showRateHistory?: boolean;
  showCapitalized?: boolean;
  showChrome?: boolean;

  precision?: number;
  valuePrecision?: number;
  rawValuePrecision?: number;
  ratePrecision?: number;
  extrasPrecision?: number;

  reversedDirection?: boolean;

  prefix?: string;
  suffix?: string;
  infix?: string;
  placeholder?: string;
  timeSeparator?: string;
  ago?: string;
  now?: string;
  never?: string;

  className?: string;
  style?: React.CSSProperties;
};

export default function ResourceRender({
  value,
  epoch,
  name,
  resource = { name, count: value ? Decimal.fromValue(value) : undefined },
  display = resource.display ?? "number",
  length = "long",
  round = display === "number" ? Decimal.floor : Decimal.round,

  showLocked = false,
  showIcon = true,
  showName = true,
  showValue = display !== "none",
  showMaxValue = false,
  showRawValue = false,
  showRate = false,
  showExtras = false,

  showColors = false,
  showRateColors = true,
  showNegatives = true,
  showZeros = true,
  showPlusSign = false,
  showZeroRates = false,
  showRatePercentages = display === "number",
  showRateHistory = false,
  showCapitalized = true,
  showChrome = false,

  precision = display === "time" ? 3 : display === "number" ? 2 : 0,
  valuePrecision = precision,
  rawValuePrecision = valuePrecision,
  ratePrecision = display === "time" ? 0 : precision,
  extrasPrecision = precision,

  reversedDirection = false,

  prefix = "",
  suffix = "",
  infix = (showIcon || showName) &&
  (showValue || showMaxValue || showRawValue || showRate || showExtras)
    ? ":"
    : "",
  placeholder = "-",
  timeSeparator = length === "long" ? ", " : ":",
  ago = "ago",
  now = "now",
  never = "never",

  className = "",
  style,
}: ResourceRenderProps) {
  const {
    settings: { numberFormat },
  } = useGameContext();
  const notation = numberFormat ? numberFormat : "Standard";

  const output: JSX.Element[] = [];
  function addValueDiv(
    num = Decimal.dNaN,
    key = "",
    {
      prec = precision,
      rnd = round,
      cls = "",
      disp = display,
      len = length,
      neg = showNegatives,
      zero = showZeros,
      plus = showPlusSign,
      color = showColors,
      paren = false,
      sep = timeSeparator,
      pre = "",
      post = "",
      ref = false,
      dry = false,
    },
  ): string {
    const exp = Decimal.pow10(prec);
    const value = rnd(
      num
        .minus(ref && epoch ? epoch : Decimal.dZero)
        .multiply(multipliers[disp])
        .multiply(exp),
    ).divide(exp);
    if (
      value.isNan() ||
      (!neg && value.lessThan(Decimal.dZero)) ||
      (!zero && value.equals(Decimal.dZero))
    ) {
      return "";
    }

    const classes = [disp.toString()];
    if (cls) {
      classes.push(cls);
    }
    if (color) {
      const v = reversedDirection ? value.negate() : value;
      classes.push(
        v.greaterThan(Decimal.dZero)
          ? "positive"
          : v.lessThan(Decimal.dZero)
          ? "negative"
          : "zero",
      );
    }

    let res = placeholder;
    if (disp === "number") {
      res = Format.number(value, { notation, len, prec });
    } else if (disp === "percentage") {
      res = Format.number(value, { notation, len, prec }) + "%";
    } else if (disp === "time") {
      if (
        ref &&
        never.length > 0 &&
        (num.lessThanOrEqualTo(Decimal.dZero) || (epoch ?? -Infinity) <= 0)
      ) {
        res = never;
      } else if (ref && epoch != null) {
        res = Format.time(
          value.toNumber(),
          { len, millis: prec > 0 },
          { sep, now, never, ago },
        );
      } else {
        res = Format.time(value.toNumber(), { len, millis: prec > 0 });
      }
    } else if (disp === "none") {
      res = "";
    }
    if (
      plus &&
      value.greaterThanOrEqualTo(Decimal.dZero) &&
      !(len === "long" && disp === "time") &&
      !res.startsWith("+")
    ) {
      res = "+" + res;
    }

    res = pre + res + post;
    if (paren) {
      res = "(" + res + ")";
    }

    if (!dry) {
      output.push(
        <div key={key} className={classes.join(" ")}>
          {res}
        </div>,
      );
    }

    return res;
  }

  const classNames = ["resource"];
  const adjustedValue = value
    ? Decimal.fromValue(value)
    : (resource.value ? resource.value() : undefined) ??
      resource.count ??
      Decimal.dNaN;

  if ((showIcon && resource.icon) || (showName && resource.name)) {
    output.push(
      <div className="name" key="name">
        {showIcon && resource.icon && resource.icon.length > 0 ? (
          <Icon icon={resource.icon} size="1em" />
        ) : null}
        {Format.word(
          name,
          {
            count: adjustedValue.toNumber(),
            name: resource.name,
            singularName: resource.singularName ?? resource.pluralName,
            pluralName: resource.pluralName ?? resource.singularName,
          },
          {
            condition: showName,
            allowEmpties: false,
            capitalize: showCapitalized,
          },
        )}
        {infix}
      </div>,
    );
  }

  if (showValue) {
    const denom = showMaxValue
      ? addValueDiv(resource.maxCount, "denominator", {
          prec: valuePrecision,
          pre: " / ",
          dry: true,
        })
      : "";

    addValueDiv(adjustedValue, "value", {
      prec: valuePrecision,
      ref: epoch != undefined && !Decimal.isNaN(epoch),
      post: denom,
      cls: "value",
    });
  }

  if (showRawValue) {
    addValueDiv(
      value ? Decimal.fromValue(value) : resource.count,
      "raw-value",
      {
        disp: "number",
        prec: rawValuePrecision,
        paren: showValue,
        cls: "raw-value",
      },
    );
  }

  if (
    showRate &&
    resource.rate != null &&
    (resource.rate.lastCountUpdate ?? 0) > 0 &&
    (showZeroRates || resource.rate.count.notEquals(Decimal.dZero))
  ) {
    let rate = Decimal.dZero;
    if (showRateHistory && resource.rate.pastCounts.length > 0) {
      let denom = Decimal.dZero;
      let length = resource.rate.pastCounts.length;
      resource.rate.pastCounts.forEach((pastRate, rateIdx) => {
        const weight = length - rateIdx;
        rate = pastRate.multiply(weight).plus(rate);
        denom = denom.plus(weight);
      });
      rate = rate.divide(denom);
    } else {
      rate = resource.rate.count;
    }

    let usePercentage = showRatePercentages;
    let rateDenom = showRatePercentages
      ? adjustedValue.multiply(0.01)
      : Decimal.dOne;
    if (
      rateDenom?.equals(Decimal.dZero) ||
      (usePercentage &&
        (rate.e + ratePrecision < rateDenom.e || rateDenom.e < 3))
    ) {
      usePercentage = false;
      rateDenom = Decimal.dOne;
    }

    addValueDiv(rate.divide(rateDenom), "rate", {
      disp: usePercentage ? "percentage" : display,
      prec: ratePrecision,
      paren: showValue || showRawValue,
      color: showRateColors,
      len: usePercentage || length !== "long" ? "tiny" : "short",
      cls: "rate",
      rnd: Decimal.round,
      neg: true,
      zero: true,
      plus: true,
      post: "/s",
    });
  }

  if (showExtras && resource.extra && Object.keys(resource.extra).length > 0) {
    for (let k in resource.extra) {
      if (k.length > 0) {
        if (output.length > 0) {
          output.push(<div className="break" key={`break-${k}`} />);
        }
        output.push(
          <div className="extra-name" key={`extra-name-${k}`}>
            {Format.word(k, undefined, {
              capitalize: showCapitalized,
            })}
            {infix}
          </div>,
        );
      }

      if (showExtras) {
        addValueDiv(Decimal.fromNumber(resource.extra[k]), `extra-value-${k}`, {
          disp: k.toLowerCase().includes("time") ? "time" : display,
          prec: extrasPrecision,
          cls: "extra-value",
        });
      }
    }
  }

  if (!showLocked && !(resource.unlocked ?? true)) {
    classNames.push("locked");
    output.splice(
      0,
      output.length,
      <div className="placeholder" key="lock">
        {placeholder}
      </div>,
    );
  }

  const resStyle = showChrome ? undefined : style;
  if (!!className && !showChrome) {
    classNames.push(className);
  }
  const res = (
    <div
      className={classNames.join(" ")}
      style={resStyle}
      id={`resource-${name ?? resource.name}`}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      {output}
      {suffix && <div className="suffix">{suffix}</div>}
    </div>
  );

  if (showChrome) {
    return (
      <div
        className={!className ? undefined : className}
        style={style}
        id={`resource-chrome-${name ?? resource.name}`}
      >
        {res}
      </div>
    );
  } else {
    return res;
  }
}
