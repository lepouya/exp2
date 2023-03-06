import { ReactNode } from "react";

import generate, { Generative } from "../utils/generate";
import Obj from "../utils/objects";
import { Optional } from "../utils/types";
import { Resource, ResourceManager } from "./Resource";

export type Popup = {
  readonly name: string;
  readonly step: number;

  enabled: boolean;

  title: ReactNode;
  body: ReactNode;

  prev: Optional<Popup>;
  next: Optional<Popup>;
  skip: Optional<Popup>;

  highlightSelector: string;
  greyOut: boolean;

  bounds: {
    left: string;
    top: string;
    width: string;
    height: string;
  };

  onMount?: () => void;
  onUnmount?: () => void;
};

export type PopupState = {
  name: string;
  priority: number;
  step: number;
};

export type PopupManager<Context> = {
  readonly context: Context;
  readonly currentStates: Resource<Context>;
  readonly popups: Record<string, Record<number, PopupGenerator<Context>>>;

  register: (...popups: PopupGenerator<Context>[]) => void;
  resolve: (name?: string, step?: number) => Popup | undefined;

  getPopupState: (popup: string | Optional<Popup>) => PopupState;
  setPopupState: (
    popup: string | Optional<Popup>,
    state: Optional<PopupState>,
  ) => void;
  delPopupState: (popup: string | Optional<Popup>) => void;

  getCurrentPopup: () => Popup | undefined;
};

export type PopupGenerator<Context> = Generative<
  Popup,
  [PopupManager<Context>]
>;

export function genPopupManager<Context>(
  context: Context,
  rm: ResourceManager<Context>,
): PopupManager<Context> {
  const currentStates = rm.get("popup:states");
  const nm: PopupManager<Context> = {
    context,
    currentStates,
    popups: {},

    register(...popups) {
      popups.forEach((popup) => {
        if (!nm.popups[popup.name ?? ""]) {
          nm.popups[popup.name ?? ""] = {};
        }
        Obj.assign(nm.popups[popup.name ?? ""], popup.step ?? 0, popup);
      });
    },

    resolve(name = "", step = 0) {
      const popup = (nm.popups[name] ?? {})[step];
      if (!popup) {
        return undefined;
      }

      const sortedSteps = Object.keys(nm.popups[name])
        .map((n) => parseInt(n))
        .sort((a, b) => a - b);
      const stepIdx = sortedSteps.indexOf(step);
      const prevIdx = sortedSteps[stepIdx - 1];
      const nextIdx = sortedSteps[stepIdx + 1];
      const skipIdx = (1 + Math.floor(step / 100)) * 100;

      const res = generate(
        popup,
        {
          name,
          step,
          enabled: true,
          title: `${name} #${step}`,
          body: "...",
          prev: {
            name,
            step: prevIdx ?? step,
            title: "< back",
          },
          next: {
            name,
            step: nextIdx ?? skipIdx,
            title: nextIdx ? "next >" : "done",
          },
          skip: {
            name,
            step: skipIdx,
            title: "skip >>>",
          },
          highlightSelector: "",
          greyOut: false,
          bounds: {
            left: "50% - 14rem",
            top: "6rem",
            width: "28rem",
            height: "28rem",
          },
        },
        nm,
      );

      return res;
    },

    getPopupState(popup: string | Optional<Popup>) {
      const name = typeof popup === "string" ? popup : popup?.name ?? "";
      const state = currentStates.extra[name];
      return {
        name,
        step: (typeof popup === "object" && popup?.step) || 0,
        priority: Infinity,
        ...state,
      };
    },

    setPopupState(
      popup: string | Optional<Popup>,
      state: Optional<PopupState>,
    ) {
      const curState = nm.getPopupState(popup);
      currentStates.extra[curState.name] = { ...curState, ...state };
    },

    delPopupState(popup: string | Optional<Popup>) {
      const name = nm.getPopupState(popup).name;
      delete currentStates.extra[name];
    },

    getCurrentPopup() {
      return Object.keys(nm.currentStates.extra)
        .map(nm.getPopupState)
        .sort((a, b) => a.priority - b.priority)
        .reduce(function (showPopup: Popup | undefined, curPopup) {
          if (showPopup) {
            return showPopup;
          }
          const popup = nm.resolve(curPopup.name, curPopup.step);
          if (popup && popup.enabled) {
            return popup;
          } else {
            return undefined;
          }
        }, undefined);
    },
  };

  return nm;
}
