import { MouseEvent, useEffect } from "react";

import useGameContext from "../components/GameContext";
import ResourceRender from "../components/ResourceRender";
import { Context, ContextInitializers } from "../model/Context";
import { Nux } from "../model/Nux";
import Format from "../utils/format";
import Fn from "../utils/functions";
import { Nullable, Optional } from "../utils/types";

export default function NuxRoot() {
  const { nuxManager } = useGameContext();
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
        ? nuxManager.currentStates.extra[nux.name + ":priority"]
        : Infinity;
    delete nuxManager.currentStates.extra[nux?.name ?? ""];
    delete nuxManager.currentStates.extra[(nux?.name ?? "") + ":priority"];
    if (validNux(nextNux)) {
      nuxManager.currentStates.extra[nextNux?.name!] = nextNux?.step!;
      nuxManager.currentStates.extra[nextNux?.name! + ":priority"] = priority;
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

function registerOfflineSummary(context: Context) {
  const settings = context.settings;
  const rm = context.resourceManager;
  const nm = context.nuxManager;

  nm.register({
    name: "OfflineSummary",
    title: "While you were offline...",
    bounds: { height: "32em" },
    body() {
      const loadUpdate = rm.execution.load;
      const keys = Object.keys(loadUpdate?.lastChanges ?? {})
        .filter((r) => isFinite(rm.resources[r].priority))
        .sort((a, b) => rm.resources[a].priority - rm.resources[b].priority);

      let remainder = 0;

      if (!loadUpdate) {
        return null;
      } else if (keys.length === 0) {
        return <div className="full">Nothing happened!</div>;
      } else if (keys.length > settings.offlineSummaryMaxUpdates) {
        remainder = keys.splice(settings.offlineSummaryMaxUpdates - 1).length;
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
                showColors={true}
                showPlusSign={true}
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
    if (
      source === "load" &&
      dt >= settings.offlineSummaryMinSecs &&
      Object.keys(changes).length > 0
    ) {
      nm.currentStates.extra["OfflineSummary"] = 0;
      nm.currentStates.extra["OfflineSummary:priority"] = 0;
    }
  };
}

ContextInitializers.push(registerOfflineSummary);
