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
  "content": ["פסקה 1", "פסקה 2", "פסקה 3", "פסקה 4", "פסקה 5", "פסקה 6"],
  "image_prompt": "English description for illustration (used if image_type is ART)",
  "image_type": "REAL or ART",
  "image_search_query": "English search query (used if image_type is REAL)",
  "sidebar": {"title": "הידעת?", "content": "עובדה מעניינת"},
  "quote": "ציטוט מהכתבה",
  "teaser": "טיזר קצר לכתבה"
}
כללי סיווג תמונה (image_type):
- "REAL": אם הכתבה עוסקת באדם מפורסם אמיתי, מקום אמיתי, חיה ספציפית, ספר/יצירה אמיתית, או אירוע היסטורי. במקרה זה, כתוב ב-image_search_query שאילתת חיפוש באנגלית.
- "ART": אם הכתבה עוסקת ברעיון מופשט, תגלית מדעית כללית, או נושא שאין לו תמונה ספציפית. במקרה זה, כתוב ב-image_prompt תיאור מפורט באנגלית.
אסור להתחיל במילים "היום" או "השבוע". החזר JSON בלבד ללא טקסט נוסף.`;

// Perplexity API Config
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const MODEL = "sonar-pro";

function cleanText(text: string): string {
    return text.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}

function cleanCitations(obj: any): any {
    if (typeof obj === "string") return cleanText(obj);
    if (Array.isArray(obj)) return obj.map(cleanCitations);
    if (obj && typeof obj === "object") {
        const newObj: any = {};
        for (const key in obj) newObj[key] = cleanCitations(obj[key]);
        return newObj;
    }
    return obj;
}

function parseJSON(text: string) {
    let cleaned = text;
    try {
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === "object") return parsed;
    } catch { /* continue */ }
    cleaned = text.replace(/```json?\s*\n?/g, "").replace(/\n?\s*```/g, "").trim();
    try { return JSON.parse(cleaned); } catch { /* continue */ }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch { /* continue */ } }
    return null;
}

export async function POST(request: Request) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "PERPLEXITY_API_KEY not configured" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { type, topic, month, year } = body;

        if (!type) return NextResponse.json({ error: "Missing article type" }, { status: 400 });

        const hebrewMonths = [
            "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
            "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
        ];
        let monthName = month || hebrewMonths[new Date().getMonth()];
        let yearNum = year || new Date().getFullYear();
        const contextDate = `חודש ${monthName} ${yearNum}`;
        const ageNote = `לתלמידי ${AGE_CONTEXT}.`;
        const searchInstruction = "חפש באינטרנט מידע אמין, עדכני ומעניין.";

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

        let prompt = "";

        // Prompts aligned with generate-edition/route.ts
        switch (type) {
            case "headline":
                prompt = topic
                    ? `נושא: "${topic}". ${contextDate}. ${ageNote}
             ${searchInstruction} מצא מידע על הנושא הזה וכתוב כתבת שער מרתקת.
             אורך הכתבה: כ-550 מילים. 7-8 פסקאות. הוסף שדה "teaser" ל-JSON. החזר JSON בלבד.`
                    : `נושא: ${getRandomTheme(headlineThemes)}. ${contextDate}. ${ageNote}
             ${searchInstruction} מצא חדשה או עובדות מרתקות בנושא זה ("${getRandomTheme(headlineThemes)}") וכתוב עליו כתבת שער.
             חשוב: הנושא נבחר אקראית כדי לגוון. אם אין חדשות טריות ממש, מצא עובדות מעניינות וחדשניות בנושא.
             אורך הכתבה: כ-550 מילים. 7-8 פסקאות. הוסף שדה "teaser" ל-JSON. החזר JSON בלבד.`;
                break;
            case "science":
                prompt = topic
                    ? `נושא: "${topic}". ${contextDate}. ${ageNote}
             ${searchInstruction} מצא מידע מדעי עדכני וכתוב כתבה מדעית.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`
                    : `נושא: ${getRandomTheme(scienceThemes)}. ${contextDate}. ${ageNote}
             ${searchInstruction} חפש תגלית או מידע מעניין בנושא המדעי הזה וכתוב עליו.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`;
                break;
            case "innovation":
                prompt = topic
                    ? `נושא: "${topic}". ${contextDate}. ${ageNote}
             ${searchInstruction} מצא מידע על חידושים טכנולוגיים וכתוב כתבה.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`
                    : `נושא: ${getRandomTheme(innovationThemes)}. ${contextDate}. ${ageNote}
             ${searchInstruction} חפש המצאה או חידוש טכנולוגי בנושא זה וכתוב עליהם.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`;
                break;
            case "music":
                prompt = topic
                    ? `נושא: "${topic}". ${contextDate}. ${ageNote}
             ${searchInstruction} מצא מידע מעולם המוזיקה וכתוב כתבה.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`
                    : `נושא: ${getRandomTheme(musicThemes)}. ${contextDate}. ${ageNote}
             ${searchInstruction} חפש מידע מעניין ועובדות על נושא מוזיקלי זה וכתוב עליו כתבה.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`;
                break;
            case "nature":
                prompt = topic
                    ? `נושא: "${topic}". ${contextDate}. ${ageNote}
             ${searchInstruction} מצא עובדות וחדשות בנושא זה וכתוב כתבה.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`
                    : `נושא: ${getRandomTheme(natureThemes)}. ${contextDate}. ${ageNote}
             ${searchInstruction} חפש סיפור מעניין או עובדות מרתקות בנושא טבע זה וכתוב עליו.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`;
                break;
            case "heritage":
                prompt = topic
                    ? `נושא: "${topic}". ${contextDate}. ${ageNote}
             ${searchInstruction} מצא מידע היסטורי/מורשת וכתוב כתבה.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`
                    : `נושא: ${getRandomTheme(heritageThemes)}. ${contextDate}. ${ageNote}
             ${searchInstruction} חפש מידע היסטורי מעניין בנושא זה וכתוב עליו כתבה מעוררת השראה.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`;
                break;
            case "custom":
            case "customArticle":
                prompt = topic
                    ? `נושא: "${topic}". ${contextDate}. ${ageNote}
             ${searchInstruction} חפש מידע על הנושא המיוחד הזה וכתוב עליו כתבה.
             אורך: 550 מילים. 7-8 פסקאות. החזר JSON בלבד.`
                    : "";
                break;
            default:
                return NextResponse.json({ error: "Invalid article type" }, { status: 400 });
        }


        if (!prompt) return NextResponse.json({ error: "Empty prompt" }, { status: 400 });

        const response = await fetch(PERPLEXITY_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt },
                ],
                temperature: 0.2,
                max_tokens: 3000,
            }),
        });

        if (!response.ok) {
            throw new Error(`Perplexity API Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        const parsed = parseJSON(content);
        if (!parsed) throw new Error("Failed to parse JSON response");

        const cleaned = cleanCitations(parsed);
        // Ensure content is joined with newlines if array
        if (cleaned && Array.isArray(cleaned.content)) {
            cleaned.content = cleaned.content.join("\n\n");
        }
        // Re-assign topic
        cleaned.topic = topic;

        return NextResponse.json(cleaned);

    } catch (error) {
        console.error("Regeneration error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
