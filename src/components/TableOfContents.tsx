import { Edition } from "@/types/edition";
import MagazinePage from "./MagazinePage";

interface TableOfContentsProps {
  edition: Edition;
  newspaperTitle?: string;
}

const sections = [
  { key: "headline", icon: "📰", label: "כתבת השער", page: 3, color: "#1a365d" },
  { key: "science", icon: "🔬", label: "מדעים", page: 4, color: "#2b6cb0" },
  { key: "innovation", icon: "💡", label: "חדשנות", page: 5, color: "#276749" },
  { key: "music", icon: "🎵", label: "מוזיקה", page: 6, color: "#6b46c1" },
  { key: "nature", icon: "🌿", label: "טבע", page: 7, color: "#975a16" },
  { key: "heritage", icon: "🏛️", label: "שבילי מורשת", page: 8, color: "#8B4513" },
  { key: "funZone", icon: "🎮", label: "הפסקה פעילה", page: 9, color: "#c53030" },
  { key: "comic", icon: "💬", label: "קומיקס", page: 11, color: "#d69e2e" },
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
      case "funZone": return "טריוויה, תפזורת ובדיחות!";
      case "comic": return edition.comic.title;
      default: return "";
    }
  };

  const dynamicSections = [...sections];
  if (edition.customArticle) {
    dynamicSections.splice(6, 0, { key: "custom", icon: "⭐", label: "מיוחד", page: 9, color: "#D53F8C" });
    // Shift subsequent pages
    dynamicSections[7].page = 10; // FunZone starts at 10
    dynamicSections[8].page = 12; // Comic is at 12
  } else {
    // Ensure defaults if no custom article
    dynamicSections[6].page = 9; // FunZone starts at 9
    dynamicSections[7].page = 11; // Comic is at 11
  }

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
