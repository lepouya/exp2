import { createContext, PropsWithChildren, useContext } from "react";

import { emptyContext, wrapContext } from "../model/Context";
import genDerivatives from "../model/Derivatives";
import registerOfflineSummary from "./OfflineSummary";

const context = emptyContext<boolean>();
const GameReactContext = createContext(context);

export function GameContextProvider(props: PropsWithChildren) {
  return (
    <GameReactContext.Provider value={context}>
      {props.children}
    </GameReactContext.Provider>
  );
}

export default function useGameContext() {
  return wrapContext(useContext(GameReactContext));
}

const _load_resources: any[] = [];
const _load_nuxes: any[] = [];

Object.assign(context, {
  init: function (this: typeof context) {
    genDerivatives(this, "x", 8);
    registerOfflineSummary(this);

    _load_resources
      .flat()
      .forEach((props: any) => this.resourceManager.upsert(props));
    Object.values(this.resourceManager.resources).forEach((res) =>
      res.compile(),
    );

    _load_nuxes.flat().forEach((props: any) => this.nuxManager.register(props));
  },
});
