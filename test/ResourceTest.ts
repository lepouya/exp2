import "mocha";

import Decimal, { DecimalSource } from "break_eternity.js";
import { expect } from "chai";

import { timers } from "../src/data/timers";
import { genResourceManager } from "../src/model/Resource";

const D = Decimal.fromValue;
const N = (n?: DecimalSource) => (n ? D(n).toNumber() : undefined);

describe("Creating resources", () => {
  it("Empty resource manager set up correctly", () => {
    const rm = genResourceManager(null, {});
    const timerKeys = timers.map((r) => r.name);
    const keys = Object.keys(rm.resources).filter(
      (k) => !timerKeys.includes(k),
    );
    expect(keys).to.deep.equal([]);
  });

  it("Creating new resource works", () => {
    const rm = genResourceManager(null, {});
    const R1 = rm.upsert({ name: "test1" });

    expect(rm.resources["test1"]).to.equal(R1);
    expect(rm.resources["test1"].name).to.equal("test1");
  });

  it("Adding multiple fields", () => {
    const rm = genResourceManager(null, {});
    const R1 = rm.upsert({ name: "test1", count: D(5), maxCount: D(1) });
    const R2 = rm.upsert({ name: "test2", extra: { bonus: 1 } });

    expect(rm.resources["test1"]).to.equal(R1);
    expect(rm.resources["test1"].name).to.equal("test1");
    expect(N(rm.resources["test1"].count)).to.be.approximately(5, 0.001);
    expect(rm.resources["test1"].extra["bonus"]).to.be.undefined;
    expect(N(rm.resources["test1"].maxCount)).to.be.approximately(1, 0.001);

    expect(rm.resources["test2"]).to.equal(R2);
    expect(rm.resources["test2"].name).to.equal("test2");
    expect(N(rm.resources["test2"].count)).to.be.approximately(0, 0.001);
    expect(rm.resources["test2"].extra["bonus"]).to.be.approximately(1, 0.001);
    expect(rm.resources["test2"].extra["auto"]).to.be.undefined;
    expect(rm.resources["test2"].maxCount).to.be.undefined;
  });

  it("Overwriting fields", () => {
    const rm = genResourceManager(null, {});
    const R1 = rm.upsert({ name: "test1", count: D(5) });
    const R2 = rm.upsert({ name: "test1", extra: { auto: 7 }, maxCount: D(1) });

    expect(rm.resources["test1"]).to.equal(R1);
    expect(rm.resources["test1"]).to.equal(R2);
    expect(rm.resources["test1"].name).to.equal("test1");
    expect(N(rm.resources["test1"].count)).to.be.approximately(5, 0.001);
    expect(rm.resources["test1"].extra["auto"]).to.be.approximately(7, 0.001);
    expect(N(rm.resources["test1"].maxCount)).to.be.approximately(1, 0.001);
  });
});

