"use client";

import { useMemo } from "react";
import { generateWordSearchGrid } from "@/utils/wordSearchGenerator";

interface WordSearchGridProps {
  words: string[];
}

export default function WordSearchGrid({ words }: WordSearchGridProps) {
  const puzzle = useMemo(() => generateWordSearchGrid(words), [words]);

  return (
    <div className="wordsearch-container">
      <h3 className="wordsearch-title">🔍 תפזורת - מצאו את המילים!</h3>

      <table className="wordsearch-table" dir="rtl">
        <tbody>
          {puzzle.grid.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((letter, colIndex) => (
                <td key={colIndex}>{letter}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="wordsearch-words">
        <h4>המילים שצריך למצוא:</h4>
        <div className="wordsearch-word-list">
          {puzzle.words.map((word, index) => (
            <span key={index} className="wordsearch-word-chip">
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
