import Decimal, { DecimalSource } from "break_eternity.js";

import { timers } from "../data/timers";
import Arr from "../utils/arrays";
import clamp from "../utils/clamp";
import Obj from "../utils/objects";
import { setSaveProperties } from "../utils/store";
import { Nullable } from "../utils/types";
import { Settings } from "./Settings";

export type Resource<Context = any, TickResult = any> = {
  readonly manager: ResourceManager<Context, TickResult>;

  readonly name: string;
  unlocked?: boolean;
  disabled?: boolean;
  priority: number;

  icon?: string;
  display?: "none" | "number" | "time" | "percentage";
  description?: string;
  singularName?: string;
  pluralName?: string;

  count: Decimal;
  maxCount?: Decimal;
  minCount?: Decimal;
  extra: Record<string, any>;

  value: () => Decimal;
  cost: (n: DecimalSource) => ResourceCount<Context, TickResult>[];
  unlockCost?: () => ResourceCount<Context, TickResult>[];

  shouldTick?: (dt: number, source?: string) => boolean;
  tick?: (dt: number, source?: string) => Nullable<TickResult>;

  buy: (
    amount?: PurchaseAmount,
    style?: PurchaseStyle,
    gainFactor?: DecimalSource,
    costFactor?: DecimalSource,
    countOverride?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;
  sell: (
    amount?: PurchaseAmount,
    style?: PurchaseStyle,
    gainFactor?: DecimalSource,
    sellFactor?: DecimalSource,
    countOverride?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;
  add: (
    amount?: PurchaseAmount,
    gainFactor?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;

  canBuy: (
    amount?: PurchaseAmount,
    costFactor?: DecimalSource,
    countOverride?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;

  gainFactor?: (m: DecimalSource) => DecimalSource;
  costFactor?: (m: DecimalSource) => DecimalSource;

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

  canAfford: (cost: ResourceCount<Context, TickResult>[]) => boolean;
  purchase: (
    toBuy: ResourceCount<Context, TickResult>[],
    style?: PurchaseStyle,
    gainFactor?: DecimalSource,
    costFactor?: DecimalSource,
    countOverride?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;
  purchaseAll: (
    resources?: Record<string, DecimalSource | undefined>,
    amount?: PurchaseAmount,
    style?: PurchaseStyle,
    gainFactor?: DecimalSource,
    costFactor?: DecimalSource,
    countOverride?: DecimalSource,
  ) => PurchaseCost<Context, TickResult>;

  update: (now?: number, source?: string) => TickResult[];
  onUpdateComplete?: (
    changes: Record<string, Decimal>,
    dt: number,
    source: string,
  ) => TickResult;

  gainFactor?: (m: DecimalSource) => DecimalSource;
  costFactor?: (m: DecimalSource) => DecimalSource;

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

export type PurchaseAmount =
  | DecimalSource
  | {
      minAmount: number;
      maxAmount: number;
      increments: number;
    };

export type PurchaseCost<Context = any, TickResult = any> = {
  count: DecimalSource;
  style: PurchaseStyle;
  gain: ResolvedRC<Context, TickResult>[];
  cost: ResolvedRC<Context, TickResult>[];
};

export function genResource<Context, TickResult>(
  rm: ResourceManager<Context, TickResult>,
  name: string,
): Resource<Context, TickResult> {
  const res: Resource<Context, TickResult> = {
    manager: rm,
    name,
    priority: Infinity,
    count: Decimal.dZero,
    extra: {},

    value() {
      return res.count.clamp(res.minCount ?? 0, res.maxCount ?? Infinity);
    },
    cost() {
      return [];
    },

    buy(amount = 1, style = "partial", gain = 1, cost = 1, override) {
      return purchaseVariable(res, amount, style, gain, cost, override);
    },
    sell(amount = 1, style = "full", gain = 1, cost = 1, override) {
      return res.buy(
        typeof amount !== "object" || amount instanceof Decimal
          ? Decimal.neg(amount)
          : Obj.map(amount, (n) => -(n ?? 0)),
        style,
        gain,
        cost,
        override,
      );
    },
    add(amount, gainFactor) {
      return res.buy(amount, "free", gainFactor);
    },
    canBuy(amount, costFactor, countOverride) {
      return res.buy(amount, "dry-partial", 1, costFactor, countOverride);
    },

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

    canAfford: (cost) => canAfford(resolveAll(rm, cost)),
    purchase: (toBuy, style = "partial", gain = 1, cost = 1, override) =>
      purchase(rm, toBuy, style, gain, cost, override),
    purchaseAll: (ress = {}, amount = 1, style, gain = 1, cost = 1, override) =>
      purchaseAll(rm, ress, amount, style ?? "partial", gain, cost, override),

    update: (now, source) => update(rm, now ?? Date.now(), source ?? "unknown"),
    execution: {},
  };

  timers.forEach((res) => upsert(rm, res));
  return setSaveProperties(rm, ["resources"]);
}

function resolve<C, R>(
  rm: ResourceManager<C, R>,
  res: Partial<Resource<C, R>> | string,
): Resource<C, R> {
  return (
    rm.resources[typeof res === "string" ? res : res.name ?? ""] ??
    upsert(rm, res)
  );
}

type ResolvedRC<C, R> = { resource: Resource<C, R>; count: DecimalSource };
function resolveAll<C, R>(
  rm: ResourceManager<C, R>,
  rcs: ResourceCount<C, R>[],
): ResolvedRC<C, R>[] {
  return rcs
    .map(({ resource, count }) => ({ resource: resolve(rm, resource), count }))
    .filter(({ resource, count }) => resource && Decimal.neq(count, 0));
}

function upsert<C, R>(
  rm: ResourceManager<C, R>,
  props: Partial<Resource<C, R>> | string,
): Resource<C, R> {
  const name = typeof props === "string" ? props : props.name ?? "";
  const res = rm.resources[name] ?? genResource(rm, name);

  if (typeof props !== "string") {
    let k: keyof Resource<C, R>;
    for (k in props) {
      if (k === "extra") {
        Obj.assign(res, k, props[k]);
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

function update<C, R>(
  rm: ResourceManager<C, R>,
  now: number,
  source: string,
): R[] {
  const {
    rateUpdateSecs = 0.1,
    rateHistoryWindow = 10,
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
      if (canAfford(resolveAll(rm, (res.unlockCost ?? res.cost)(1)), false)) {
        res.unlocked = true;
      }
    }
  });

  const resources = Object.values(rm.resources)
    .filter((res) => (res.unlocked ?? true) && !res.disabled)
    .sort((a, b) => a.priority - b.priority);

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

  const results: Record<string, R[]> = {};
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
    if (res.autoAward && !res.disabled && res.count.lt(res.maxCount ?? 0)) {
      const req = res.cost(res.count.add(1));
      if (canAfford(resolveAll(rm, req), false)) {
        res.count = res.count.add(1);

        if (res.onPurchase) {
          res.onPurchase({
            count: 1,
            style: "free",
            gain: [{ resource: res, count: 1 }],
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
      res.rate.count = res.count.minus(res.rate.lastCount ?? 0).div(rateDt);
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
    cache[res.name] = res.count.minus(cache[res.name] ?? 0);
    if (cache[res.name].eq(0)) {
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
    lastResult: Arr.dedupe(Object.values(results).flat()),
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

function canAfford<C, R>(cost: ResolvedRC<C, R>[], toSpend = true): boolean {
  return combineResources(cost).every(
    ({ resource, count }) =>
      (resource.unlocked ?? true) &&
      resource.count.minus(count).gte(toSpend ? resource.minCount ?? 0 : 0),
  );
}

function purchaseVariable<C, R>(
  resource: Resource<C, R>,
  amount: PurchaseAmount,
  style: PurchaseStyle,
  gainFactor: DecimalSource,
  costFactor: DecimalSource,
  countOverride?: DecimalSource,
): PurchaseCost<C, R> {
  if (typeof amount !== "object" || amount instanceof Decimal) {
    return purchase(
      resource.manager,
      [{ resource, count: amount }],
      style,
      gainFactor,
      costFactor,
      countOverride,
    );
  }

  const current = getResourceCount(resource, countOverride).toNumber();
  if (
    !isFinite(current) ||
    Math.abs(amount.minAmount) > Math.abs(amount.maxAmount) ||
    Math.abs(amount.maxAmount) > 1000 ||
    amount.increments === 0
  ) {
    return { count: 0, style, gain: [], cost: [] };
  }

  const minCount = resource.minCount?.toNumber() ?? 0,
    maxCount = resource.maxCount?.toNumber() ?? Infinity,
    increment = amount.increments;
  function adjust(c: number) {
    return (
      clamp(
        Math.floor((current + c) / increment) * increment,
        minCount,
        maxCount,
      ) - current
    );
  }

  // Try to buy max amount allowed
  let toBuy = purchase(
    resource.manager,
    [{ resource, count: adjust(amount.maxAmount) }],
    "dry-partial",
    gainFactor,
    costFactor,
    countOverride,
  );
  let pCount = (toBuy.count as Decimal).toNumber();

  // Something partial came back, so adjust it to increments
  if (pCount % increment !== 0) {
    toBuy = purchase(
      resource.manager,
      [{ resource, count: adjust(pCount) }],
      "dry-partial",
      gainFactor,
      costFactor,
      countOverride,
    );
    pCount = (toBuy.count as Decimal).toNumber();
  }

  // Can't afford anything
  if (
    pCount === 0 ||
    (amount.minAmount >= 0 && pCount < amount.minAmount) ||
    (amount.minAmount < 0 && pCount > amount.minAmount)
  ) {
    if (!style.includes("dry")) {
      return { count: 0, style, gain: [], cost: [] };
    }

    const adjusted = adjust(
      clamp(
        increment,
        Math.min(amount.minAmount, amount.maxAmount),
        Math.max(amount.minAmount, amount.maxAmount),
      ),
    );
    toBuy = purchase(
      resource.manager,
      [{ resource, count: adjusted === 0 ? Math.sign(increment) : adjusted }],
      "dry-full",
      gainFactor,
      costFactor,
      countOverride,
    );
    pCount = (toBuy.count as Decimal).toNumber();
  }

  if (style.includes("dry")) {
    return toBuy;
  } else {
    return purchase(
      resource.manager,
      [{ resource, count: pCount }],
      style,
      gainFactor,
      costFactor,
      countOverride,
    );
  }
}

function purchase<C, R>(
  rm: ResourceManager<C, R>,
  toBuy: ResourceCount<C, R>[],
  style: PurchaseStyle,
  gainFactor: DecimalSource,
  costFactor: DecimalSource,
  countOverride?: DecimalSource,
): PurchaseCost<C, R> {
  gainFactor = rm.gainFactor ? rm.gainFactor(gainFactor) : gainFactor;
  costFactor = rm.costFactor ? rm.costFactor(costFactor) : costFactor;

  const costs = resolveAll(rm, toBuy).map(({ resource, count }) => {
    const rcCost = getPurchaseCost(
      rm,
      resource,
      count,
      style,
      resource.gainFactor ? resource.gainFactor(gainFactor) : gainFactor,
      resource.costFactor ? resource.costFactor(costFactor) : costFactor,
      countOverride,
    );

    if (style.includes("dry") || Decimal.eq(rcCost.count, 0)) {
      return rcCost;
    } else {
      if (!(resource.unlocked ?? true)) {
        if (resource.unlockCost) {
          resource.unlocked = true;
        } else {
          return { count: 0, style, gain: [], cost: [] };
        }
      }

      const gain = applyToResource(resource, rcCost.gain);
      const cost = rcCost.cost
        .map(({ resource, count }) =>
          applyToResource(resource, [{ resource, count: Decimal.neg(count) }]),
        )
        .flat();

      const purchaseCost = { ...rcCost, gain, cost };
      if (resource.onPurchase) {
        resource.onPurchase(purchaseCost);
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

function purchaseAll<C, R>(
  rm: ResourceManager<C, R>,
  resources: Record<string, DecimalSource | undefined>,
  amount: PurchaseAmount,
  style: PurchaseStyle,
  gainFactor: DecimalSource,
  costFactor: DecimalSource,
  countOverride?: DecimalSource,
): PurchaseCost<C, R> {
  let toBuy = Object.values(rm.resources).filter(
    (res) => (res.unlocked ?? true) && !res.disabled,
  );
  const limits = Object.keys(resources);
  if (limits.length > 0) {
    toBuy = toBuy.filter((res) => limits.includes(res.name));
  }

  const costs = toBuy.map((res) => {
    return purchaseVariable(
      res,
      amount,
      style,
      gainFactor,
      costFactor,
      resources[res.name] ?? countOverride,
    );
  });
  return {
    count: costs.reduce((count, rc) => count.plus(rc.count), Decimal.dZero),
    style,
    gain: combineResources(costs.map((rcCost) => rcCost.gain).flat()),
    cost: combineResources(costs.map((rcCost) => rcCost.cost).flat()),
  };
}

function getPurchaseCost<C, R>(
  rm: ResourceManager<C, R>,
  resource: Resource<C, R>,
  amount: DecimalSource,
  style: PurchaseStyle,
  gainFactor: DecimalSource,
  costFactor: DecimalSource,
  countOverride?: DecimalSource,
): PurchaseCost<C, R> {
  if (!resource || Decimal.eq(amount, 0)) {
    return { count: 0, style, gain: [], cost: [] };
  }

  let start = getResourceCount(resource, countOverride);
  let target = start
    .plus(amount)
    .clamp(resource.minCount ?? 0, resource.maxCount ?? Infinity);

  if (style === "free") {
    const diff = target.minus(start);
    return {
      count: diff,
      style,
      gain: [{ resource, count: diff.mul(gainFactor) }],
      cost: [],
    };
  }

  if (start.gt(target)) {
    [start, target] = [target, start];
    [gainFactor, costFactor] = [
      Decimal.neg(gainFactor),
      Decimal.neg(costFactor).mul(rm.settings.sellRatio ?? 1),
    ];
  }

  let cost: ResolvedRC<C, R>[] = [];
  if (!(resource.unlocked ?? true) && resource.unlockCost) {
    cost = resolveAll(rm, resource.unlockCost());
  }

  const s = start.floor().toNumber(),
    t = target.floor().toNumber();
  if (!isFinite(s) || !isFinite(t) || Math.abs(t - s) > 1000) {
    return { count: 0, style, gain: [], cost: [] };
  }

  let partialCount = 0;
  for (let i = s; i < t; i++) {
    const curCost = resolveAll(rm, resource.cost(i + 1));
    curCost.forEach((rc) => (rc.count = Decimal.mul(rc.count, costFactor)));
    const partialCost = combineResources([...cost, ...curCost]);

    if (style.includes("partial") && !canAfford(partialCost)) {
      break;
    } else {
      partialCount++;
      cost = partialCost;
    }
  }

  if (
    (!style.includes("dry") && !canAfford(cost)) ||
    (style === "full" && partialCount !== t - s)
  ) {
    return { count: 0, style, gain: [], cost: [] };
  } else {
    return {
      count: partialCount * Decimal.sign(gainFactor),
      style,
      gain: [{ resource, count: Decimal.mul(gainFactor, partialCount) }],
      cost,
    };
  }
}

function getResourceCount(res?: Resource, override?: DecimalSource): Decimal {
  if (override != null) {
    if (
      res != null &&
      typeof override === "string" &&
      res.extra[override] != null
    ) {
      return Decimal.fromValue_noAlloc(res.extra[override]);
    } else {
      return Decimal.fromValue_noAlloc(override);
    }
  } else if (res != null) {
    return res.count;
  } else {
    return Decimal.dNaN;
  }
}

function combineResources<C, R>(rcs: ResolvedRC<C, R>[]): ResolvedRC<C, R>[] {
  const res: Record<string, ResolvedRC<C, R>> = {};
  rcs.forEach(({ resource, count }) => {
    res[resource.name] ??= { resource, count: 0 };
    res[resource.name].count = Decimal.add(res[resource.name].count, count);
  });
  return Object.values(res).filter(({ count }) => Decimal.neq(count, 0));
}

function applyToResource<C, R>(
  res: Resource<C, R>,
  rcs: ResolvedRC<C, R>[],
): ResolvedRC<C, R>[] {
  return combineResources(
    rcs
      .filter(({ resource }) => res.name === resource.name)
      .map(({ count }) => {
        const prev = res.count;
        res.count = res.count
          .plus(count)
          .clamp(res.minCount ?? 0, res.maxCount ?? Infinity);

        return [{ resource: res, count: res.count.minus(prev) }];
      })
      .flat(),
  );
}
