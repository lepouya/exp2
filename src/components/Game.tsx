import { ReactNode, useCallback, useEffect, useState } from "react";
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
import Options from "./Options";
import PopupRoot from "./PopupRoot";
import toast from "./Toast";

export default function Game() {
  const { context, settings, save } = useGameContext();
  const [timerId, setTimerId] = useState<NodeJS.Timer | undefined>();
  const [_, setLastRendered] = useState(0);

  const handleKeyPress = useCallback(
    (ev: KeyboardEvent) => processShortcuts(context, ev),
    [context],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const tick = useCallback(() => {
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
  }, [context, settings, save, setLastRendered]);

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

  const left = tabs.left.map((tab) => generate(tab, {}, context));
  const right = tabs.right.map((tab) => generate(tab, {}, context));
  const root = left.filter((tab) => tab.path === "/")[0] ??
    right.filter((tab) => tab.path === "/")[0] ??
    left[0] ??
    right[0] ?? { body: "" };

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
      <PopupRoot />
      <Routes>
        {root.path !== "/" && <Route path="/" element={root.body} />}
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

  icon?: ReactNode;
  heading?: ReactNode;
  body: ReactNode;
};

const tabs: Record<"left" | "right", Generative<GameTab, [Context]>[]> = {
  left: [],
  right: [
    {
      path: "/settings",
      placement: "right",
      order: 0,
      enabled: true,
      icon: "ti:settings",
      body: <Options />,
    },
  ],
};

Game.registerTab = (tab: Generative<GameTab, [Context]>) => {
  const placement = tab.placement ?? "left";

  const removeIdx = tabs[placement].findIndex((t) => t.path === tab.path);
  if (removeIdx >= 0) {
    tabs[placement].splice(removeIdx, 1);
  }

  tabs[placement].push(tab);
  tabs[placement].sort(
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
        end
      >
        {typeof tab.icon === "string" ? <Icon icon={tab.icon} /> : tab.icon}
        {tab.heading && <span>{tab.heading}</span>}
      </NavLink>
    </div>
  );
}

const BLOCKED_DOM_ELEMS = ["TEXTAREA", "INPUT"];
type ShortcutCallback = (context: Context, event: KeyboardEvent) => boolean;
const shortcuts: Record<string, ShortcutCallback[]> = {
  s: [
    function (ctx, ev) {
      if (ev.ctrlKey || ev.metaKey) {
        ctx.save();
        toast.success("Game saved!");
        return true;
      }
      return false;
    },
  ],
};

Game.registerShortcut = (key: string, callback: ShortcutCallback) => {
  key = key.toLowerCase().replace(/\W/g, "");
  shortcuts[key] ??= [];
  if (!shortcuts[key].includes(callback)) {
    shortcuts[key].push(callback);
  }
};

function processShortcuts(context: Context, event: KeyboardEvent) {
  if (
    event.target &&
    BLOCKED_DOM_ELEMS.includes(
      (event.target as HTMLElement).tagName.toUpperCase(),
    )
  ) {
    return;
  }

  const callbacks = shortcuts[event.key.toLowerCase()];
  if (callbacks && callbacks.length > 0) {
    callbacks.forEach((cb) => {
      if (cb(context, event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
}
