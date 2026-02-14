"use client";

import { useState, useEffect, useRef } from "react";
import { ArticleContent } from "@/types/edition";
import MagazinePage from "./MagazinePage";
import ArticleImage from "./ArticleImage";

interface ArticlePageProps {
  article: ArticleContent;
  section: string;
  pageNumber: number;
  month?: string;
  year?: number;
  onRegenerate?: (section: string, newArticle: ArticleContent) => void;
  onImageUpload?: (section: string, dataUrl: string) => void;
}

const sectionStyles: Record<
  string,
  { icon: string; label: string; color: string; bgColor: string; lightBg: string }
> = {
  headline: {
    icon: "📰",
    label: "כתבת השער",
    color: "#1a365d",
    bgColor: "#2b6cb0",
    lightBg: "#ebf8ff",
  },
  science: {
    icon: "🔬",
    label: "מדעים",
    color: "#2b6cb0",
    bgColor: "#3182ce",
    lightBg: "#ebf8ff",
  },
  innovation: {
    icon: "💡",
    label: "חדשנות",
    color: "#276749",
    bgColor: "#38a169",
    lightBg: "#f0fff4",
  },
  music: {
    icon: "🎵",
    label: "מוזיקה",
    color: "#6b46c1",
    bgColor: "#805ad5",
    lightBg: "#faf5ff",
  },
  nature: {
    icon: "🌿",
    label: "טבע",
    color: "#975a16",
    bgColor: "#d69e2e",
    lightBg: "#fffff0",
  },
  heritage: {
    icon: "🏛️",
    label: "שבילי מורשת",
    color: "#8B4513",
    bgColor: "#CD853F",
    lightBg: "#FFF8DC",
  },
  custom: {
    icon: "⭐",
    label: "מיוחד",
    color: "#D53F8C",
    bgColor: "#ED64A6",
    lightBg: "#FFF5F7",
  },
};

