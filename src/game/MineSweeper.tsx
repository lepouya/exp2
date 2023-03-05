import Decimal from "break_eternity.js";
import { MouseEvent, useEffect, useState } from "react";
import { useLocation } from "react-router";

import BuyButton from "../components/BuyButton";
import Game from "../components/Game";
import useGameContext from "../components/GameContext";
import Icon from "../components/Icon";
import ProgressBar from "../components/ProgressBar";
import ProgressCircle from "../components/ProgressCircle";
import ResourceRender from "../components/ResourceRender";
import TableGrid from "../components/TableGrid";
import ToggleButton from "../components/ToggleButton";
import { Context } from "../model/Context";
import { Resource } from "../model/Resource";
import Arr from "../utils/arrays";
import clamp from "../utils/clamp";
import Format from "../utils/format";
import message from "../utils/message";
import { setSaveProperties } from "../utils/store";
import tickTimer from "../utils/tickTimer";
import { Expansion } from "../utils/types";

export default function initMineSweeper(context: Context) {
  genMineSweeper(context);

  Game.registerTab({
    path: "/minesweeper",
    placement: "left",
    order: 2,
    heading: "Minesweeper",
    body: () => (
      <div id="minesweeper">
        <ResourceBar />
        <MineSweeper />
        <ModeControls />
        <Upgrades />
        <Automation />
        <Stats />
      </div>
    ),
  });
}

function genMineSweeper(context: Context) {
  const res: Partial<Resource<Context>>[] = [
    {
      name: "minesweeper",
      extra: {
        board: { ...emptyBoard },
        tapMode: "reveal",
        maxErrors: 1,
      },
    },
    {
      name: "wins",
      singularName: "win",
      icon: "icon-won ti:square-check",
      count: Decimal.dZero,
      extra: {
        auto: 0,
        manual: 0,
        total: 0,
        streak: 0,
        longestStreak: 0,
      },
    },
    {
      name: "losses",
      singularName: "lose",
      icon: "icon-lost ti:square-x",
      count: Decimal.dZero,
      extra: {
        auto: 0,
        manual: 0,
        total: 0,
        streak: 0,
        longestStreak: 0,
      },
    },
    {
      name: "resets",
      singularName: "reset",
      icon: "ti:refresh",
      count: Decimal.dZero,
      extra: {
        auto: 0,
        manual: 0,
        total: 0,
      },
    },
    {
      name: "automation",
      icon: "ti:robot",
      count: Decimal.dZero,
      extra: {
        total: 0,
      },
    },

    {
      name: "rows",
      singularName: "row",
      icon: "ti:arrows-vertical",
      count: Decimal.fromNumber(3),
      minCount: Decimal.fromNumber(3),
      cost(n) {
        return [{ resource: "cells", count: Decimal.sqr(n) }];
      },
      value(this: Resource) {
        return this.count.floor();
      },
    },
    {
      name: "cols",
      singularName: "col",
      icon: "ti:arrows-horizontal",
      count: Decimal.fromNumber(3),
      minCount: Decimal.fromNumber(3),
      cost(n) {
        return [{ resource: "cells", count: Decimal.sqr(n) }];
      },
      value(this: Resource) {
        return this.count.floor();
      },
    },
    {
      name: "difficulty",
      icon: "ti:adjustments-horizontal",
      display: "percentage",
      count: Decimal.fromNumber(15),
      minCount: Decimal.fromNumber(1),
      maxCount: Decimal.fromNumber(100),
      cost(n) {
        return [{ resource: "flags", count: Decimal.div(n, 2).floor() }];
      },
    },
    {
      name: "hintQuality",
      icon: "icon-hinted ti:bulb",
      display: "percentage",
      count: Decimal.dZero,
      maxCount: Decimal.fromNumber(100),
      cost(n) {
        return [
          { resource: "cells", count: Decimal.mul(n, 2) },
          { resource: "wins", count: Decimal.div(n, 10).floor() },
        ];
      },
    },
    {
      name: "hintsCount",
      singularName: "hint",
      pluralName: "hints",
      count: Decimal.dOne,
      cost(n) {
        return [
          { resource: "cells", count: Decimal.pow(2, Decimal.add(n, 1)) },
          { resource: "wins", count: Decimal.add(n, 1).sqr() },
        ];
      },
      value(this: Resource) {
        return this.count.floor();
      },
    },
    {
      name: "resetSpeed",
      icon: "ti:refresh-alert",
      display: "percentage",
      count: Decimal.dZero,
      maxCount: Decimal.fromNumber(100),
      extra: {
        remainingTime: 0,
      },
      cost(n) {
        return [
          { resource: "resets", count: 1 },
          { resource: "cells", count: n },
        ];
      },
      tick: tickTimer({ kind: "remainingTime", direction: -1 }),
    },
    {
      name: "revealNeighbors",
      icon: "icon-revealed ti:arrows-maximize",
      unlocked: false,
      count: Decimal.dZero,
      maxCount: Decimal.fromNumber(8),
      extra: {
        reveals: 0,
        explosions: 0,
        auto: 0,
        manual: 0,
        useless: 0,
      },
      cost(n) {
        return [
          { resource: "cells", count: Decimal.pow(2, Decimal.add(n, 1)) },
        ];
      },
      unlockCost: () => [],
      value(this: Resource) {
        return this.count.floor();
      },
    },

    {
      name: "clicks",
      singularName: "click",
      icon: "ti:hand-click",
      count: Decimal.dZero,
      extra: {
        left: 0,
        right: 0,
        double: 0,
        useless: 0,
      },
    },
    {
      name: "cells",
      singularName: "cell",
      icon: "icon-revealed ti:square",
      count: Decimal.dZero,
      extra: {
        auto: 0,
        manual: 0,
        total: 0,
        hidden: 0,
      },
    },
    {
      name: "hints",
      singularName: "hint",
      icon: "icon-hinted ti:eye",
      count: Decimal.dZero,
      extra: {
        auto: 0,
        manual: 0,
        total: 0,
      },
      cost() {
        return [{ resource: "wins", count: 1 }];
      },
      gainFactor(m) {
        return context.resourceManager.get("hintsCount").count.mul(m);
      },
    },
    {
      name: "flags",
      singularName: "flag",
      icon: "icon-flagged ti:flag-2",
      count: Decimal.dZero,
      extra: {
        auto: 0,
        manual: 0,
        total: 0,
        unflags: 0,
      },
    },
    {
      name: "explosions",
      singularName: "explosion",
      icon: "icon-blown ti:alert-triangle",
      count: Decimal.dZero,
      extra: {
        auto: 0,
        manual: 0,
        total: 0,
      },
    },

    {
      name: "autoRevealNeighbors",
      unlocked: false,
      count: Decimal.dZero,
      cost(n) {
        return [
          {
            resource: "automation",
            count: Decimal.pow(Decimal.add(n, 1), 1.5).floor(),
          },
        ];
      },
      unlockCost: () => [],
      shouldTick: shouldAutoTick,
      tick() {
        return revealNeighborsTask(context);
      },
    },
    {
      name: "autoFlagMines",
      unlocked: false,
      count: Decimal.dZero,
      cost(n) {
        return [
          {
            resource: "automation",
            count: Decimal.pow(Decimal.add(n, 1), 1.5).floor(),
          },
        ];
      },
      unlockCost: () => [],
      shouldTick: shouldAutoTick,
      tick() {
        return flagMinesTask(context);
      },
    },
    {
      name: "autoRevealHints",
      unlocked: false,
      count: Decimal.dZero,
      cost(n) {
        return [
          {
            resource: "automation",
            count: Decimal.pow(Decimal.add(n, 1), 1.5).floor(),
          },
        ];
      },
      unlockCost: () => [],
      shouldTick: shouldAutoTick,
      tick() {
        return revealHintsTask(context);
      },
    },
    {
      name: "autoPurchaseHints",
      unlocked: false,
      count: Decimal.dZero,
      cost(n) {
        return [
          {
            resource: "automation",
            count: Decimal.pow(Decimal.add(n, 1), 2).floor(),
          },
        ];
      },
      unlockCost: () => [],
      shouldTick: shouldAutoTick,
      tick() {
        return purchaseHintsTask(context);
      },
    },
    {
      name: "autoResetGame",
      unlocked: false,
      count: Decimal.dZero,
      cost(n) {
        return [
          {
            resource: "automation",
            count: Decimal.pow(Decimal.add(n, 1), 1.5).floor(),
          },
        ];
      },
      unlockCost: () => [],
      shouldTick: shouldAutoTick,
      tick() {
        return resetGameTask(context);
      },
    },
    {
      name: "autoClickBoard",
      unlocked: false,
      count: Decimal.dZero,
      cost(n) {
        return [
          {
            resource: "automation",
            count: Decimal.pow(Decimal.add(n, 1), 2).floor(),
          },
        ];
      },
      unlockCost: () => [],
    },
    {
      name: "autoBoardUpgrade",
      singularName: "Auto Expand Board",
      pluralName: "Auto Expand Board",
      unlocked: false,
      count: Decimal.dZero,
      cost(n) {
        return [
          {
            resource: "automation",
            count: Decimal.pow(Decimal.add(n, 1), 2).floor(),
          },
        ];
      },
      unlockCost: () => [],
      shouldTick: shouldAutoTick,
      tick() {
        return expandBoardDims(context);
      },
    },
  ];

  return res.map(context.resourceManager.upsert);
}

