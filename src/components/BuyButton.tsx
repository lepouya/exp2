import Decimal, { DecimalSource } from "break_eternity.js";
import { MouseEvent, useState } from "react";

import { Resource, ResourceCount } from "../model/Resource";
import Fn from "../utils/function";
import useGameContext from "./GameContext";
import Icon from "./Icon";
import ResourceRender from "./ResourceRender";

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
  const {
    resourceManager,
    settings: { buyAmount },
  } = useGameContext();
  const res = resourceManager.get(resource);
  const originalCount = res.count;

  const amounts =
    buyAmounts[overrideBuyAmount ?? buyAmount ?? "+1"] ?? buyAmounts["+1"];
  minNum ??= amounts.min;
  maxNum ??= amounts.max;
  increment ??= amounts.inc;

  if (!(res.unlocked ?? true)) {
    if (allowUnlocking && res.unlockCost) {
      minNum = maxNum = increment = 1;
    } else {
      minNum = maxNum = increment = 0;
      enabled = false;
    }
  }

  if (mode === "sell") {
    [minNum, maxNum, increment] = [-minNum, -maxNum, -increment];
  }

  function renderResourceCounts(rcs: ResourceCount[], multiplier: Decimal) {
    return rcs.map((rc, i) => (
      <ResourceRender
        resource={rc.resource}
        override={{ count: multiplier.mul(rc.count) }}
        precision={precision}
        infix=""
        placeholder=""
        prefix={i > 0 ? and : ""}
        showLocked={allowUnlocking}
        showValue={
          typeof rc.resource === "string" ? true : rc.resource.unlocked ?? true
        }
        showColors={true}
        showChrome={true}
        showPlusSign={true}
        className="value-first"
        key={typeof rc.resource === "string" ? rc.resource : rc.resource.name}
      />
    ));
  }

  function doPurchase(count: DecimalSource, event: MouseEvent) {
    event.preventDefault();
    if (!enabled || Decimal.eq(count, 0)) {
      return;
    }

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

  if (overrideCount != undefined) {
    res.count = Decimal.fromValue(overrideCount);
  }
  const purchase = res.buy(
    { minAmount: minNum, maxAmount: maxNum, increments: increment },
    "dry-partial",
    gainMultiplier,
    costMultiplier,
  );
  if (overrideCount != undefined) {
    res.count = originalCount;
  }

  const affordable = resourceManager.canAfford(purchase.cost);
  if (!enabled) {
    purchase.cost = [];
  }
  const totalCost = purchase.cost.reduce(
    (tot, rc) => tot.plus(Decimal.abs(rc.count)),
    Decimal.dZero,
  );

  const classNames = [
    "buy-button",
    `buy-button-${affordable ? "" : "un"}affordable`,
    className,
  ].filter((s) => !!s);

  return (
    <button
      onClick={Fn.apply(doPurchase, affordable && enabled ? purchase.count : 0)}
      disabled={!affordable || !enabled}
      className={classNames.join(" ")}
      style={style}
      id={`button-buy-${res.name}`}
    >
      {prefix && <div className="prefix">{prefix}</div>}
      {renderResourceCounts(purchase.gain, Decimal.dOne)}
      {totalCost.notEquals(Decimal.dZero) && infix && (
        <div className="infix">{infix}</div>
      )}
      {totalCost.notEquals(Decimal.dZero) &&
        renderResourceCounts(purchase.cost, Decimal.dNegOne)}
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
