import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const AGE_CONTEXT = "כיתות ד׳-ו׳ (גילאי 9-12)";

const SYSTEM_PROMPT = `אתה כתב נלהב וחינוכי בעיתון בית ספר ישראלי.
ענה בעברית בלבד. התאם לתלמידי ${AGE_CONTEXT}.
כלל קריטי: עליך לחפש מידע אמיתי ועדכני ברשת ולהתבסס רק עליו. אסור להמציא עובדות, שמות, תאריכים או מספרים.
הנחיה חשובה: אל תכלול מספרי ציטוטים בטקסט (כמו [1], [2]). כתוב טקסט רציף ונקי.
החזר JSON תקין בלבד עם המבנה הבא בדיוק:
{
  "title": "כותרת",
  "subtitle": "כותרת משנה",
  "content": ["פסקה 1", "פסקה 2", "פסקה 3", "פסקה 4", "פסקה 5", "פסקה 6", "פסקה 7", "פסקה 8"],
  "image_prompt": "English description for illustration (used if image_type is ART)",
  "image_type": "REAL or ART",
  "image_search_query": "English search query (used if image_type is REAL)",
  "full_page_image_prompt": "Optional: Detailed English prompt for a vertical (portrait) full-page poster image (only if requested)",
  "sidebar": {"title": "הידעת?", "content": "עובדה מעניינת"},
  "quote": "ציטוט מהכתבה"
}

כללי סיווג תמונה (image_type):
- "REAL": אם הכתבה עוסקת באדם מפורסם אמיתי, מקום אמיתי, חיה ספציפית, ספר/יצירה אמיתית, או אירוע היסטורי. במקרה זה, כתוב ב-image_search_query שאילתת חיפוש באנגלית (לדוגמה: "Mozart portrait", "Amazon rainforest aerial view").
- "ART": אם הכתבה עוסקת ברעיון מופשט, תגלית מדעית כללית, או נושא שאין לו תמונה ספציפית. במקרה זה, כתוב ב-image_prompt תיאור מפורט באנגלית ליצירת איור.
שני השדות (image_prompt ו-image_search_query) חייבים להופיע תמיד, אבל רק אחד מהם ישמש בפועל בהתאם ל-image_type.

אסור להתחיל במילים "היום" או "השבוע". החזר JSON בלבד ללא טקסט נוסף.`;

const FUN_ZONE_SYSTEM_PROMPT = `ענה בעברית בלבד. התאם לתלמידי ${AGE_CONTEXT}.
חשוב מאוד: כל התשובות חייבות להיות מדויקות ומהימנות! אסור להמציא עובדות.
החזר JSON תקין בלבד עם המבנה הבא בדיוק:
{"trivia":[{"question":"שאלה","answer":"תשובה"}],"word_search_words":["מילה"],"riddle":{"question":"חידה","answer":"תשובה"},"crossword":[{"clue":"הגדרה","answer":"מילה"}],"tashchetz":[{"clue":"הגדרה קצרה","answer":"מילה"}]}`;

