import Decimal from "break_eternity.js";
import { useMemo } from "react";

import BuyButton from "../components/BuyButton";
import Game from "../components/Game";
import useGameContext from "../components/GameContext";
import Icon from "../components/Icon";
import { Context } from "../model/Context";
import { Resource } from "../model/Resource";
import Format from "../utils/format";

export default function initDerivatives(context: Context) {
  genDerivatives(context, "x", 10);
  Game.registerTab({
    path: "/",
    placement: "left",
    order: 1,
    heading: "x",
    body: () => (
      <div id="x">
        <RenderDerivatives name="x" />
      </div>
    ),
  });
}

function genDerivatives(context: Context, name = "x", cnt = 0) {
  const supers = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  const res = [];

  for (let d = 0; d <= cnt; d++) {
    const dSuper = Array.from(d <= 1 ? "" : d.toFixed()).reduce(
      (c, n) => c + supers[parseInt(n)],
      "",
    );
    res.push(
      context.resourceManager.upsert({
        name: `${name}_${d}`,
        singularName: d ? `d${dSuper}/dt${dSuper} . ${name}` : name,
        priority: d,

        count: Decimal.dZero,
        extra: { base: 0 },
        value(this: Resource) {
          return this.count;
        },

        unlocked: d === 0,
        autoUnlock: true,
        unlockCost() {
          return [
            { resource: `${name}_${0}`, count: Decimal.pow10(d - 0.3) },
            { resource: `${name}_${d - 1}`, count: 1 },
          ];
        },

        cost(n) {
          if (!d) {
            return [];
          }
          return [
            {
              resource: `${name}_${0}`,
              count: Decimal.sub(n, 1)
                .div(10)
                .add(1)
                .floor()
                .mul(Math.floor(d ** 1.5) + 1)
                .sub(1)
                .floor()
                .pow10(),
            },
          ];
        },

        onPurchase(this: Resource, purchase) {
          if (purchase.style !== "free") {
            this.extra.base =
              (this.extra.base ?? 0) +
              Decimal.fromValue(purchase.count).toNumber();
            if (d > 0) {
              this.extra.factor = Decimal.div(this.extra.base, 10)
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
                this.count.multiply(this.extra.factor ?? 0).multiply(0.1 * dt),
              );
          }
        },
      }),
    );
  }

  return res;
}

function RenderDerivatives(props: { name: string }) {
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
      {ress[0].count.gte(10) && (
        <div className="full right">
          Buy multiples: &nbsp;
          <BuyButton.BuyAmountButtons />
        </div>
      )}
    </div>
  );
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
          {props.rest && props.rest[0] && props.rest[0].count.gt(10) && (
            <BuyButton.BuyAllButton
              resources={props.rest}
              showNames={false}
              overrideCount="base"
              all={`all ${fmt.name} derivatives`}
            />
          )}
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
          {res.extra.factor > 1 && (
            <div className="zero three-quarters right">
              {`x${fmt.extras["Factor"]}`}
            </div>
          )}
        </div>
        <div className="quarter">
          <div className="full">{fmt.value}</div>
          {res.extra.base > 0 && (
            <div className="zero three-quarters right">
              {`(${fmt.extras["Base"]})`}
            </div>
          )}
        </div>
        <div className="quarter">
          {fmt.rateSign !== "zero" && (
            <div className={fmt.rateSign}>{`(${fmt.rate})`}</div>
          )}
        </div>
        <div className="quarter">
          <BuyButton resource={res} overrideCount="base" />
        </div>
        <hr className="dotted" />
      </>
    );
  }
}
