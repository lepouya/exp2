import { Context } from "../model/Context";
import { PopupGenerator } from "../model/Popup";

export default function initTutorial(context: Context) {
  context.popupManager.register(...tsInit);
  context.popupManager.setPopupState("Tutorial", {});
}

const tsInit: PopupGenerator<Context>[] = [
  {
    name: "Tutorial",
    step: 0,
    title: "Starting Tutorial",
    body: (
      <>
        <div className="full">Hi! Welcome to exp2.</div>
        <div className="full">
          This is where I test the different features I make for my game engine.
        </div>
        <div className="full">
          These dialogs are tests of the tutorial system.
        </div>
      </>
    ),
    greyOut: true,
  },
  {
    name: "Tutorial",
    step: 5,
    title: "Tabs",
    body: (
      <div className="full">
        Go to the minesweeper tab for enabling the next step.
      </div>
    ),
    greyOut: false,
  },
  {
    name: "Tutorial",
    step: 10,
    enabled: () => window.location.toString().includes("minesweep"),
    title: "Changed tab",
    body: <div className="full">Yay.</div>,
  },
];
