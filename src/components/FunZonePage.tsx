"use client";

import { FunZoneContent } from "@/types/edition";
import MagazinePage from "./MagazinePage";
import WordSearchGrid from "./WordSearchGrid";
import ArticleImage from "./ArticleImage";

interface FunZonePageProps {
  funZone: FunZoneContent;
  startPage: number;
}

export default function FunZonePage({ funZone, startPage }: FunZonePageProps) {
  return (
    <>
      {/* Page 1: Trivia + Visual Puzzle */}
      <MagazinePage pageNumber={startPage}>
        <div className="funzone-page h-full flex flex-col">
          <div className="funzone-banner shrink-0 mb-4">
            <span>🎉</span>
            <span>הפסקה פעילה!</span>
            <span>🎮</span>
          </div>

          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            {/* Trivia - Compact */}
            <div className="funzone-trivia bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h2 className="funzone-section-title text-xl mb-3">❓ טריוויה</h2>
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

            {/* Visual Puzzle (Find Waldo style) */}
            {funZone.find_waldo_prompt && (
              <div className="flex-1 relative min-h-0 border-4 border-dashed border-yellow-400 rounded-xl overflow-hidden bg-yellow-50">
                <div className="absolute top-2 right-2 z-10 bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  חפשו בתמונה!
                </div>
                <ArticleImage
                  prompt={funZone.find_waldo_prompt}
                  alt="חידת חפש את הדמות"
                  className="w-full h-full object-cover"
                  model="gemini-3-pro-image-preview"
                />
              </div>
            )}

            {/* Riddle */}
            {funZone.riddle && (
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 shrink-0">
                <h2 className="text-base font-bold text-purple-800 mb-1">🤔 חידה</h2>
                <p className="text-sm text-gray-700 font-medium mb-1">{funZone.riddle.question}</p>
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

          <WordSearchGrid words={funZone.word_search_words} />
        </div>
      </MagazinePage>
    </>
  );
}
