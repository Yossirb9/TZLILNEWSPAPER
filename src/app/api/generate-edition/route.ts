import { NextResponse } from "next/server";

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

// Perplexity API Config
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const MODEL = "sonar-pro"; // Powerful model with search capabilities

// Clean citations like [1], [2] from text
function cleanText(text: string): string {
  return text.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}

async function generateSection(
  userPrompt: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<{ data: string; error?: string }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { data: "{}", error: "PERPLEXITY_API_KEY not configured" };
  }

  try {
    console.log(`[Perplexity] Generating with prompt: "${userPrompt.substring(0, 50)}..."`);

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey} `,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2, // Low temperature for factual accuracy
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Perplexity] Error ${response.status}: ${errorText} `);

      if (response.status === 429) {
        return { data: "{}", error: "Rate limit exceeded (429)" };
      }
      return { data: "{}", error: `HTTP ${response.status}: ${errorText} ` };
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "{}";

    // Perplexity might return markdown code blocks, strip them
    if (content.length > 10) {
      // Clean citations from the raw string *before* parsing, just in case
      // But safer to do it after parsing to avoid breaking JSON structure constraints
      // Actually, citation numbers often appear inside string values. Cleaning them here is risky if they are inside keys or format.
      // Let's parse first, then map/clean.
      return { data: content };
    }

    return { data: "{}", error: "Empty response from Perplexity" };

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Perplexity] Request failed: ${errMsg} `);
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
    .replace(/```json ?\s *\n ?/g, "")
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

// Function to recursively clean citations from an object
function cleanCitations(obj: any): any {
  if (typeof obj === "string") {
    return cleanText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanCitations);
  }
  if (obj && typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = cleanCitations(obj[key]);
    }
    return newObj;
  }
  return obj;
}