function MineSweeper() {
  const {
    context,
    resources: { minesweeper },
  } = useGameContext();
  const board: Board = minesweeper.extra.board;

  return (
    <div className="panel">
      <div className="title-bar">Minesweeper</div>
      <div className="full center">
        <TableGrid
          className="mine-sweeper"
          cells={board.cells}
          cellClass={(cell) => `cell-${cell.state}`}
          onRender={(cell) => <CellIcon cell={cell} />}
          onClick={(event, cell) => handleCellClick(event, cell, context)}
        >
          <ResetBox />
        </TableGrid>
      </div>
    </div>
  );
}

function ResourceBar() {
  const {
    context,
    resources: { wins, cells, automation, minesweeper },
  } = useGameContext();
  const board: Board = minesweeper.extra.board;

  return (
    <div className={`panel board-${board.state}`} id="resource-bar">
      <ResourceRender
        resource={wins}
        precision={0}
        showRate={true}
        showZeroRates={true}
        showRatePercentages={false}
        showChrome={true}
      />
      {automation.extra.total >= 5 && (
        <ResourceRender
          resource={automation}
          precision={0}
          showRate={true}
          showZeroRates={true}
          showRatePercentages={false}
          showChrome={true}
        />
      )}
      <ResourceRender
        resource={cells}
        precision={0}
        showRate={true}
        showZeroRates={true}
        showRatePercentages={false}
        showChrome={true}
      />
      <hr className="separator" />
      <ResourceRender
        override={{ name: "Board" }}
        suffix={`${board.rows}x${board.cols}`}
        showChrome={true}
      />
      <ResourceRender
        override={{
          name: "progress",
          count: Decimal.fromValue(boardProgress(context)),
          display: "percentage",
        }}
        showChrome={true}
      />
      <ResourceRender
        override={{
          name: "Mines",
          count: Decimal.fromValue(board.cellStates?.flagged),
          maxCount: Decimal.fromValue(board.cellContents?.mine),
        }}
        showMaxValue={true}
        showChrome={true}
      />
    </div>
  );
}

function ModeControls() {
  const {
    context,
    resources: { rows, cols, hints, resets, minesweeper },
  } = useGameContext();
  const [tapMode, setTapMode] = useState(minesweeper.extra.tapMode);
  const reveal = tapMode === "reveal";
  let board: Board = minesweeper.extra.board;

  function toggleTapMode(event: MouseEvent) {
    event.preventDefault();
    minesweeper.extra.tapMode = reveal ? "flag" : "reveal";
    setTapMode(minesweeper.extra.tapMode);
  }

  const boardSizeChanged =
    rows.value().neq(board.rows) || cols.value().neq(board.cols);

  function reset() {
    minesweeper.extra.board = board = { ...calculateBoardState(board, 0) };
    stateChanged(context, "board", board.state, false);
  }

  function getHint(numHints: number) {
    numHints = genHints(board, numHints, 0, 8, hintQuality(context));
    if (numHints > 0) {
      countActions(hints, false, numHints);
      minesweeper.extra.board = board = { ...board };
    }
  }

  return (
    <div className="panel" id="mode-controls">
      <div className="half left">
        <span>Tap mode:</span>
        <button
          type="button"
          value={tapMode}
          onClick={toggleTapMode}
          id="button-tapmode"
        >
          <Icon
            icon={reveal ? _cellIcons.revealed[9] : _cellIcons.flagged}
            className={`icon-${reveal ? "revealed" : "flagged"}`}
          />
          {reveal ? "Revealing" : "Flagging"}
        </button>
      </div>
      <div className="spacer"></div>
      <div className="right">
        <span>Buy amount:</span>
        <BuyButton.BuyAmountButtons />
      </div>
      <div className="half">
        <button className="buy-button" onClick={reset} id="button-reset">
          <ResourceRender
            resource={resets}
            override={{ count: Decimal.dOne }}
            showValue={false}
            showChrome={false}
            infix=""
            suffix="the Game"
          />
        </button>
      </div>
      <div className="half">
        <BuyButton
          resource={hints}
          overrideCount={0}
          onPurchase={(_, numHints) =>
            getHint(Decimal.fromValue(numHints).toNumber())
          }
        />
      </div>
      {boardSizeChanged && (
        <div className="left full" id="reset-info">
          On reset, game board will change to size to
          {` ${rows.value()}x${cols.value()}`}
        </div>
      )}
    </div>
  );
}

