import assign from "../utils/assign";
import generate, { Generative } from "../utils/generate";
import { setSaveProperties } from "../utils/store";

export type Nux = {
  readonly name: string;
  readonly step: number;

  enabled: boolean;

  title: string | JSX.Element;
  body: string | JSX.Element;

  prevName: string;
  prevStep: number;
  prevTitle: string | JSX.Element;
  nextName: string;
  nextStep: number;
  nextTitle: string | JSX.Element;
  skipName: string;
  skipStep: number;
  skipTitle: string | JSX.Element;

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
  readonly nuxes: Record<
    string,
    Record<number, Generative<Nux, [NuxManager<Context>]>>
  >;

  currentStates: Record<string, { step?: number; priority?: number }>;

  register: (nux: Generative<Nux, [NuxManager<Context>]>) => void;
  resolve: (name?: string, step?: number) => Nux | undefined;
};

export function genNuxManager<Context>(context: Context): NuxManager<Context> {
  const nm: NuxManager<Context> = {
    context,
    nuxes: {},
    currentStates: {},

    register(nux: Generative<Nux, [NuxManager<Context>]>) {
      const res = generate(nux, { name: "", step: 0 }, nm);
      if (!nm.nuxes[res.name ?? ""]) {
        nm.nuxes[res.name ?? ""] = {};
      }
      assign(nm.nuxes[res.name ?? ""], res.step ?? 0, nux);
    },

    resolve(name: string = "", step: number = 0) {
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
      const skipIdx = Math.floor(1 + stepIdx / 100) * 100;

      const res = generate(
        nux,
        {
          name,
          step,

          enabled: true,

          title: `${name} #${step}`,
          body: "...",

          prevName: name,
          prevStep: prevIdx ?? step,
          prevTitle: "< back",
          nextName: name,
          nextStep: nextIdx ?? skipIdx,
          nextTitle: nextIdx ? "next >" : "done",
          skipName: name,
          skipStep: skipIdx,
          skipTitle: "skip >>>",

          highlightSelector: "",
          greyOut: false,
          bounds: {
            left: "50% - 200px",
            top: "6rem",
            width: "400px",
            height: "450px",
          },
        },
        nm,
      );

      return res;
    },
  };

  return setSaveProperties(nm, ["currentStates"]);
}
