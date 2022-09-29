import { ChangeEvent, MouseEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { themes } from "../data/themes";
import { setTheme } from "../utils/document";
import { loadFromFile, saveToFile } from "../utils/fileStorage";
import Format from "../utils/format";
import formatWithNotation from "../utils/notation";
import Obj from "../utils/objects";
import useGameContext from "./GameContext";
import toast from "./Toast";

export default function Options() {
  const context = useGameContext();
  const [textContents, setTextContents] = useState("");
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const settings = context.settings;
  const debug = location.search.toLowerCase().includes("debug");

  function saveGame() {
    context.save(debug);
    toast.success("Game saved!");
  }

  function loadGame() {
    if (context.load()) {
      navigate({ pathname: "/", search: location.search });
      toast.success("Game loaded!");
    } else {
      toast.fail("Load failed!");
    }
  }

  function exportGame() {
    setTextContents(context.saveAs(debug));
    toast.success("Game exported!");
  }

  function importGame() {
    if (context.loadAs(textContents)) {
      navigate({ pathname: "/", search: location.search });
      toast.success("Game imported!");
    } else {
      toast.fail("Import failed!");
    }
  }

  function saveFile() {
    const pkg = Obj.map(globalThis.gamePackage, (s) => s?.replace(/\W/g, "_"));
    const date = new Date()
      .toISOString()
      .replace(/\D/g, " ")
      .trim()
      .replace(/\D/g, "-");
    saveToFile(`${pkg.name}-v${pkg.version}-${date}`, context.saveAs(debug));
    toast.success("Game exported!");
  }

  function loadFile() {
    loadFromFile((contents) => {
      if (context.loadAs(contents)) {
        navigate({ pathname: "/", search: location.search });
        toast.success("Game imported!");
      } else {
        toast.fail("Import failed!");
      }
    });
  }

  function changeFrequency(timer: string, value: string) {
    let freq = parseInt(value);
    if (freq >= 1 && freq <= 1000) {
      switch (timer) {
        case "tick":
          settings.ticksPerSecond = freq;
          break;
        case "render":
          settings.framesPerSecond = freq;
          break;
        case "save":
          settings.saveFrequencySecs = 600 / freq;
          break;
      }
    }
  }

  function changeTheme(event: MouseEvent) {
    const theme = (event.target as HTMLElement).getAttribute("theme");
    if (theme) {
      settings.theme = theme;
      setTheme(theme);
    }
  }

  function changeNumberFormat(event: MouseEvent) {
    settings.numberFormat = (event.target as HTMLButtonElement).name;
  }

  function resetGame() {
    if (resetAcknowledged) {
      if (confirm("Are you sure you want to reset? This cannot be undone.")) {
        context.reset();
        navigate({ pathname: "/", search: location.search });
      } else {
        setResetAcknowledged(false);
      }
    }
  }

  return (
    <div id="options">
      <div className="panel options" id="options-theme">
        <div className="title-bar">Theme Options</div>
        <div className="full">
          Current theme is: &nbsp;
          {themes[settings.theme]}
        </div>
        {Object.keys(themes).map((theme) => (
          <div key={`theme-${theme}`} className="half center">
            <div className="themed" id={`theme-${theme}`} theme={theme}>
              <button
                id={`button-theme-${theme}`}
                theme={theme}
                onClick={changeTheme}
              >
                {themes[theme]}
              </button>
            </div>
          </div>
        ))}

        <hr className="dashed" />
        <div className="full">
          Current number format is: &nbsp;
          {formatWithNotation.all[settings.numberFormat].name}
        </div>
        {Object.values(formatWithNotation.all).map((notation) => (
          <div key={`notation-${notation.name}`} className="half center">
            <div className="themed">
              <button
                id={`button-notation-${notation.name}`}
                name={notation.name}
                onClick={changeNumberFormat}
              >
                <div className="title-bar">{notation.name}</div>
                {["123456.789", "123.456e789.012"].map((num, idx) => (
                  <div
                    key={`sample-${notation.name}-${idx}`}
                    className="full center"
                  >
                    {formatWithNotation(num, notation, 3)}
                  </div>
                ))}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel options" id="options-data">
        <div className="title-bar">Game Data</div>
        <div className="full">
          You started this game{" "}
          {Format.time(settings.lastUpdate, { epoch: settings.lastReset })}
        </div>
        <div className="full">
          This session started{" "}
          {Format.time(settings.lastUpdate, { epoch: settings.lastLoaded })}
        </div>
        <div className="full">
          Game was last saved{" "}
          {Format.time(settings.lastUpdate, { epoch: settings.lastSaved })}
        </div>

        <hr className="dashed" />
        <div className="half center">
          <input
            type="button"
            value="Load"
            onClick={loadGame}
            id="button-load"
          />
        </div>
        <div className="half center">
          <input
            type="button"
            value="Save"
            onClick={saveGame}
            id="button-save"
          />
        </div>
        <div className="half center">
          <input
            type="button"
            value="Load from File"
            onClick={loadFile}
            id="button-file-load"
          />
        </div>
        <div className="half center">
          <input
            type="button"
            value="Save to File"
            onClick={saveFile}
            id="button-file-save"
          />
        </div>
        <div className="half center">
          <input
            type="button"
            value="Import"
            onClick={importGame}
            id="button-import"
          />
        </div>
        <div className="half center">
          <input
            type="button"
            value="Export"
            onClick={exportGame}
            id="button-export"
          />
        </div>
        <div className="full center" id="export-text">
          <textarea
            value={textContents}
            onChange={(e) => setTextContents(e.target.value)}
          />
        </div>
      </div>

      <div className="panel options" id="options-advanced">
        <div className="title-bar">Advanced Settings</div>
        <div className="full">
          If you are having performance issues, increase the time between
          updates. Faster updating frequncies lead to better game experience but
          might use a lot of CPU.
        </div>
        <div className="half">Updating frequency:</div>
        <div className="half center">
          {Math.floor(1000.0 / settings.ticksPerSecond)}ms
        </div>
        <div className="half"></div>
        <div className="half center">
          <input
            type="range"
            min={1}
            max={1000}
            value={settings.ticksPerSecond}
            onInput={(e: ChangeEvent<HTMLInputElement>) =>
              changeFrequency("tick", e.target.value)
            }
            id="input-freq-tick"
          />
        </div>

        <div className="full"></div>
        <div className="half">Rendering frequency:</div>
        <div className="half center">
          {Math.floor(1000.0 / settings.framesPerSecond)}ms
        </div>
        <div className="half"></div>
        <div className="half center">
          <input
            type="range"
            min={1}
            max={60}
            value={settings.framesPerSecond}
            onInput={(e: ChangeEvent<HTMLInputElement>) =>
              changeFrequency("render", e.target.value)
            }
            id="input-freq-render"
          />
        </div>

        <div className="full">
          Change how often the game is saved in the background. More frequent
          saving leads to faster backups, but increases CPU and I/O usage
        </div>
        <div className="half">Saving frequency:</div>
        <div className="half center">
          {Format.time(1000 * settings.saveFrequencySecs, { ago: "" })}
        </div>
        <div className="half"></div>
        <div className="half center">
          <input
            type="range"
            min={1}
            max={60}
            value={600 / settings.saveFrequencySecs}
            onInput={(e: ChangeEvent<HTMLInputElement>) =>
              changeFrequency("save", e.target.value)
            }
            id="input-freq-save"
          />
        </div>
      </div>

      <div className="panel options reset" id="options-reset">
        <div className="title-bar warning">Game Reset</div>
        <div className="full">
          WARNING: this will completely reset your game and delete all saved
          progress and setting. Only use this if you want to restart the game
          from beginning, or if something in the settings is so messed up that
          the game is now unplayable.
        </div>
        <div className="full">
          <label>
            <input
              type="checkbox"
              checked={resetAcknowledged}
              onChange={() => setResetAcknowledged(!resetAcknowledged)}
              id="acknowledge-box"
            />
            I understand what this means and still want to reset the game
          </label>
        </div>
        <div className="full right">
          <input
            type="button"
            value="Reset everything"
            disabled={!resetAcknowledged}
            onClick={resetGame}
            id="button-wipeall"
          />
        </div>
      </div>

      {debug && (
        <div className="panel options debug" id="options-debug">
          <div className="title-bar">Debug Context</div>
          <div className="full">
            {JSON.stringify(
              context,
              (key, value) =>
                (typeof key === "string" && key.startsWith("_")) ||
                disallowedResourceKeys.includes(key)
                  ? undefined
                  : value,
              2,
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const disallowedResourceKeys = ["context", "manager", "resourceManager"];
