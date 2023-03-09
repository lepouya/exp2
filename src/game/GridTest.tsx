import Game from "../components/Game";
import Grid from "../components/Grid";
import Icon from "../components/Icon";
import { Context } from "../model/Context";

export default function initGridTest(_context: Context) {
  Game.registerTab({
    path: "/grid_test",
    placement: "left",
    order: 3,
    heading: "Grids Test",
    body: () => (
      <div>
        {shapes.map((shape) => (
          <div className="panel" key={shape}>
            <div className="title-bar">{shape}</div>
            {cells.map((grid, i) => (
              <div className="full center" key={shape + "-" + i}>
                <Grid
                  cells={grid}
                  render={RenderCell}
                  shape={shape}
                  cellGap="1px"
                  cellStyle={() => ({
                    background: "linear-gradient(#aaa, #eee)",
                  })}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  });
}

type CellProps = {
  cells: string[][];
  cell?: string;
  row: number;
  col: number;
};

function RenderCell({ cell, row, col }: CellProps) {
  const text = `${row + 1}:${col + 1}`;
  if (cell) {
    return <Icon icon={cell} />;
  } else {
    return <div>{text}</div>;
  }
}

const cells: string[][][] = [
  Array.from(Array(4)).map((_) => Array.from(Array(4)).map((_) => "")),
  Array.from(Array(10)).map((_) => Array.from(Array(10)).map((_) => "")),
  [
    ["gi:breaking-chain", "gi:circular-saw", "gi:scales"],
    ["ti:chart-bar-off", "ti:brand-nextjs", "ti:chess-knight"],
    ["gi:barn-owl", "ti:square", "gi:goblin"],
  ],
];

const shapes = [
  "Square",
  "Diamond",
  "Zigzag",
  "Drape",
  "Checkerboard",
  "Hexagon",
  "Honeycomb",
  "Octagon",
] as const;
