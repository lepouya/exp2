import Decimal from "break_eternity.js";

import Game from "../components/Game";
import useGameContext from "../components/GameContext";
import Icon from "../components/Icon";
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
      <div id="ms">
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
  const { resources } = useGameContext();
  const board: Board = resources.minesweeper.extra.board;
  if (!board.state) {
    resources.minesweeper.extra.board = calculateBoardState(board);
  }

  return (
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

  neighborContents: Expansion<CellContents, number>;
  neighborStates: Expansion<CellState, number>;
};

type Board = {
  rows: number;
  cols: number;

  cells: Cell[][];
  numMines: number;

  state: BoardState;
  cellCounts: Expansion<CellState, number>;

  hadUserAction: boolean;
};

const emptyCell: Cell = {
  row: 0,
  col: 0,
  contents: "clear",
  state: "hidden",
  neighborContents: {
    clear: 0,
    mine: 0,
  },
  neighborStates: {
    hidden: 0,
    hinted: 0,
    flagged: 0,
    revealed: 0,
    blown: 0,
  },
};

const emptyBoard: Board = {
  rows: 0,
  cols: 0,
  cells: [],
  numMines: 0,
  state: "inactive",
  cellCounts: {
    hidden: 0,
    hinted: 0,
    flagged: 0,
    revealed: 0,
    blown: 0,
  },
  hadUserAction: false,
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
    numMines: 0,
    state: "active",
    cellCounts: { ...emptyBoard.cellCounts, hidden: rows * cols },
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
    board.cellCounts.hidden - board.numMines - 1,
  );

  while (numMines > 0) {
    const r = Math.floor(Math.random() * board.rows);
    const c = Math.floor(Math.random() * board.cols);

    if (
      board.cells[r][c].contents === "clear" &&
      board.cells[r][c].state === "hidden"
    ) {
      board.cells[r][c].contents = "mine";
      board.numMines++;
      numMines--;
    }
  }

  return calculateBoardState(board);
}

function calculateBoardState(board: Board, maxErrors = 1): Board {
  board.cellCounts = { ...emptyBoard.cellCounts };
  board.numMines = 0;
  board.cells.forEach((cells) =>
    cells.forEach((cell) => {
      cell.neighborContents = { ...emptyCell.neighborContents };
      cell.neighborStates = { ...emptyCell.neighborStates };
    }),
  );

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.cells[r][c];
      board.numMines += cell.contents === "mine" ? 1 : 0;
      board.cellCounts[cell.state]++;
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

  if (board.state === "lost" || board.cellCounts["blown"] >= maxErrors) {
    board.state = "lost";
    board.cells.forEach((cells) =>
      cells.forEach((cell) => {
        board.cellCounts[cell.state]--;
        actOnCell(cell, "reveal");
        board.cellCounts[cell.state]++;
      }),
    );
  } else if (board.cols * board.rows === 0) {
    board.state = "inactive";
  } else if (
    board.cellCounts["blown"] + board.cellCounts["flagged"] >= board.numMines &&
    board.cellCounts["hidden"] === 0 &&
    board.cellCounts["revealed"] >= board.cols * board.rows - board.numMines
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

export function genHints(
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
    actOnCell(hint, "hint");
    board.cellCounts.hinted++;
    board.cellCounts.hidden--;
  });

  return hints.length;
}
