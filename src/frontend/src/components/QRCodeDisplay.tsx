interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

interface QRCell {
  row: number;
  col: number;
  key: string;
}

// Generates a visual QR-like grid pattern based on the value string
function generateFilledCells(value: string, gridSize: number): QRCell[] {
  let seed = 0;
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) & 0xffffffff;
  }

  function next() {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return (seed >>> 0) % 2 === 0;
  }

  const cells: QRCell[] = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const isFinderTL =
        r < 7 &&
        c < 7 &&
        (r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      const isFinderTR =
        r < 7 &&
        c >= gridSize - 7 &&
        (r === 0 ||
          r === 6 ||
          c === gridSize - 1 ||
          c === gridSize - 7 ||
          (r >= 2 && r <= 4 && c >= gridSize - 5 && c <= gridSize - 3));
      const isFinderBL =
        r >= gridSize - 7 &&
        c < 7 &&
        (r === gridSize - 1 ||
          r === gridSize - 7 ||
          c === 0 ||
          c === 6 ||
          (r >= gridSize - 5 && r <= gridSize - 3 && c >= 2 && c <= 4));

      const filled = isFinderTL || isFinderTR || isFinderBL || next();
      if (filled) {
        cells.push({ row: r, col: c, key: `qr-r${r}-c${c}` });
      }
    }
  }

  return cells;
}

export default function QRCodeDisplay({
  value,
  size = 180,
}: QRCodeDisplayProps) {
  const gridSize = 21;
  const cells = generateFilledCells(value, gridSize);
  const cellSize = size / gridSize;

  return (
    <div
      className="rounded-xl p-4 inline-block"
      style={{ background: "white", border: "1px solid oklch(0.90 0.01 240)" }}
    >
      <svg
        role="img"
        aria-label="QR code for wallet address"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block" }}
      >
        {cells.map(({ row, col, key }) => (
          <rect
            key={key}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill="oklch(0.13 0.02 260)"
            rx={0.5}
          />
        ))}
      </svg>
    </div>
  );
}
