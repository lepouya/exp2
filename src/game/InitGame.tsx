import { Context } from "../model/Context";
import initDerivatives from "./Derivatives";
import initGridTest from "./GridTest";
import initMineSweeper from "./MineSweeper";
import initTutorial from "./Tutorial";

export default function initGame(context: Context) {
  initTutorial(context);
  initDerivatives(context);
  initMineSweeper(context);
  initGridTest(context);
}