describe("Updating resources", () => {
  it("Time is updated correctly", () => {
    const settings = { lastUpdate: 1000 };
    const rm = genResourceManager(null, settings);

    rm.update(2000);
    expect(settings.lastUpdate).to.be.equal(2000);

    rm.update(3000);
    expect(settings.lastUpdate).to.be.equal(3000);
  });

  it("Time below min delta doesn't change anything", () => {
    const settings = { lastUpdate: 1000 };
    const rm = genResourceManager(null, settings);

    rm.update(1000.1);
    expect(settings.lastUpdate).to.be.equal(1000);
  });

  it("Resource ticks called corectly", () => {
    const settings = { lastUpdate: 0 };
    const rm = genResourceManager(null, settings);

    rm.upsert({
      name: "test1",
      tick: (dt) => (rm.get("test1").count = rm.get("test1").count.plus(dt)),
    });
    rm.upsert({
      name: "test2",
      tick: () => (rm.get("test2").count = rm.get("test2").count.add(1)),
    });

    rm.update(500);
    expect(settings.lastUpdate).to.be.equal(500);
    expect(N(rm.resources["test1"].count)).to.be.equal(0.5);
    expect(N(rm.resources["test2"].count)).to.be.equal(1);

    rm.update(1500);
    expect(settings.lastUpdate).to.be.equal(1500);
    expect(N(rm.resources["test1"].count)).to.be.equal(1.5);
    expect(N(rm.resources["test2"].count)).to.be.equal(2);
  });

  it("Tick granularity works as expected", () => {
    const settings = { lastUpdate: 0 };
    const rm = genResourceManager(null, settings);

    const R1 = rm.upsert({ name: "test1" });
    R1.tick = (dt) => {
      R1.count = R1.count.plus(dt);
    };
    const R2 = rm.upsert({ name: "test2" });
    R2.tick = () => {
      R2.count = R2.count.add(1);
    };

    rm.update(0.5);
    expect(settings.lastUpdate).to.be.equal(0);
    expect(N(rm.resources["test1"].count)).to.be.equal(0);
    expect(N(rm.resources["test2"].count)).to.be.equal(0);

    rm.update(500);
    expect(settings.lastUpdate).to.be.equal(500);
    expect(N(rm.resources["test1"].count)).to.be.equal(0.5);
    expect(N(rm.resources["test2"].count)).to.be.equal(1);

    rm.update(1000);
    expect(settings.lastUpdate).to.be.equal(1000);
    expect(N(rm.resources["test1"].count)).to.be.equal(1);
    expect(N(rm.resources["test2"].count)).to.be.equal(2);

    rm.update(10000);
    expect(settings.lastUpdate).to.be.equal(10000);
    expect(N(rm.resources["test1"].count)).to.be.equal(10);
    expect(N(rm.resources["test2"].count)).to.be.equal(11);
  });

  it("Max tick update works", () => {
    const settings = { lastUpdate: 0 };
    const rm = genResourceManager(null, settings);

    rm.upsert("test1").tick = function (dt) {
      rm.get("test1").count = rm.get("test1").count.add(dt);
    };
    rm.upsert("test2").tick = function () {
      rm.get("test2").count = rm.get("test2").count.add(1);
    };

    rm.update(500);
    expect(settings.lastUpdate).to.be.equal(500);
    expect(N(rm.resources["test1"].count)).to.be.equal(0.5);
    expect(N(rm.resources["test2"].count)).to.be.equal(1);

    rm.update(100000000);
    expect(settings.lastUpdate).to.be.equal(100000000);
    expect(N(rm.resources["test1"].count)).to.be.equal(86400.5);
    expect(N(rm.resources["test2"].count)).to.be.equal(86401);
  });

  it("Rate update works", () => {
    const settings = { lastUpdate: 0 };
    const rm = genResourceManager(null, settings);

    rm.upsert({
      name: "test1",
      tick: (dt) => (rm.get("test1").count = rm.get("test1").count.plus(dt)),
    });
    rm.upsert({
      name: "test2",
      tick: () =>
        (rm.get("test2").count = rm
          .get("test2")
          .count.plus(rm.get("test1").value())),
    });

    rm.update(1000);
    expect(N(rm.resources["test1"].count)).to.be.equal(1);
    expect(N(rm.resources["test2"].count)).to.be.equal(1);

    rm.update(2000);
    expect(N(rm.resources["test1"].count)).to.be.equal(2);
    expect(N(rm.resources["test1"].rate.count)).to.be.equal(1);
    expect(N(rm.resources["test2"].count)).to.be.equal(3);
    expect(N(rm.resources["test2"].rate.count)).to.be.equal(2);

    rm.update(5000);
    expect(N(rm.resources["test1"].count)).to.be.equal(5);
    expect(N(rm.resources["test1"].rate.count)).to.be.equal(1);
    expect(N(rm.resources["test2"].count)).to.be.equal(15);
    expect(N(rm.resources["test2"].rate.count)).to.be.equal(4);
  });
});

