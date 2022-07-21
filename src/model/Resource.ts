import Decimal, { DecimalSource } from "break_eternity.js";

import assign from "../utils/assign";
import clamp from "../utils/clamp";
import dedupe from "../utils/dedupe";
import Fn from "../utils/function";
import { setSaveProperties } from "../utils/store";
import tickTimer from "../utils/tickTimer";
import { Nullable } from "../utils/types";
import { Settings } from "./Settings";

export type Resource<Context = any, TickResult = any> = {
  readonly manager: ResourceManager<Context, TickResult>;

  readonly name: string;
  unlocked?: boolean;
  disabled?: boolean;

  icon?: string;
  display?: "none" | "number" | "time" | "percentage";
  description?: string;
  singularName?: string;
  pluralName?: string;

  count: Decimal;
  maxCount?: Decimal;
  minCount?: Decimal;
  extra: Record<string, number>;

  value: () => Decimal;
  cost: (n: DecimalSource) => ResourceCount<Context, TickResult>[];

  shouldTick?: (dt: number, source?: string) => boolean;
  tick?: (dt: number, source?: string) => Nullable<TickResult>;

  buy: (
    count?: DecimalSource,
    style?: PurchaseStyle,
    gainMultiplier?: DecimalSource,
    costMultiplier?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;
  sell: (
    count?: DecimalSource,
    sellMultiplier?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;
  add: (
    count?: DecimalSource,
    gainMultiplier?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;

  canBuy: (
    count?: DecimalSource,
    costMultiplier?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;

  gainMultiplier?: (m: DecimalSource) => DecimalSource;
  costMultiplier?: (m: DecimalSource) => DecimalSource;

  autoUnlock?: boolean;
  autoAward?: boolean;

  onPurchase?: (purchase: PurchaseCost<Context, TickResult>) => void;
  onChange?: (count: DecimalSource, source: string) => TickResult;

  execution: {
    lastTick?: number;
    lastResult?: Nullable<TickResult>;
    lastAttempt?: number;
  };

  rate: {
    count: Decimal;
    ticks: number;

    lastCountUpdate?: number;
    lastCount?: Decimal;

    lastTickUpdate?: number;
    deltaTicks?: number;

    pastCounts: Decimal[];
    pastTicks: number[];
  };
};

export type ResourceManager<Context = any, TickResult = any> = {
  readonly context: Context;
  readonly settings: Partial<Settings>;
  readonly resources: Record<string, Resource<Context, TickResult>>;

  upsert: (
    props: Partial<Resource<Context, TickResult>> | string,
  ) => Resource<Context, TickResult>;
  get: (
    resource: Resource<Context, TickResult> | string,
  ) => Resource<Context, TickResult>;
  purchase: (
    toBuy: ResourceCount<Context, TickResult>[],
    style?: PurchaseStyle,
    gainMultiplier?: DecimalSource,
    costMultiplier?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;
  canAfford: (cost: ResourceCount<Context, TickResult>[]) => boolean;

  update: (now?: number, source?: string) => TickResult[];
  onUpdateComplete?: (
    changes: Record<string, Decimal>,
    dt: number,
    source: string,
  ) => TickResult;

  gainMultiplier?: (m: DecimalSource) => DecimalSource;
  costMultiplier?: (m: DecimalSource) => DecimalSource;

  execution: Record<
    string,
    {
      lastTick: number;
      lastDelta: number;
      lastResult: TickResult[];
      lastChanges: Record<string, Decimal>;
    }
  >;
};

export type ResourceCount<Context = any, TickResult = any> = {
  resource: Resource<Context, TickResult> | string;
  count: DecimalSource;
};

export type PurchaseStyle =
  | "full"
  | "partial"
  | "free"
  | "dry-full"
  | "dry-partial";

export type PurchaseCost<Context = any, TickResult = any> = {
  count: DecimalSource;
  style: PurchaseStyle;
  gain: ResourceCount<Context, TickResult>[];
  cost: ResourceCount<Context, TickResult>[];
};

export function genResource<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  name: string,
): Resource<Context, TickResult> {
  const res: Resource<Context, TickResult> = {
    manager: rm,
    name,
    count: Decimal.dZero,
    extra: {},

    value: () =>
      res.minCount != undefined || res.maxCount != undefined
        ? res.count.clamp(
            res.minCount ?? Decimal.dZero,
            res.maxCount ?? Decimal.dInf,
          )
        : res.count,
    cost: () => [],

    buy: (
      count = Decimal.dOne,
      style = "partial",
      gainMultiplier = Decimal.dOne,
      costMultiplier = Decimal.dOne,
    ) =>
      purchase(
        rm,
        [{ resource: res, count }],
        style,
        gainMultiplier,
        costMultiplier,
      ),
    sell: (count, sellMultiplier) =>
      res.buy(
        Decimal.fromValue(count ?? 1).negate(),
        undefined,
        undefined,
        sellMultiplier,
      ),
    add: (count, gainMultiplier) => res.buy(count, "free", gainMultiplier),

    canBuy: (count, costMultiplier) =>
      res.buy(count, "dry-partial", undefined, costMultiplier),

    execution: {},
    rate: { count: Decimal.dZero, ticks: 0, pastCounts: [], pastTicks: [] },
  };

  return setSaveProperties(res, [
    "name",
    "unlocked",
    "disabled",
    "count",
    "extra",
  ]);
}

export function genResourceManager<Context, TickResult>(
  context: Context,
  settings: Partial<Settings>,
): ResourceManager<Context, TickResult> {
  const rm: ResourceManager<Context, TickResult> = {
    context,
    settings,
    resources: {},
    upsert: (props) => upsert(rm, props),
    get: (resource) => resolve(rm, resource),
    purchase: (
      toBuy,
      style = "partial",
      gainMultiplier = Decimal.dOne,
      costMultiplier = Decimal.dOne,
    ) => purchase(rm, toBuy, style, gainMultiplier, costMultiplier),
    canAfford: (cost) => canAfford(rm, cost),
    update: (now, source) => update(rm, now ?? Date.now(), source ?? "unknown"),
    execution: {},
  };

  return setSaveProperties(rm, ["resources"]);
}

function resolve<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  resource: Resource<Context, TickResult> | string,
): Resource<Context, TickResult> {
  return (
    rm.resources[typeof resource === "string" ? resource : resource.name] ??
    upsert(rm, resource)
  );
}

function upsert<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  props: Partial<Resource<Context, TickResult>> | string,
): Resource<Context, TickResult> {
  const name = typeof props === "string" ? props : props.name ?? "";
  const res = rm.resources[name] ?? genResource(rm, name);

  if (typeof props !== "string") {
    let k: keyof Resource<Context, TickResult>;
    for (k in props) {
      if (k === "extra") {
        assign(res, k, props[k]);
      } else if (k === "count" || k === "maxCount" || k === "minCount") {
        if (props[k] != undefined) {
          res[k] = Decimal.fromValue(props[k]!);
        }
      } else if (k !== "manager" && k !== "name" && props[k] != undefined) {
        (res as any)[k] = props[k];
      }
    }
  }

  if (res.name) {
    rm.resources[res.name] = res;
  }

  return res;
}

function update<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  now: number,
  source: string,
): TickResult[] {
  const {
    rateUpdateSecs = 1,
    rateHistoryWindow = 3,
    minResourceUpdateSecs = 0.001,
    maxResourceUpdateSecs = 24 * 60 * 60,
    maxResourceTickSecs = 1,
    timeDilation = 1.0,
  } = rm.settings;

  let dt = clamp(
    (now - (rm.settings.lastUpdate ?? now)) / 1000,
    0,
    maxResourceUpdateSecs,
  );
  if (dt < minResourceUpdateSecs && rm.settings.lastUpdate != undefined) {
    return [];
  }

  rm.settings.lastUpdate = now;
  const epoch = now - dt * 1000;
  const cache: Record<string, Decimal> = {};

  Object.values(rm.resources).forEach((res) => {
    if (res.autoUnlock && !res.disabled && !(res.unlocked ?? true)) {
      if (canAfford(rm, res.cost(1), false)) {
        res.unlocked = true;
      }
    }
  });

  const resources = Object.values(rm.resources).filter(
    (res) => (res.unlocked ?? true) && !res.disabled,
  );

  resources.forEach((res) => {
    cache[res.name] = res.count;

    res.rate.lastCountUpdate ??= epoch;
    res.rate.lastCount ??= res.count;
    res.execution.lastTick = clamp(
      res.execution.lastTick ?? epoch,
      now - maxResourceUpdateSecs * 1000,
      now,
    );
    res.execution.lastAttempt = now;
  });

  const results: Record<string, TickResult[]> = {};
  const tickResources = resources.filter((res) => res.tick);
  const tickScale = 1 / 1000 / timeDilation;
  while (dt > 0) {
    dt -= clamp(dt, minResourceUpdateSecs, maxResourceTickSecs);
    const slice = now - dt * 1000;

    tickResources.forEach((res) => {
      const tick = (slice - res.execution.lastTick!) * tickScale;

      if (tick > 0 && (!res.shouldTick || res.shouldTick(tick, source))) {
        res.execution.lastResult = res.tick!(tick, source);
        res.execution.lastTick = slice;
        res.rate.deltaTicks = (res.rate.deltaTicks ?? 0) + 1;
        res.rate.lastTickUpdate ??= slice;
        if (res.execution.lastResult) {
          if (!results[res.name]) {
            results[res.name] = [];
          }

          if (!results[res.name].includes(res.execution.lastResult)) {
            results[res.name].push(res.execution.lastResult);
          }
        }
      }
    });
  }

  resources.forEach((res) => {
    if (
      res.autoAward &&
      !res.disabled &&
      res.count.lessThan(res.maxCount ?? Decimal.dZero)
    ) {
      const req = res.cost(res.count.add(1));
      if (canAfford(rm, req, false)) {
        res.count = res.count.add(1);

        if (res.onPurchase) {
          res.onPurchase({
            count: Decimal.dOne,
            style: "free",
            gain: [{ resource: res, count: Decimal.dOne }],
            cost: [],
          });
        }
      }
    }
  });

  resources.forEach((res) => {
    const rateDt = (now - (res.rate.lastCountUpdate ?? 0)) / 1000;
    if (
      res.rate.lastCountUpdate == undefined ||
      res.rate.lastCount == undefined ||
      rateDt >= rateUpdateSecs
    ) {
      res.rate.count = res.count.minus(res.rate.lastCount ?? 0).divide(rateDt);
      res.rate.lastCount = res.count;
      res.rate.lastCountUpdate = now;
      res.rate.pastCounts.unshift(res.rate.count);
      res.rate.pastCounts.splice(rateHistoryWindow);
    }

    const tickRateDt = (now - (res.rate.lastTickUpdate ?? 0)) / 1000;
    if (
      res.rate.lastTickUpdate == undefined ||
      res.rate.deltaTicks == undefined ||
      tickRateDt >= rateUpdateSecs
    ) {
      res.rate.ticks = (res.rate.deltaTicks ?? 0) / tickRateDt;
      res.rate.deltaTicks = 0;
      res.rate.lastTickUpdate = now;
      res.rate.pastTicks.unshift(res.rate.ticks);
      res.rate.pastTicks.splice(rateHistoryWindow);
    }
  });

  resources.forEach((res) => {
    cache[res.name] = res.count.minus(cache[res.name] ?? Decimal.dZero);
    if (cache[res.name].equals(Decimal.dZero)) {
      delete cache[res.name];
    }

    if (res.onChange && cache[res.name]) {
      const changeResult = res.onChange(res.count, source);
      if (changeResult && !results[res.name].includes(changeResult)) {
        results[res.name].push(changeResult);
      }
    }
  });

  rm.execution[source] = {
    lastTick: now,
    lastDelta: (now - epoch) / 1000,
    lastResult: dedupe(Object.values(results).flat()),
    lastChanges: cache,
  };

  if (rm.onUpdateComplete) {
    const updateResult = rm.onUpdateComplete(
      cache,
      (now - epoch) / 1000,
      source,
    );
    if (updateResult) {
      results["__ResourceManager_onUpdateComplete"] = [updateResult];
    }
  }

  return rm.execution[source].lastResult;
}

function purchase<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  toBuy: ResourceCount<Context, TickResult>[],
  style: PurchaseStyle,
  gainMultiplier: DecimalSource,
  costMultiplier: DecimalSource,
): PurchaseCost<Context, TickResult> {
  const globalGainMultiplier = rm.gainMultiplier
    ? rm.gainMultiplier(gainMultiplier)
    : gainMultiplier;
  const globalCostMultiplier = rm.costMultiplier
    ? rm.costMultiplier(costMultiplier)
    : costMultiplier;

  const costs = resolveAll(rm, toBuy).map((rc) => {
    const res = rc.resource;
    const localGainMultiplier = res.gainMultiplier
      ? res.gainMultiplier(globalGainMultiplier)
      : globalGainMultiplier;
    const localCostMultiplier = res.costMultiplier
      ? res.costMultiplier(globalCostMultiplier)
      : globalCostMultiplier;
    const rcCost = getPurchaseCost(
      rm,
      res,
      rc.count,
      style,
      localGainMultiplier,
      localCostMultiplier,
    );

    if (style === "dry-partial" || style === "dry-full") {
      return rcCost;
    } else {
      const gain = applyToResource(res, rcCost.gain),
        cost = rcCost.cost
          .map(({ resource, count }) =>
            applyToResource(resolve(rm, resource), [
              { resource, count: Decimal.fromValue(count).negate() },
            ]),
          )
          .flat();

      const purchaseCost = { count: rcCost.count, style, gain, cost };
      if (res.onPurchase) {
        res.onPurchase(purchaseCost);
      }
      return purchaseCost;
    }
  });

  return {
    count: costs.reduce((count, rc) => count.plus(rc.count), Decimal.dZero),
    style,
    gain: combineResources(costs.map((rcCost) => rcCost.gain).flat()),
    cost: combineResources(costs.map((rcCost) => rcCost.cost).flat()),
  };
}

