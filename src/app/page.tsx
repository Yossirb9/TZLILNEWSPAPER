"use client";

import { useState, useCallback } from "react";
import { Edition, ArticleContent } from "@/types/edition";
import CoverPage from "@/components/CoverPage";
import TableOfContents from "@/components/TableOfContents";
import ArticlePage from "@/components/ArticlePage";
import FunZonePage from "@/components/FunZonePage";
import RecommendationPage from "@/components/RecommendationPage";
import FullPageImagePage from "@/components/FullPageImagePage";

interface TopicField {
  key: string;
  label: string;
  placeholder: string;
  icon: string;
}

const topicFields: TopicField[] = [
  { key: "headlineTopic", label: "כתבת השער", placeholder: "ריק = מדע/טכנולוגיה/טבע", icon: "📰" },
  { key: "scienceTopic", label: "מדעים", placeholder: "למשל: חורים שחורים, DNA...", icon: "🔬" },
  { key: "innovationTopic", label: "חדשנות", placeholder: "למשל: רובוטיקה, בינה מלאכותית...", icon: "💡" },
  { key: "musicTopic", label: "מוזיקה", placeholder: "למשל: כלי נגינה, אמנים, סגנונות...", icon: "🎵" },
  { key: "natureTopic", label: "טבע", placeholder: "למשל: דולפינים, יערות הגשם...", icon: "🌿" },
  { key: "heritageTopic", label: "שבילי מורשת", placeholder: "למשל: ירושלים, דוד בן גוריון...", icon: "🏛️" },
  { key: "recommendationTopic", label: "המלצה", placeholder: "למשל: ספרי פנטזיה, סרטי טבע...", icon: "⭐" },
];

