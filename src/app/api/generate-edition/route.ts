import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const AGE_CONTEXT = "כיתות ד׳-ו׳ (גילאי 9-12)";

const SYSTEM_PROMPT = `אתה כתב נלהב וחינוכי בעיתון בית ספר ישראלי.
ענה בעברית בלבד. התאם לתלמידי ${AGE_CONTEXT}.
כלל קריטי: אתה חייב לכתוב רק על עובדות אמיתיות שמופיעות בהנחיות. אסור בתכלית האיסור להמציא אירועים, שמות, תאריכים או מספרים.
החזר JSON תקין בלבד עם המבנה הבא בדיוק:
{
  "title": "כותרת",
  "subtitle": "כותרת משנה",
  "content": ["פסקה 1", "פסקה 2", "פסקה 3", "פסקה 4", "פסקה 5", "פסקה 6"],
  "image_prompt": "English description for illustration",
  "sidebar": {"title": "הידעת?", "content": "עובדה מעניינת"},
  "quote": "ציטוט מהכתבה"
}
אסור להתחיל במילים "היום" או "השבוע". החזר JSON בלבד ללא טקסט נוסף.`;

const FUN_ZONE_SYSTEM_PROMPT = `ענה בעברית בלבד. התאם לתלמידי ${AGE_CONTEXT}.
החזר JSON תקין בלבד עם המבנה הבא בדיוק:
{"trivia":[{"question":"שאלה","answer":"תשובה"}],"word_search_words":["מילה"],"find_waldo_prompt":"description for where's waldo style image","riddle":{"question":"חידה","answer":"תשובה"}}`;

const COMIC_SYSTEM_PROMPT = `ענה בעברית בלבד. התאם לתלמידי ${AGE_CONTEXT}.
צור קומיקס הרפתקאות מרתק ומלא אקשן ב-10 קוביות (פאנלים).
מבנה העלילה חייב לכלול:
- קוביות 1-2: פתיחה - הצגת הדמויות והמצב הראשוני
- קוביות 3-5: בניית מתח - סכנה, בעיה או אתגר הולך וגדל
- קוביות 6-8: שיא - רגע קריטי, שיא הסכנה, הדמויות בסיטואציה קשה
- קוביות 9-10: פתרון - הגיבורים מוצאים פתרון מתוחכם ומנצחים!
העלילה חייבת להיות מותאמת לגילאי 9-12 (לא ילדותי מידי, לא מפחיד מידי). נושאים: הרפתקאות, מסע חקירה, מדע דמיוני, משימות ריגול, חילוצים מסוכנים, גיבורי על ילדים.
החזר JSON תקין בלבד עם המבנה הבא:
{
  "title": "שם הקומיקס",
  "image_prompt": "A detailed prompt for an AI image generator to create a 10-panel adventure comic strip. Action-packed with dynamic poses and dramatic angles. The comic should look like a professional comic book page with 10 panels in a grid layout. Tall image, portrait mode, vertical aspect ratio (2:3). Panel 1: [DESC]. Panel 2: [DESC]... up to Panel 10. Include speech bubbles with Hebrew text. Use bold outlines, dramatic shadows, and action lines.",
  "panels": [
    {"panel_number": 1, "scene_description": "תיאור", "characters": ["דמות"], "dialogue": [{"character": "דמות", "text": "טקסט"}], "sound_effect": ""}
  ]
}
חשוב מאוד: בשדה image_prompt כתוב תיאור מפורט באנגלית ליצירת תמונה אחת שמכילה את כל 10 הפאנלים, כולל תיאור הדמויות, הפעולות, והאקשן. שים דגש על דינמיות, תנועה ומתח.`;

// Helper: delay
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

