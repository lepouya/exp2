import { createContext, PropsWithChildren, useContext } from "react";

import { emptyContext, wrapContext } from "../model/Context";
import { genDerivatives } from "../model/Derivatives";

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

Object.assign(context, {
  init: function (this: typeof context) {
    genDerivatives(this, "x", 10);
  },
});