export default function Home() {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topics, setTopics] = useState<Record<string, string>>(
    Object.fromEntries([...topicFields, { key: "customTopic", label: "", placeholder: "", icon: "" }].map(f => [f.key, ""]))
  );

  const [newspaperTitle, setNewspaperTitle] = useState("צליל למצוינות");
  const [schoolName, setSchoolName] = useState("בית הספר צליל למצוינות");
  const [coverEmoji, setCoverEmoji] = useState("🎵");
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [addCustomArticle, setAddCustomArticle] = useState(false);

  // Date Selection
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toLocaleString('he-IL', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const hebrewMonths = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ];
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const updateTopic = (key: string, value: string) => {
    setTopics(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Callback: article regenerated → update edition state so TOC and cover update
  const handleArticleRegenerate = useCallback((section: string, newArticle: ArticleContent) => {
    setEdition(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      switch (section) {
        case "headline": updated.headline = newArticle; break;
        case "science": updated.science = newArticle; break;
        case "innovation": updated.innovation = newArticle; break;
        case "music": updated.music = newArticle; break;
        case "nature": updated.nature = newArticle; break;
        case "heritage": updated.heritage = newArticle; break;
        case "custom": updated.customArticle = newArticle; break;
      }
      return updated;
    });
  }, []);

  const generateEdition = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...Object.fromEntries(Object.entries(topics).map(([k, v]) => [k, v.trim()])),
        customTopic: addCustomArticle ? topics.customTopic?.trim() : "",
        month: selectedMonth,
        year: selectedYear,
      };
      const response = await fetch("/api/generate-edition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "שגיאה ביצירת הגיליון");
      }
      const data: Edition = await response.json();
      setEdition(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleImageUpload = (sectionKey: string, dataUrl: string) => {
    if (!edition) return;

    setEdition(prev => {
      if (!prev) return null;
      const newEdition = { ...prev };

      if (sectionKey === "custom") {
        if (newEdition.customArticle) {
          newEdition.customArticle = {
            ...newEdition.customArticle,
            custom_image_url: dataUrl
          };
        }
      } else {
        // @ts-ignore - Dynamic access
        if (newEdition[sectionKey]) {
          // @ts-ignore
          newEdition[sectionKey] = {
            // @ts-ignore
            ...newEdition[sectionKey],
            custom_image_url: dataUrl
          };
        }
      }
      return newEdition;
    });
  };

  const articleOrder = ["headline", "science", "innovation", "music", "nature", "heritage"];

  const getArticlePageCount = (article: ArticleContent | undefined) => {
    if (!article) return 1;
    if (article.is_two_page) return 2;
    // Check word count
    const contentStr = Array.isArray(article.content) ? article.content.join(" ") : (article.content || "");
    const wordCount = contentStr.split(/\s+/).length;
    return wordCount > 250 ? 2 : 1;

  };

  // Calculate dynamic page numbers based on 2-page article
  const getPageNumbers = () => {
    if (!edition) return { headline: 3, science: 4, innovation: 5, music: 6, nature: 7, heritage: 8, custom: 9, recommendation: 10, funZone: 11 };

    let page = 3; // Start after cover (1) and TOC (2)
    const nums: any = {};

    // Headline
    nums.headline = page;
    page += getArticlePageCount(edition.headline);
    if (edition.headline?.full_page_image_prompt) page++;

    // Science
    nums.science = page;
    page += getArticlePageCount(edition.science);
    if (edition.science?.full_page_image_prompt) page++;

    // Innovation
    nums.innovation = page;
    page += getArticlePageCount(edition.innovation);
    if (edition.innovation?.full_page_image_prompt) page++;

    // Music
    nums.music = page;
    page += getArticlePageCount(edition.music);
    if (edition.music?.full_page_image_prompt) page++;

    // Nature
    nums.nature = page;
    page += getArticlePageCount(edition.nature);
    if (edition.nature?.full_page_image_prompt) page++;

    // Heritage
    nums.heritage = page;
    page += getArticlePageCount(edition.heritage);
    if (edition.heritage?.full_page_image_prompt) page++;

    // Custom
    nums.custom = page;
    if (edition.customArticle) {
      page += getArticlePageCount(edition.customArticle);
    }

    // Recommendation
    nums.recommendation = page;
    if (edition.recommendation) page += 1;

    // Fun Zone
    nums.funZone = page;

    return nums;
  };

  const pageNums = edition ? getPageNumbers() : null;

  return (
    <div className="app-layout no-print-layout">

      {/* ══════ LEFT: Magazine Preview ══════ */}
      <div className="app-preview">
        {/* Error */}
        {error && (
          <div className="error-box">
            <p className="error-title">❌ {error}</p>
            <p className="error-hint">נסו שוב או בדקו את הגדרת ה-API Key</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="skeleton-viewer">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-600">ה-AI עובד על הגיליון שלך... 🤖</h3>
              <p className="text-gray-500 text-sm">זה לוקח כדקה</p>
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="skeleton-page">
                <div className="skeleton-block skeleton-shimmer" style={{ height: 60, width: "60%", margin: "0 auto 20px" }} />
                <div className="skeleton-block skeleton-shimmer" style={{ height: 120, width: "100%", marginTop: 30 }} />
              </div>
            ))}
          </div>
        )}

        {/* Magazine pages */}
        {edition && !loading && pageNums && (
          <div className="magazine-viewer">
            <CoverPage
              headline={edition.headline}
              generatedAt={edition.generatedAt}
              newspaperTitle={newspaperTitle}
              schoolName={schoolName}
              coverEmoji={coverEmoji}
              logoSrc={logoSrc}
            />
            <TableOfContents edition={edition} newspaperTitle={newspaperTitle} />
            <ArticlePage
              article={edition.headline}
              section="headline"
              pageNumber={pageNums.headline}
              month={selectedMonth}
              year={selectedYear}
              onRegenerate={handleArticleRegenerate}
              onImageUpload={handleImageUpload}
            />
            {edition.headline.full_page_image_prompt && (
              <FullPageImagePage
                prompt={edition.headline.full_page_image_prompt}
                pageNumber={pageNums.headline + getArticlePageCount(edition.headline)}
                overlayText={edition.headline.quote}
              />
            )}
            <ArticlePage
              article={edition.science}
              section="science"
              pageNumber={pageNums.science}
              month={selectedMonth}
              year={selectedYear}
              onRegenerate={handleArticleRegenerate}
              onImageUpload={handleImageUpload}
              forceTwoPage={getArticlePageCount(edition.science) === 2}
            />
            <ArticlePage
              article={edition.innovation}
              section="innovation"
              pageNumber={pageNums.innovation}
              month={selectedMonth}
              year={selectedYear}
              onRegenerate={handleArticleRegenerate}
              onImageUpload={handleImageUpload}
              forceTwoPage={getArticlePageCount(edition.innovation) === 2}
            />
            <ArticlePage
              article={edition.music}
              section="music"
              pageNumber={pageNums.music}
              month={selectedMonth}
              year={selectedYear}
              onRegenerate={handleArticleRegenerate}
              onImageUpload={handleImageUpload}
              forceTwoPage={getArticlePageCount(edition.music) === 2}
            />
            <ArticlePage
              article={edition.nature}
              section="nature"
              pageNumber={pageNums.nature}
              month={selectedMonth}
              year={selectedYear}
              onRegenerate={handleArticleRegenerate}
              onImageUpload={handleImageUpload}
              forceTwoPage={getArticlePageCount(edition.nature) === 2}
            />
            {edition.nature.full_page_image_prompt && (
              <FullPageImagePage
                prompt={edition.nature.full_page_image_prompt}
                pageNumber={pageNums.nature + getArticlePageCount(edition.nature)}
                overlayText={edition.nature.quote}
              />
            )}
            <ArticlePage
              article={edition.heritage}
              section="heritage"
              pageNumber={pageNums.heritage}
              month={selectedMonth}
              year={selectedYear}
              onRegenerate={handleArticleRegenerate}
              onImageUpload={handleImageUpload}
              forceTwoPage={getArticlePageCount(edition.heritage) === 2}
            />
            {edition.customArticle && (
              <ArticlePage
                article={edition.customArticle}
                section="custom"
                pageNumber={pageNums.custom}
                month={selectedMonth}
                year={selectedYear}
                onRegenerate={handleArticleRegenerate}
                onImageUpload={handleImageUpload}
                forceTwoPage={getArticlePageCount(edition.customArticle) === 2}
              />
            )}
            {edition.recommendation && (
              <RecommendationPage recommendation={edition.recommendation} pageNumber={pageNums.recommendation} />
            )}
            <FunZonePage funZone={edition.funZone} startPage={pageNums.funZone} />
          </div>
        )}

        {/* Empty State */}
        {!edition && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">🗞️</div>
            <h2>ברוכים הבאים לעיתון {newspaperTitle}!</h2>
            <p>לחצו על &quot;הפק גיליון חדש&quot; כדי ליצור את המגזין החודשי</p>
          </div>
        )}
      </div>

      {/* ══════ RIGHT: Settings Panel ══════ */}
      <aside className="app-sidebar no-print">
        <h2 className="sidebar-main-title">⚙️ הגדרות העיתון</h2>

        {/* Cover Settings */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">🎨 עיצוב השער</h3>
          <div className="sidebar-field">
            <label htmlFor="newspaper-title">שם העיתון</label>
            <input id="newspaper-title" type="text" value={newspaperTitle}
              onChange={(e) => setNewspaperTitle(e.target.value)} disabled={loading} />
          </div>
          <div className="sidebar-field">
            <label htmlFor="school-name">שם בית הספר</label>
            <input id="school-name" type="text" value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)} disabled={loading} />
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="sidebar-field">
              <label htmlFor="month-select">חודש</label>
              <select id="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={loading} className="w-full border rounded p-1">
                {hebrewMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="sidebar-field">
              <label htmlFor="year-select">שנה</label>
              <select id="year-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} disabled={loading} className="w-full border rounded p-1">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="sidebar-field mt-3">
            <label htmlFor="logo-upload">לוגו / סמל</label>
            <input id="logo-upload" type="file" accept="image/*"
              onChange={handleLogoUpload} disabled={loading} className="text-xs" />
            {logoSrc && (
              <div className="flex items-center gap-2 mt-1">
                <img src={logoSrc} alt="Logo Preview" className="h-10 w-10 object-contain rounded border" />
                <button onClick={() => setLogoSrc(null)} className="text-xs text-red-500 hover:underline">הסר</button>
              </div>
            )}
            {!logoSrc && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">או אימוג&apos;י:</span>
                <input type="text" value={coverEmoji}
                  onChange={(e) => setCoverEmoji(e.target.value)}
                  className="w-12 text-center text-lg p-1 border rounded" disabled={loading} />
              </div>
            )}
          </div>
        </div>

        {/* Section Topics */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">📝 נושאים למדורים</h3>
          <p className="text-xs text-gray-400 mb-2">השאירו ריק לנושא אקראי/היסטורי</p>
          {topicFields.map((field) => (
            <div key={field.key} className="sidebar-field">
              <label htmlFor={field.key}>{field.icon} {field.label}</label>
              <input id={field.key} type="text" value={topics[field.key]}
                onChange={(e) => updateTopic(field.key, e.target.value)}
                placeholder={field.placeholder} disabled={loading} />
            </div>
          ))}
        </div>

        {/* Custom Article */}
        <div className="sidebar-section">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={addCustomArticle}
              onChange={(e) => setAddCustomArticle(e.target.checked)}
              disabled={loading} className="w-4 h-4" />
            <span className="font-bold text-sm text-gray-700">⭐ הוסף כתבה מיוחדת</span>
          </label>
          {addCustomArticle && (
            <div className="sidebar-field mt-2">
              <label htmlFor="customTopic" className="text-purple-600">נושא הכתבה</label>
              <input id="customTopic" type="text" value={topics.customTopic}
                onChange={(e) => updateTopic("customTopic", e.target.value)}
                placeholder="למשל: טיול שנתי, ראיון עם המנהלת..."
                disabled={loading} autoFocus />
            </div>
          )}
        </div>

        {/* Generate Buttons */}
        <div className="sidebar-actions">
          <button onClick={generateEdition} disabled={loading} className="btn-generate w-full">
            {loading ? (
              <><span className="spinner" /> יוצר גיליון...</>
            ) : (
              "🗞️ הפק גיליון חדש"
            )}
          </button>
          {edition && (
            <button onClick={handlePrint} className="btn-print w-full">
              🖨️ הדפס / שמור PDF
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