export default function ArticlePage({
  article,
  section,
  pageNumber,
  month,
  year,
  onRegenerate,
  onImageUpload,
}: ArticlePageProps) {
  const [currentArticle, setCurrentArticle] = useState(article);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentArticle(article);
  }, [article]);

  const style = sectionStyles[section] || sectionStyles.headline;
  const isHeadline = section === "headline";
  const isTwoPage = currentArticle.is_two_page === true;

  const handleRegenerate = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      const response = await fetch("/api/regenerate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: section === "custom" ? "customArticle" : section,
          topic: currentArticle.topic,
          month,
          year
        }),
      });

      if (!response.ok) throw new Error("Regeneration failed");

      const newArticle = await response.json();
      // Preserve the two-page flag
      newArticle.is_two_page = currentArticle.is_two_page;
      // Preserve custom image if exists? Maybe user wants to keep it.
      // But typically regeneration implies new content.
      // However, if user uploaded an image, they might want to keep it.
      if (currentArticle.custom_image_url) {
        newArticle.custom_image_url = currentArticle.custom_image_url;
      }

      setCurrentArticle(newArticle);
      // Notify parent so TOC and CoverPage can update
      if (onRegenerate) {
        onRegenerate(section, newArticle);
      }
    } catch (error) {
      console.error("Failed to regenerate article:", error);
      alert("שגיאה בחידוש הכתבה. אנא נסה שוב.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(section, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderImageSection = () => (
    <div className={`float-left ml-3 mr-4 mb-2 relative z-20 group ${isHeadline ? "w-[48%]" : "w-[40%]"}`}
      style={{ shapeOutside: "margin-box" }}>

      {/* Action Buttons */}
      <div className="absolute top-2 right-2 z-30 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {onRegenerate && (
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="bg-white/90 text-blue-600 p-2 rounded-full shadow-lg hover:bg-blue-50 transition-colors border border-gray-200"
            title="כתוב מחדש את הטקסט"
          >
            <span className={isRegenerating ? "animate-spin block" : ""}>🔄</span>
          </button>
        )}

        {onImageUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/90 text-purple-600 p-2 rounded-full shadow-lg hover:bg-purple-50 transition-colors border border-gray-200"
            title="העלה תמונה משלך"
          >
            📂
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      <div className="relative rounded-lg overflow-hidden shadow-lg border-2 border-white transform rotate-1">
        {currentArticle.custom_image_url ? (
          <img
            src={currentArticle.custom_image_url}
            alt={currentArticle.title}
            className="w-full aspect-[4/3] object-cover"
          />
        ) : (
          <ArticleImage
            prompt={currentArticle.image_prompt}
            alt={currentArticle.title}
            className="w-full aspect-[4/3] object-cover"
            model="gemini-3-pro-image-preview"
            imageType={currentArticle.image_type}
            searchQuery={currentArticle.image_search_query}
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 px-2">
          <span className="text-white text-[10px] font-mono opacity-75">
            {currentArticle.custom_image_url
              ? 'Custom Upload'
              : (currentArticle.image_type === 'ART' ? 'AI Generated Illustration' : 'Press Photo')}
          </span>
        </div>
      </div>

      {currentArticle.teaser && (
        <div className="mt-2 text-xs font-bold text-gray-500 bg-white/90 p-2 rounded shadow-sm border border-gray-100 text-center leading-tight">
          {currentArticle.teaser}
        </div>
      )}
    </div>
  );

  const paragraphs = currentArticle.content
    ? currentArticle.content.split(/\n\n|\n/).filter((p) => p.trim().length > 0)
    : [];

  const isDialogue = paragraphs.some(p => p.includes("רון:") || p.includes("יותם:"));

  // For 2-page articles, split paragraphs between pages
  if (isTwoPage && !isDialogue) {
    const splitIdx = Math.ceil(paragraphs.length / 2);
    const page1Paragraphs = paragraphs.slice(0, splitIdx);
    const page2Paragraphs = paragraphs.slice(splitIdx);
    const introParagraph = page1Paragraphs[0];
    const bodyParagraphs1 = page1Paragraphs.slice(1);

    return (
      <>
        {/* Page 1 */}
        <MagazinePage pageNumber={pageNumber}>
          <div className="article-page h-full flex flex-col pt-1 relative group">
            <header className="mb-1.5 shrink-0 relative">
              <div className="flex items-center justify-between mb-1 opacity-80" style={{ color: style.color }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{style.icon}</span>
                  <span className="font-bold tracking-wide uppercase text-xs">{style.label}</span>
                </div>
              </div>
              <div className="h-px bg-current w-full opacity-30 mb-1" style={{ color: style.color }} />
              <h1
                className="font-black leading-none"
                style={{ color: style.color, fontSize: isHeadline ? '24pt' : '20pt', marginBottom: '2px' }}
              >
                {currentArticle.title}
              </h1>
              {currentArticle.subtitle && (
                <h2 className="font-medium text-gray-600 leading-snug" style={{ fontSize: '11pt', marginBottom: '4px' }}>
                  {currentArticle.subtitle}
                </h2>
              )}
            </header>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1">
                {renderImageSection()}

                <div className="text-justify text-gray-800 font-medium" style={{ fontSize: '11.5pt', lineHeight: 1.5, marginBottom: '8px' }}>
                  <span
                    className="float-right font-black leading-[0.8] ml-2 mt-1"
                    style={{ color: style.bgColor, fontSize: '38pt' }}
                  >
                    {introParagraph?.charAt(0)}
                  </span>
                  {introParagraph?.slice(1)}
                </div>

                <div className="text-justify text-gray-700" style={{ fontSize: '11.5pt', lineHeight: 1.5 }}>
                  {bodyParagraphs1.map((p, i) => (
                    <p key={i} className="mb-2">{p}</p>
                  ))}
                </div>
              </div>

              <div className="text-center text-gray-400 text-sm mt-auto pt-2">
                ← המשך בעמוד הבא
              </div>
            </div>
          </div>
        </MagazinePage>

        {/* Page 2 */}
        <MagazinePage pageNumber={pageNumber + 1}>
          <div className="article-page h-full flex flex-col pt-1">
            <header className="mb-1.5 shrink-0">
              <div className="flex items-center gap-2 mb-1 opacity-80" style={{ color: style.color }}>
                <span className="text-lg">{style.icon}</span>
                <span className="font-bold tracking-wide uppercase text-xs">{style.label} — המשך</span>
              </div>
              <div className="h-px bg-current w-full opacity-30 mb-1" style={{ color: style.color }} />
              <h2 className="font-bold text-gray-500 text-sm mb-1">{currentArticle.title} (המשך)</h2>
            </header>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 text-justify text-gray-700" style={{ fontSize: '11.5pt', lineHeight: 1.5 }}>
                {page2Paragraphs.map((p, i) => (
                  <p key={i} className="mb-2">{p}</p>
                ))}

                {currentArticle.quote && (
                  <blockquote
                    className="my-3 p-3 border-r-4 rounded-r-lg bg-gray-50 shadow-sm"
                    style={{ borderColor: style.bgColor }}
                  >
                    <p className="font-bold italic leading-relaxed text-gray-800 text-sm">
                      &quot;{currentArticle.quote}&quot;
                    </p>
                  </blockquote>
                )}
              </div>

              {currentArticle.sidebar && (
                <aside
                  className="rounded-lg border-2 shrink-0 break-inside-avoid"
                  style={{
                    backgroundColor: style.lightBg,
                    borderColor: style.bgColor,
                    padding: '8px 10px',
                    marginTop: '4px',
                  }}
                >
                  <h3
                    className="font-black flex items-center gap-2"
                    style={{ color: style.color, fontSize: '10pt', marginBottom: '2px' }}
                  >
                    <span>💡</span>
                    {currentArticle.sidebar.title || "הידעת?"}
                  </h3>
                  <div className="text-gray-800 whitespace-pre-line" style={{ fontSize: '9pt', lineHeight: 1.3 }}>
                    {currentArticle.sidebar.content}
                  </div>
                </aside>
              )}
            </div>
          </div>
        </MagazinePage>
      </>
    );
  }

  // Single-page article (original layout)
  const introParagraph = paragraphs[0];
  const bodyParagraphs = paragraphs.slice(1);

  return (
    <MagazinePage pageNumber={pageNumber}>
      <div className="article-page h-full flex flex-col pt-1 relative group">
        <header className="mb-1.5 shrink-0 relative">
          <div className="flex items-center justify-between mb-1 opacity-80" style={{ color: style.color }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{style.icon}</span>
              <span className="font-bold tracking-wide uppercase text-xs">{style.label}</span>
            </div>
          </div>
          <div className="h-px bg-current w-full opacity-30 mb-1" style={{ color: style.color }} />
          <h1
            className="font-black leading-none"
            style={{ color: style.color, fontSize: isHeadline ? '24pt' : '20pt', marginBottom: '2px' }}
          >
            {currentArticle.title}
          </h1>
          {currentArticle.subtitle && (
            <h2 className="font-medium text-gray-600 leading-snug" style={{ fontSize: '11pt', marginBottom: '4px' }}>
              {currentArticle.subtitle}
            </h2>
          )}
        </header>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1">
            {renderImageSection()}

            {/* Main Text */}
            {!isDialogue && (
              <div className="text-justify text-gray-800 font-medium" style={{ fontSize: '11.5pt', lineHeight: 1.5, marginBottom: '8px' }}>
                <span
                  className="float-right font-black leading-[0.8] ml-2 mt-1"
                  style={{ color: style.bgColor, fontSize: '38pt' }}
                >
                  {introParagraph?.charAt(0)}
                </span>
                {introParagraph?.slice(1)}
              </div>
            )}

            {isDialogue ? (
              <div className="dialogue-container space-y-2">
                {paragraphs.map((p, i) => {
                  const isRon = p.includes("רון:");
                  const isYotam = p.includes("יותם:");
                  if (!isRon && !isYotam) return <p key={i} className="text-sm font-semibold text-gray-700 mb-1">{p}</p>;

                  const cleanText = p.replace("רון:", "").replace("יותם:", "").trim();
                  return (
                    <div key={i} className={`flex gap-2 ${isRon ? "flex-row-reverse" : ""}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${isRon ? "bg-orange-400" : "bg-blue-600"}`}>
                        {isRon ? "רון" : "יות"}
                      </div>
                      <div className={`p-2 px-3 rounded-xl max-w-[90%] text-sm leading-snug ${isRon ? "bg-orange-50 text-orange-900 rounded-tr-none" : "bg-blue-50 text-blue-900 rounded-tl-none"}`}>
                        {cleanText}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-justify text-gray-700" style={{ fontSize: '11.5pt', lineHeight: 1.5 }}>
                {bodyParagraphs.map((p, i) => (
                  <p key={i} className="mb-2">
                    {p}
                  </p>
                ))}

                {/* Quote in text if single page */}
                {currentArticle.quote && (
                  <blockquote
                    className="my-3 p-3 border-r-4 rounded-r-lg bg-gray-50 shadow-sm"
                    style={{ borderColor: style.bgColor }}
                  >
                    <p className="font-bold italic leading-relaxed text-gray-800 text-sm">
                      &quot;{currentArticle.quote}&quot;
                    </p>
                  </blockquote>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          {currentArticle.sidebar && (
            <aside
              className={`rounded-lg border-2 shrink-0 break-inside-avoid ${isDialogue ? 'order-first mb-3' : ''}`}
              style={{
                backgroundColor: style.lightBg,
                borderColor: style.bgColor,
                padding: '8px 10px',
                marginTop: '4px',
              }}
            >
              <h3
                className="font-black flex items-center gap-2"
                style={{ color: style.color, fontSize: '10pt', marginBottom: '2px' }}
              >
                <span>💡</span>
                {currentArticle.sidebar.title || "הידעת?"}
              </h3>
              <div className="text-gray-800 whitespace-pre-line" style={{ fontSize: '9pt', lineHeight: 1.3 }}>
                {currentArticle.sidebar.content}
              </div>
            </aside>
          )}
        </div>
      </div>
    </MagazinePage>
  );
}
