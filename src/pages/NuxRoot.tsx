import { MouseEvent, useEffect } from "react";

import useGameContext from "../components/GameContext";
import ResourceRender from "../components/ResourceRender";
import { Context } from "../model/Context";
import { Nux, NuxManager } from "../model/Nux";
import Format from "../utils/format";
import Fn from "../utils/function";
import { Nullable, Optional } from "../utils/types";

export default function NuxRoot() {
  const { nuxManager } = useGameContext();
  if (!nuxManager.nuxes["OfflineSummary"]) {
    registerOfflineSummary(nuxManager);
  }
  const nux = nuxManager.genCurrentNux();

  useEffect(() => {
    const onMount = nux?.onMount;
    const onUnmount = nux?.onUnmount;
    let elems: Nullable<NodeListOf<Element>>;
    try {
      elems = document.querySelectorAll(nux?.highlightSelector ?? "");
    } catch (_) {}

    if (nux?.enabled) {
      elems?.forEach((elem) => elem.classList.add("highlight"));
      if (onMount) {
        onMount();
      }
    }

    return () => {
      elems?.forEach((elem) => elem.classList.remove("highlight"));
      if (onUnmount) {
        onUnmount();
      }
    };
  }, [nux?.name, nux?.step, nux?.enabled]);

  if (!nux) {
    return null;
  }
  function validNux(otherNux: Optional<Nux>) {
    return (
      otherNux?.name != null &&
      otherNux?.step != null &&
      otherNux?.name != "" &&
      !isNaN(otherNux?.step) &&
      isFinite(otherNux?.step) &&
      !(otherNux?.name == nux?.name && otherNux?.step == nux?.step)
    );
  }

  function gotoNux(nextNux: Optional<Nux>, event?: MouseEvent) {
    event?.preventDefault();

    const priority =
      nextNux?.name && nextNux?.name === nux?.name
        ? nuxManager.currentStates[nux?.name ?? ""].priority
        : undefined;
    delete nuxManager.currentStates[nux?.name ?? ""];
    if (validNux(nextNux)) {
      nuxManager.currentStates[nextNux?.name!] = {
        step: nextNux?.step!,
        priority,
      };
    }
  }

  function calcStyle(v?: string, d = "%") {
    return `max(5${d}, 1em, min(90${d}, calc(100${d} - 2em), calc(${v})))`;
  }

  const bounds = {
    left: calcStyle(nux.bounds.left, "vw"),
    bottom: calcStyle(`100vh - ${nux.bounds.top} - ${nux.bounds.height}`, "vh"),
    width: calcStyle(nux.bounds.width, "vw"),
    minHeight: calcStyle(nux.bounds.height, "vh"),
    maxHeight: calcStyle("100vh", "vh"),
  };

  const nuxRoot = (
    <div id="nux-root" style={bounds}>
      <div className="panel shadow" style={{ minHeight: nux.bounds.height }}>
        {nux.title && <div className="title-bar">{nux.title}</div>}
        {nux.body}
        {validNux(nux.prev) &&
          !(
            nux.prev?.name === nux.next?.name &&
            nux.prev?.step === nux.next?.step
          ) && (
            <div className="prev">
              <a href="" onClick={Fn.apply(gotoNux, nux.prev)}>
                {nux.prev?.title ?? "< back"}
              </a>
            </div>
          )}
        <div className="next">
          <a href="" onClick={Fn.apply(gotoNux, nux.next)}>
            {nux.next?.title ?? (nux.next?.step ? "next >" : "done")}
          </a>
        </div>
        {validNux(nux.skip) &&
          !(
            nux.skip?.name === nux.next?.name &&
            nux.skip?.step === nux.next?.step
          ) && (
            <div className="skip">
              <a href="" onClick={Fn.apply(gotoNux, nux.skip)}>
                {nux.skip?.title ?? "skip >>>"}
              </a>
            </div>
          )}
      </div>
    </div>
  );

  if (nux.greyOut) {
    return <div className="greyout">{nuxRoot}</div>;
  } else {
    return nuxRoot;
  }
}

function registerOfflineSummary(nm: NuxManager<Context>) {
  const rm = nm.context.resourceManager;
  nm.register({
    name: "OfflineSummary",
    title: "While you were offline...",
    bounds: { height: "32em" },
    body() {
      const loadUpdate = rm.execution.load;
      const keys = Object.keys(loadUpdate?.lastChanges ?? {}).sort(
        (a, b) => rm.resources[a].priority - rm.resources[b].priority,
      );

      let remainder = 0;

      if (!loadUpdate) {
        return null;
      } else if (keys.length === 0) {
        return <div className="full">Nothing happened!</div>;
      } else if (keys.length > 12) {
        remainder = keys.length - 11;
        keys.splice(11);
      }
      return (
        <>
          <div className="full">
            You were offline for{" "}
            {Format.time(loadUpdate.lastDelta * 1000, {
              now: "",
              ago: "",
              never: "",
            })}
            . During this time, you gained:
          </div>
          {keys.map((res) => (
            <div className="full" key={res}>
              <ResourceRender
                resource={res}
                override={{ count: loadUpdate.lastChanges[res] }}
              />
            </div>
          ))}
          {remainder > 0 && (
            <div className="full center">... and {remainder} more ...</div>
          )}
        </>
      );
    },
  });

  rm.onUpdateComplete = function (changes, dt, source) {
    if (source === "load" && dt >= 0 && Object.keys(changes).length > 0) {
      nm.currentStates.OfflineSummary = { priority: 0 };
    }
  };
  const load = rm.execution.load;
  if (load && load.lastTick > 0) {
    rm.onUpdateComplete(load.lastChanges, load.lastDelta, "load");
  }
}
