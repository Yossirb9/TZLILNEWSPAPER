import { Edition } from "@/types/edition";
import MagazinePage from "./MagazinePage";

interface TableOfContentsProps {
  edition: Edition;
  newspaperTitle?: string;
}

const baseSections = [
  { key: "headline", icon: "📰", label: "כתבת השער", color: "#1a365d" },
  { key: "science", icon: "🔬", label: "מדעים", color: "#2b6cb0" },
  { key: "innovation", icon: "💡", label: "חדשנות", color: "#276749" },
  { key: "music", icon: "🎵", label: "מוזיקה", color: "#6b46c1" },
  { key: "nature", icon: "🌿", label: "טבע", color: "#975a16" },
  { key: "heritage", icon: "🏛️", label: "שבילי מורשת", color: "#8B4513" },
];

export default function TableOfContents({ edition, newspaperTitle = "צליל למצוינות" }: TableOfContentsProps) {
  const getTitle = (key: string): string => {
    switch (key) {
      case "headline": return edition.headline.title;
      case "science": return edition.science.title;
      case "innovation": return edition.innovation.title;
      case "music": return edition.music.title;
      case "nature": return edition.nature.title;
      case "heritage": return edition.heritage.title;
      case "custom": return edition.customArticle?.title || "כתבה מיוחדת";
      case "recommendation": return edition.recommendation?.title || "פינת ההמלצה";
      case "funZone": return "טריוויה, תפזורת ותשבץ!";

      default: return "";
    }
  };

  // Build sections list with dynamic page numbers
  // Start at page 3 (after cover + TOC)
  const dynamicSections: { key: string; icon: string; label: string; page: number; color: string }[] = [];
  let currentPage = 3;

  // Helper: which articles are 2-page
  const twoPageKey = edition.twoPageSection;

  for (const sec of baseSections) {
    dynamicSections.push({ ...sec, page: currentPage });
    currentPage += (sec.key === twoPageKey) ? 2 : 1;
  }

  // Custom article (optional)
  if (edition.customArticle) {
    dynamicSections.push({ key: "custom", icon: "⭐", label: "מיוחד", page: currentPage, color: "#D53F8C" });
    currentPage += 1;
  }

  // Recommendation
  if (edition.recommendation) {
    dynamicSections.push({ key: "recommendation", icon: "🌟", label: "פינת ההמלצה", page: currentPage, color: "#7C3AED" });
    currentPage += 1;
  }

  // FunZone (4 pages: trivia, word search, crossword, tashchetz)
  dynamicSections.push({ key: "funZone", icon: "🎮", label: "הפסקה פעילה", page: currentPage, color: "#c53030" });
  currentPage += 4;

  return (
    <MagazinePage pageNumber={2}>
      <div className="toc-container">
        <h1 className="toc-title">תוכן העניינים</h1>
        <div className="toc-decoration-line" />

        <div className="toc-list">
          {dynamicSections.map((section) => (
            <div key={section.key} className="toc-item">
              <div className="toc-item-right">
                <span
                  className="toc-item-icon"
                  style={{ backgroundColor: section.color }}
                >
                  {section.icon}
                </span>
                <div className="toc-item-text">
                  <span className="toc-item-label" style={{ color: section.color }}>
                    {section.label}
                  </span>
                  <span className="toc-item-article-title">
                    {getTitle(section.key)}
                  </span>
                </div>
              </div>
              <div className="toc-item-dots" />
              <div className="toc-item-page" style={{ color: section.color }}>
                {section.page}
              </div>
            </div>
          ))}
        </div>

        {/* Decorative bottom section */}
        <div className="toc-footer">
          <div className="toc-footer-box">
            <p>🎵 {newspaperTitle} - העיתון החודשי 🎵</p>
          </div>
        </div>
      </div>
    </MagazinePage>
  );
}