const _cellIcons = {
  hidden: "ti:question-mark",
  hinted: "ti:eye",
  flagged: "ti:flag-2",
  blown: "ti:alert-triangle",
  revealed: [
    "ti:square-dot",
    "ti:square-number-1",
    "ti:square-number-2",
    "ti:square-number-3",
    "ti:square-number-4",
    "ti:square-number-5",
    "ti:square-number-6",
    "ti:square-number-7",
    "ti:square-number-8",
    "ti:square",
  ],
};

function CellIcon({ cell }: { cell: Cell }) {
  let icon = _cellIcons[cell.state];
  if (icon instanceof Array) {
    icon = icon[cell.neighborContents?.mine ?? 9];
  }

  return <Icon icon={icon} className={`icon-${cell.state}`} />;
}

function ResetBox() {
  const {
    context,
    resources: { resetSpeed, minesweeper },
  } = useGameContext();
  let board: Board = minesweeper.extra.board;
  const [title, setTitle] = useState<string>(board.state);
  const [isResetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [messageTime, setMessageTime] = useState(0);

  if (!board.state) {
    minesweeper.extra.board = board = calculateBoardState(board);
  }

  useEffect(() => {
    setTitle(message(board.state));
  }, [board, board.state]);

  if (board.rows === 0 || board.cols === 0 || board.state === "inactive") {
    boardReset(context, true);
    return null;
  } else if (board.state === "active") {
    return null;
  }

  const waitTime = resetTime(context);
  const remainingTime = resetSpeed.extra.remainingTime;

  if (!isResetting && remainingTime > 0) {
    setResetting(true);
    setMessageTime(0);
  } else if (isResetting && remainingTime < 0.001) {
    setResetting(false);
    boardReset(context, false);
  }

  if (
    isResetting &&
    (!resetMessage || waitTime - remainingTime >= messageTime)
  ) {
    setResetMessage(message("resetting"));
    setMessageTime(messageTime + 2);
  }

  function startReset(event?: MouseEvent) {
    event?.preventDefault();

    if (!isResetting) {
      if (waitTime < 0.001) {
        boardReset(context, false);
      } else if (resetSpeed.extra.remainingTime < 0.001) {
        resetSpeed.extra.remainingTime = waitTime;
      }
    }
  }

  return (
    <div id="reset-box">
      <div className={`panel shadow board-${board.state}`}>
        <div className="title-bar">{title}</div>
        <div className="full center">Game over!</div>
        <div className="full center">
          You may reset the board to receive a brand new game to play:
        </div>
        <ProgressCircle
          value={isResetting ? (waitTime - remainingTime) / waitTime : 0}
          showPercent={isResetting}
          width="100%"
          height="50%"
        >
          {!isResetting && (
            <input
              type="button"
              value="Reset!"
              disabled={isResetting}
              onClick={startReset}
              id="button-reset"
            />
          )}
          {isResetting && <span>{resetMessage}...</span>}
        </ProgressCircle>
      </div>
    </div>
  );
}

function Upgrades() {
  const {
    context,
    resources: {
      rows,
      cols,
      difficulty,
      hintQuality,
      hintsCount,
      resetSpeed,
      revealNeighbors,
    },
  } = useGameContext();

  return (
    <div id="upgrades">
      <div className="game-controls panel" id="game-upgrades">
        <div className="title-bar">Game Upgrades</div>

        <div className="quarter">Game Width:</div>
        <div className="quarter">
          <ResourceRender
            resource={cols}
            showChrome={true}
            infix=""
            className="value-first"
          />
        </div>
        <div className="right half">
          <BuyButton resource={cols} prefix="Expand" />
        </div>
        <div className="half"></div>
        <div className="right half">
          {cols.count.gt(3) && (
            <BuyButton
              resource={cols}
              prefix="Shrink"
              mode="sell"
              costFactor={-1}
            />
          )}
        </div>

        <div className="quarter">Game Height:</div>
        <div className="quarter">
          <ResourceRender
            resource={rows}
            showChrome={true}
            infix=""
            className="value-first"
          />
        </div>
        <div className="right half">
          <BuyButton resource={rows} prefix="Expand" />
        </div>
        <div className="half"></div>
        <div className="right half">
          {rows.count.gt(3) && (
            <BuyButton
              resource={rows}
              prefix="Shrink"
              mode="sell"
              costFactor={-1}
            />
          )}
        </div>

        <div className="quarter">Game Difficulty:</div>
        <div className="quarter">
          <ResourceRender
            resource={difficulty}
            showChrome={true}
            showName={false}
            infix=""
            className="value-first"
          />
        </div>
        <div className="right half">
          <BuyButton resource={difficulty} prefix="Increase" />
        </div>
        <div className="quarter">
          <span className="computed">Score Multiplier:</span>
        </div>
        <div className="quarter">
          <ResourceRender
            override={{
              count: Decimal.fromValue(difficultyScore(context)),
              display: "percentage",
            }}
            showChrome={true}
            className="computed"
          />
        </div>
        <div className="right half">
          {difficulty.count.gt(1) && (
            <BuyButton
              resource={difficulty}
              prefix="Decrease"
              mode="sell"
              costFactor={-1}
            />
          )}
        </div>
      </div>

      <div className="game-controls panel">
        <div className="title-bar">Quality Upgrades</div>

        <div className="quarter">Reset Speed:</div>
        <div className="quarter">
          <ResourceRender
            resource={resetSpeed}
            showChrome={true}
            showName={false}
            infix=""
            className="value-first"
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={resetSpeed}
            prefix={
              resetSpeed.count < (resetSpeed.maxCount ?? Infinity)
                ? "Speed up"
                : "Max Speed!"
            }
          />
        </div>

        <hr className="separator" />

        <div className="quarter">Hint Quality:</div>
        <div className="quarter">
          <ResourceRender
            resource={hintQuality}
            showChrome={true}
            showName={false}
            infix=""
            className="value-first"
          />
        </div>
        <div className="right half">
          <BuyButton resource={hintQuality} prefix="Improve" />
        </div>

        <div className="quarter">Number of hints on purchase:</div>
        <div className="quarter">
          <ResourceRender
            resource={hintsCount}
            showChrome={true}
            infix=""
            className="value-first"
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={hintsCount}
            prefix={
              hintsCount.count < (hintsCount.maxCount ?? Infinity)
                ? "Improve"
                : "Max Quality!"
            }
          />
        </div>

        <hr className="separator" />

        <div className="half">
          <ResourceRender
            resource={revealNeighbors}
            showChrome={true}
            infix=""
            placeholder="Nothing happens"
            suffix="on double-tap"
            className="value-first"
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={revealNeighbors}
            allowUnlocking={true}
            prefix={
              !revealNeighbors.unlocked
                ? "Unlock"
                : revealNeighbors.count.lt(revealNeighbors.maxCount ?? Infinity)
                ? "Additional"
                : "Maxed out!"
            }
          />
        </div>
        <div className="full computed">
          Reveals random (hidden) neighbors of the square being tapped on.
          <br />
          CAUTION: it might trigger a mine if they have not been properly
          flagged!
        </div>
      </div>
    </div>
  );
}

function Automation() {
  const {
    resources: {
      revealNeighbors,
      autoRevealNeighbors,
      autoFlagMines,
      autoRevealHints,
      autoPurchaseHints,
      autoResetGame,
      autoClickBoard,
      autoBoardUpgrade,
    },
  } = useGameContext();

  const autoTimeStr = Format.time(1000 * 60, { ago: "" });

  function tickProgress(res: Resource) {
    // Prevent flickering
    return !res.disabled && res.value().gte(60) ? 1 : getTickProgress(res);
  }

  return (
    <div id="automation" className="automation">
      <div className="game-controls panel">
        <div className="title-bar">Cell Automation</div>

        <div className="half">
          <ResourceRender
            resource={autoRevealNeighbors}
            showChrome={true}
            showLocked={true}
            infix=""
            suffix={`time${
              autoRevealNeighbors.count.eq(1) ? "" : "s"
            } every ${autoTimeStr}`}
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={autoRevealNeighbors}
            allowUnlocking={true}
            enabled={revealNeighbors.unlocked && revealNeighbors.count.gt(0)}
            prefix={!autoRevealNeighbors.unlocked ? "Unlock" : "Additional"}
          />
        </div>
        <div className="full right">
          Enabled:
          <ToggleButton
            checked={
              autoRevealNeighbors.unlocked && !autoRevealNeighbors.disabled
            }
            onChange={(checked) => (autoRevealNeighbors.disabled = !checked)}
            checkedContents={<Icon icon="robot" />}
            unCheckedContents={<Icon icon="robot-off" />}
            enabled={
              autoRevealNeighbors.unlocked && autoRevealNeighbors.count.gt(0)
            }
          />
        </div>
        <ProgressBar
          value={tickProgress(autoRevealNeighbors)}
          className="full computed"
        >
          Automatically reveals the neighboring hidden squares if all the mines
          around it have been flagged.
        </ProgressBar>

        <hr className="separator" />

        <div className="half">
          <ResourceRender
            resource={autoFlagMines}
            showChrome={true}
            showLocked={true}
            infix=""
            suffix={`time${
              autoFlagMines.count.eq(1) ? "" : "s"
            } every ${autoTimeStr}`}
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={autoFlagMines}
            allowUnlocking={true}
            enabled={
              autoRevealNeighbors.unlocked && autoRevealNeighbors.count.gt(0)
            }
            prefix={!autoFlagMines.unlocked ? "Unlock" : "Additional"}
          />
        </div>
        <div className="full right">
          Enabled:
          <ToggleButton
            checked={autoFlagMines.unlocked && !autoFlagMines.disabled}
            onChange={(checked) => (autoFlagMines.disabled = !checked)}
            checkedContents={<Icon icon="robot" />}
            unCheckedContents={<Icon icon="robot-off" />}
            enabled={autoFlagMines.unlocked && autoFlagMines.count.gt(0)}
          />
        </div>
        <ProgressBar
          value={tickProgress(autoFlagMines)}
          className="full computed"
        >
          Automatically flags the hidden mines around a square if there are no
          more hidden clear squares left around it.
        </ProgressBar>

        <hr className="separator" />

        <div className="half">
          <ResourceRender
            resource={autoRevealHints}
            showChrome={true}
            showLocked={true}
            infix=""
            suffix={`time${
              autoRevealHints.count.eq(1) ? "" : "s"
            } every ${autoTimeStr}`}
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={autoRevealHints}
            allowUnlocking={true}
            prefix={!autoRevealHints.unlocked ? "Unlock" : "Additional"}
          />
        </div>
        <div className="full right">
          Enabled:
          <ToggleButton
            checked={autoRevealHints.unlocked && !autoRevealHints.disabled}
            onChange={(checked) => (autoRevealHints.disabled = !checked)}
            checkedContents={<Icon icon="robot" />}
            unCheckedContents={<Icon icon="robot-off" />}
            enabled={autoRevealHints.unlocked && autoRevealHints.count.gt(0)}
          />
        </div>
        <ProgressBar
          value={tickProgress(autoRevealHints)}
          className="full computed"
        >
          Automatically reveals any purchased hints.
        </ProgressBar>

        <hr className="separator" />

        <div className="half">
          <ResourceRender
            resource={autoPurchaseHints}
            showChrome={true}
            showLocked={true}
            infix=""
            suffix={`time${
              autoPurchaseHints.count.eq(1) ? "" : "s"
            } every ${autoTimeStr}`}
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={autoPurchaseHints}
            allowUnlocking={true}
            prefix={!autoPurchaseHints.unlocked ? "Unlock" : "Additional"}
          />
        </div>
        <div className="full right">
          Enabled:
          <ToggleButton
            checked={autoPurchaseHints.unlocked && !autoPurchaseHints.disabled}
            onChange={(checked) => (autoPurchaseHints.disabled = !checked)}
            checkedContents={<Icon icon="robot" />}
            unCheckedContents={<Icon icon="robot-off" />}
            enabled={
              autoPurchaseHints.unlocked && autoPurchaseHints.count.gt(0)
            }
          />
        </div>
        <ProgressBar
          value={tickProgress(autoPurchaseHints)}
          className="full computed"
        >
          Automatically makes a hint purchase when there are no other actions
          available.
        </ProgressBar>
      </div>

      <div className="game-controls panel">
        <div className="title-bar">Game Automation</div>

        <div className="half">
          <ResourceRender
            resource={autoResetGame}
            showChrome={true}
            showLocked={true}
            infix=""
            suffix={`time${
              autoResetGame.count.eq(1) ? "" : "s"
            } every ${autoTimeStr}`}
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={autoResetGame}
            allowUnlocking={true}
            prefix={!autoResetGame.unlocked ? "Unlock" : "Additional"}
          />
        </div>
        <div className="full right">
          Enabled:
          <ToggleButton
            checked={autoResetGame.unlocked && !autoResetGame.disabled}
            onChange={(checked) => (autoResetGame.disabled = !checked)}
            checkedContents={<Icon icon="robot" />}
            unCheckedContents={<Icon icon="robot-off" />}
            enabled={autoResetGame.unlocked && autoResetGame.count.gt(0)}
          />
        </div>
        <ProgressBar
          value={tickProgress(autoResetGame)}
          className="full computed"
        >
          Automatically initiates game reset when the game is either won or
          lost.
        </ProgressBar>

        <hr className="separator" />

        <div className="half">
          <ResourceRender
            resource={autoClickBoard}
            showChrome={true}
            showLocked={true}
            infix=""
            suffix={`time${autoClickBoard.count.eq(1) ? "" : "s"} after reset`}
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={autoClickBoard}
            allowUnlocking={true}
            prefix={!autoClickBoard.unlocked ? "Unlock" : "Additional"}
          />
        </div>
        <div className="full right">
          Enabled:
          <ToggleButton
            checked={autoClickBoard.unlocked && !autoClickBoard.disabled}
            onChange={(checked) => (autoClickBoard.disabled = !checked)}
            checkedContents={<Icon icon="robot" />}
            unCheckedContents={<Icon icon="robot-off" />}
            enabled={autoClickBoard.unlocked && autoClickBoard.count.gt(0)}
          />
        </div>
        <div className="full computed">
          Automatically reveals cells on new games. Does not differentiate
          between mines and clear cells.
        </div>
      </div>

      <div className="game-controls panel">
        <div className="title-bar">Board Automation</div>

        <div className="half">
          <ResourceRender
            resource={autoBoardUpgrade}
            showChrome={true}
            showLocked={true}
            infix=""
            suffix={`time${
              autoBoardUpgrade.count.eq(1) ? "" : "s"
            } every ${autoTimeStr}`}
          />
        </div>
        <div className="right half">
          <BuyButton
            resource={autoBoardUpgrade}
            allowUnlocking={true}
            prefix={!autoBoardUpgrade.unlocked ? "Unlock" : "Additional"}
          />
        </div>
        <div className="full right">
          Enabled:
          <ToggleButton
            checked={autoBoardUpgrade.unlocked && !autoBoardUpgrade.disabled}
            onChange={(checked) => (autoBoardUpgrade.disabled = !checked)}
            checkedContents={<Icon icon="robot" />}
            unCheckedContents={<Icon icon="robot-off" />}
            enabled={autoBoardUpgrade.unlocked && autoBoardUpgrade.count.gt(0)}
          />
        </div>
        <ProgressBar
          value={tickProgress(autoBoardUpgrade)}
          className="full computed"
        >
          Automatically purchases game width and game height expansions if
          affordable.
        </ProgressBar>
      </div>
    </div>
  );
}

function Stats() {
  const context = useGameContext();
  const location = useLocation();
  const debug = location.search.toLowerCase().includes("debug");

  function render(name: string) {
    const res = context.resourceManager.get(name);
    return (
      <ResourceRender
        resource={res}
        length={res.display === "percentage" ? "tiny" : "short"}
        precision={res.display === "percentage" ? 1 : undefined}
        showMaxValue={true}
        showRate={true}
        showExtras={debug}
        showZeroRates={true}
        showRateColors={true}
        placeholder=""
      />
    );
  }

  return (
    <div id="stats">
      <div className="panel stats" id="stats-time">
        <div className="title-bar">Time Info</div>
        {render("totalTime")}
        {render("activeTime")}
        {render("offlineTime")}
      </div>
      <div className="panel stats" id="stats-board">
        <div className="title-bar">Board Info</div>
        {render("rows")}
        {render("cols")}
        {render("difficulty")}
        {render("resetSpeed")}
        {render("hintQuality")}
      </div>
      <div className="panel stats" id="stats-game">
        <div className="title-bar">Game Info</div>
        {render("wins")}
        {render("losses")}
        {render("resets")}
        {render("automation")}
      </div>
      <div className="panel stats" id="stats-cell">
        <div className="title-bar">Cell Info</div>
        {render("cells")}
        {render("flags")}
        {render("hints")}
        {render("explosions")}
        {render("clicks")}
        {render("revealNeighbors")}
      </div>
    </div>
  );
}

type CellContents = "clear" | "mine";
type CellState = "hidden" | "hinted" | "flagged" | "revealed" | "blown";
type CellAction = "reveal" | "flag" | "hint" | "hide";
type BoardState = "inactive" | "active" | "won" | "lost";

type Cell = {
  row: number;
  col: number;

  contents: CellContents;
  state: CellState;
  locked?: boolean;

  neighborStates: Expansion<CellState, number>;
  neighborContents: Expansion<CellContents, number>;
};

type Board = {
  rows: number;
  cols: number;

  cells: Cell[][];

  state: BoardState;
  cellStates: Expansion<CellState, number>;
  cellContents: Expansion<CellContents, number>;

  hadUserAction: boolean;
};

const emptyBoard: Board = {
  rows: 0,
  cols: 0,
  cells: [],
  state: "inactive",
  cellStates: {
    hidden: 0,
    hinted: 0,
    flagged: 0,
    revealed: 0,
    blown: 0,
  },
  cellContents: {
    clear: 0,
    mine: 0,
  },
  hadUserAction: false,
};

const emptyCell: Cell = {
  row: 0,
  col: 0,
  contents: "clear",
  state: "hidden",
  neighborStates: { ...emptyBoard.cellStates },
  neighborContents: { ...emptyBoard.cellContents },
};

function actOnCell(cell: Cell, action: CellAction): Cell {
  switch (action) {
    case "flag":
      if (cell.state === "hidden" || cell.state === "hinted") {
        cell.state = "flagged";
      } else if (cell.state === "flagged") {
        cell.state = "hidden";
      }
      break;

    case "reveal":
      if (cell.state === "hidden" || cell.state === "hinted") {
        if (cell.contents === "clear") {
          cell.state = "revealed";
        } else if (cell.contents === "mine") {
          cell.state = "blown";
        }
      }
      break;

    case "hint":
      if (cell.state === "hidden") {
        cell.state = "hinted";
      }
      break;

    case "hide":
      if (cell.state === "flagged" || cell.state === "revealed") {
        cell.state = "hidden";
      }
      break;
  }

  return cell;
}

function makeClearBoard(rows: number, cols: number): Board {
  const cells: Cell[][] = [];
  for (let row = 0; row < rows; row++) {
    cells[row] = [];
    for (let col = 0; col < cols; col++) {
      cells[row][col] = { ...emptyCell, row, col };
    }
  }

  return {
    rows,
    cols,
    cells,
    state: "active",
    cellStates: { ...emptyBoard.cellStates, hidden: rows * cols },
    cellContents: { ...emptyBoard.cellContents, clear: rows * cols },
    hadUserAction: false,
  };
}

function populateRandomMines(
  board: Board,
  minMines?: number,
  maxMines?: number,
): Board {
  minMines = minMines ?? maxMines ?? 0;
  maxMines = maxMines ?? minMines ?? 0;
  let numMines = clamp(
    Math.floor(minMines + Math.random() * (1 + maxMines - minMines)),
    0,
    board.cellStates.hidden - board.cellContents.mine - 1,
  );

  while (numMines > 0) {
    const r = Math.floor(Math.random() * board.rows);
    const c = Math.floor(Math.random() * board.cols);

    if (
      board.cells[r][c].contents === "clear" &&
      board.cells[r][c].state === "hidden"
    ) {
      board.cells[r][c].contents = "mine";
      board.cellContents.mine++;
      numMines--;
    }
  }

  return calculateBoardState(board);
}

function calculateBoardState(board: Board, maxErrors = 1): Board {
  board.cellStates = { ...emptyBoard.cellStates };
  board.cellContents = { ...emptyBoard.cellContents };
  board.cells.forEach((cells) =>
    cells.forEach((cell) => {
      cell.neighborStates = { ...emptyCell.neighborStates };
      cell.neighborContents = { ...emptyCell.neighborContents };
    }),
  );

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.cells[r][c];
      board.cellStates[cell.state]++;
      board.cellContents[cell.contents]++;
      cell.row = r;
      cell.col = c;
      cell.locked = !!cell.locked || undefined;
      setSaveProperties(cell, ["contents", "state", "locked"]);

      for (let dr = r - 1; dr <= r + 1; dr++) {
        for (let dc = c - 1; dc <= c + 1; dc++) {
          const neighbor = (board.cells[dr] ?? [])[dc];
          if (neighbor && !(dr === r && dc === c)) {
            cell.neighborContents[neighbor.contents]++;
            cell.neighborStates[neighbor.state]++;
          }
        }
      }
    }
  }

  if (board.state === "lost" || board.cellStates["blown"] >= maxErrors) {
    board.state = "lost";
    board.cells.forEach((cells) =>
      cells.forEach((cell) => {
        board.cellStates[cell.state]--;
        actOnCell(cell, "reveal");
        board.cellStates[cell.state]++;
      }),
    );
  } else if (board.cols * board.rows === 0) {
    board.state = "inactive";
  } else if (
    board.cellStates["blown"] + board.cellStates["flagged"] >=
      board.cellContents.mine &&
    board.cellStates["hidden"] === 0 &&
    board.cellStates["revealed"] >=
      board.cols * board.rows - board.cellContents.mine
  ) {
    board.state = "won";
  } else {
    board.state = "active";
  }

  return setSaveProperties(board, ["rows", "cols", "cells", "hadUserAction"]);
}

