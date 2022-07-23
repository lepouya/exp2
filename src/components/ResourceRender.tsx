import { Resource } from "../model/Resource";
import Format from "../utils/format";
import useGameContext from "./GameContext";
import Icon from "./Icon";

export type ResourceRenderProps = {
  resource?: Partial<Resource> | string;
  override?: Partial<Resource>;
  epoch?: number;
  length?: "tiny" | "short" | "long";
  precision?: number;
  reversedDirection?: boolean;

  showLocked?: boolean;
  showIcon?: boolean;
  showName?: boolean;
  showValue?: boolean;
  showMaxValue?: boolean;
  showRate?: boolean;
  showExtras?: boolean;

  showColors?: boolean;
  showRateColors?: boolean;
  showNegatives?: boolean;
  showZeros?: boolean;
  showPlusSign?: boolean;
  showZeroRates?: boolean;
  showRatePercentages?: boolean;
  showCapitalized?: boolean;
  showChrome?: boolean;

  prefix?: string;
  suffix?: string;
  infix?: string;
  placeholder?: string;

  className?: string;
  style?: React.CSSProperties;
};

export default function ResourceRender({
  resource,
  override,
  epoch,
  length,
  precision,
  reversedDirection,

  showLocked,
  showIcon = true,
  showName = true,
  showValue = true,
  showMaxValue,
  showRate,
  showExtras,

  showColors,
  showRateColors = true,
  showNegatives = true,
  showZeros = true,
  showPlusSign,
  showZeroRates,
  showRatePercentages,
  showCapitalized,
  showChrome,

  prefix,
  suffix,
  infix,
  placeholder,

  className,
  style,
}: ResourceRenderProps) {
  const { resourceManager } = useGameContext();
  resource =
    typeof resource === "string"
      ? resourceManager.get(resource)
      : resource ?? {};

  const res = Format.resource(resource, {
    override,
    useRatePercent: showRatePercentages,
    len: length,
    prec: precision,
    alwaysShowSign: showPlusSign,
    epoch,
    capitalize: showCapitalized,
  });

  let output: JSX.Element[] = [];
  function addValueDiv(
    val?: string,
    sign?: number,
    key?: string,
    color = showColors,
    paren = false,
  ) {
    if (
      !val ||
      (!showNegatives && sign != null && sign < 0) ||
      (!showZeros && sign != null && sign === 0)
    ) {
      return;
    }

    const classes = [];
    if (key) {
      classes.push(key);
    }
    if (color) {
      sign = (sign ?? 0) * (reversedDirection ? -1 : 1);
      classes.push(sign > 0 ? "positive" : sign < 0 ? "negative" : "zero");
    }

    if (paren) {
      val = "(" + val + ")";
    }

    output.push(
      <div key={`${key}-${output.length + 1}`} className={classes.join(" ")}>
        {val}
      </div>,
    );
  }

  const classNames = ["resource", resource.display?.toString()];

  if ((showIcon && resource.icon) || (showName && res.name)) {
    output.push(
      <div className="name" key="name">
        {showIcon && resource.icon && <Icon icon={resource.icon} size="1em" />}
        {showName && res.name}
        {(showValue || showRate) && (infix ?? ":")}
      </div>,
    );
  }

  if (showValue && res.value) {
    const denom = showMaxValue && res.max ? " / " + res.max : "";
    addValueDiv(res.value + denom, res.valueSign, "value");
  }

  if (showRate && res.rate && (showZeroRates || res.rateSign !== 0)) {
    addValueDiv(res.rate, res.rateSign, "rate", showRateColors, showValue);
  }

  if (showExtras && res.extras && Object.keys(res.extras).length > 0) {
    for (let k in res.extras) {
      if (!k || !res.extras[k]) {
        continue;
      }

      if (output.length > 0) {
        output.push(<div className="break" key={`break-${k}`} />);
      }
      output.push(
        <div className="extra-name" key={`extra-name-${k}`}>
          {k}
          {infix ?? ":"}
        </div>,
      );
      addValueDiv(res.extras[k], undefined, "extra-value");
    }
  }

  if (!showLocked && !(resource.unlocked ?? true)) {
    classNames.push("locked");
    output = [
      <div className="placeholder" key="lock">
        {placeholder}
      </div>,
    ];
  }

  const resStyle = showChrome ? undefined : style;
  if (!!className && !showChrome) {
    classNames.push(className);
  }
  const ret = (
    <div className={classNames.join(" ")} style={resStyle}>
      {prefix && <div className="prefix">{prefix}</div>}
      {output}
      {suffix && <div className="suffix">{suffix}</div>}
    </div>
  );

  if (showChrome) {
    return (
      <div className={!className ? undefined : className} style={style}>
        {ret}
      </div>
    );
  } else {
    return ret;
  }
}
