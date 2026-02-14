import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FALLBACK_MODEL = "gemini-2.5-flash-image";

// Timeout helper
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    return Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
    ]);
}

type ImageSuccess = { buffer: Buffer; mimeType: string };
type ImageError = { error: string; status: number };
type ImageResult = ImageSuccess | ImageError;

function isImageError(r: ImageResult): r is ImageError {
    return "error" in r;
}

async function callGeminiImageAPI(
    prompt: string,
    modelName: string,
    isComic: boolean
): Promise<ImageResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const noTextSuffix = "IMPORTANT: Do NOT include any text, letters, words, numbers, labels, captions, watermarks, or writing of any kind in the image. The image must be purely visual with zero text elements.";

    const enhancedPrompt = isComic
        ? `${prompt}. ${noTextSuffix}`
        : `photorealistic, cinematic lighting, highly detailed, realistic texture, 8k resolution, photography style, ${prompt}. ${noTextSuffix}`;

    console.log(`[ImageGen] Generating with ${modelName}...`);

    const response = await fetchWithTimeout(
        url,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancedPrompt }] }],
                generationConfig: { responseModalities: ["Image"] },
            }),
        },
        90000 // 90 second timeout
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ImageGen] ${modelName} error: ${response.status}`, errorText.substring(0, 300));
        return { error: `API error: ${response.status}`, status: response.status };
    }

    const data = await response.json();
    const candidates = data?.candidates;
    if (!candidates || candidates.length === 0) {
        return { error: "No candidates returned", status: 500 };
    }

    const parts = candidates[0]?.content?.parts;
    if (!parts || parts.length === 0) {
        return { error: "No parts returned", status: 500 };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((part: any) => part.inlineData);

    if (!imagePart?.inlineData) {
        return { error: "No image data in response", status: 500 };
    }

    const { mimeType, data: imageBase64 } = imagePart.inlineData;
    const buffer = Buffer.from(imageBase64, "base64");
    console.log(`[ImageGen] ${modelName} success! Size: ${buffer.length}, type: ${mimeType}`);
    return { buffer, mimeType };
}

export async function POST(request: Request) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json(
            { error: "GEMINI_API_KEY is not configured. Please set it in .env.local" },
            { status: 500 }
        );
    }

    try {
        const { prompt, model } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const requestedModel =
            model === "gemini-3-pro-image-preview" || model === "gemini-2.5-flash-image"
                ? model
                : FALLBACK_MODEL;

        const isComic = requestedModel === "gemini-3-pro-image-preview";

        // Try the requested model first
        let result: ImageResult = await callGeminiImageAPI(prompt, requestedModel, isComic).catch(
            (err): ImageError => ({
                error: err.message || "Unknown error",
                status: 500,
            })
        );

        // If the requested model failed and it's not already the fallback, try the fallback model
        if (isImageError(result) && requestedModel !== FALLBACK_MODEL) {
            console.log(
                `[ImageGen] ${requestedModel} failed (${result.error}), falling back to ${FALLBACK_MODEL}`
            );
            result = await callGeminiImageAPI(prompt, FALLBACK_MODEL, false).catch(
                (err): ImageError => ({
                    error: err.message || "Unknown error",
                    status: 500,
                })
            );
        }

        if (isImageError(result)) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return new NextResponse(new Uint8Array(result.buffer), {
            headers: {
                "Content-Type": result.mimeType || "image/png",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("[ImageGen] Image generation error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `שגיאה ביצירת תמונה: ${message}` }, { status: 500 });
    }
}