function genBoard(
  rows: number,
  cols: number,
  minMines?: number,
  maxMines?: number,
): Board {
  let board = makeClearBoard(rows, cols);
  board = populateRandomMines(board, minMines, maxMines);

  return board;
}

function genHints(
  board: Board,
  numHints: number,
  minHintLevel: number = 0,
  maxHintLevel: number = 8,
  hintQuality: number = 0,
): number {
  minHintLevel = Math.floor(clamp(minHintLevel, 0, 8));
  maxHintLevel = Math.floor(clamp(maxHintLevel, 0, 8));

  const hints = Arr.pickWeightedSamples(
    board.cells.flat(),
    numHints,
    hintQuality,
    (a, b) => a.neighborContents.mine - b.neighborContents.mine,
    (cell) =>
      cell.state === "hidden" &&
      cell.contents === "clear" &&
      cell.neighborContents.mine >= minHintLevel &&
      cell.neighborContents.mine <= maxHintLevel,
  );

  hints.forEach((hint) => {
    board.cellStates[hint.state]--;
    actOnCell(hint, "hint");
    board.cellStates[hint.state]++;
  });

  return hints.length;
}

function countActions(resource: Resource, automatic: boolean, count = 1) {
  if (automatic) {
    const auto = resource.manager.resources.automation;
    auto.add(count);
    auto.extra.total += count;

    if (resource.extra.auto != null) {
      resource.extra.auto += count;
    }
  } else if (resource.extra.manual != null) {
    resource.extra.manual += count;
  }

  if (resource.extra.total != null) {
    resource.extra.total += count;
  }

  if (resource.extra.streak != null) {
    resource.extra.streak += count;

    if (
      resource.extra.longestStreak != null &&
      resource.extra.streak > resource.extra.longestStreak
    ) {
      resource.extra.longestStreak = resource.extra.streak;
    }
  }
}

