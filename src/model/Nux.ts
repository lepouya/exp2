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

export type NuxManager<Context> = {
  readonly context: Context;
  readonly currentStates: Resource<Context>;
  readonly nuxes: Record<string, Record<number, NuxGenerator<Context>>>;

  register: (...nuxes: NuxGenerator<Context>[]) => void;
  resolve: (name?: string, step?: number) => Nux | undefined;

  getNuxState: (nux: string | Optional<Nux>) => {
    name: string;
    step: number;
    priority: number;
  };
  setNuxState: (
    nux: string | Optional<Nux>,
    priority?: number,
    step?: number,
  ) => void;
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
      let name = typeof nux === "string" ? nux : nux?.name ?? "";
      if (name.endsWith(":step")) {
        name = name.slice(0, name.length - 5);
      } else if (name.endsWith(":priority")) {
        name = name.slice(0, name.length - 9);
      }
      return {
        name,
        step: currentStates.extra[name + ":step"] ?? 0,
        priority: currentStates.extra[name + ":priority"] ?? Infinity,
      };
    },

    setNuxState(nux: string | Optional<Nux>, priority?: number, step?: number) {
      const name = nm.getNuxState(nux).name;
      if (step == undefined && nux && typeof nux !== "string") {
        step = nux.step ?? undefined;
      }
      if (name && step != undefined) {
        currentStates.extra[name + ":step"] = step;
      }
      if (name && priority != undefined) {
        currentStates.extra[name + ":priority"] = priority;
      }
    },

    delNuxState(nux: string | Optional<Nux>) {
      const name = nm.getNuxState(nux).name;
      delete currentStates.extra[name + ":step"];
      delete currentStates.extra[name + ":priority"];
    },

    getCurrentNux() {
      return Object.keys(nm.currentStates.extra)
        .filter((extra) => extra.endsWith(":step"))
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