describe("Purchasing", () => {
  it("Simple purchases", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(10) });
    const r2 = rm.upsert({ name: "r2", count: D(0) });
    r2.cost = () => [{ resource: "r1", count: D(1) }];

    rm.purchase([{ resource: "r2", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(9, 0.001);
    expect(N(r2.count)).to.be.approximately(1, 0.001);

    rm.purchase([{ resource: "r2", count: D(4) }]);
    expect(N(r1.count)).to.be.approximately(5, 0.001);
    expect(N(r2.count)).to.be.approximately(5, 0.001);
  });

  it("Full purchases", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(10) });
    const r2 = rm.upsert({ name: "r2", count: D(0) });
    r2.cost = () => [{ resource: "r1", count: D(1) }];

    rm.purchase([{ resource: "r2", count: D(3) }], "full");
    expect(N(r1.count)).to.be.approximately(7, 0.001);
    expect(N(r2.count)).to.be.approximately(3, 0.001);

    rm.purchase([{ resource: "r2", count: D(4) }], "full");
    expect(N(r1.count)).to.be.approximately(3, 0.001);
    expect(N(r2.count)).to.be.approximately(7, 0.001);

    rm.purchase([{ resource: "r2", count: D(5) }], "full");
    expect(N(r1.count)).to.be.approximately(3, 0.001);
    expect(N(r2.count)).to.be.approximately(7, 0.001);
  });

  it("Partial purchases", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(10) });
    const r2 = rm.upsert({ name: "r2", count: D(0) });
    r2.cost = () => [{ resource: "r1", count: D(1) }];

    rm.purchase([{ resource: "r2", count: D(3) }], "partial");
    expect(N(r1.count)).to.be.approximately(7, 0.001);
    expect(N(r2.count)).to.be.approximately(3, 0.001);

    rm.purchase([{ resource: "r2", count: D(4) }], "partial");
    expect(N(r1.count)).to.be.approximately(3, 0.001);
    expect(N(r2.count)).to.be.approximately(7, 0.001);

    rm.purchase([{ resource: "r2", count: D(5) }], "partial");
    expect(N(r1.count)).to.be.approximately(0, 0.001);
    expect(N(r2.count)).to.be.approximately(10, 0.001);
  });

  it("Free purchases", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(10) });
    const r2 = rm.upsert({ name: "r2", count: D(0) });
    r2.cost = () => [{ resource: "r1", count: D(1) }];

    rm.purchase([{ resource: "r2", count: D(3) }], "free");
    expect(N(r1.count)).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(3, 0.001);
  });

  it("Locked purchases", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(10) });
    const r2 = rm.upsert({ name: "r2", count: D(0) });
    r2.cost = () => [{ resource: "r1", count: D(1) }];
    r2.unlocked = false;

    rm.purchase([{ resource: "r2", count: D(3) }]);
    expect(N(r1.count)).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(0, 0.001);

    r1.unlocked = false;
    r2.unlocked = true;

    rm.purchase([{ resource: "r2", count: D(3) }]);
    expect(N(r1.count)).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(0, 0.001);

    r1.unlocked = true;

    rm.purchase([{ resource: "r2", count: D(3) }]);
    expect(N(r1.count)).to.be.approximately(7, 0.001);
    expect(N(r2.count)).to.be.approximately(3, 0.001);
  });

  it("Complex purchases", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(100) });
    const r2 = rm.upsert({ name: "r2", count: D(20) });
    const r3 = rm.upsert({ name: "r3", count: D(0) });
    r3.cost = (n) => [
      { resource: "r1", count: D(n).pow(2) },
      { resource: "r2", count: n },
    ];

    rm.purchase([{ resource: "r3", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(99, 0.001);
    expect(N(r2.count)).to.be.approximately(19, 0.001);
    expect(N(r3.count)).to.be.approximately(1, 0.001);

    rm.purchase([{ resource: "r3", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(95, 0.001);
    expect(N(r2.count)).to.be.approximately(17, 0.001);
    expect(N(r3.count)).to.be.approximately(2, 0.001);

    rm.purchase([{ resource: "r3", count: D(2) }]);
    expect(N(r1.count)).to.be.approximately(70, 0.001);
    expect(N(r2.count)).to.be.approximately(10, 0.001);
    expect(N(r3.count)).to.be.approximately(4, 0.001);

    rm.purchase([{ resource: "r3", count: D(2) }], "full");
    expect(N(r1.count)).to.be.approximately(70, 0.001);
    expect(N(r2.count)).to.be.approximately(10, 0.001);
    expect(N(r3.count)).to.be.approximately(4, 0.001);

    rm.purchase([{ resource: "r3", count: D(2) }], "partial");
    expect(N(r1.count)).to.be.approximately(45, 0.001);
    expect(N(r2.count)).to.be.approximately(5, 0.001);
    expect(N(r3.count)).to.be.approximately(5, 0.001);

    rm.purchase([{ resource: "r3", count: D(2) }], "free");
    expect(N(r1.count)).to.be.approximately(45, 0.001);
    expect(N(r2.count)).to.be.approximately(5, 0.001);
    expect(N(r3.count)).to.be.approximately(7, 0.001);
  });

  it("Multiple purchases", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(100), extra: { auto: 10 } });
    const r2 = rm.upsert({ name: "r2", count: D(20) });
    const r3 = rm.upsert({ name: "r3", count: D(0) });
    r2.cost = (n) => [{ resource: "r1", count: n }];
    r3.cost = (n) => [
      { resource: "r1", count: D(n).pow(2) },
      { resource: "r2", count: n },
    ];

    rm.purchase([{ resource: "r3", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(99, 0.001);
    expect(r1.extra["auto"]).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(19, 0.001);
    expect(N(r3.count)).to.be.approximately(1, 0.001);

    rm.purchase([{ resource: "r2", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(79, 0.001);
    expect(N(r2.count)).to.be.approximately(20, 0.001);
    expect(N(r3.count)).to.be.approximately(1, 0.001);

    rm.purchase([
      { resource: "r3", count: D(2) },
      { resource: "r2", count: D(2) },
    ]);
    expect(N(r1.count)).to.be.approximately(33, 0.001);
    expect(N(r2.count)).to.be.approximately(17, 0.001);
    expect(N(r3.count)).to.be.approximately(3, 0.001);
  });

  it("Dry purchases", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(100), extra: { auto: 10 } });
    const r2 = rm.upsert({ name: "r2", count: D(20) });
    const r3 = rm.upsert({ name: "r3", count: D(0) });
    r2.cost = (n) => [
      { resource: "r1", count: n },
      { resource: "r1", count: D(1) },
    ];
    r3.cost = (n) => [
      { resource: "r1", count: D(n).pow(2) },
      { resource: "r2", count: n },
    ];

    let canBuy = rm.purchase([{ resource: "r3", count: D(1) }], "dry-full");
    expect(N(r1.count)).to.be.approximately(100, 0.001);
    expect(r1.extra["auto"]).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(20, 0.001);
    expect(N(r3.count)).to.be.approximately(0, 0.001);
    expect(canBuy.gain).to.deep.equal([{ resource: r3, count: D(1) }]);

    canBuy = rm.purchase([{ resource: "r2", count: D(1) }], "dry-full");
    expect(N(r1.count)).to.be.approximately(100, 0.001);
    expect(r1.extra["auto"]).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(20, 0.001);
    expect(N(r3.count)).to.be.approximately(0, 0.001);
    expect(canBuy.gain).to.deep.equal([{ resource: r2, count: D(1) }]);

    canBuy = rm.purchase(
      [
        { resource: r3, count: D(10) },
        { resource: "r2", count: D(10) },
      ],
      "dry-partial",
    );
    expect(canBuy.gain).to.deep.equal([
      { resource: r3, count: D(5) },
      { resource: r2, count: D(4) },
    ]);
  });
});

describe("ResourceHelper", () => {
  it("Helper methods", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(100), extra: { auto: 10 } });
    const r2 = rm.upsert({ name: "r2", count: D(20) });
    const r3 = rm.upsert({ name: "r3", count: D(0) });
    r1.value = () =>
      Object.values(r1.extra).reduce((s, c) => s.plus(c), r1.count);
    r2.cost = (n) => [
      { resource: "r1", count: n },
      { resource: "r1", count: D(1) },
    ];
    r3.cost = (n) => [
      { resource: "r1", count: D(n).pow(2) },
      { resource: "r2", count: n },
    ];

    expect(N(rm.get(r1).value())).to.be.approximately(110, 0.001);
    expect(rm.get("r1").extra["auto"]).to.be.approximately(10, 0.001);
    expect(N(rm.get("r2").value())).to.be.approximately(20, 0.001);
    expect(N(rm.get(r3).value())).to.be.approximately(0, 0.001);

    expect(N(rm.get("r3").canBuy().count)).to.be.approximately(1, 0.001);
    expect(N(rm.get("r2").canBuy(D(1)).count)).to.be.approximately(1, 0.001);
    expect(N(rm.get(r3).canBuy(D(10)).count)).to.be.approximately(5, 0.001);
    expect(N(rm.get(r2).canBuy(D(10)).count)).to.be.approximately(4, 0.001);

    expect(N(rm.get(r1).add(D(3)).count)).to.be.approximately(3, 0.001);
    expect(N(rm.get(r1).value())).to.be.approximately(113, 0.001);
    expect(N(rm.get(r1).count)).to.be.approximately(103, 0.001);
    expect(rm.get(r1).extra["auto"]).to.be.approximately(10, 0.001);

    expect(N(rm.get(r3).add(D(10)).count)).to.be.approximately(10, 0.001);
    expect(N(rm.get(r1).value())).to.be.approximately(113, 0.001);
    expect(N(rm.get(r2).value())).to.be.approximately(20, 0.001);
    expect(N(rm.get(r3).value())).to.be.approximately(10, 0.001);

    r1.count = D(100);
    r3.count = D(0);

    expect(N(rm.get(r3).buy().count)).to.be.approximately(1, 0.001);
    expect(N(r1.count)).to.be.approximately(99, 0.001);
    expect(r1.extra["auto"]).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(19, 0.001);
    expect(N(r3.count)).to.be.approximately(1, 0.001);

    expect(N(rm.get(r2).buy(D(1)).count)).to.be.approximately(1, 0.001);
    expect(N(r1.count)).to.be.approximately(78, 0.001);
    expect(N(r2.count)).to.be.approximately(20, 0.001);
    expect(N(r3.count)).to.be.approximately(1, 0.001);

    expect(N(rm.get(r3).buy(D(2)).count)).to.be.approximately(2, 0.001);
    expect(N(rm.get(r2).buy(D(2)).count)).to.be.approximately(2, 0.001);
    expect(N(r1.count)).to.be.approximately(30, 0.001);
    expect(N(r2.count)).to.be.approximately(17, 0.001);
    expect(N(r3.count)).to.be.approximately(3, 0.001);
  });
});

