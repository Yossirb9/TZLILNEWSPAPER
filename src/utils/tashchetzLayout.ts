/**
 * Tashchetz (Hebrew arrow-word puzzle) layout engine.
 *
 * The grid has three cell types:
 *   - "black"  – empty/dark cell
 *   - "clue"   – contains definition text + arrow (← or ↓)
 *   - "letter" – blank cell the solver fills in
 *
 * Horizontal answers run RIGHT-TO-LEFT  (clue on the RIGHT, letters to its LEFT).
 * Vertical   answers run TOP-TO-BOTTOM  (clue on TOP, letters BELOW).
 */

export type Direction = 'h' | 'v';

export interface ClueCell {
    kind: 'clue';
    text: string;
    dir: Direction; // 'h' = arrow points left, 'v' = arrow points down
}

export interface LetterCell {
    kind: 'letter';
    char: string;   // correct letter (hidden from user)
}

export interface BlackCell {
    kind: 'black';
}

export type TCell = ClueCell | LetterCell | BlackCell;

export interface PlacedWord {
    word: string;
    clue: string;
    dir: Direction;
    clueR: number;
    clueC: number;
}

/* ------------------------------------------------------------------ */
/* Layout algorithm                                                    */
/* ------------------------------------------------------------------ */

export function generateTashchetzGrid(
    items: { clue: string; answer: string }[],
    cols = 11,
    rows = 14
): { grid: TCell[][]; placed: PlacedWord[] } {
    // Init grid
    const grid: TCell[][] = [];
    for (let r = 0; r < rows; r++) {
        const row: TCell[] = [];
        for (let c = 0; c < cols; c++) row.push({ kind: 'black' });
        grid.push(row);
    }

    const placed: PlacedWord[] = [];

    // Filter out words too long and sort short first
    const valid = items
        .filter(i => i.answer.length >= 2 && i.answer.length <= cols - 1 && !i.answer.includes(' '))
        .sort((a, b) => a.answer.length - b.answer.length);

    if (valid.length === 0) return { grid, placed };

    // Split into horizontal and vertical pools
    const hPool = valid.filter((_, i) => i % 2 === 0);
    const vPool = valid.filter((_, i) => i % 2 === 1);

    // Helper: check if a range of cells is free (all black)
    const isFree = (r: number, c: number) =>
        r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c].kind === 'black';

    const isLetterAt = (r: number, c: number, ch: string) =>
        r >= 0 && r < rows && c >= 0 && c < cols &&
        grid[r][c].kind === 'letter' && (grid[r][c] as LetterCell).char === ch;

    // Place horizontal word: clue at (r, clueC), letters to the LEFT
    function placeH(item: { clue: string; answer: string }, r: number, clueC: number): boolean {
        const len = item.answer.length;
        // Letters at columns clueC-1, clueC-2, ..., clueC-len
        if (clueC - len < 0) return false;
        if (!isFree(r, clueC)) return false;

        // Check letter positions
        for (let i = 0; i < len; i++) {
            const c = clueC - 1 - i;
            const ch = item.answer[i];
            if (isLetterAt(r, c, ch)) continue; // intersection OK
            if (!isFree(r, c)) return false;
        }

        // Commit
        grid[r][clueC] = { kind: 'clue', text: item.clue, dir: 'h' };
        for (let i = 0; i < len; i++) {
            const c = clueC - 1 - i;
            if (grid[r][c].kind === 'black') {
                grid[r][c] = { kind: 'letter', char: item.answer[i] };
            }
        }
        placed.push({ word: item.answer, clue: item.clue, dir: 'h', clueR: r, clueC });
        return true;
    }

    // Place vertical word: clue at (clueR, c), letters BELOW
    function placeV(item: { clue: string; answer: string }, clueR: number, c: number): boolean {
        const len = item.answer.length;
        if (clueR + len >= rows) return false;
        if (!isFree(clueR, c)) return false;

        for (let i = 0; i < len; i++) {
            const r = clueR + 1 + i;
            const ch = item.answer[i];
            if (isLetterAt(r, c, ch)) continue;
            if (!isFree(r, c)) return false;
        }

        grid[clueR][c] = { kind: 'clue', text: item.clue, dir: 'v' };
        for (let i = 0; i < len; i++) {
            const r = clueR + 1 + i;
            if (grid[r][c].kind === 'black') {
                grid[r][c] = { kind: 'letter', char: item.answer[i] };
            }
        }
        placed.push({ word: item.answer, clue: item.clue, dir: 'v', clueR, clueC: c });
        return true;
    }

    // Strategy: place horizontal words row by row, then try vertical words through intersections
    let hIdx = 0;
    for (let r = 0; r < rows && hIdx < hPool.length; r += 2) {
        const item = hPool[hIdx];
        const clueC = cols - 1; // clue on rightmost column
        if (placeH(item, r, clueC)) {
            hIdx++;
        }
    }

    // Now try to place vertical words – for each, find a column where an intersection exists
    for (const item of vPool) {
        let didPlace = false;

        // Try to intersect with existing horizontal letters
        for (let c = 0; c < cols - 1 && !didPlace; c++) {
            for (let clueR = 0; clueR < rows - item.answer.length - 1 && !didPlace; clueR++) {
                // Check if at least one letter below the clue cell intersects
                let hasIntersection = false;
                let canPlace = true;

                if (!isFree(clueR, c)) { canPlace = false; continue; }

                for (let i = 0; i < item.answer.length; i++) {
                    const r = clueR + 1 + i;
                    const ch = item.answer[i];
                    if (r >= rows) { canPlace = false; break; }
                    if (isLetterAt(r, c, ch)) {
                        hasIntersection = true;
                    } else if (!isFree(r, c)) {
                        canPlace = false;
                        break;
                    }
                }

                if (canPlace && hasIntersection) {
                    didPlace = placeV(item, clueR, c);
                }
            }
        }

        // If no intersection found, place in a free column
        if (!didPlace) {
            for (let c = cols - 2; c >= 0 && !didPlace; c--) {
                for (let clueR = 0; clueR < rows - item.answer.length - 1 && !didPlace; clueR++) {
                    didPlace = placeV(item, clueR, c);
                }
            }
        }
    }

    return { grid, placed };
}
