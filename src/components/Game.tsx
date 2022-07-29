import { useEffect, useState } from "react";
import {
  HashRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { Context } from "../model/Context";
import { setTheme } from "../utils/document";
import generate, { Generative } from "../utils/generate";
import useGameContext from "./GameContext";
import Icon from "./Icon";
import NuxRoot from "./NuxRoot";
import Options from "./Options";
import toast from "./Toast";

export default function Game() {
  const { context, settings, save } = useGameContext();
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
    const updated = context.resourceManager.update(undefined, "tick");
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

  const left = GameTabs.left.map((tab) => generate(tab, {}, context));
  const right = GameTabs.right.map((tab) => generate(tab, {}, context));
  return (
    <HashRouter>
      <nav id="navbar">
        <div className="left">
          {left.map((tab) => (
            <TabLink tab={tab} key={tab.path} />
          ))}
        </div>
        <div className="spacer"></div>
        <div className="right">
          {right.map((tab) => (
            <TabLink tab={tab} key={tab.path} />
          ))}
        </div>
      </nav>
      <NuxRoot />
      <Routes>
        {[...left, ...right].map((tab) => (
          <Route path={tab.path} key={tab.path} element={tab.body} />
        ))}
      </Routes>
    </HashRouter>
  );
}

export type GameTab = {
  readonly path: string;
  readonly placement: "left" | "right";
  readonly order: number;

  enabled?: boolean;

  icon?: string | JSX.Element;
  heading?: string | JSX.Element;
  body: string | JSX.Element;
};

const GameTabs: Record<"left" | "right", Generative<GameTab, [Context]>[]> = {
  left: [],
  right: [
    {
      path: "/settings",
      placement: "right",
      order: 0,
      enabled: true,
      icon: "settings",
      body: <Options />,
    },
  ],
};

Game.registerTab = (tab: Generative<GameTab, [Context]>) => {
  const placement = tab.placement ?? "left";
  GameTabs[placement].push(tab);
  GameTabs[placement].sort(
    (tab1, tab2) =>
      (placement === "left" ? 1 : -1) * (tab1.order ?? Infinity) -
      (tab2.order ?? Infinity),
  );
};

function TabLink({ tab }: { tab: GameTab }) {
  if (!(tab.enabled ?? true)) {
    return null;
  }

  const location = useLocation();
  return (
    <div id={`tab-${tab.path.replace(/\W/g, "") || "main"}`}>
      <NavLink
        className={(p) => (p.isActive ? "active" : undefined)}
        to={{ pathname: tab.path, search: location.search }}
      >
        {typeof tab.icon === "string" ? <Icon icon={tab.icon} /> : tab.icon}
        {tab.heading && <span>{tab.heading}</span>}
      </NavLink>
    </div>
  );
}
