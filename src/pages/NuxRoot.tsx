import { MouseEvent, useEffect } from "react";

import useGameContext from "../components/GameContext";
import { Nux } from "../model/Nux";
import apply from "../utils/apply";
import { Nullable } from "../utils/types";

export default function NuxRoot() {
  const { nuxManager } = useGameContext();

  const nux = Object.keys(nuxManager.currentStates)
    .sort(
      (a, b) =>
        (nuxManager.currentStates[b].priority ?? 0) -
        (nuxManager.currentStates[a].priority ?? 0),
    )
    .reduce(function (showNux, curNux) {
      if (showNux) {
        return showNux;
      }
      const nux = nuxManager.resolve(
        curNux,
        nuxManager.currentStates[curNux].step,
      );
      if (nux && nux.enabled) {
        return nux;
      } else {
        return undefined;
      }
    }, undefined as Nux | undefined);

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

  function validNux(name?: string, step?: number) {
    return (
      name != null &&
      step != null &&
      name != "" &&
      !isNaN(step) &&
      isFinite(step) &&
      !(name === nux?.name && step === nux?.step)
    );
  }

  function gotoNux(name?: string, step?: number, event?: MouseEvent) {
    event?.preventDefault();

    const priority =
      name && name === nux?.name
        ? nuxManager.currentStates[name ?? ""].priority
        : undefined;
    delete nuxManager.currentStates[nux?.name ?? ""];
    if (validNux(name, step)) {
      nuxManager.currentStates[name ?? ""] = { step, priority };
    }
  }

  function calcStyle(size?: string) {
    return `max(5%, 1em, min(90%, calc(100% - 2em), calc(${size})))`;
  }

  const bounds = {
    left: calcStyle(nux.bounds.left),
    bottom: calcStyle("100vh - " + nux.bounds.top + " - " + nux.bounds.height),
    width: calcStyle(nux.bounds.width),
    minHeight: calcStyle(nux.bounds.height),
    maxHeight: calcStyle("100%"),
  };

  const nuxRoot = (
    <div id="nux-root" style={bounds}>
      <div className="panel shadow" style={{ minHeight: nux.bounds.height }}>
        {nux.title && <div className="title-bar">{nux.title}</div>}
        {nux.body}
        {validNux(nux.prevName, nux.prevStep) &&
          !(nux.prevName === nux.nextName && nux.prevStep === nux.nextStep) && (
            <div className="prev">
              <a href="" onClick={apply(gotoNux, nux.prevName, nux.prevStep)}>
                {nux.prevTitle}
              </a>
            </div>
          )}
        {validNux(nux.nextName, nux.nextStep) && (
          <div className="next">
            <a href="" onClick={apply(gotoNux, nux.nextName, nux.nextStep)}>
              {nux.nextTitle}
            </a>
          </div>
        )}
        {validNux(nux.skipName, nux.skipStep) &&
          !(nux.skipName === nux.nextName && nux.skipStep === nux.nextStep) && (
            <div className="skip">
              <a href="" onClick={apply(gotoNux, nux.skipName, nux.skipStep)}>
                {nux.skipTitle}
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
