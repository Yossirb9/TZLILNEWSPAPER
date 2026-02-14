import { ArticleContent } from "@/types/edition";
import MagazinePage from "./MagazinePage";
import ArticleImage from "./ArticleImage";

interface ArticlePageProps {
  article: ArticleContent;
  section: string;
  pageNumber: number;
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
}: ArticlePageProps) {
  const style = sectionStyles[section] || sectionStyles.headline;
  const isHeadline = section === "headline";

  const paragraphs = article.content
    .split(/\n\n|\n/)
    .filter((p) => p.trim().length > 0);

  const isDialogue = paragraphs.some(p => p.includes("רון:") || p.includes("יותם:"));

  const introParagraph = paragraphs[0];
  const bodyParagraphs = paragraphs.slice(1);

  return (
    <MagazinePage pageNumber={pageNumber}>
      <div className="article-page" style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
        {/* Header Section - compact */}
        <header style={{ marginBottom: '6px', flexShrink: 0 }}>
          <div className="flex items-center gap-2 mb-1 opacity-80" style={{ color: style.color }}>
            <span className="text-lg">{style.icon}</span>
            <span className="font-bold tracking-wide uppercase text-xs">{style.label}</span>
            <div className="h-px bg-current flex-1 opacity-30" />
          </div>

          <h1
            className="font-black leading-none"
            style={{ color: style.color, fontSize: isHeadline ? '24pt' : '20pt', marginBottom: '2px' }}
          >
            {article.title}
          </h1>

          {article.subtitle && (
            <h2 className="font-medium text-gray-600 leading-snug" style={{ fontSize: '11pt', marginBottom: '4px' }}>
              {article.subtitle}
            </h2>
          )}
        </header>

        {/* Content Layout - FILLS remaining space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Main Content Area */}
          <div style={{ flex: 1 }}>

            {/* Image - inline float */}
            {/* Image - inline float */}
            <div className={`float-left ml-2 mr-6 mb-4 relative z-20 ${isHeadline ? "w-[48%]" : "w-[40%]"}`}
              style={{ shapeOutside: "margin-box" }}>
              <ArticleImage
                prompt={article.image_prompt}
                alt={article.title}
                className="w-full aspect-[4/3] object-cover shadow-lg transform rotate-1 border-3 border-white rounded-lg"
                model="gemini-3-pro-image-preview"
              />
            </div>

            {!isDialogue && (
              <div className="text-justify text-gray-800 font-medium" style={{ fontSize: '11.5pt', lineHeight: 1.6, marginBottom: '8px' }}>
                <span
                  className="float-right font-black leading-[0.8] ml-3 mt-1"
                  style={{ color: style.bgColor, fontSize: '38pt' }}
                >
                  {introParagraph?.charAt(0)}
                </span>
                {introParagraph?.slice(1)}
              </div>
            )}

            {isDialogue ? (
              <div className="dialogue-container space-y-3">
                {paragraphs.map((p, i) => {
                  const isRon = p.includes("רון:");
                  const isYotam = p.includes("יותם:");
                  if (!isRon && !isYotam) return <p key={i} className="text-sm font-semibold text-gray-700 mb-1">{p}</p>;

                  const cleanText = p.replace("רון:", "").replace("יותם:", "").trim();
                  return (
                    <div key={i} className={`flex gap-3 ${isRon ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${isRon ? "bg-orange-400" : "bg-blue-600"}`}>
                        {isRon ? "רון" : "יות"}
                      </div>
                      <div className={`p-3 px-4 rounded-xl max-w-[85%] text-sm leading-relaxed ${isRon ? "bg-orange-50 text-orange-900 rounded-tr-none" : "bg-blue-50 text-blue-900 rounded-tl-none"}`}>
                        {cleanText}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-justify text-gray-700" style={{ fontSize: '12pt', lineHeight: 1.65 }}>
                {bodyParagraphs.map((p, i) => (
                  <p key={i} className="mb-3">
                    {p}
                  </p>
                ))}

                {article.quote && (
                  <blockquote
                    className="my-4 p-4 border-r-4 rounded-r-lg bg-gray-50 shadow-sm"
                    style={{ borderColor: style.bgColor }}
                  >
                    <p className="font-bold italic leading-relaxed text-gray-800" style={{ fontSize: '12pt' }}>
                      &quot;{article.quote}&quot;
                    </p>
                  </blockquote>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - "הידעת?" */}
          {article.sidebar && (
            <aside
              className={`rounded-lg border-2 shrink-0 break-inside-avoid ${isDialogue ? 'order-first mb-3' : ''}`}
              style={{
                backgroundColor: style.lightBg,
                borderColor: style.bgColor,
                padding: '8px 12px',
                marginTop: '6px',
              }}
            >
              <h3
                className="font-black flex items-center gap-2"
                style={{ color: style.color, fontSize: '10pt', marginBottom: '3px' }}
              >
                <span>💡</span>
                {article.sidebar.title || "הידעת?"}
              </h3>
              <div className="text-gray-800 whitespace-pre-line" style={{ fontSize: '9pt', lineHeight: 1.4 }}>
                {article.sidebar.content}
              </div>
            </aside>
          )}
        </div>
      </div>
    </MagazinePage>
  );
}