const _targetStates: Record<string, string> = {
  "board:active": "resets",
  "board:lost": "losses",
  "board:won": "wins",
  "cell:blown": "explosions",
  "cell:hinted": "hints",
  "cell:flagged": "flags",
  "cell:revealed": "cells",
};

function stateChanged(
  context: Context,
  target: "board" | "cell",
  state: string,
  automatic: boolean,
  count = 1,
) {
  const resources = context.resourceManager.resources;
  const res = resources[_targetStates[target + ":" + state] ?? ""];
  if (res) {
    res.add(count);
    countActions(res, automatic, count);
  }

  switch (target + ":" + state) {
    case "cell:unflagged":
      resources.flags.add(-count);
      resources.flags.extra.unflags += count;
      break;
    case "cell:unrevealed":
      resources.cells.add(-count);
      resources.cells.extra.hidden += count;
      break;
    case "board:won":
      resources.losses.extra.streak = 0;
      break;
    case "board:lost":
      resources.wins.extra.streak = 0;
      break;
  }
}

function revealNeighbors(
  context: Context,
  board: Board,
  cell: Cell,
  count: number,
  automatic: boolean,
): number {
  const res = context.resourceManager.resources.revealNeighbors;

  const choices = [];
  for (let dr = cell.row - 1; dr <= cell.row + 1; dr++) {
    for (let dc = cell.col - 1; dc <= cell.col + 1; dc++) {
      if ((board.cells[dr] ?? [])[dc]?.state === "hidden") {
        choices.push(board.cells[dr][dc]);
      }
    }
  }

  Arr.shuffle(choices).splice(count);
  for (const cell of choices) {
    actOnCell(cell, "reveal");
    stateChanged(context, "cell", cell.state, true);

    if (cell.state === "revealed" && cell.contents === "clear") {
      res.extra.reveals++;
    } else if (cell.state === "blown" || cell.contents === "mine") {
      res.extra.explosions++;
    } else {
      res.extra.useless++;
    }
  }

  countActions(res, automatic);
  if (choices.length === 0) {
    res.extra.useless++;
  }

  return choices.length;
}