describe("Task execution", () => {
  it("Task executor enables and disabled task runs", () => {
    const settings = { lastUpdate: 0 };
    const rm = genResourceManager(null, settings);

    const t1 = rm.upsert({
      name: "test1",
      tick: (dt) => dt.toString(),
      unlocked: false,
    });

    expect(rm.update(1)).to.deep.equal([]);
    expect(t1.execution.lastTick).to.be.undefined;
    expect(t1.execution.lastAttempt).to.be.undefined;

    expect(rm.update(2)).to.deep.equal([]);
    expect(t1.execution.lastTick).to.be.undefined;
    expect(t1.execution.lastAttempt).to.be.undefined;

    expect(rm.update(1000)).to.deep.equal([]);
    expect(t1.execution.lastTick).to.be.undefined;
    expect(t1.execution.lastAttempt).to.be.undefined;

    t1.unlocked = true;

    expect(rm.update(2000)).to.deep.equal(["1"]);
    expect(t1.execution.lastTick).to.be.equal(2000);
    expect(t1.execution.lastAttempt).to.be.equal(2000);

    expect(rm.update(2001)).to.deep.equal(["0.001"]);
    expect(t1.execution.lastTick).to.be.equal(2001);
    expect(t1.execution.lastAttempt).to.be.equal(2001);

    expect(rm.update(3000)).to.deep.equal(["0.999"]);
    expect(t1.execution.lastTick).to.be.equal(3000);
    expect(t1.execution.lastAttempt).to.be.equal(3000);

    t1.unlocked = false;

    expect(rm.update(4000)).to.deep.equal([]);
    expect(t1.execution.lastTick).to.be.equal(3000);
    expect(t1.execution.lastAttempt).to.be.equal(3000);
  });

  it("Task executor schedules tasks correctly", () => {
    const settings = { maxResourceTickSecs: 5 };
    const rm = genResourceManager(null, settings);

    const t1 = rm.upsert({
      name: "1/sec",
      shouldTick: (dt) => dt >= 1,
      tick: (dt) => t1.name + "-" + dt.toString(),
    });
    const t2 = rm.upsert({
      name: "2/sec",
      shouldTick: (dt) => dt >= 0.5,
      tick: (dt) => t2.name + "-" + dt.toString(),
    });

    expect(rm.update(1000)).to.deep.equal([]);
    expect(rm.update(1100)).to.deep.equal([]);
    expect(rm.update(1200)).to.deep.equal([]);
    expect(rm.update(1500)).to.deep.equal(["2/sec-0.5"]);
    expect(rm.update(1750)).to.deep.equal([]);
    expect(rm.update(2000)).to.deep.equal(["1/sec-1", "2/sec-0.5"]);
    expect(rm.update(3000)).to.deep.equal(["1/sec-1", "2/sec-1"]);
    expect(rm.update(5000)).to.deep.equal(["1/sec-2", "2/sec-2"]);
    expect(rm.update(5555)).to.deep.equal(["2/sec-0.555"]);
    expect(rm.update(15555)).to.deep.equal([
      "1/sec-5.555",
      "1/sec-5",
      "2/sec-5",
    ]);
  });

  it("Task executor updates rates", () => {
    const settings = { maxResourceTickSecs: 5, rateUpdateSecs: 1 };
    const rm = genResourceManager(null, settings);

    const t1 = rm.upsert({
      name: "1/sec",
      shouldTick: (dt) => dt >= 1,
      tick: (dt) => t1.name + "-" + dt.toString(),
    });
    const t2 = rm.upsert({
      name: "2/sec",
      shouldTick: (dt) => dt >= 0.5,
      tick: (dt) => t2.name + "-" + dt.toString(),
    });

    expect(t1.rate.ticks).to.be.approximately(0, 0.001);
    expect(t2.rate.ticks).to.be.approximately(0, 0.001);
    rm.update(1000);
    expect(t1.rate.ticks).to.be.approximately(0, 0.001);
    expect(t2.rate.ticks).to.be.approximately(0, 0.001);
    rm.update(1100);
    rm.update(1200);
    rm.update(1500);
    expect(t1.rate.ticks).to.be.approximately(0, 0.001);
    expect(t2.rate.ticks).to.be.approximately(0, 0.001);
    rm.update(1750);
    expect(t1.rate.ticks).to.be.approximately(0, 0.001);
    expect(t2.rate.ticks).to.be.approximately(0, 0.001);
    rm.update(2000);
    expect(t1.rate.ticks).to.be.approximately(1, 0.001);
    expect(t2.rate.ticks).to.be.approximately(2, 0.001);
    rm.update(3000);
    expect(t1.rate.ticks).to.be.approximately(1, 0.001);
    expect(t2.rate.ticks).to.be.approximately(1, 0.001);
    rm.update(5000);
    expect(t1.rate.ticks).to.equal(0.5);
    expect(t2.rate.ticks).to.equal(0.5);
    rm.update(5555);
    expect(t1.rate.ticks).to.equal(0.5);
    expect(t2.rate.ticks).to.equal(0.5);
    rm.update(6500);
    expect(t1.rate.ticks).to.equal(1 / 1.5);
    expect(t2.rate.ticks).to.equal(2 / 1.5);
    rm.update(16500);
    expect(t1.rate.ticks).to.equal(0.2);
    expect(t2.rate.ticks).to.equal(0.2);
  });
});

