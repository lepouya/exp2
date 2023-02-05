import Decimal from "break_eternity.js";

import BuyButton from "../components/BuyButton";
import Game from "../components/Game";
import useGameContext from "../components/GameContext";
import Icon from "../components/Icon";
import ResourceRender from "../components/ResourceRender";
import TableGrid from "../components/TableGrid";
import { Context } from "../model/Context";
import { Resource } from "../model/Resource";
import Arr from "../utils/arrays";
import clamp from "../utils/clamp";
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
        <MineSweeper />
      </div>
    ),
  });
}

function genMineSweeper(context: Context) {
  const res: Partial<Resource<Context>>[] = [
    {
      name: "minesweeper",
      extra: {
        board: genBoard(10, 10, 10), // { ...emptyBoard },
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
      count: Decimal.dZero,
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
  ];

  return res.map(context.resourceManager.upsert);
}

function MineSweeper() {
  const {
    context,
    resources: { rows, cols, hints, hintQuality, resets, minesweeper },
  } = useGameContext();

  let board: Board = minesweeper.extra.board;
  if (!board.state) {
    minesweeper.extra.board = board = calculateBoardState(board);
  }

  const boardSizeChanged =
    rows.value().neq(board.rows) || cols.value().neq(board.cols);

  function reset() {
    minesweeper.extra.board = board = { ...calculateBoardState(board, 0) };
    stateChanged(context, "board", board.state, false);
  }

  function getHint(numHints: number) {
    numHints = genHints(
      board,
      numHints,
      0,
      8,
      hintQuality.value().div(100).toNumber(),
    );
    if (numHints > 0) {
      countActions(hints, false, numHints);
      minesweeper.extra.board = board = { ...board };
    }
  }

  return (
    <>
      <div className="panel">
        <div className="title-bar">Minesweeper</div>
        <div className="full center">
          <TableGrid
            cells={board.cells}
            onRender={(cell) => (
              <Icon icon={`ti:square-number-${cell?.neighborContents.mine}`} />
            )}
          />
        </div>
      </div>
      <div className="game-controls panel">
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
            // overrideMaxCount={
            //   board.rows * board.cols -
            //   board.numMines -
            //   board.cellCounts.revealed
            // }
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
    </>
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

function stateChanged(
  context: Context,
  target: "board" | "cell",
  state: string,
  automatic: boolean,
  count = 1,
) {
  const targetStates: Record<string, string> = {
    "board:active": "resets",
    "board:lost": "losses",
    "board:won": "wins",
    "cell:blown": "explosions",
    "cell:hinted": "hints",
    "cell:flagged": "flags",
    "cell:revealed": "cells",
  };

  const resources = context.resourceManager.resources;
  const res = resources[targetStates[target + ":" + state] ?? ""];
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
