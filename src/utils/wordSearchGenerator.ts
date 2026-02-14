import { WordSearchGrid, WordPlacement } from "@/types/edition";

const HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת";
const GRID_SIZE = 12;

type Direction = "horizontal" | "vertical" | "diagonal-down" | "diagonal-up";

const DIRECTION_DELTAS: Record<Direction, [number, number]> = {
  horizontal: [0, 1],
  vertical: [1, 0],
  "diagonal-down": [1, 1],
  "diagonal-up": [-1, 1],
};

const DIRECTIONS: Direction[] = [
  "horizontal",
  "vertical",
  "diagonal-down",
  "diagonal-up",
];

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function generateWordSearchGrid(words: string[]): WordSearchGrid {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill("")
  );
  const placements: WordPlacement[] = [];

  const sortedWords = [...words]
    .filter((w) => w.length <= GRID_SIZE)
    .sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    let placed = false;

    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = DIRECTIONS[randomInt(DIRECTIONS.length)];
      const [dr, dc] = DIRECTION_DELTAS[dir];

      const maxRow =
        dir === "diagonal-up"
          ? GRID_SIZE - 1
          : GRID_SIZE - 1 - (dr > 0 ? word.length - 1 : 0);
      const minRow =
        dir === "diagonal-up" ? word.length - 1 : 0;

      const maxCol = GRID_SIZE - 1 - (dc > 0 ? word.length - 1 : 0);
      const minCol = 0;

      if (maxRow < minRow || maxCol < minCol) continue;

      const startRow = minRow + randomInt(maxRow - minRow + 1);
      const startCol = minCol + randomInt(maxCol - minCol + 1);

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = startRow + dr * i;
        const c = startCol + dc * i;
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
          fits = false;
          break;
        }
        if (grid[r][c] !== "" && grid[r][c] !== word[i]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        for (let i = 0; i < word.length; i++) {
          const r = startRow + dr * i;
          const c = startCol + dc * i;
          grid[r][c] = word[i];
        }
        placements.push({
          word,
          startRow,
          startCol,
          direction: dir,
        });
        placed = true;
      }
    }
  }

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = HEBREW_LETTERS[randomInt(HEBREW_LETTERS.length)];
      }
    }
  }

  return { grid, words: sortedWords, placements };
}