const RECOMMENDATION_SYSTEM_PROMPT = `ענה בעברית בלבד. התאם לתלמידי ${AGE_CONTEXT}.
אתה מומחה להמלצות תרבות לילדים בוגרים (גילאי 9-12, כיתות ד'-ו').
כלל ברזל מוחלט: ההמלצה חייבת להיות על יצירה אמיתית וקיימת בפועל!
אסור בשום אופן להמציא שמות ספרים, הצגות, סדרות או פודקאסטים שלא קיימים!
ודא שהשם המדויק של היצירה נכון. לדוגמא: "הארי פוטר ואבן החכמים" ולא "הארי פוטר ומסע הסוריאלוס".
חפש באינטרנט כדי לוודא שהיצירה קיימת ושהשם מדויק.
אסור להמליץ על תכנים לפעוטות או גן.
אסור להמליץ על תכנים למבוגרים.
החזר JSON תקין בלבד עם המבנה הבא בדיוק:
{
  "type": "ספר/הצגה/תוכנית/פודקאסט",
  "title": "שם היצירה המדויק כפי שהוא קיים בפועל",
  "creator": "שם היוצר/ת האמיתי",
  "description": "תיאור קצר וסוחף של 3-4 משפטים",
  "image_prompt": "Photorealistic, highly detailed, 4k photograph of [Description]",
  "image_type": "REAL or ART",
  "image_search_query": "English search query for a high resolution real photo (used if image_type is REAL)",
  "why": "למה כדאי - משפט אחד שמשכנע ילדים"
}
כללי סיווג תמונה (image_type):
- "REAL": אם ההמלצה היא על יצירה אמיתית שקיימת (ספר, הצגה, תוכנית) - השתמש ב-REAL וכתוב שאילתת חיפוש (למשל: "Harry Potter book cover high resolution").
- "ART": רק אם אין תמונה אמיתית שניתן לחפש.
חשוב מאוד: השם חייב להיות מדויק ומהימן! אם אתה לא בטוח ב-100% שהיצירה קיימת, בחר יצירה אחרת שאתה בטוח לגביה. החזר JSON בלבד.`;


// Helper: delay
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Gemini API Config
const MODEL_NAME = "gemini-3-flash-preview";

// Clean citations like [1], [2] from text
function cleanText(text: string): string {
  return text.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}

async function generateSection(
  userPrompt: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<{ data: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { data: "{}", error: "GEMINI_API_KEY not configured" };
  }

  try {
    console.log(`[Gemini] Generating with prompt: "${userPrompt.substring(0, 50)}..."`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent([
      systemPrompt, // Passing system prompt as first part of prompt typically works well for Gemini
      userPrompt
    ]);

    const response = await result.response;
    const text = response.text();

    if (!text) {
      return { data: "{}", error: "Empty response from Gemini" };
    }

    return { data: text };

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Gemini] Request failed: ${errMsg} `);

    if (errMsg.includes("429")) {
      return { data: "{}", error: "Rate limit exceeded (429)" };
    }

    return { data: "{}", error: errMsg };
  }
}

function parseJSON(text: string) {
  let cleaned = text;
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
  } catch { /* continue */ }

  cleaned = text
    .replace(/^```json\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    console.error("Raw text:", text);
    return null;
  }
}

// New helper to handle citations if needed (though we ask model not to include them)
// Gemini usually respects the prompt better regarding formatting
function cleanCitations(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') return cleanText(obj);
  if (Array.isArray(obj)) return obj.map(cleanCitations);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = cleanCitations(obj[key]);
    }
    return newObj;
  }
  return obj;
}


// Topics for random selection
const headlineThemes = ["התגלית החדשה בחלל", "רובוטים שעוזרים בבית", "המצאת הגלגל מחדש", "חיות נדירות בישראל", "העיר החכמה של העתיד"];
const scienceThemes = ["איך נוצר הגשם?", "למה השמיים כחולים?", "החיים במעמקי הים", "מסע אל המאדים", "אנרגיה ירוקה"];
const innovationThemes = ["רכבות מעופפות", "הדפסת בתים בתלת ממד", "בינה מלאכותית בכיתה", "אפליקציות שעוזרות ללמוד", "מכוניות אוטונומיות"];
const musicThemes = ["ההיסטוריה של הגיטרה", "איך כותבים שיר?", "מוזיקה קלאסית לילדים", "הכלי הכי מוזר בעולם", "להקות מפורסמות בהיסטוריה"];
const natureThemes = ["נדידת הציפורים", "סודות היער", "חיות לילה", "שונית האלמוגים", "פרחים נדירים"];
const heritageThemes = ["סיפורי המכבים", "ירושלים העתיקה", "המצאות ישראליות", "דמויות מופת בהיסטוריה", "חגים ומסורות"];

function getRandomTheme(themes: string[]) {
  return themes[Math.floor(Math.random() * themes.length)];
}

