import { useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";

import Main from "../pages/Main";
import Options from "../pages/Options";
import { setTheme } from "../utils/document";
import useGameContext from "./GameContext";
import Link from "./Link";
import NuxRoot from "./NuxRoot";
import toast from "./Toast";

export default function Game() {
  const { settings, resourceManager, save } = useGameContext();
  const [timerId, setTimerId] = useState<NodeJS.Timer | undefined>();
  const [_, setLastRendered] = useState(0);

  useEffect(
    function () {
      if (timerId) {
        clearInterval(timerId);
      }
      setTimerId(setInterval(tick, 1000.0 / settings.ticksPerSecond));
      setTheme(settings.theme);

      return () => {
        if (timerId) {
          clearInterval(timerId);
          setTimerId(undefined);
        }
      };
    },
    [settings, settings.ticksPerSecond, settings.theme],
  );

  function tick() {
    // Update resources
    const updated = resourceManager.update(undefined, "tick");
    if (updated.includes(true)) {
      // Needs update
    }

    // Save game
    if (
      settings.lastUpdate - settings.lastSaved >=
        settings.saveFrequencySecs * 1000 &&
      settings.lastUpdate - settings.lastLoaded >=
        settings.saveFrequencySecs * 1000
    ) {
      save();
      toast.info("Game saved!");
    }

    // Force re-render of child components
    setLastRendered((lastRendered) =>
      settings.lastUpdate - lastRendered >= 1000.0 / settings.framesPerSecond
        ? settings.lastUpdate
        : lastRendered,
    );
  }

  return (
    <HashRouter>
      <nav id="navbar">
        <div className="left">
          <Link to="/" heading="Main" />
        </div>
        <div className="spacer"></div>
        <div className="right">
          <Link to="/options" icon="settings" />
        </div>
      </nav>
      <NuxRoot />
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/options" element={<Options />} />
      </Routes>
    </HashRouter>
  );
}
