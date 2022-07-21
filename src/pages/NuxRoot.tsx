import { MouseEvent, useEffect } from "react";

import useGameContext from "../components/GameContext";
import { Nux } from "../model/Nux";
import Fn from "../utils/function";
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