describe("Gain and cost multipliers", () => {
  it("Simple multipliers", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(10) });
    const r2 = rm.upsert({ name: "r2", count: D(0) });
    r2.cost = () => [{ resource: "r1", count: D(1) }];

    rm.purchase([{ resource: "r2", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(9, 0.001);
    expect(N(r2.count)).to.be.approximately(1, 0.001);

    rm.purchase([{ resource: "r2", count: D(2) }], undefined, D(2), D(1));
    expect(N(r1.count)).to.be.approximately(7, 0.001);
    expect(N(r2.count)).to.be.approximately(5, 0.001);

    rm.purchase([{ resource: "r2", count: D(2) }], undefined, D(1), D(2));
    expect(N(r1.count)).to.be.approximately(3, 0.001);
    expect(N(r2.count)).to.be.approximately(7, 0.001);
  });

  it("More complicated multipliers", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(100) });
    const r2 = rm.upsert({ name: "r2", count: D(20) });
    const r3 = rm.upsert({ name: "r3", count: D(0) });
    r3.cost = (n) => [
      { resource: "r1", count: D(n).pow(2) },
      { resource: "r2", count: n },
    ];

    rm.purchase([{ resource: "r3", count: D(1) }], "full", D(10), D(2));
    expect(N(r1.count)).to.be.approximately(98, 0.001);
    expect(N(r2.count)).to.be.approximately(18, 0.001);
    expect(N(r3.count)).to.be.approximately(10, 0.001);

    rm.purchase([{ resource: "r3", count: D(1) }], "partial", D(2), D(0.1));
    expect(N(r1.count)).to.equal(85.9);
    expect(N(r2.count)).to.equal(16.9);
    expect(N(r3.count)).to.be.approximately(12, 0.001);

    rm.purchase([{ resource: "r3", count: D(3) }], "partial", D(0.5), D(0.5));
    expect(N(r1.count)).to.be.approximately(1.4, 0.001);
    expect(N(r2.count)).to.be.approximately(10.4, 0.001);
    expect(N(r3.count)).to.be.approximately(12.5, 0.001);
  });
});

