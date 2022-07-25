import Decimal from "break_eternity.js";
import { useMemo } from "react";

import BuyButton from "../components/BuyButton";
import useGameContext from "../components/GameContext";
import Icon from "../components/Icon";
import Format from "../utils/format";
import { Context } from "./Context";
import { Resource } from "./Resource";

export function genDerivatives(context: Context, name = "x", d = 0) {
  const res = [];
  for (let i = 0; i <= d; i++) {
    res.push(genDerivativeResource(context, name, i));
  }
  return res;
}

export function RenderDerivatives(props: { name: string }) {
  const { resources } = useGameContext();
  const [main, ress] = useMemo(() => {
    const prefix = `${props.name}_`;
    const ress = Object.values(resources)
      .filter((r) => r.name.startsWith(prefix))
      .sort(
        (a, b) =>
          parseInt(a.name.substring(prefix.length)) -
          parseInt(b.name.substring(prefix.length)),
      );
    const main = ress.splice(0, 1)[0];
    return [main, ress];
  }, [props.name]);

  if (!props.name || !ress || !ress.length || !main) {
    return null;
  }

  return (
    <div className="panel">
      <RenderDerivative resource={main} header={true} rest={ress} />
      {ress.map((res) => (
        <RenderDerivative key={res.name} resource={res} />
      ))}
      <div className="full right">
        Buy multiples: &nbsp;
        <BuyButton.BuyAmountButtons />
      </div>
    </div>
  );
}

const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
function toSuper(n: number) {
  if (n === 1) {
    return "";
  }
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
          count: l.plus(1).multiply(d).plus(l).pow10(),
        },
      ];
    },

    unlockCost() {
      return [
        { resource: `${name}_${0}`, count: Decimal.pow10(d - 0.5) },
        { resource: `${name}_${d - 1}`, count: 1 },
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

function RenderDerivative(props: {
  resource: Resource<Context>;
  rest?: Resource<Context>[];
  header?: boolean;
}) {
  if (!(props.resource.unlocked ?? true) || props.resource.disabled) {
    return null;
  }

  const res = props.resource;
  const fmt = Format.resource(props.resource);

  if (fmt.active !== "active") {
    return <div className="full">{fmt.active}</div>;
  } else if (props.header) {
    return (
      <>
        <div className="full center bold">
          {fmt.icon && <Icon icon={fmt.icon} size="1em" />}
          {fmt.name?.toUpperCase()}
          &nbsp;: &nbsp;
          {fmt.value}
        </div>
        <div className="quarter">
          <BuyButton resource={res} overrideBuyAmount="+1" prefix="Add" />
        </div>
        <div className="half center">
          {fmt.rateSign !== "zero" && (
            <div className={fmt.rateSign}>{`(${fmt.rate})`}</div>
          )}
        </div>
        <div className="quarter">
          <BuyButton.BuyAllButton
            resources={props.rest}
            showNames={false}
            overrideCount="manual"
          />
        </div>
        <hr className="underlined" />
      </>
    );
  } else {
    return (
      <>
        <div className="quarter">
          <div className="full">
            {fmt.icon && <Icon icon={fmt.icon} size="1em" />}
            {fmt.name}
          </div>
          {res.extra.speedMultiplier > 1 && (
            <div className="zero three-quarters right">
              {`x${fmt.extras["Speed Multiplier"]} speed`}
            </div>
          )}
        </div>
        <div className="quarter">
          <div className="full">{fmt.value}</div>
          {res.extra.manual && (
            <div className="zero three-quarters right">
              {`(${fmt.extras["Manual"]})`}
            </div>
          )}
        </div>
        <div className="quarter">
          {fmt.rateSign !== "zero" && (
            <div className={fmt.rateSign}>{`(${fmt.rate})`}</div>
          )}
        </div>
        <div className="quarter">
          <BuyButton resource={res} overrideCount="manual" />
        </div>
        <hr className="dotted" />
      </>
    );
  }
}
