import { ArticleContent } from "@/types/edition";
import MagazinePage from "./MagazinePage";
import ArticleImage from "./ArticleImage";

interface CoverPageProps {
  headline: ArticleContent;
  generatedAt: string;
  newspaperTitle?: string;
  schoolName?: string;
  coverEmoji?: string;
  logoSrc?: string | null;
  sections?: { key: string; icon: string; label: string; color: string }[];
}

export default function CoverPage({
  headline,
  generatedAt,
  newspaperTitle = "צליל למצוינות",
  schoolName = "בית הספר צליל למצוינות",
  coverEmoji = "🎵",
  logoSrc,
  sections,
}: CoverPageProps) {
  const hebrewMonths = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ];
  const date = new Date(generatedAt);
  const monthName = hebrewMonths[date.getMonth()];
  const year = date.getFullYear();

  const defaultSections = [
    { key: "science", icon: "🔬", label: "מדע וטבע", color: "bg-blue-600/90" },
    { key: "innovation", icon: "💡", label: "חדשנות", color: "bg-green-600/90" },
    { key: "music", icon: "🎵", label: "מוזיקה", color: "bg-purple-600/90" },
    { key: "heritage", icon: "🏛️", label: "שבילי מורשת", color: "bg-amber-700/90" },
  ];
  const displaySections = sections || defaultSections;

  return (
    <MagazinePage noPadding>
      <div className="cover-page relative h-full w-full overflow-hidden text-white">

        {/* BACKGROUND IMAGE - Full Cover */}
        <div className="absolute inset-0 z-0 bg-gray-900">
          <ArticleImage
            prompt={headline.image_prompt || "Colorful abstract background, magazine cover style"}
            alt="Cover Background"
            className="w-full h-full object-cover opacity-90 !rounded-none"
            model="gemini-3-pro-image-preview"
          />
          {/* Lighter overlay - let image show through more */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 z-10" />
        </div>

        {/* CONTENT (z-index 20) */}
        <div className="relative z-20 h-full flex flex-col p-8">

          {/* Masthead */}
          <div className="cover-masthead mb-4 text-center drop-shadow-lg pt-4">
            <div className="text-sm font-bold tracking-widest opacity-90 mb-2 text-yellow-300"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
              {schoolName} מגיש
            </div>
            <h1 className="text-7xl font-black text-white tracking-tight mb-3"
              style={{ textShadow: "0 4px 12px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.5)" }}>
              {newspaperTitle}
            </h1>

            {/* Logo/Emoji - ONCE, below title */}
            <div className="flex justify-center mb-3">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt="School Logo"
                  className="h-24 w-24 object-contain drop-shadow-lg"
                />
              ) : (
                <span className="text-6xl" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{coverEmoji}</span>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 text-xl font-light tracking-wide border-t border-white/30 pt-3 px-10"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}>
              <span>עיתון חודשי</span>
              <span>•</span>
              <span>{monthName} {year}</span>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-auto">
            {displaySections.map((sec) => (
              <div key={sec.key} className={`${sec.color} text-white py-2 px-4 rounded-lg backdrop-blur-sm shadow-lg flex items-center gap-2`}>
                <span className="text-xl">{sec.icon}</span>
                <span className="font-bold text-sm">{sec.label}</span>
              </div>
            ))}
          </div>

          {/* Headline card - right-aligned, text with strong shadows */}
          <div className="mt-auto mb-8 max-w-2xl mr-auto pr-6 pl-6 relative z-10">
            <div className="flex items-center justify-start gap-3 mb-3">
              <span className="bg-red-600 text-white text-sm font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-[0_4px_10px_rgba(0,0,0,0.5)]">כתבת השער</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight text-white text-right drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)]"
              style={{ textShadow: "3px 3px 0 #000000, 0 0 15px rgba(0,0,0,0.5)" }}>
              {headline.title}
            </h2>

            <p className="text-base md:text-lg leading-relaxed text-white font-semibold text-right drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]"
              style={{ textShadow: "1px 1px 0 #000000" }}>
              {headline.teaser || headline.content.substring(0, 350) + "..."}
            </p>
          </div>
        </div>
      </div>
    </MagazinePage>
  );
}