function resolveAll<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  rcs: ResourceCount<Context, TickResult>[],
): {
  resource: Resource<Context, TickResult>;
  count: DecimalSource;
}[] {
  return rcs
    .map(({ resource, count }) => ({ resource: resolve(rm, resource), count }))
    .filter(({ resource, count }) => resource && count);
}

function canAfford<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  cost: ResourceCount<Context, TickResult>[],
  toSpend = true,
): boolean {
  return resolveAll(rm, combineResources(cost)).every((rc) =>
    checkHasResources(rc.resource, [rc], toSpend),
  );
}

function getPurchaseCost<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  resource: Resource<Context, TickResult>,
  count: DecimalSource,
  style: PurchaseStyle,
  gainMultiplier: DecimalSource,
  costMultiplier: DecimalSource,
): PurchaseCost<Context, TickResult> {
  if (
    !resource ||
    Decimal.fromValue(count).equals(Decimal.dZero) ||
    (!(resource.unlocked ?? true) && !style.includes("dry"))
  ) {
    return { count: Decimal.dZero, style, gain: [], cost: [] };
  }

  let start = resource.count;
  let target = start
    .plus(count)
    .clamp(
      resource.minCount ?? Decimal.dZero,
      resource.maxCount ?? Decimal.dInf,
    );

  if (style === "free") {
    const diff = target.minus(start);
    return {
      count: diff,
      style,
      gain: [{ resource, count: diff.multiply(gainMultiplier) }],
      cost: [],
    };
  }

  [gainMultiplier, costMultiplier] = [
    Decimal.fromValue(gainMultiplier),
    Decimal.fromValue(costMultiplier),
  ];

  if (start.greaterThan(target)) {
    [start, target] = [target, start];
    [gainMultiplier, costMultiplier] = [
      gainMultiplier.negate(),
      costMultiplier.negate().multiply(rm.settings.sellRatio ?? 1),
    ];
  }

  let cost: ResourceCount<Context, TickResult>[] = [];
  let partialCost = cost;
  let partialCount = Decimal.dZero;
  for (let i = start; i.lessThan(target); i = i.add(1)) {
    const curCost = scaleResources(
      resolveAll(rm, resource.cost(i.add(1))),
      costMultiplier,
    );
    if (style.includes("partial")) {
      partialCost = combineResources(partialCost, curCost);
      if (!canAfford(rm, partialCost)) {
        break;
      }
    }

    partialCount = partialCount.add(1);
    cost = combineResources(cost, curCost);
  }

  if (
    (style !== "dry-full" && !canAfford(rm, cost)) ||
    (style === "full" && start.plus(partialCount).notEquals(target))
  ) {
    return { count: Decimal.dZero, style, gain: [], cost: [] };
  }

  return {
    count: partialCount.multiply(gainMultiplier.sign),
    style,
    gain: [{ resource, count: partialCount.multiply(gainMultiplier) }],
    cost,
  };
}