function defaultArticle(title: string) {
  return {
    title,
    subtitle: "כתבה מעניינת בהכנה...",
    content: ["אנחנו עובדים על הכתבה הזו ברגעים אלו ממש.", "חזרו בקרוב לקרוא אותה!"],
    image_prompt: "colorful newspaper placeholder illustration",
    sidebar: { title: "💡 טיפ", content: "נסו שוב מאוחר יותר." },
    quote: "סבלנות היא מפתח להצלחה! 🔑",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      headlineTopic,
      scienceTopic,
      innovationTopic,
      musicTopic,
      natureTopic,
      heritageTopic,
      customTopic,
      recommendationTopic,
      month,
      year
    } = body;

    const now = new Date();
    // Use user provided date or current date
    const dateStr = (month && year) ? `${month} ${year}` : now.toLocaleDateString("he-IL");
    const contextDate = `תאריך העיתון: ${dateStr}`;
    const ageNote = `קהל יעד: ${AGE_CONTEXT}`;
    const searchInstruction = `חשוב: חפש מידע עדכני ואמיתי ברשת.`;

    // Only one article should be 2 pages long.
    // We'll randomly select one from: headline, science, innovation, music, nature, heritage.
    const sectionsForTwoPage = ["headline", "science", "innovation", "music", "nature", "heritage"];
    const twoPageSection = sectionsForTwoPage[Math.floor(Math.random() * sectionsForTwoPage.length)];

    const getTwoPageInstruction = (sectionName: string) => {
      if (sectionName === twoPageSection) {
        return `הנחיה מיוחדת: כתבה זו היא "כתבה מרכזית" כפולה באורכה.
        עליך לכתוב כתבה ארוכה ומעמיקה במיוחד (כ-800 מילים), המחולקת ל-10-12 פסקאות.
        הקפד על פירוט רב, דוגמאות מעניינות והסברים מעמיקים.`;
      }
      return `אורך הכתבה: כ-600 מילים. חלק ל-7-8 פסקאות.`;
    }

    // Prepare prompts
    const headlinePrompt = headlineTopic
      ? `נושא: "${headlineTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} כתוב כתבת שער מרתקת על הנושא, כולל עובדות חדשות ומפתיעות.
         חובה: הוסף שדה 'full_page_image_prompt' עם תיאור מפורט באנגלית לתמונה אנכית (poster style) של נושא הכתבה.
         ${getTwoPageInstruction("headline")}
         החזר JSON בלבד.`
      : `נושא: ${getRandomTheme(headlineThemes)}. ${contextDate}. ${ageNote}
         ${searchInstruction} כתוב כתבת שער מעניינת וסוחפת.
         חובה: הוסף שדה 'full_page_image_prompt' עם תיאור מפורט באנגלית לתמונה אנכית (poster style) של נושא הכתבה.
         ${getTwoPageInstruction("headline")}
         החזר JSON בלבד.`;

    const sciencePrompt = scienceTopic
      ? `נושא: "${scienceTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} מצא עובדות מדעיות מעניינות בנושא זה וכתוב כתבה.
         ${getTwoPageInstruction("science")}
         החזר JSON בלבד.`
      : `נושא: ${getRandomTheme(scienceThemes)}. ${contextDate}. ${ageNote}
         ${searchInstruction} חפש תגלית או תופעה מדעית מעניינת וכתוב עליה.
         ${getTwoPageInstruction("science")}
         החזר JSON בלבד.`;

    const innovationPrompt = innovationTopic
      ? `נושא: "${innovationTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} כתוב על החידושים האחרונים בנושא זה.
         ${getTwoPageInstruction("innovation")}
         החזר JSON בלבד.`
      : `נושא: ${getRandomTheme(innovationThemes)}. ${contextDate}. ${ageNote}
         ${searchInstruction} חפש המצאה או חידוש טכנולוגי בנושא זה וכתוב עליהם.
         ${getTwoPageInstruction("innovation")}
         החזר JSON בלבד.`;

    const musicPrompt = musicTopic
      ? `נושא: "${musicTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} מצא מידע מעולם המוזיקה בנושא זה וכתוב כתבה.
         ${getTwoPageInstruction("music")}
         החזר JSON בלבד.`
      : `נושא: ${getRandomTheme(musicThemes)}. ${contextDate}. ${ageNote}
         ${searchInstruction} חפש מידע מעניין ועובדות על נושא מוזיקלי זה וכתוב עליו כתבה.
         ${getTwoPageInstruction("music")}
         החזר JSON בלבד.`;

    const naturePrompt = natureTopic
      ? `נושא: "${natureTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} מצא עובדות וחדשות בנושא טבע זה וכתוב כתבה.
         חובה: הוסף שדה 'full_page_image_prompt' עם תיאור מפורט באנגלית לתמונה אנכית (poster style) של החיה או הנוף.
         ${getTwoPageInstruction("nature")}
         החזר JSON בלבד.`
      : `נושא: ${getRandomTheme(natureThemes)}. ${contextDate}. ${ageNote}
         ${searchInstruction} חפש סיפור מעניין או עובדות מרתקות בנושא טבע זה וכתוב עליו.
         חובה: הוסף שדה 'full_page_image_prompt' עם תיאור מפורט באנגלית לתמונה אנכית (poster style) של החיה או הנוף.
         ${getTwoPageInstruction("nature")}
         החזר JSON בלבד.`;

    const heritagePrompt = heritageTopic
      ? `נושא: "${heritageTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} מצא מידע היסטורי או מורשת בנושא זה וכתוב כתבה.
         ${getTwoPageInstruction("heritage")}
         החזר JSON בלבד.`
      : `נושא: ${getRandomTheme(heritageThemes)}. ${contextDate}. ${ageNote}
         ${searchInstruction} חפש מידע היסטורי מעניין בנושא זה וכתוב עליו כתבה מעוררת השראה.
         ${getTwoPageInstruction("heritage")}
         החזר JSON בלבד.`;

    const customArticlePrompt = customTopic
      ? `נושא: "${customTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} חפש מידע על הנושא המיוחד הזה וכתוב עליו כתבה.
         אורך הכתבה: כ-550 מילים. חלק ל-7-8 פסקאות.
         החזר JSON בלבד.`
      : "";

    // Recommendation prompt
    const recommendationPrompt = recommendationTopic
      ? `נושא ההמלצה: "${recommendationTopic}". ${contextDate}. ${ageNote}
         חפש המלצה תרבותית ספציפית בנושא זה (ספר, הצגה, תוכנית) שמתאימה לגילאי 9-12.
         אם הנושא הוא שם של יצירה, המלץ עליה (רק אם היא מתאימה לגיל).`
      : `המלץ על יצירה אחת מעולם התרבות לילדים. ${contextDate}. ${ageNote}
         ${searchInstruction} חפש המלצה אמיתית על ספר, הצגה, תוכנית טלוויזיה, או פודקאסט שמתאימים לילדים בגילאי 9-12.
         הקפד לא להמליץ על דברים של קטנטנים!`;

    // ===== BATCH PROCESSING =====
    const errors: string[] = [];
    console.log("Starting batch generation with Gemini...");

    // Batch 1: headline + science
    const [headlineResult, scienceResult] = await Promise.all([
      generateSection(headlinePrompt),
      generateSection(sciencePrompt)
    ]);
    if (headlineResult.error) errors.push(`שער: ${headlineResult.error}`);
    if (scienceResult.error) errors.push(`מדעים: ${scienceResult.error}`);
    await delay(500);

    // Batch 2: innovation + music
    const [innovationResult, musicResult] = await Promise.all([
      generateSection(innovationPrompt),
      generateSection(musicPrompt)
    ]);
    if (innovationResult.error) errors.push(`חדשנות: ${innovationResult.error}`);
    if (musicResult.error) errors.push(`מוזיקה: ${musicResult.error}`);
    await delay(500);

    // Batch 3: nature + heritage
    const [natureResult, heritageResult] = await Promise.all([
      generateSection(naturePrompt),
      generateSection(heritagePrompt)
    ]);
    if (natureResult.error) errors.push(`טבע: ${natureResult.error}`);
    if (heritageResult.error) errors.push(`מורשת: ${heritageResult.error}`);
    await delay(500);

    // Batch 4: Custom + Recommendation
    const [customResult, recommendationResult] = await Promise.all([
      customArticlePrompt ? generateSection(customArticlePrompt) : Promise.resolve({ data: "{}" } as { data: string; error?: string }),
      generateSection(recommendationPrompt, RECOMMENDATION_SYSTEM_PROMPT)
    ]);

    if (customArticlePrompt && customResult.error) errors.push(`כתבה מיוחדת: ${customResult.error}`);
    if (recommendationResult.error) errors.push(`המלצה: ${recommendationResult.error}`);

    // Parse results
    const headline = cleanCitations(parseJSON(headlineResult.data));
    const science = cleanCitations(parseJSON(scienceResult.data));
    const innovation = cleanCitations(parseJSON(innovationResult.data));
    const music = cleanCitations(parseJSON(musicResult.data));
    const nature = cleanCitations(parseJSON(natureResult.data));
    const heritage = cleanCitations(parseJSON(heritageResult.data));
    const customArticle = customArticlePrompt ? cleanCitations(parseJSON(customResult.data)) : undefined;
    const recommendation = cleanCitations(parseJSON(recommendationResult.data));

    // Gather titles for Fun Zone context
    const articlesContext = [
      headline?.title,
      science?.title,
      innovation?.title,
      music?.title,
      nature?.title,
      heritage?.title,
      customArticle?.title,
      recommendation?.title
    ].filter(Boolean).join(", ");

    // Batch 5: funZone
    const funZoneResult = await generateSection(
      `צור תוכן לפינת "הפסקה פעילה":
         הנה הכתבות שיצרנו בגיליון: ${articlesContext || "ידע כללי"}.
         חשוב: כל התשובות חייבות להיות מדויקות ומהימנות!
         דרישה חשובה: צור שאלת טריוויה אחת מכל כתבה! כלומר, אם יש 6 כתבות, צור 6 שאלות - כל שאלה קשורה לכתבה אחרת.
         צור 5-6 מילים לתפזורת (4-8 אותיות) מנושאים שונים.
         צור חידה אחת מאתגרת עם תשובה.
         צור 10-12 הגדרות לתשבץ (Crossword): זוגות של "הגדרה" ו-"תשובה" (מילה אחת בלבד, ללא רווחים). המילים צריכות להיות קשורות לנושאי בית ספר, מדע, או כללי.
         צור 10-12 הגדרות לתשחץ (tashchetz): זוגות של "הגדרה" ו-"תשובה" (מילה אחת בלבד, ללא רווחים, 2-6 אותיות). ההגדרות צריכות להיות קצרות (2-3 מילים בלבד). דוגמאות: {"clue":"בירת ישראל","answer":"ירושלים"}, {"clue":"מלך החיות","answer":"אריה"}, {"clue":"צבע השמיים","answer":"כחול"}.
         החזר JSON בלבד.`,
      FUN_ZONE_SYSTEM_PROMPT
    );

    if (funZoneResult.error) errors.push(`הפסקה: ${funZoneResult.error}`);

    console.log("All generation complete. Errors:", errors);

    // Normalize formatting
    [headline, science, innovation, music, nature, heritage, customArticle].forEach(doc => {
      if (doc && doc.content && Array.isArray(doc.content)) {
        // Ensure content is array of strings
      }
    });

    const defaultFunZone = {
      trivia: [
        { question: "מה הכוכב הקרוב ביותר לכדור הארץ?", answer: "השמש" },
        { question: "כמה רגליים יש לעכביש?", answer: "8 רגליים" },
        { question: "מהי בירת ישראל?", answer: "ירושלים" }
      ],
      word_search_words: ["שמש", "ירח", "כוכב", "ענן", "גשם", "רוח", "שלג", "קשת"],
      riddle: { question: "מה שייך לך אבל אחרים משתמשים בו יותר ממך?", answer: "השם שלך" },
      crossword: [
        { clue: "בירת ישראל", answer: "ירושלים" },
        { clue: "החיה המהירה בעולם", answer: "ברדלס" },
        { clue: "צבע השמיים", answer: "כחול" },
        { clue: "מלך החיות", answer: "אריה" },
        { clue: "ספר לימוד", answer: "מחברת" }
      ],
      tashchetz: [
        { clue: "בירת ישראל", answer: "ירושלים" },
        { clue: "מלך החיות", answer: "אריה" },
        { clue: "צבע השמיים", answer: "כחול" },
        { clue: "פרי אדום", answer: "תות" },
        { clue: "חודש אחרון", answer: "דצמבר" },
        { clue: "כלי כתיבה", answer: "עיפרון" },
        { clue: "חיית מחמד", answer: "כלב" },
        { clue: "כוכב לכת", answer: "מאדים" },
        { clue: "עונת חום", answer: "קיץ" },
        { clue: "כלי נגינה", answer: "חליל" }
      ]
    };

    // Merge parsed data with defaults to ensure all fields exist
    const funZoneParsed = cleanCitations(parseJSON(funZoneResult.data));
    const funZone = funZoneParsed ? {
      ...defaultFunZone,
      ...funZoneParsed
    } : defaultFunZone;

    // Helper to validate article content
    const isValidArticle = (doc: any) => {
      if (!doc || !doc.content) return false;
      if (Array.isArray(doc.content)) return doc.content.length > 0 && doc.content[0].length > 0;
      return typeof doc.content === 'string' && doc.content.length > 0;
    };

    // Assign topics to articles for regeneration context
    if (headline) headline.topic = headlineTopic;
    if (science) science.topic = scienceTopic;
    if (innovation) innovation.topic = innovationTopic;
    if (music) music.topic = musicTopic;
    if (nature) nature.topic = natureTopic;
    if (heritage) heritage.topic = heritageTopic;
    if (customArticle) customArticle.topic = customTopic;

    // Mark the two-page article
    const articleMap: Record<string, any> = { headline, science, innovation, music, nature, heritage };
    if (articleMap[twoPageSection]) {
      articleMap[twoPageSection].is_two_page = true;
    }

    // If recommendation failed, retry once with a generic prompt
    let finalRecommendation = (recommendation && recommendation.title) ? recommendation : null;
    if (!finalRecommendation) {
      console.log("[Recommendation] First attempt failed, retrying...");
      const retryResult = await generateSection(
        `חפש באינטרנט והמלץ על ספר אחד פופולרי ואהוב לילדים בגילאי 9-12. 
         חשוב: ודא שהספר קיים באמת ושהשם מדויק! חפש ברשת לפני שאתה עונה.
         בחר ספר מוכר ואהוב כמו: הארי פוטר ואבן החכמים, מטילדה, הנסיך הקטן, שודדת הספרים וכו'.`,
        RECOMMENDATION_SYSTEM_PROMPT
      );
      if (!retryResult.error) {
        const retryParsed = cleanCitations(parseJSON(retryResult.data));
        if (retryParsed && retryParsed.title) {
          finalRecommendation = retryParsed;
        }
      }
    }

    const edition = {
      generatedAt: new Date().toISOString(),
      headline: isValidArticle(headline) ? headline : defaultArticle("כתבת השער"),
      science: isValidArticle(science) ? science : defaultArticle("מדע וטכנולוגיה"),
      innovation: isValidArticle(innovation) ? innovation : defaultArticle("חדשנות וטכנולוגיה"),
      music: isValidArticle(music) ? music : defaultArticle("מוזיקה ותרבות"),
      nature: isValidArticle(nature) ? nature : defaultArticle("טבע וסביבה"),
      heritage: isValidArticle(heritage) ? heritage : defaultArticle("שבילי מורשת"),
      customArticle: (customTopic && isValidArticle(customArticle)) ? customArticle : null,
      funZone: funZone,
      recommendation: finalRecommendation,
      twoPageSection
    };


    return NextResponse.json(edition);
  } catch (error) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: `שגיאה כללית: ${message}` }, { status: 500 });
  }
}
