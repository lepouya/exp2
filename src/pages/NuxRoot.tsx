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