function combineResources<Context, TickResult>(
  rcs: ResourceCount<Context, TickResult>[],
  ...rcss: ResourceCount<Context, TickResult>[][]
): ResourceCount<Context, TickResult>[] {
  return [rcs, ...rcss]
    .flat()
    .reduce(
      (
        res: ResourceCount<Context, TickResult>[],
        rc: ResourceCount<Context, TickResult>,
      ) => {
        const frc = res.find(
          (orc) =>
            orc.resource === rc.resource ||
            (typeof orc.resource === "string"
              ? orc.resource
              : orc.resource.name) ===
              (typeof rc.resource === "string"
                ? rc.resource
                : rc.resource.name),
        );
        if (frc) {
          frc.count = Decimal.fromValue(frc.count).plus(rc.count);
          return res;
        } else {
          return [...res, { ...rc }];
        }
      },
      [],
    )
    .filter(({ count }) => Decimal.fromValue(count).notEquals(Decimal.dZero));
}

function scaleResources<Context, TickResult>(
  rcs: ResourceCount<Context, TickResult>[],
  scalar: DecimalSource,
): ResourceCount<Context, TickResult>[] {
  return rcs.map(({ resource, count }) => ({
    resource,
    count: Decimal.fromValue(count).multiply(scalar),
  }));
}

