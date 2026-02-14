"use client";

import React, { useMemo } from 'react';
import { generateTashchetzGrid, TCell } from '@/utils/tashchetzLayout';

interface TashchetzGridProps {
    items: { clue: string; answer: string }[];
}

export default function TashchetzGrid({ items }: TashchetzGridProps) {
    const { grid, placed } = useMemo(() => {
        return generateTashchetzGrid(items || [], 11, 14);
    }, [items]);

    if (placed.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg text-gray-500">
                <p>לא הצלחנו ליצור תשחץ. נסה ליצור גיליון חדש.</p>
            </div>
        );
    }

    // Find bounding box of non-black cells to trim empty space
    let minR = grid.length, maxR = 0, minC = grid[0].length, maxC = 0;
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c].kind !== 'black') {
                minR = Math.min(minR, r);
                maxR = Math.max(maxR, r);
                minC = Math.min(minC, c);
                maxC = Math.max(maxC, c);
            }
        }
    }

    const trimmedGrid = grid.slice(minR, maxR + 1).map(row => row.slice(minC, maxC + 1));
    const numCols = trimmedGrid[0]?.length || 1;

    const renderCell = (cell: TCell, r: number, c: number) => {
        if (cell.kind === 'black') {
            return (
                <div
                    key={`${r}-${c}`}
                    className="bg-gray-800 border border-gray-700"
                    style={{ aspectRatio: '1' }}
                />
            );
        }

        if (cell.kind === 'clue') {
            const arrow = cell.dir === 'h' ? '←' : '↓';
            return (
                <div
                    key={`${r}-${c}`}
                    className="bg-gray-200 border border-gray-400 p-[2px] flex flex-col items-center justify-center relative overflow-hidden"
                    style={{ aspectRatio: '1' }}
                    dir="rtl"
                >
                    <span className="text-[6px] sm:text-[7px] leading-[1.1] text-gray-800 font-bold text-center break-words hyphens-auto"
                        style={{ wordBreak: 'break-all', maxHeight: '90%', overflow: 'hidden' }}>
                        {cell.text}
                    </span>
                    <span className="absolute text-[8px] font-black text-blue-600"
                        style={{
                            ...(cell.dir === 'h'
                                ? { left: '1px', top: '50%', transform: 'translateY(-50%)' }
                                : { bottom: '1px', left: '50%', transform: 'translateX(-50%)' })
                        }}>
                        {arrow}
                    </span>
                </div>
            );
        }

        // Letter cell - empty box for user to write in
        return (
            <div
                key={`${r}-${c}`}
                className="bg-white border border-gray-400 flex items-center justify-center"
                style={{ aspectRatio: '1' }}
            >
                {/* Empty cell for user to fill */}
            </div>
        );
    };

    return (
        <div className="tashchetz-container w-full flex flex-col items-center gap-2 px-2" dir="rtl">
            <div
                className="grid border-2 border-gray-600 w-full max-w-[500px]"
                style={{
                    gridTemplateColumns: `repeat(${numCols}, 1fr)`,
                    gap: '0px',
                }}
            >
                {trimmedGrid.map((row, r) =>
                    row.map((cell, c) => renderCell(cell, r, c))
                )}
            </div>

            {/* Reversed answers at bottom */}
            <div className="text-[8px] text-gray-300 transform rotate-180 text-center mt-2 leading-relaxed max-w-[500px]">
                <span className="font-semibold">תשובות: </span>
                {placed.map((p, i) => `${i + 1}.${p.word}`).join(' | ')}
            </div>
        </div>
    );
}
