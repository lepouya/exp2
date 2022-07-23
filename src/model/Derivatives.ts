import Decimal from "break_eternity.js";

import { Context } from "./Context";
import { Resource } from "./Resource";

export default function genDerivatives(context: Context, name = "x", d = 0) {
  const res = [];
  for (let i = 0; i <= d; i++) {
    res.push(genDerivativeResource(context, name, i));
  }
  return res;
}

const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
function toSuper(n: number) {
  return Array.from(n.toFixed())
    .map((d) => superscripts[parseInt(d)])
    .join("");
}

const oneTenth = Decimal.dTen.reciprocal();
function genDerivativeResource(context: Context, name = "x", d = 0) {
  return context.resourceManager.upsert({
    name: `${name}_${d}`,
    singularName: d ? `d${toSuper(d)} / d.${name}${toSuper(d)}` : name,

    unlocked: d === 0,
    autoUnlock: true,

    count: Decimal.dZero,
    value(this: Resource) {
      return this.count;
    },

    cost(n) {
      if (!d) {
        return [];
      }
      const l = oneTenth.multiply(n).subtract(oneTenth).floor();
      return [
        {
          resource: `${name}_${0}`,
          count: l.plus(Decimal.dOne).multiply(d).plus(l).pow10(),
        },
      ];
    },

    unlockCost() {
      return [
        {
          resource: `${name}_${0}`,
          count: Decimal.pow10(d - 0.5),
        },
      ];
    },

    extra: {},
    onPurchase(this: Resource, purchase) {
      if (purchase.style !== "free") {
        this.extra.manual =
          (this.extra.manual ?? 0) +
          Decimal.fromValue(purchase.count).toNumber();
        if (d > 0) {
          this.extra.speedMultiplier = oneTenth
            .multiply(this.extra.manual)
            .floor()
            .pow_base(Decimal.dTwo)
            .round()
            .toNumber();
        }
      }
    },

    tick(this: Resource<Context>, dt) {
      if (d > 0) {
        this.manager
          .get(`${name}_${d - 1}`)
          .add(
            this.count
              .multiply(this.extra.speedMultiplier ?? 0)
              .multiply(0.1 * dt),
          );
      }
    },
  });
}