function checkHasResources<Context, TickResult>(
  res: Resource<Context, TickResult>,
  rcs: ResourceCount<Context, TickResult>[],
  toSpend = false,
): boolean {
  return (
    (res.unlocked ?? true) &&
    combineResources(rcs).every(
      ({ resource, count }) =>
        res.name !==
          (typeof resource === "string" ? resource : resource.name) ||
        res.count
          .minus(count)
          .greaterThanOrEqualTo(
            toSpend && typeof resource !== "string"
              ? resource.minCount ?? Decimal.dZero
              : Decimal.dZero,
          ),
    )
  );
}

function applyToResource<Context, TickResult>(
  res: Resource<Context, TickResult>,
  rcs: ResourceCount<Context, TickResult>[],
): ResourceCount<Context, TickResult>[] {
  return combineResources(
    rcs
      .filter(
        ({ resource }) =>
          (res.unlocked ?? true) &&
          res.name ===
            (typeof resource === "string" ? resource : resource.name),
      )
      .map(({ count }) => {
        const prev = res.count;
        res.count = res.count.plus(count);
        if (res.minCount != undefined || res.maxCount != undefined) {
          res.count = res.count.clamp(
            res.minCount ?? Decimal.dZero,
            res.maxCount ?? Decimal.dInf,
          );
        }

        return [{ resource: res, count: res.count.minus(prev) }];
      })
      .flat(),
  );
}

