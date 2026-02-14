
import React, { useMemo, useState } from 'react';
import { generateCrosswordLayout, CrosswordWord } from '@/utils/crosswordLayout';

interface CrosswordGridProps {
    words: CrosswordWord[];
}

export default function CrosswordGrid({ words }: CrosswordGridProps) {
    const [userInputs, setUserInputs] = useState<Record<string, string>>({}); // valid key: "row,col"

    const { grid, placedWords, rows, cols } = useMemo(() => {
        return generateCrosswordLayout(words || [], 12, 12);
    }, [words]);

    const handleInputChange = (r: number, c: number, val: string) => {
        if (val.length > 1) val = val.slice(-1); // only last char
        setUserInputs(prev => ({
            ...prev,
            [`${r},${c}`]: val
        }));
    };

    const getNumber = (r: number, c: number) => {
        const word = placedWords.find(w => w.row === r && w.col === c);
        return word ? word.number : null;
    };

    // Separate clues by direction
    const acrossClues = placedWords
        .filter(w => w.direction === 'across')
        .sort((a, b) => a.number - b.number);

    const downClues = placedWords
        .filter(w => w.direction === 'down')
        .sort((a, b) => a.number - b.number);

    if (placedWords.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg text-gray-500">
                <p>לא הצלחנו ליצור תשבץ מהמילים שנוצרו. נסה ליצור גיליון חדש.</p>
            </div>
        );
    }

    return (
        <div className="crossword-container w-full h-full flex flex-col gap-4 p-4">
            {/* Grid */}
            <div className="flex justify-center">
                <div
                    className="grid gap-[1px] bg-black border-2 border-black p-1"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        width: 'fit-content'
                    }}
                >
                    {grid.map((row, r) => (
                        row.map((cell, c) => {
                            const number = getNumber(r, c);
                            const isBlack = cell === null;

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={`
                    relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center
                    ${isBlack ? 'bg-black' : 'bg-white'}
                  `}
                                >
                                    {!isBlack && (
                                        <>
                                            {number && (
                                                <span className="absolute top-0 right-0 text-[10px] leading-none p-[1px] font-bold text-gray-700">
                                                    {number}
                                                </span>
                                            )}
                                            <input
                                                type="text"
                                                className="w-full h-full text-center font-bold bg-transparent outline-none focus:bg-yellow-100"
                                                maxLength={1}
                                                value={userInputs[`${r},${c}`] || ''}
                                                onChange={(e) => handleInputChange(r, c, e.target.value)}
                                                dir="rtl"
                                            />
                                        </>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>

            {/* Clues */}
            <div className="grid grid-cols-2 gap-8 text-right bg-white/80 p-4 rounded-xl shadow-sm border border-gray-200" dir="rtl">
                <div>
                    <h3 className="font-bold text-lg mb-2 text-blue-700 underline decoration-wavy">מאוזן</h3>
                    <ul className="space-y-1 text-sm">
                        {acrossClues.map((clue, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="font-bold text-blue-600 min-w-[1.5rem]">{clue.number}.</span>
                                <span>{clue.clue}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-2 text-green-700 underline decoration-wavy">מאונך</h3>
                    <ul className="space-y-1 text-sm">
                        {downClues.map((clue, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="font-bold text-green-600 min-w-[1.5rem]">{clue.number}.</span>
                                <span>{clue.clue}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Reversed answers */}
            <div className="text-[9px] text-gray-300 transform rotate-180 text-center mt-4 leading-relaxed">
                <span className="font-semibold">תשובות: </span>
                {[...acrossClues, ...downClues]
                    .sort((a, b) => a.number - b.number)
                    .map(c => `${c.number}.${c.word}`)
                    .join(' | ')}
            </div>
        </div>
    );
}
