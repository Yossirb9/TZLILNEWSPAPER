"use client";

import { FunZoneContent } from "@/types/edition";
import MagazinePage from "./MagazinePage";
import WordSearchGrid from "./WordSearchGrid";
import CrosswordGrid from "./CrosswordGrid";
import TashchetzGrid from "./TashchetzGrid";

interface FunZonePageProps {
  funZone: FunZoneContent;
  startPage: number;
}

export default function FunZonePage({ funZone, startPage }: FunZonePageProps) {
  const hasCrossword = funZone.crossword && funZone.crossword.length > 0;
  const hasTashchetz = funZone.tashchetz && funZone.tashchetz.length > 0;

  return (
    <>
      {/* Page 1: Trivia + Riddle */}
      <MagazinePage pageNumber={startPage}>
        <div className="funzone-page h-full flex flex-col">
          <div className="funzone-banner shrink-0 mb-4">
            <span>🎉</span>
            <span>הפסקה פעילה!</span>
            <span>🎮</span>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Trivia */}
            <div className="funzone-trivia bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex-1">
              <h2 className="funzone-section-title text-xl mb-3">❓ טריוויה מהכתבות</h2>
              <div className="funzone-trivia-list grid grid-cols-1 gap-2">
                {funZone.trivia.map((item, index) => (
                  <div key={index} className="funzone-trivia-item text-sm py-1">
                    <div className="funzone-trivia-number w-6 h-6 text-xs">{index + 1}</div>
                    <div className="funzone-trivia-question font-medium">
                      {item.question}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Riddle */}
            {funZone.riddle && (
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shrink-0">
                <h2 className="text-lg font-bold text-purple-800 mb-2">🤔 חידה</h2>
                <p className="text-sm text-gray-700 font-medium mb-2">{funZone.riddle.question}</p>
                <div className="text-[10px] text-gray-400 transform rotate-180 inline-block hover:rotate-0 transition-transform cursor-help">
                  תשובה: {funZone.riddle.answer}
                </div>
              </div>
            )}

            {/* Trivia Answers upside down */}
            <div className="text-[10px] text-gray-300 transform rotate-180 text-center mt-auto">
              {funZone.trivia.map((t, i) => `${i + 1}.${t.answer}`).join(' | ')}
            </div>
          </div>
        </div>
      </MagazinePage>

      {/* Page 2: Word Search Grid */}
      <MagazinePage pageNumber={startPage + 1}>
        <div className="funzone-page">
          <div className="funzone-banner">
            <span>🧩</span>
            <span>תפזורת</span>
            <span>🔍</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <WordSearchGrid words={funZone.word_search_words} />
          </div>
        </div>
      </MagazinePage>

      {/* Page 3: Crossword */}
      {hasCrossword && (
        <MagazinePage pageNumber={startPage + 2}>
          <div className="funzone-page">
            <div className="funzone-banner bg-gradient-to-r from-teal-500 to-green-500">
              <span>✍️</span>
              <span>תשבץ</span>
              <span>🧠</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <CrosswordGrid words={funZone.crossword.map(c => ({ word: c.answer, clue: c.clue }))} />
            </div>
          </div>
        </MagazinePage>
      )}

      {/* Page 4: Tashchetz */}
      {hasTashchetz && (
        <MagazinePage pageNumber={startPage + (hasCrossword ? 3 : 2)}>
          <div className="funzone-page">
            <div className="funzone-banner bg-gradient-to-r from-purple-500 to-pink-500">
              <span>🔮</span>
              <span>תשחץ - מצאו את המילה הנסתרת</span>
              <span>✨</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <TashchetzGrid
                items={funZone.tashchetz!}
              />
            </div>
          </div>
        </MagazinePage>
      )}
    </>
  );
}
