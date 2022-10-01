import Game from "../components/Game";
import Icon from "../components/Icon";
import TableGrid from "../components/TableGrid";
import { Context } from "../model/Context";

export default function initMineSweeper(_context: Context) {
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

function MineSweeper() {
  // const { resourceManager } = useGameContext();

  return (
    <div className="panel">
      <div className="title-bar">Minesweeper</div>
      <div className="full center">
        <TableGrid
          cells={[
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ]}
          onRender={(cell) => <Icon icon={`ti:square-number-${cell}`} />}
        />
      </div>
    </div>
  );
}
