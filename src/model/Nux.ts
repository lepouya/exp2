import { ReactNode } from "react";

import generate, { Generative } from "../utils/generate";
import Obj from "../utils/objects";
import { Optional } from "../utils/types";
import { Resource, ResourceManager } from "./Resource";

export type Nux = {
  readonly name: string;
  readonly step: number;

  enabled: boolean;

  title: ReactNode;
  body: ReactNode;

  prev: Optional<Nux>;
  next: Optional<Nux>;
  skip: Optional<Nux>;

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

export type NuxState = {
  name: string;
  priority: number;
  step: number;
};

export type NuxManager<Context> = {
  readonly context: Context;
  readonly currentStates: Resource<Context>;
  readonly nuxes: Record<string, Record<number, NuxGenerator<Context>>>;

  register: (...nuxes: NuxGenerator<Context>[]) => void;
  resolve: (name?: string, step?: number) => Nux | undefined;

  getNuxState: (nux: string | Optional<Nux>) => NuxState;
  setNuxState: (nux: string | Optional<Nux>, state: Optional<NuxState>) => void;
  delNuxState: (nux: string | Optional<Nux>) => void;

  getCurrentNux: () => Nux | undefined;
};

export type NuxGenerator<Context> = Generative<Nux, [NuxManager<Context>]>;

export function genNuxManager<Context>(
  context: Context,
  rm: ResourceManager<Context>,
): NuxManager<Context> {
  const currentStates = rm.get("nux:states");
  const nm: NuxManager<Context> = {
    context,
    currentStates,
    nuxes: {},

    register(...nuxes) {
      nuxes.forEach((nux) => {
        if (!nm.nuxes[nux.name ?? ""]) {
          nm.nuxes[nux.name ?? ""] = {};
        }
        Obj.assign(nm.nuxes[nux.name ?? ""], nux.step ?? 0, nux);
      });
    },

    resolve(name = "", step = 0) {
      const nux = (nm.nuxes[name] ?? {})[step];
      if (!nux) {
        return undefined;
      }

      const sortedSteps = Object.keys(nm.nuxes[name])
        .map((n) => parseInt(n))
        .sort((a, b) => a - b);
      const stepIdx = sortedSteps.indexOf(step);
      const prevIdx = sortedSteps[stepIdx - 1];
      const nextIdx = sortedSteps[stepIdx + 1];
      const skipIdx = (1 + Math.floor(step / 100)) * 100;

      const res = generate(
        nux,
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

    getNuxState(nux: string | Optional<Nux>) {
      const name = typeof nux === "string" ? nux : nux?.name ?? "";
      const state = currentStates.extra[name];
      return {
        name,
        step: (typeof nux === "object" && nux?.step) ?? 0,
        priority: Infinity,
        ...state,
      };
    },

    setNuxState(nux: string | Optional<Nux>, state: Optional<NuxState>) {
      const curState = nm.getNuxState(nux);
      currentStates.extra[curState.name] = { ...curState, ...state };
    },

    delNuxState(nux: string | Optional<Nux>) {
      const name = nm.getNuxState(nux).name;
      delete currentStates.extra[name];
    },

    getCurrentNux() {
      return Object.keys(nm.currentStates.extra)
        .map(nm.getNuxState)
        .sort((a, b) => a.priority - b.priority)
        .reduce(function (showNux: Nux | undefined, curNux) {
          if (showNux) {
            return showNux;
          }
          const nux = nm.resolve(curNux.name, curNux.step);
          if (nux && nux.enabled) {
            return nux;
          } else {
            return undefined;
          }
        }, undefined);
    },
  };

  return nm;
}
