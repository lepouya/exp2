import { MouseEvent, useEffect } from "react";

import { Context, ContextInitializers } from "../model/Context";
import { Popup } from "../model/Popup";
import Format from "../utils/format";
import Fn from "../utils/functions";
import { Nullable, Optional } from "../utils/types";
import useGameContext from "./GameContext";
import ResourceRender from "./ResourceRender";

export default function PopupRoot() {
  const { popupManager } = useGameContext();
  const popup = popupManager.getCurrentPopup();

  useEffect(() => {
    const onMount = popup?.onMount;
    const onUnmount = popup?.onUnmount;
    let elems: Nullable<NodeListOf<Element>>;
    try {
      elems = document.querySelectorAll(popup?.highlightSelector ?? "");
    } catch (_) {}

    if (popup?.enabled) {
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
  }, [popup?.name, popup?.step, popup?.enabled]);

  if (!popup) {
    return null;
  }

  function validPopup(otherPopup: Optional<Popup>) {
    return (
      otherPopup?.name != null &&
      otherPopup?.step != null &&
      otherPopup?.name != "" &&
      !isNaN(otherPopup?.step) &&
      isFinite(otherPopup?.step) &&
      !(otherPopup?.name == popup?.name && otherPopup?.step == popup?.step)
    );
  }

  function gotoPopup(nextPopup: Optional<Popup>, event?: MouseEvent) {
    event?.preventDefault();

    const state = popupManager.getPopupState(popup);
    popupManager.delPopupState(popup);
    if (nextPopup && validPopup(nextPopup)) {
      popupManager.setPopupState(nextPopup, { priority: state.priority });
    }
  }

  function calcStyle(v?: string, d = "%") {
    return `max(5${d}, 1em, min(90${d}, calc(100${d} - 2em), calc(${v})))`;
  }

  const bounds = {
    left: calcStyle(popup.bounds.left, "vw"),
    bottom: calcStyle(
      `100vh - ${popup.bounds.top} - ${popup.bounds.height}`,
      "vh",
    ),
    width: calcStyle(popup.bounds.width, "vw"),
    minHeight: calcStyle(popup.bounds.height, "vh"),
    maxHeight: calcStyle("100vh", "vh"),
  };

  const popupRoot = (
    <div id="popup-root" style={bounds}>
      <div className="panel shadow" style={{ minHeight: popup.bounds.height }}>
        {popup.title && <div className="title-bar">{popup.title}</div>}
        {popup.body}
        {validPopup(popup.prev) &&
          !(
            popup.prev?.name === popup.next?.name &&
            popup.prev?.step === popup.next?.step
          ) && (
            <div className="prev">
              <a href="" onClick={Fn.apply(gotoPopup, popup.prev)}>
                {popup.prev?.title ?? "< back"}
              </a>
            </div>
          )}
        <div className="next">
          <a href="" onClick={Fn.apply(gotoPopup, popup.next)}>
            {popup.next?.title ?? (popup.next?.step ? "next >" : "done")}
          </a>
        </div>
        {validPopup(popup.skip) &&
          !(
            popup.skip?.name === popup.next?.name &&
            popup.skip?.step === popup.next?.step
          ) && (
            <div className="skip">
              <a href="" onClick={Fn.apply(gotoPopup, popup.skip)}>
                {popup.skip?.title ?? "skip >>>"}
              </a>
            </div>
          )}
      </div>
    </div>
  );

  if (popup.greyOut) {
    return <div className="greyout">{popupRoot}</div>;
  } else {
    return popupRoot;
  }
}

function registerOfflineSummary({
  settings,
  resourceManager,
  popupManager: popupManager,
}: Context) {
  popupManager.register({
    name: "OfflineSummary",
    title: "While you were offline...",
    bounds: { height: "32em" },
    body() {
      const loadUpdate = resourceManager.execution.load;
      const keys = Object.keys(loadUpdate?.lastChanges ?? {})
        .filter((r) => isFinite(resourceManager.resources[r].priority))
        .sort(
          (a, b) =>
            resourceManager.resources[a].priority -
            resourceManager.resources[b].priority,
        );

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

  resourceManager.onUpdateComplete = function (changes, dt, source) {
    if (
      source === "load" &&
      dt >= settings.offlineSummaryMinSecs &&
      Object.keys(changes).length > 0
    ) {
      popupManager.setPopupState("OfflineSummary", { step: 0 });
    }
  };
}

ContextInitializers.push(registerOfflineSummary);
