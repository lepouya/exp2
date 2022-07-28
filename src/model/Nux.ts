import generate, { Generative } from "../utils/generate";
import Obj from "../utils/objects";
import { setSaveProperties } from "../utils/store";
import { Optional } from "../utils/types";

export type Nux = {
  readonly name: string;
  readonly step: number;

  enabled: boolean;

  title: string | JSX.Element;
  body: string | JSX.Element;

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
  readonly nuxes: Record<string, Record<number, NuxGenerator<Context>>>;

  currentStates: Record<string, { step?: number; priority?: number }>;

  register: (...nuxes: NuxGenerator<Context>[]) => void;
  resolve: (name?: string, step?: number) => Nux | undefined;

  genCurrentNux: () => Nux | undefined;
};

export type NuxGenerator<Context> = Generative<Nux, [NuxManager<Context>]>;

export function genNuxManager<Context>(context: Context): NuxManager<Context> {
  const nm: NuxManager<Context> = {
    context,
    nuxes: {},
    currentStates: {},

    register(...nuxes) {
      nuxes.forEach((nux) => {
        const res = generate(nux, { name: "", step: 0 }, nm);
        if (!nm.nuxes[res.name ?? ""]) {
          nm.nuxes[res.name ?? ""] = {};
        }
        Obj.assign(nm.nuxes[res.name ?? ""], res.step ?? 0, nux);
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

    genCurrentNux() {
      return Object.keys(nm.currentStates)
        .sort(
          (a, b) =>
            (nm.currentStates[a].priority ?? Infinity) -
            (nm.currentStates[b].priority ?? Infinity),
        )
        .reduce(function (showNux, curNux) {
          if (showNux) {
            return showNux;
          }
          const nux = nm.resolve(curNux, nm.currentStates[curNux].step);
          if (nux && nux.enabled) {
            return nux;
          } else {
            return undefined;
          }
        }, undefined as Nux | undefined);
    },
  };

  return setSaveProperties(nm, ["currentStates"]);
}
