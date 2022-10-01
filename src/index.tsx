import { createRoot } from "react-dom/client";

import { GameContextProvider } from "./components/GameContext";
import Loader from "./components/Loader";
import initDerivatives from "./game/Derivatives";
import initMineSweeper from "./game/MineSweeper";
import { ContextInitializers } from "./model/Context";
import { getHTMLElement } from "./utils/document";

window.addEventListener(
  "load",
  () =>
    createRoot(getHTMLElement("app")).render(
      <GameContextProvider>
        <Loader />
      </GameContextProvider>,
    ),
  false,
);

ContextInitializers.push(initDerivatives, initMineSweeper);