export async function POST(request: Request) {
  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json(
      { error: "PERPLEXITY_API_KEY is not configured. Please set it in .env.local" },
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
    const recommendationTopic: string = body.recommendationTopic || "";

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

    // Prompts - explicitly asking Perplexity to SEARCH
    const searchInstruction = "חפש באינטרנט מידע אמין, עדכני ומעניין.";

    // Reduced Word Count Prompts (400 words)
    // Choose a random article to be 2 pages (different each generation)
    const articleKeys = ["headline", "science", "innovation", "music", "nature", "heritage"];
    const twoPageSection = articleKeys[Math.floor(Math.random() * articleKeys.length)];
    const getTwoPageInstruction = (section: string) => section === twoPageSection
      ? `אורך הכתבה: כ-800 מילים (כתבה ארוכה במיוחד!). חלק ל-12 פסקאות מפורטות.`
      : `אורך הכתבה: כ-550 מילים. חלק ל-7-8 פסקאות.`;

    // Random Sub-Topics arrays for variety
    const headlineThemes = [
      "חקר החלל והמאדים", "גילויים חדשים במעמקי האוקיינוס", "רובוטים שעוזרים לבני אדם",
      "המצאות ירוקות לשמירה על כדור הארץ", "דינוזאורים ותגליות פרה-היסטוריות",
      "בינה מלאכותית ברפואה", "חיות נדירות שהתגלו מחדש", "תקשורת בין בעלי חיים",
      "גילוי עתיקות מרגש בישראל", "התקדמות בחקר המוח", "אנרגיה מתחדשת ושמש"
    ];
    const scienceThemes = [
      "אסטרונומיה וכוכבים רחוקים", "העולם המופלא של החרקים", "כימיה במטבח",
      "גוף האדם והמוח", "פיזיקה וניסויים מעניינים", "חיידקים טובים ורעים",
      "הרי געש ורעידות אדמה", "מזג האוויר והאקלים", "הנדסה גנטית (הסבר לילדים)"
    ];
    const innovationThemes = [
      "רחפנים ושימושים חדשים", "הדפסת תלת-ממד", "מכוניות אוטונומיות",
      "טכנולוגיה בבית הספר", "משחקי מחשב ופיתוח", "מציאות מדומה ורבודה",
      "סייבר ובטיחות ברשת", "רובוטים בחקלאות", "המצאות ישראליות חדשות"
    ];
    const musicThemes = [
      "מוצרט והילדות שלו", "איך עובד פסנתר?", "ההיסטוריה של הגיטרה החשמלית",
      "תזמורת סימפונית - הכרת הכלים", "מוזיקה אלקטרונית ואיך יוצרים אותה",
      "הביטלס והשפעתם", "מוזיקה מסרטים מפורסמים", "כלי נגינה עתיקים",
      "הקול האנושי ומקהלות"
    ];
    const natureThemes = [
      "נדידת הציפורים", "לווייתנים ותקשורת במים", "יערות הגשם באמזונס",
      "חיות לילה", "הסוואה בטבע", "צמחים טורפים",
      "שוניות האלמוגים", "חיי הנמלים והדבורים", "חיות במדבר הישראלי"
    ];
    const heritageThemes = [
      "ירושלים העתיקה והחומות", "מצדה והסיפור שלה", "דוד בן גוריון והנגב",
      "הכרזת העצמאות", "אליעזר בן יהודה ושפת העברית", "רכבת העמק ההיסטורית",
      "נמל קיסריה העתיק", "חומה ומגדל", "תולדות הכנסת"
    ];

    const getRandomTheme = (themes: string[]) => themes[Math.floor(Math.random() * themes.length)];

    const headlinePrompt = headlineTopic
      ? `כתוב כתבת שער מרתקת על: "${headlineTopic}".
       חובה: הוסף שדה 'full_page_image_prompt' עם תיאור מפורט באנגלית לתמונה אנכית (poster style) מרהיבה שקשורה לנושא.
       ${contextDate}. ${ageNote}
         ${searchInstruction} מצא מידע על הנושא הזה וכתוב כתבת שער מרתקת.
         ${getTwoPageInstruction("headline")}
         הוסף שדה "teaser" ל-JSON: פסקה מסקרנת של 30-40 מילים.
         החזר JSON בלבד.`
      : `נושא: ${getRandomTheme(headlineThemes)}. ${contextDate}. ${ageNote}
         ${searchInstruction} מצא חדשה או עובדות מרתקות בנושא זה ("${getRandomTheme(headlineThemes)}") וכתוב עליו כתבת שער.
         חשוב: הנושא נבחר אקראית כדי לגוון. אם אין חדשות טריות ממש, מצא עובדות מעניינות וחדשניות בנושא.
         ${getTwoPageInstruction("headline")}
         הוסף שדה "teaser" ל-JSON: פסקה מסקרנת של 30-40 מילים.
         החזר JSON בלבד.`;

    const sciencePrompt = scienceTopic
      ? `נושא: "${scienceTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} מצא מידע מדעי עדכני בנושא זה וכתוב כתבה מדעית מרתקת.
         ${getTwoPageInstruction("science")}
         החזר JSON בלבד.`
      : `נושא: ${getRandomTheme(scienceThemes)}. ${contextDate}. ${ageNote}
         ${searchInstruction} חפש תגלית או מידע מעניין בנושא המדעי הזה וכתוב עליו.
         ${getTwoPageInstruction("science")}
         החזר JSON בלבד.`;

    const innovationPrompt = innovationTopic
      ? `נושא: "${innovationTopic}". ${contextDate}. ${ageNote}
         ${searchInstruction} מצא מידע על חידושים טכנולוגיים בנושא זה וכתוב כתבה.
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
    console.log("Starting batch generation with Perplexity...");

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

    // Batch 4: custom article + recommendation
    let customResult: { data: string; error?: string } = { data: "{}" };
    const recommendationResultPromise = generateSection(recommendationPrompt, RECOMMENDATION_SYSTEM_PROMPT);
    if (customArticlePrompt) {
      customResult = await generateSection(customArticlePrompt);
      if (customResult.error) errors.push(`מיוחדת: ${customResult.error}`);
    }
    const recommendationResult = await recommendationResultPromise;
    if (recommendationResult.error) errors.push(`המלצות: ${recommendationResult.error}`);
    await delay(500);

    // Parse and CLEAN citations
    const headline = cleanCitations(parseJSON(headlineResult.data));
    const science = cleanCitations(parseJSON(scienceResult.data));
    const innovation = cleanCitations(parseJSON(innovationResult.data));
    const music = cleanCitations(parseJSON(musicResult.data));
    const nature = cleanCitations(parseJSON(natureResult.data));
    const heritage = cleanCitations(parseJSON(heritageResult.data));
    const customArticle = customTopic ? cleanCitations(parseJSON(customResult.data)) : null;
    const recommendation = cleanCitations(parseJSON(recommendationResult.data));

    // Collect topics for context
    const articles = [headline, science, innovation, music, nature, heritage, customArticle].filter(a => a && a.title);
    const articlesContext = articles.map(a => `"${a.title}"`).join(", ");

    // Choose one article for the comic
    const comicSource = customArticle || headline || articles[0];
    const comicContext = comicSource
      ? `העלילה חייבת להיות הרפתקה מותחת (אקשן/בילוש/תעלומה) המבוססת על הכתבה: "${comicSource.title}" - ${comicSource.subtitle || ""}.`
      : "";

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
      if (doc && Array.isArray(doc.content)) {
        doc.content = doc.content.join("\n\n");
      }
    });

    // Fallbacks
    const defaultArticle = (title: string) => ({
      title: `${title} 📰`,
      subtitle: "תוכן זה לא נוצר בגלל עומס על שרת ה-AI",
      content: "⏳ המדור הזה לא נוצר כרגע. נסו שוב מאוחר יותר.\n\n" + (errors.length > 0 ? "שגיאות: " + errors.join(", ") : ""),
      image_prompt: "colorful newspaper placeholder illustration",
      sidebar: { title: "💡 טיפ", content: "נסו שוב מאוחר יותר." },
      quote: "סבלנות היא מפתח להצלחה! 🔑",
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
      headline: (headline && headline.content) ? headline : defaultArticle("כתבת השער"),
      science: (science && science.content) ? science : defaultArticle("מדע וטבע"),
      innovation: (innovation && innovation.content) ? innovation : defaultArticle("חדשנות וטכנולוגיה"),
      music: (music && music.content) ? music : defaultArticle("מוזיקה"),
      nature: (nature && nature.content) ? nature : defaultArticle("עולם החי"),
      heritage: (heritage && heritage.content) ? heritage : defaultArticle("שבילי מורשת"),
      customArticle: (customTopic && customArticle && customArticle.content) ? customArticle : undefined,
      funZone: funZone || defaultFunZone,
      recommendation: finalRecommendation || undefined,
      twoPageSection,
      generatedAt: now.toISOString(),
    };

    return NextResponse.json(edition);
  } catch (error) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: `שגיאה כללית: ${message}` }, { status: 500 });
  }
}
