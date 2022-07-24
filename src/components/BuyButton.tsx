import Decimal, { DecimalSource } from "break_eternity.js";
import { MouseEvent, useState } from "react";

import { Resource, ResourceCount } from "../model/Resource";
import Format from "../utils/format";
import useGameContext from "./GameContext";
import Icon from "./Icon";

export type BuyButtonProps = {
  resource: string | Resource;
  enabled?: boolean;
  allowUnlocking?: boolean;

  maxNum?: number;
  minNum?: number;
  increment?: number;
  precision?: number;

  gainMultiplier?: DecimalSource;
  costMultiplier?: DecimalSource;
  mode?: "buy" | "sell";

  overrideCount?: DecimalSource;
  overrideBuyAmount?: string;

  prefix?: string;
  suffix?: string;
  infix?: string;
  and?: string;

  className?: string;
  style?: React.CSSProperties;

  onPurchase?: (resource: Resource, bought: DecimalSource) => void;
};

export default function BuyButton({
  resource,
  enabled = true,
  allowUnlocking = false,

  maxNum,
  minNum,
  increment,
  precision = 0,

  gainMultiplier = Decimal.dOne,
  costMultiplier = Decimal.dOne,
  mode = "buy",

  overrideCount,
  overrideBuyAmount,

  prefix = "Buy",
  suffix = "",
  infix = "for",
  and = "&",

  className,
  style,
  onPurchase,
}: BuyButtonProps) {
  const context = useGameContext();
  const res = context.resourceManager.get(resource);
  const buyAmount =
    buyAmounts[overrideBuyAmount ?? context.settings.buyAmount ?? "+1"] ??
    buyAmounts["+1"];
  const amount = {
    minAmount: minNum ?? buyAmount.min,
    maxAmount: maxNum ?? buyAmount.max,
    increments: increment ?? buyAmount.inc,
  };

  if (!(res.unlocked ?? true)) {
    if (allowUnlocking) {
      amount.minAmount = amount.maxAmount = amount.increments = 1;
    } else {
      amount.minAmount = amount.maxAmount = amount.increments = 0;
      enabled = false;
    }
  }

  function renderResourceCounts(rcs: ResourceCount[], multiplier = 1) {
    return rcs.map(({ resource, count }, i) => {
      resource = context.resourceManager.get(resource);
      const res = Format.resource(resource, {
        override: { count: Decimal.mul(count, multiplier) },
        prec: precision,
        alwaysShowSign: true,
      });
      const color = !res.valueSign
        ? "zero"
        : res.valueSign > 0
        ? "positive"
        : "negative";
      return (
        <div className="resource" key={res.name}>
          {i > 0 && <div className="prefix">{and}</div>}
          <div className={color}>{res.value}</div>
          <div>
            {resource.icon && <Icon icon={resource.icon} size="1em" />}
            {res.name}
          </div>
        </div>
      );
    });
  }

  function doPurchase(count: DecimalSource, event: MouseEvent) {
    event.preventDefault();
    if (!enabled || Decimal.eq(count, 0)) {
      return;
    }

    const originalCount = res.count;
    if (overrideCount != undefined) {
      res.count = Decimal.fromValue(overrideCount);
    }
    const bought = res.buy(count, "partial", gainMultiplier, costMultiplier);

    if (overrideCount != undefined) {
      res.count = originalCount.plus(res.count).minus(overrideCount);
    }

    if (onPurchase && bought.gain.length > 0) {
      onPurchase(res, bought.gain[0].count);
    }
  }

  const originalCount = res.count;
  if (overrideCount != undefined) {
    res.count = Decimal.fromValue(overrideCount);
  }
  const tx =
    mode === "buy"
      ? res.buy(amount, "dry-partial", gainMultiplier, costMultiplier)
      : res.sell(amount, costMultiplier);
  res.count = originalCount;

  const active = context.resourceManager.canAfford(tx.cost);
  const hasCost = tx.cost.some(({ count }) => Decimal.neq(count, 0));
  const classNames = [className, "buy-button", (active ? "" : "in") + "active"];

  return (
    <button
      onClick={(e) => doPurchase(active && enabled ? tx.count : 0, e)}
      disabled={!active || !enabled}
      className={classNames.filter((s) => !!s).join(" ")}
      style={style}
      id={`button-buy-${res.name}`}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      {renderResourceCounts(tx.gain, 1)}
      {hasCost && enabled && infix && <div className="infix">{infix}</div>}
      {hasCost && enabled && renderResourceCounts(tx.cost, -1)}
      {suffix && <div className="suffix">{suffix}</div>}
    </button>
  );
}

export function BuyAmountButtons() {
  const { settings } = useGameContext();
  const [buyAmount, setBuyAmount] = useState(settings.buyAmount);

  function getClassName(buyMode: string) {
    return buyMode === buyAmount ? "selected" : "unselected";
  }

  function setBuyMode(event: React.MouseEvent) {
    event.preventDefault();
    settings.buyAmount = (event.target as HTMLInputElement).value;
    setBuyAmount(settings.buyAmount);
  }

  const buttons = Object.keys(buyAmounts).sort((a, b) =>
    a.substring(1).localeCompare(b.substring(1)),
  );

  return (
    <>
      {buttons.map((value) => (
        <button
          value={value}
          key={value}
          className={`buy-amount-button ${getClassName(value)}`}
          onClick={setBuyMode}
          id={`button-${value.replace(/\W/g, "")}`}
        >
          {buyIcons[value[0]] && <Icon icon={buyIcons[value[0]]} />}
          {value.replace(/^[+x]/, "").toUpperCase()}
        </button>
      ))}
    </>
  );
}

const buyAmounts: Record<string, { min: number; max: number; inc: number }> = {
  "+1": { min: 1, max: 1, inc: 1 },
  x10: { min: 1, max: 10, inc: 10 },
  x100: { min: 1, max: 100, inc: 100 },
  "+10": { min: 10, max: 10, inc: 1 },
  "+100": { min: 100, max: 100, inc: 1 },
  max: { min: 1, max: 100, inc: 1 },
};

const buyIcons: Record<string, string> = { x: "arrow-bar-to-right", "+": "x" };
