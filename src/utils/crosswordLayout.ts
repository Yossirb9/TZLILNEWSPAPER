
export interface CrosswordWord {
    word: string;
    clue: string;
}

export interface PlacedWord {
    word: string;
    clue: string;
    row: number;
    col: number;
    direction: 'across' | 'down';
    number: number;
}

export interface CrosswordLayout {
    grid: (string | null)[][]; // null = empty, string = letter
    placedWords: PlacedWord[];
    rows: number;
    cols: number;
}

export function generateCrosswordLayout(words: CrosswordWord[], rows = 12, cols = 12): CrosswordLayout {
    // Initialize grid
    let grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
    const placedWords: PlacedWord[] = [];

    // Sort words by length descending to place longest first
    const sortedWords = [...words]
        .map(w => ({ ...w, word: w.word.replace(/\s/g, "") })) // Remove spaces
        .sort((a, b) => b.word.length - a.word.length);

    if (sortedWords.length === 0) return { grid, placedWords, rows, cols };

    // Helper to check if placement is valid
    const canPlace = (
        word: string,
        row: number,
        col: number,
        direction: 'across' | 'down'
    ): boolean => {
        if (direction === 'across') {
            if (col + word.length > cols) return false; // Out of bounds
            if (col > 0 && grid[row][col - 1] !== null) return false; // Touch left
            if (col + word.length < cols && grid[row][col + word.length] !== null) return false; // Touch right

            for (let i = 0; i < word.length; i++) {
                const cell = grid[row][col + i];
                if (cell !== null && cell !== word[i]) return false; // Conflict

                // Check neighbors (above/below) if this is a new placement (cell is null)
                // If cell is not null (intersection), neighbors are fine (because they belong to the intersecting word)
                if (cell === null) {
                    if (row > 0 && grid[row - 1][col + i] !== null) return false;
                    if (row < rows - 1 && grid[row + 1][col + i] !== null) return false;
                }
            }
        } else { // down
            if (row + word.length > rows) return false; // Out of bounds
            if (row > 0 && grid[row - 1][col] !== null) return false; // Touch top
            if (row + word.length < rows && grid[row + word.length][col] !== null) return false; // Touch bottom

            for (let i = 0; i < word.length; i++) {
                const cell = grid[row + i][col];
                if (cell !== null && cell !== word[i]) return false; // Conflict

                // Check neighbors (left/right) if this is a new placement
                if (cell === null) {
                    if (col > 0 && grid[row + i][col - 1] !== null) return false;
                    if (col < cols - 1 && grid[row + i][col + 1] !== null) return false;
                }
            }
        }
        return true;
    };

    // Place first word in the middle roughly
    const firstWord = sortedWords[0];
    const startRow = Math.floor(rows / 2);
    const startCol = Math.floor((cols - firstWord.word.length) / 2);

    // Place first (across)
    for (let i = 0; i < firstWord.word.length; i++) {
        grid[startRow][startCol + i] = firstWord.word[i];
    }
    placedWords.push({
        ...firstWord,
        row: startRow,
        col: startCol,
        direction: 'across',
        number: 1
    });

    // Try to place remaining words
    const remaining = sortedWords.slice(1);
    let wordNum = 2;

    for (const nextWord of remaining) {
        let bestPlacement: { r: number, c: number, dir: 'across' | 'down' } | null = null;

        // Find all potential intersections with already placed words
        // We want to intersect an existing character

        // Brute force: Try every position? Better: try intersection points.
        // Actually, strictly trying intersections is safer.

        const possibleIntersections: { r: number, c: number, dir: 'across' | 'down' }[] = [];

        // Iterate over grid to find letters
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const char = grid[r][c];
                if (char) {
                    // Does nextWord contain this char?
                    for (let i = 0; i < nextWord.word.length; i++) {
                        if (nextWord.word[i] === char) {
                            // Try placing 'across' passing through (r,c) at index i
                            // This implies startCol = c - i
                            possibleIntersections.push({ r: r, c: c - i, dir: 'across' });

                            // Try placing 'down' passing through (r,c) at index i
                            // startRow = r - i
                            possibleIntersections.push({ r: r - i, c: c, dir: 'down' });
                        }
                    }
                }
            }
        }

        // Shuffle possibilities for randomness or just take first valid
        // Let's filter for validity and pick first
        for (const p of possibleIntersections) {
            if (canPlace(nextWord.word, p.r, p.c, p.dir)) {
                bestPlacement = p;
                break;
            }
        }

        if (bestPlacement) {
            // Place it
            const { r, c, dir } = bestPlacement;
            if (dir === 'across') {
                for (let i = 0; i < nextWord.word.length; i++) {
                    grid[r][c + i] = nextWord.word[i];
                }
            } else {
                for (let i = 0; i < nextWord.word.length; i++) {
                    grid[r + i][c] = nextWord.word[i];
                }
            }
            placedWords.push({
                ...nextWord,
                row: r,
                col: c,
                direction: dir,
                number: wordNum++
            });
        } else {
            console.warn(`Could not place word: ${nextWord.word}`);
        }
    }

    // Final cleanup: re-number words based on position (reading order) for standard crossword feel?
    // Standard numbering: 1, 2, 3 based on starting squares, reading left-to-right, top-to-bottom.
    // Let's do that.

    // 1. Identify all starting squares
    const starts: { r: number, c: number }[] = [];
    placedWords.forEach(pw => {
        // Check if this start is already in our list
        if (!starts.some(s => s.r === pw.row && s.c === pw.col)) {
            starts.push({ r: pw.row, c: pw.col });
        }
    });

    // 2. Sort starts
    starts.sort((a, b) => (a.r - b.r) || (a.c - b.c));

    // 3. Assign numbers
    const numberMap = new Map<string, number>();
    starts.forEach((s, idx) => {
        numberMap.set(`${s.r},${s.c}`, idx + 1);
    });

    // 4. Update placedWords with new numbers
    placedWords.forEach(pw => {
        pw.number = numberMap.get(`${pw.row},${pw.col}`) || 0;
    });

    // 5. Sort placedWords by number (and direction if same number, across usually first? irrelevant for list)
    placedWords.sort((a, b) => a.number - b.number);

    return { grid, placedWords, rows, cols };
}