async function generateSection(
  userPrompt: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<{ data: string; error?: string }> {
  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model,
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      });

      const content = chatCompletion.choices[0]?.message?.content || "{}";
      if (content.length > 10) {
        console.log(`Success with model: ${model}`);
        return { data: content };
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Model ${model} failed:`, errMsg.substring(0, 100));

      if (errMsg.includes("429") || errMsg.includes("rate_limit")) {
        console.log(`Rate limited on ${model}, trying next model...`);
        continue;
      }

      await delay(500);
    }
  }
  return { data: "{}", error: "All models exhausted or rate limited" };
}

function parseJSON(text: string) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
  } catch { /* continue */ }

  const cleaned = text
    .replace(/```json?\s*\n?/g, "")
    .replace(/\n?\s*```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch { /* continue */ }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* continue */ }
  }

  console.error("Failed to parse JSON:", text.substring(0, 200));
  return null;
}

// ===== TAVILY NEWS SEARCH =====
interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

async function searchNews(query: string, timeRange: string = "month"): Promise<{ answer: string; results: TavilyResult[]; error?: string }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { answer: "", results: [], error: "TAVILY_API_KEY not configured" };
  }

  try {
    console.log(`[Tavily] Searching: "${query}"`);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        topic: "news",
        search_depth: "basic",
        time_range: timeRange,
        max_results: 3,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Tavily] Error ${response.status}: ${errText.substring(0, 200)}`);
      return { answer: "", results: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const results: TavilyResult[] = (data.results || []).map((r: { title: string; url: string; content: string }) => ({
      title: r.title,
      url: r.url,
      content: (r.content || "").substring(0, 500),
    }));

    console.log(`[Tavily] Found ${results.length} results, answer: ${(data.answer || "").substring(0, 100)}...`);
    return { answer: data.answer || "", results };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Tavily] Search failed: ${errMsg}`);
    return { answer: "", results: [], error: errMsg };
  }
}

function buildNewsContext(searchResult: { answer: string; results: TavilyResult[] }): string {
  if (!searchResult.answer && searchResult.results.length === 0) return "";

  let context = "\n\n--- מידע אמיתי שנמצא ברשת (חובה להתבסס עליו!) ---\n";
  if (searchResult.answer) {
    context += `סיכום: ${searchResult.answer}\n`;
  }
  for (const r of searchResult.results) {
    context += `• ${r.title}: ${r.content.substring(0, 300)}\n`;
  }
  context += "--- סוף מידע ---\n";
  context += "חשוב מאוד: כתוב את הכתבה על בסיס המידע האמיתי שלמעלה בלבד. אסור בתכלית האיסור להמציא עובדות, אירועים, שמות או מספרים. אם אין מספיק מידע, התייחס רק למה שידוע.";
  return context;
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured. Please set it in .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Per-section topics
    const headlineTopic: string = body.headlineTopic || "";
    const scienceTopic: string = body.scienceTopic || "";
    const innovationTopic: string = body.innovationTopic || "";
    const musicTopic: string = body.musicTopic || "";
    const natureTopic: string = body.natureTopic || "";
    const heritageTopic: string = body.heritageTopic || "";
    const customTopic: string = body.customTopic || "";

    // Date selection
    const hebrewMonths = [
      "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
      "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
    ];

    // Use user provided date or default to now
    let monthName, year;
    const now = new Date();

    if (body.month && body.year) {
      monthName = body.month;
      year = body.year;
    } else {
      monthName = hebrewMonths[now.getMonth()];
      year = now.getFullYear();
    }

    const contextDate = `חודש ${monthName} ${year}`;
    const ageNote = `לתלמידי ${AGE_CONTEXT}.`;

    // ===== TAVILY NEWS SEARCHES (parallel) =====
    console.log("[Tavily] Starting parallel news searches...");
    const [
      headlineNews,
      scienceNews,
      innovationNews,
      musicNews,
      natureNews,
      heritageNews,
    ] = await Promise.all([
      searchNews(headlineTopic || "interesting news for kids science discovery technology"),
      searchNews(scienceTopic || "science discovery breakthrough research 2025"),
      searchNews(innovationTopic || "technology innovation invention AI robotics"),
      searchNews(musicTopic || "music culture arts entertainment celebrity"),
      searchNews(natureTopic || "nature animals wildlife environment climate"),
      searchNews(heritageTopic || "Israel heritage history archaeology culture"),
    ]);
    console.log("[Tavily] All searches complete.");

    const headlineContext = buildNewsContext(headlineNews);
    const scienceContext = buildNewsContext(scienceNews);
    const innovationContext = buildNewsContext(innovationNews);
    const musicContext = buildNewsContext(musicNews);
    const natureContext = buildNewsContext(natureNews);
    const heritageContext = buildNewsContext(heritageNews);

    // Build prompts per section with REAL NEWS context
    const headlinePrompt = headlineTopic
      ? `כתוב כתבת שער בנושא: "${headlineTopic}". ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 600 מילים. חלק את הכתבה ל-8 פסקאות לפחות.
         הוסף שדה "teaser" ל-JSON: פסקה מסקרנת של 30-40 מילים (2-3 משפטים) שמושכת את הקורא ויוצרת מתח/עניין.
         ${headlineContext}
         החזר JSON בלבד.`
      : `כתוב כתבת שער על אירוע אמיתי שקרה לאחרונה. ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 600 מילים. חלק את הכתבה ל-8 פסקאות לפחות.
         הוסף שדה "teaser" ל-JSON: פסקה מסקרנת של 30-40 מילים (2-3 משפטים) שמושכת את הקורא ויוצרת מתח/עניין.
         ${headlineContext}
         החזר JSON בלבד.`;

    const sciencePrompt = scienceTopic
      ? `כתוב כתבה מדעית מרתקת בנושא: "${scienceTopic}". ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${scienceContext}
         החזר JSON בלבד.`
      : `כתוב כתבה מדעית מרתקת על תגלית מדעית אמיתית שקרתה לאחרונה. ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${scienceContext}
         החזר JSON בלבד.`;

    const innovationPrompt = innovationTopic
      ? `כתוב כתבה על חדשנות וטכנולוגיה בנושא: "${innovationTopic}". ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${innovationContext}
         החזר JSON בלבד.`
      : `כתוב כתבה על המצאה טכנולוגית אמיתית שפורסמה לאחרונה. ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${innovationContext}
         החזר JSON בלבד.`;

    const musicPrompt = musicTopic
      ? `כתוב כתבה מרתקת על מוזיקה ותרבות בנושא: "${musicTopic}". ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${musicContext}
         החזר JSON בלבד.`
      : `כתוב כתבה מרתקת על אירוע תרבות/מוזיקה אמיתי שקרה לאחרונה. ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${musicContext}
         החזר JSON בלבד.`;

    const naturePrompt = natureTopic
      ? `כתוב כתבה על טבע בנושא: "${natureTopic}". ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${natureContext}
         החזר JSON בלבד.`
      : `כתוב כתבה על גילוי טבע/בעלי חיים אמיתי שפורסם לאחרונה. ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${natureContext}
         החזר JSON בלבד.`;

    const heritagePrompt = heritageTopic
      ? `כתוב כתבה מעוררת השראה בנושא מורשת ישראלית על: "${heritageTopic}". ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${heritageContext}
         החזר JSON בלבד.`
      : `כתוב כתבה מעוררת השראה על מורשת/היסטוריה ישראלית אמיתית. ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6 פסקאות לפחות.
         ${heritageContext}
         החזר JSON בלבד.`;

    const customArticlePrompt = customTopic
      ? `כתוב כתבה מעניינת לעיתון בית ספר בנושא: "${customTopic}". ${contextDate}. ${ageNote}
         דרישה קריטית: אורך הכתבה חייב להיות לפחות 500 מילים. חלק את הכתבה ל-6-8 פסקאות.
         החזר JSON בלבד.`
      : "";

    // ===== BATCH PROCESSING =====
    const errors: string[] = [];
    console.log("Starting batch generation...");

    // Batch 1: headline + science
    const [headlineResult, scienceResult] = await Promise.all([
      generateSection(headlinePrompt),
      generateSection(sciencePrompt)
    ]);
    if (headlineResult.error) errors.push(`שער: ${headlineResult.error}`);
    if (scienceResult.error) errors.push(`מדעים: ${scienceResult.error}`);
    await delay(300);

    // Batch 2: innovation + music
    const [innovationResult, musicResult] = await Promise.all([
      generateSection(innovationPrompt),
      generateSection(musicPrompt)
    ]);
    if (innovationResult.error) errors.push(`חדשנות: ${innovationResult.error}`);
    if (musicResult.error) errors.push(`מוזיקה: ${musicResult.error}`);
    await delay(300);

    // Batch 3: nature + heritage
    const [natureResult, heritageResult] = await Promise.all([
      generateSection(naturePrompt),
      generateSection(heritagePrompt)
    ]);
    if (natureResult.error) errors.push(`טבע: ${natureResult.error}`);
    if (heritageResult.error) errors.push(`מורשת: ${heritageResult.error}`);
    await delay(300);

    // Batch 4: custom article (if requested)
    let customResult: { data: string; error?: string } = { data: "{}" };
    if (customArticlePrompt) {
      customResult = await generateSection(customArticlePrompt);
      if (customResult.error) errors.push(`מיוחדת: ${customResult.error}`);
      await delay(300);
    }

    // Parse early to use context
    const headline = parseJSON(headlineResult.data);
    const science = parseJSON(scienceResult.data);
    const innovation = parseJSON(innovationResult.data);
    const music = parseJSON(musicResult.data);
    const nature = parseJSON(natureResult.data);
    const heritage = parseJSON(heritageResult.data);
    const customArticle = customTopic ? parseJSON(customResult.data) : null;

    // Collect topics for context
    const articles = [headline, science, innovation, music, nature, heritage, customArticle].filter(a => a && a.title);
    const articlesContext = articles.map(a => `"${a.title}"`).join(", ");

    // Choose one article for the comic (prefer headline or custom, otherwise random)
    const comicSource = customArticle || headline || articles[0];
    const comicContext = comicSource ? `העלילה צריכה להיות מבוססת בצורה הומוריסטית או מותחת על הכתבה בנושא: "${comicSource.title}".` : "";

    // Batch 5: funZone + comic (WITH CONTEXT)
    const [funZoneResult, comicResult] = await Promise.all([
      generateSection(
        `צור תוכן לפינת "הפסקה פעילה":
         5 שאלות טריוויה מעניינות ומאתגרות שקשורות לנושאים האלו: ${articlesContext || "ידע כללי"}.
         8 מילים לתפזורת (4-8 אותיות).
         חידה אחת מאתגרת עם תשובה.
         הוסף שדה find_waldo_prompt עם תיאור באנגלית לתמונה בסגנון "איפה אפי?" (Where's Waldo). התמונה צריכה להיות עמוסה בפרטים, ובתוכה מסתתרת דמות או חפץ שקשור לנושא: "${comicSource?.title || "בית ספר"}".
         החזר JSON בלבד.`,
        FUN_ZONE_SYSTEM_PROMPT
      ),
      generateSection(
        `צור קומיקס מצחיק או מותח ב-6 פאנלים לילדים.
         ${comicContext}
         דמויות חיות וצבעוניות.
         ${ageNote}`,
        COMIC_SYSTEM_PROMPT
      )
    ]);

    if (funZoneResult.error) errors.push(`הפסקה: ${funZoneResult.error}`);
    if (comicResult.error) errors.push(`קומיקס: ${comicResult.error}`);

    console.log("All generation complete. Errors:", errors);

    const funZone = parseJSON(funZoneResult.data);
    const comic = parseJSON(comicResult.data);

    // Normalize content arrays
    [headline, science, innovation, music, nature, heritage, customArticle].forEach(doc => {
      if (doc && Array.isArray(doc.content)) {
        doc.content = doc.content.join("\n\n");
      }
    });

    // Fallback content for failed sections
    const defaultArticle = (title: string) => ({
      title: `${title} 📰`,
      subtitle: "תוכן זה לא נוצר בגלל עומס על שרת ה-AI",
      content: "⏳ המדור הזה לא נוצר כרגע בגלל מגבלת שימוש ב-API. נסו לייצר גיליון חדש מאוחר יותר, או בדקו את הגדרות ה-API Key שלכם.\n\nהמערכת מנסה להשתמש במספר מודלים חלופיים, אך כולם הגיעו למגבלת השימוש היומית. המגבלה מתאפסת בכל יום.",
      image_prompt: "colorful newspaper placeholder illustration",
      sidebar: { title: "💡 טיפ", content: "נסו שוב מאוחר יותר או שדרגו את חשבון ה-Groq שלכם." },
      quote: "סבלנות היא מפתח להצלחה! 🔑",
    });

    const defaultFunZone = {
      trivia: [
        { question: "מה הכוכב הקרוב ביותר לכדור הארץ?", answer: "השמש" },
        { question: "כמה רגליים יש לעכביש?", answer: "8 רגליים" },
        { question: "מהי בירת ישראל?", answer: "ירושלים" }
      ],
      word_search_words: ["שמש", "ירח", "כוכב", "ענן", "גשם", "רוח", "שלג", "קשת"],
      joke: "למה התלמיד הביא סולם לבית הספר? כי הוא רצה ללכת לכיתה גבוהה! 😂"
    };

    const defaultComic = {
      title: "הרפתקה בבית הספר",
      image_prompt: "A fun 6-panel comic strip for kids about a school adventure, with colorful characters and speech bubbles",
      panels: [
        { panel_number: 1, scene_description: "כיתה בבית ספר", characters: ["תלמיד"], dialogue: [{ character: "תלמיד", text: "קומיקס יגיע בגיליון הבא!" }], sound_effect: "" }
      ]
    };

    const edition = {
      headline: (headline && headline.content) ? headline : defaultArticle("כתבת השער"),
      science: (science && science.content) ? science : defaultArticle("מדע וטבע"),
      innovation: (innovation && innovation.content) ? innovation : defaultArticle("חדשנות וטכנולוגיה"),
      music: (music && music.content) ? music : defaultArticle("תרבות ומוזיקה"),
      nature: (nature && nature.content) ? nature : defaultArticle("עולם החי"),
      heritage: (heritage && heritage.content) ? heritage : defaultArticle("שבילי מורשת"),
      customArticle: (customTopic && customArticle && customArticle.content) ? customArticle : undefined,
      funZone: funZone || defaultFunZone,
      comic: comic || defaultComic,
      generatedAt: now.toISOString(), // Keep generation time for reference, but content is based on selected date
    };

    return NextResponse.json(edition);
  } catch (error) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: `שגיאה כללית: ${message}` }, { status: 500 });
  }
}