function boardReset(context: Context, automatic = false) {
  const resources = context.resourceManager.resources;
  let board: Board = resources.minesweeper.extra.board;
  const firstGame =
    automatic &&
    board.state === "inactive" &&
    resources.resets.count.eq(0) &&
    resources.resets.extra.total === 0;

  // First game always has 1 mine
  const m = firstGame ? 1 : numMines(context);

  resources.minesweeper.extra.tapMode = "reveal";
  resources.minesweeper.extra.board = board = genBoard(
    resources.rows.value().toNumber(),
    resources.cols.value().toNumber(),
    Math.floor(m),
    Math.ceil(m),
  );
  stateChanged(context, "board", board.state, automatic);

  if (firstGame) {
    // Free hint on first game!
    if (genHints(board, 1, 0, 0, 1) === 0) {
      genHints(board, 1, 0, 1, 1);
    }
    stateChanged(context, "cell", "hinted", true);
  }

  // Auto click on start
  if (
    resources.autoClickBoard.count.gt(0) &&
    (resources.autoClickBoard.unlocked ?? true) &&
    !resources.autoClickBoard.disabled
  ) {
    for (let i = resources.autoClickBoard.value().toNumber(); i > 0; i--) {
      const r = Math.floor(Math.random() * resources.rows.value().toNumber());
      const c = Math.floor(Math.random() * resources.cols.value().toNumber());
      const cell = board.cells[r][c];
      if (cell.state === "hidden" && board.state === "active") {
        actOnCell(cell, "reveal");
        stateChanged(context, "cell", cell.state, true);
      }
    }
  }

  return recomputeBoardState(context);
}

