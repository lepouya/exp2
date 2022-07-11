import { createContext, PropsWithChildren, useContext } from "react";

import { emptyContext, wrapContext } from "../model/Context";
import genDerivatives from "../model/Derivatives";
import { compileAllResources } from "../model/Resource";

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

Object.assign(context, {
  init: function (this: typeof context) {
    genDerivatives(this, "x", 100);
    _load_resources
      .flat()
      .forEach((props: any) => this.resourceManager.upsert(props));
    compileAllResources(this.resourceManager);
  },
});