export function compileAllResources<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
) {
  Object.values(rm.resources).forEach((res) => {
    const ctx = {
      ...res.manager.context,
      ...res.manager,
      ...res.manager.resources,
      ...Decimal,
      timer: Fn.apply(tickTimer, res),
    };

    if (typeof res.value === "string") {
      res.value = Fn.compile(res.value, res, [], ctx);
    }

    if (typeof res.cost === "string") {
      const costFunction =
        "[" +
        (res.cost as string)
          .replace(/\s/gim, "")
          .split(/[;]/gim)
          .map((cost) => {
            const parts = cost.split(/:/gim);
            const rc = [
              `resource: ${parts[0]}`,
              `count: ${parts[parts.length - 1]}`,
            ];
            return "{" + rc.join(", ") + "}";
          })
          .join(", ") +
        "]";
      res.cost = Fn.compile(costFunction, res, ["n"], ctx);
    }

    if (typeof res.shouldTick === "string") {
      res.shouldTick = Fn.compile(res.shouldTick, res, ["dt", "source"], ctx);
    }
    if (typeof res.tick === "string") {
      res.tick = Fn.compile(res.tick, res, ["dt", "source"], ctx);
    }

    if (typeof res.gainMultiplier === "string") {
      res.gainMultiplier = Fn.compile(res.gainMultiplier, res, ["m"], ctx);
    }
    if (typeof res.costMultiplier === "string") {
      res.costMultiplier = Fn.compile(res.costMultiplier, res, ["m"], ctx);
    }

    if (typeof res.onPurchase === "string") {
      res.onPurchase = Fn.compile(res.onPurchase, res, ["purchase"], ctx);
    }
    if (typeof res.onChange === "string") {
      res.onChange = Fn.compile(res.onChange, res, ["value", "source"], ctx);
    }
  });
}