function handleCellClick(event: MouseEvent, cell: Cell, context: Context) {
  event.preventDefault();
  const resources = context.resourceManager.resources;
  let board: Board = resources.minesweeper.extra.board;

  const clicks = resources.clicks;
  clicks.count = clicks.count.add(1);
  if (cell.locked) {
    clicks.extra.useless++;
    return;
  }

  const prevState = cell.state;

  // To flag: Right click
  //  On devices that don't have right click, hold any of the modifier keys
  //  and left click
  if (
    (event.button === 2 && event.type === "contextmenu") ||
    (event.button === 0 &&
      event.type === "click" &&
      (resources.minesweeper.extra.tapMode === "flag" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey))
  ) {
    clicks.extra.right++;
    actOnCell(cell, "flag");
  }
  // To reveal: Left click
  else if (
    event.button === 0 &&
    event.type === "click" &&
    resources.minesweeper.extra.tapMode === "reveal"
  ) {
    clicks.extra.left++;
    actOnCell(cell, "reveal");
  }
  // To auto-fill: Double click
  else if (event.button === 0 && event.type === "dblclick") {
    clicks.extra.double++;
    clicks.extra.useless--;
    clicks.extra.left--;

    if (!(resources.revealNeighbors.unlocked ?? true)) {
      clicks.extra.useless++;
    } else {
      revealNeighbors(
        context,
        board,
        cell,
        resources.revealNeighbors.count.toNumber(),
        false,
      );
    }
  }

  if (prevState === cell.state && event.type !== "dblclick") {
    clicks.extra.useless++;
  } else {
    if (prevState !== cell.state) {
      stateChanged(context, "cell", cell.state, false);
      if (cell.state === "hidden") {
        stateChanged(context, "cell", "un" + prevState, false);
      }
    }

    board.hadUserAction = true;
    if (board.state === "active") {
      resources.minesweeper.extra.board = board = {
        ...calculateBoardState(board, resources.minesweeper.extra.maxErrors),
      };
      if (board.state !== "active") {
        stateChanged(context, "board", board.state, false);
      }
    }
  }
}

function boardProgress({ resourceManager: { resources } }: Context): number {
  const board: Board = resources.minesweeper.extra.board;
  return (
    (100 * (board.cellStates?.revealed + board.cellStates?.flagged)) /
    (board.rows * board.cols)
  );
}

function numMines({ resourceManager: { resources } }: Context): number {
  return (
    resources.rows.value().toNumber() *
    resources.cols.value().toNumber() *
    (resources.difficulty.value().toNumber() / 100)
  );
}

function hintQuality({ resourceManager: { resources } }: Context): number {
  return resources.hintQuality.value().toNumber() / 100;
}

function remainingHints({ resourceManager: { resources } }: Context): number {
  const board: Board = resources.minesweeper.extra.board;
  return (
    board.rows * board.cols -
    board.cellContents?.mine -
    board.cellStates?.revealed
  );
}

function resetTime({ resourceManager: { resources } }: Context): number {
  return (
    (1 - resources.resetSpeed.value().toNumber() / 100) *
    Math.sqrt(
      resources.rows.value().toNumber() *
        resources.cols.value().toNumber() *
        (resources.difficulty.value().toNumber() / 100) *
        10,
    )
  );
}

function difficultyScore({ resourceManager: { resources } }: Context): number {
  return (resources.difficulty.value().toNumber() + 10) / 25;
}