describe("Resource selling", () => {
  it("Simple buy and sell", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(10) });
    const r2 = rm.upsert({ name: "r2", count: D(0) });
    r2.cost = () => [{ resource: "r1", count: D(1) }];

    rm.purchase([{ resource: "r2", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(9, 0.001);
    expect(N(r2.count)).to.be.approximately(1, 0.001);

    rm.purchase([{ resource: "r2", count: D(2) }]);
    expect(N(r1.count)).to.be.approximately(7, 0.001);
    expect(N(r2.count)).to.be.approximately(3, 0.001);

    rm.purchase([{ resource: "r2", count: D(-1) }]);
    expect(N(r1.count)).to.be.approximately(8, 0.001);
    expect(N(r2.count)).to.be.approximately(2, 0.001);

    rm.purchase([{ resource: "r2", count: D(-2) }]);
    expect(N(r1.count)).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(0, 0.001);

    rm.purchase([{ resource: "r2", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(9, 0.001);
    expect(N(r2.count)).to.be.approximately(1, 0.001);

    rm.purchase([{ resource: "r2", count: D(-2) }]);
    expect(N(r1.count)).to.be.approximately(10, 0.001);
    expect(N(r2.count)).to.be.approximately(0, 0.001);
  });

  it("Complex selling", () => {
    const rm = genResourceManager(null, {});
    const r1 = rm.upsert({ name: "r1", count: D(100), minCount: D(80) });
    const r2 = rm.upsert({ name: "r2", count: D(20) });
    const r3 = rm.upsert({ name: "r3", count: D(0), maxCount: D(5) });
    r3.cost = (n) => [
      { resource: "r1", count: D(n).pow(2) },
      { resource: "r2", count: n },
    ];

    rm.purchase([{ resource: "r3", count: D(1) }]);
    expect(N(r1.count)).to.be.approximately(99, 0.001);
    expect(N(r2.count)).to.be.approximately(19, 0.001);
    expect(N(r3.count)).to.be.approximately(1, 0.001);

    rm.purchase([{ resource: "r3", count: D(2) }]);
    expect(N(r1.count)).to.be.approximately(86, 0.001);
    expect(N(r2.count)).to.be.approximately(14, 0.001);
    expect(N(r3.count)).to.be.approximately(3, 0.001);

    rm.purchase([{ resource: "r3", count: D(2) }]);
    expect(N(r1.count)).to.be.approximately(86, 0.001);
    expect(N(r2.count)).to.be.approximately(14, 0.001);
    expect(N(r3.count)).to.be.approximately(3, 0.001);

    rm.purchase([{ resource: "r3", count: D(-1) }]);
    expect(N(r1.count)).to.be.approximately(95, 0.001);
    expect(N(r2.count)).to.be.approximately(17, 0.001);
    expect(N(r3.count)).to.be.approximately(2, 0.001);

    rm.purchase([{ resource: "r3", count: D(-5) }]);
    expect(N(r1.count)).to.be.approximately(100, 0.001);
    expect(N(r2.count)).to.be.approximately(20, 0.001);
    expect(N(r3.count)).to.be.approximately(0, 0.001);
  });
});
