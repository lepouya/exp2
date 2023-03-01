import {
  CSSProperties,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  useState,
} from "react";

import Arr from "../utils/arrays";

type TableGridProps<Cell> = {
  id?: string;
  cells: Cell[][];

  cellAutoSize?: boolean;
  cellWidth?: string | number;
  cellHeight?: string | number;
  minCellWidth?: string | number;
  maxCellWidth?: string | number;
  minCellHeight?: string | number;
  maxCellHeight?: string | number;

  onClick?: (event: MouseEvent, cell: Cell, row: number, col: number) => void;
  onRender?: (cell: Cell, row: number, col: number) => ReactNode;

  className?: string;
  style?: CSSProperties;
  tableClass?: string;
  tableStyle?: CSSProperties;
  rowClass?: (row: number) => string | undefined;
  rowStyle?: (row: number) => CSSProperties | undefined;
  cellClass?: (cell: Cell, row: number, col: number) => string | undefined;
  cellStyle?: (
    cell: Cell,
    row: number,
    col: number,
  ) => CSSProperties | undefined;
};

export default function TableGrid<Cell>({
  id,
  cells,

  cellAutoSize = true,
  cellWidth,
  cellHeight,
  minCellWidth,
  maxCellWidth,
  minCellHeight,
  maxCellHeight,

  onClick,
  onRender,

  className,
  style,
  tableClass,
  tableStyle,
  rowClass,
  rowStyle,
  cellClass,
  cellStyle,

  children,
}: PropsWithChildren<TableGridProps<Cell>>) {
  const [gridId, _] = useState(
    () => id || "grid-" + Math.random().toString(36).substring(2, 10),
  );

  if (cellAutoSize) {
    const cellRatio =
      1.0 / Math.max(1, cells.length, ...cells.map((row) => row.length));
    const vwRatio = Math.floor(cellRatio * 95);
    const vhRatio = Math.floor(cellRatio * 80);
    const cellSize = `max(min(${vwRatio}vw, ${vhRatio}vh))`;

    cellWidth ||= cellSize;
    cellHeight ||= cellSize;
  }

  return (
    <div
      id={gridId}
      className={Arr.className("table-grid", className)}
      style={style}
    >
      <table
        id={`${gridId}-table`}
        className={Arr.className(tableClass)}
        style={tableStyle}
      >
        <tbody>
          {cells.map((row, r) => (
            <tr
              key={`row:${r}:*`}
              id={`${gridId}-row-${r}`}
              className={Arr.className(rowClass && rowClass(r))}
              style={rowStyle && rowStyle(r)}
            >
              {row.map((cell, c) => (
                <td
                  key={`cell:${r}:${c}`}
                  id={`${gridId}-cell-${r}-${c}`}
                  className={Arr.className(cellClass && cellClass(cell, r, c))}
                  style={cellStyle && cellStyle(cell, r, c)}
                  onClick={onClick && ((e) => onClick(e, cell, r, c))}
                  onDoubleClick={onClick && ((e) => onClick(e, cell, r, c))}
                  onContextMenu={onClick && ((e) => onClick(e, cell, r, c))}
                >
                  <div
                    style={{
                      width: cellWidth,
                      height: cellHeight,
                      minWidth: minCellWidth,
                      maxWidth: maxCellWidth,
                      minHeight: minCellHeight,
                      maxHeight: maxCellHeight,
                    }}
                  >
                    {onRender && onRender(cell, r, c)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {children}
    </div>
  );
}