function getTickProgress(res: Resource<Context>, dt?: number): number {
  if (!res || res.count.lte(0) || !(res.unlocked ?? true) || res.disabled) {
    return NaN;
  }

  const context = res.manager.context;
  dt ??=
    (Date.now() - (res.execution.lastTick ?? Date.now())) /
    1000.0 /
    context.settings.timeDilation;
  return (dt * res.count.toNumber()) / 60.0;
}

function shouldAutoTick(this: Resource, dt: number, src?: string) {
  return src === "tick" && getTickProgress(this, dt) >= 1.0;
}

function recomputeBoardState(context: Context, invalidate = true) {
  if (invalidate) {
    const resources = context.resourceManager.resources;
    resources.minesweeper.extra.board = {
      ...calculateBoardState(
        resources.minesweeper.extra.board,
        resources.minesweeper.extra.maxErrors,
      ),
    };
  }

  return invalidate;
}

function canRevealNeighbors(cell: Cell) {
  return (
    cell.state === "revealed" &&
    cell.contents === "clear" &&
    cell.neighborContents.mine ===
      cell.neighborStates.flagged + cell.neighborStates.blown &&
    cell.neighborStates.hidden > 0
  );
}

function revealNeighborsTask(context: Context) {
  const resources = context.resourceManager.resources;
  const board: Board = resources.minesweeper.extra.board;
  const res = resources.autoRevealNeighbors;

  if (
    res.count.lte(0) ||
    !(res.unlocked ?? true) ||
    res.disabled ||
    board.state !== "active"
  ) {
    return null;
  }

  const candidates = board.cells.flat().filter(canRevealNeighbors);
  if (candidates.length === 0) {
    return false;
  }

  const revelaed = revealNeighbors(
    context,
    board,
    Arr.shuffle(candidates)[0],
    resources.revealNeighbors.count.toNumber(),
    true,
  );

  return recomputeBoardState(context, revelaed > 0);
}

function resetGameTask(context: Context) {
  const resources = context.resourceManager.resources;
  const board: Board = resources.minesweeper.extra.board;

  if (
    resources.autoResetGame.count.lte(0) ||
    !(resources.autoResetGame.unlocked ?? true) ||
    resources.autoResetGame.disabled ||
    board.state === "active" ||
    board.state === "inactive" ||
    resources.resetSpeed.extra.remainingTime > 0
  ) {
    return null;
  }

  const waitTime = resetTime(context);
  if (waitTime < 0.001) {
    boardReset(context, true);
    return true;
  } else {
    resources.resetSpeed.extra.remainingTime = waitTime;
    return false;
  }
}

function canFlagMines(cell: Cell) {
  return (
    cell.state === "revealed" &&
    cell.contents === "clear" &&
    cell.neighborContents.mine ===
      cell.neighborStates.flagged +
        cell.neighborStates.blown +
        cell.neighborStates.hidden &&
    cell.neighborContents.clear === cell.neighborStates.revealed &&
    cell.neighborStates.hidden > 0
  );
}

function flagMinesTask(context: Context) {
  const board: Board =
    context.resourceManager.resources.minesweeper.extra.board;
  const res = context.resourceManager.resources.autoFlagMines;

  if (
    res.count.lte(0) ||
    !(res.unlocked ?? true) ||
    res.disabled ||
    board.state !== "active"
  ) {
    return null;
  }

  const candidates = board.cells.flat().filter(canFlagMines);
  if (candidates.length === 0) {
    return false;
  }

  const cell = Arr.shuffle(candidates)[0];
  const choices = [];
  for (let dr = cell.row - 1; dr <= cell.row + 1; dr++) {
    for (let dc = cell.col - 1; dc <= cell.col + 1; dc++) {
      if ((board.cells[dr] ?? [])[dc]?.state === "hidden") {
        choices.push(board.cells[dr][dc]);
      }
    }
  }
  if (choices.length === 0) {
    return false;
  }

  const neighbor = Arr.shuffle(choices)[0];
  actOnCell(neighbor, "flag");
  stateChanged(context, "cell", neighbor.state, true);

  return recomputeBoardState(context);
}

function canRevealHints(cell: Cell) {
  return cell.state === "hinted" && cell.contents === "clear";
}

function revealHintsTask(context: Context) {
  const board: Board =
    context.resourceManager.resources.minesweeper.extra.board;
  const res = context.resourceManager.resources.autoRevealHints;

  if (
    res.count.lte(0) ||
    !(res.unlocked ?? true) ||
    res.disabled ||
    board.state !== "active"
  ) {
    return null;
  }

  const candidates = board.cells.flat().filter(canRevealHints);
  if (candidates.length === 0) {
    return false;
  }

  const cell = Arr.shuffle(candidates)[0];
  actOnCell(cell, "reveal");
  stateChanged(context, "cell", cell.state, true);

  return recomputeBoardState(context);
}

function purchaseHintsTask(context: Context) {
  const board: Board =
    context.resourceManager.resources.minesweeper.extra.board;
  const res = context.resourceManager.resources.autoPurchaseHints;

  if (
    res.count.lte(0) ||
    !(res.unlocked ?? true) ||
    res.disabled ||
    board.state !== "active" ||
    remainingHints(context) === 0
  ) {
    return null;
  }

  const hints = context.resourceManager.resources.hints;
  const candidates = board.cells
    .flat()
    .filter(
      (cell) =>
        canRevealHints(cell) || canRevealNeighbors(cell) || canFlagMines(cell),
    );
  if (candidates.length > 0) {
    return false;
  }

  const purchase = hints.buy();
  if (Decimal.eq(purchase.count, 0)) {
    return false;
  }

  const numHints = genHints(
    board,
    Decimal.fromValue(purchase.gain[0].count).toNumber(),
    0,
    8,
    hintQuality(context),
  );
  if (numHints > 0) {
    countActions(hints, true, numHints);
    return recomputeBoardState(context);
  }

  return false;
}

function expandBoardDims(context: Context) {
  const ress = context.resourceManager.resources;
  if (
    ress.autoBoardUpgrade.count.lte(0) ||
    !(ress.autoBoardUpgrade.unlocked ?? true) ||
    ress.autoBoardUpgrade.disabled
  ) {
    return null;
  }

  const res = ress.rows.count < ress.cols.count ? ress.rows : ress.cols;
  const purchase = res.buy();
  if (Decimal.eq(purchase.count, 0)) {
    return false;
  }

  countActions(res, true);
  return recomputeBoardState(context);
}
