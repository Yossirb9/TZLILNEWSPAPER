import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

        const selectedModel = model === "gemini-3-pro-image-preview" || model === "gemini-2.5-flash-image"
            ? model
            : GEMINI_MODEL;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

        // If it's a comic (gemini-3-pro), we want less style enforcement to allow the prompt to control the layout (panels/bubbles)
        const isComic = selectedModel === "gemini-3-pro-image-preview";
        const enhancedPrompt = isComic
            ? prompt // Pass the prompt as is for the comic model, assuming the caller formatted it well
            : `photorealistic, cinematic lighting, highly detailed, realistic texture, 8k resolution, photography style, ${prompt}`;

        console.log(`[NanoBanana] Generating image with ${selectedModel}...`);

        const response = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: enhancedPrompt }],
                    },
                ],
                generationConfig: {
                    responseModalities: ["Image"],
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[NanoBanana] API error:", response.status, errorText.substring(0, 300));
            return NextResponse.json(
                { error: `Nano Banana API error: ${response.status}` },
                { status: 500 }
            );
        }

        const data = await response.json();

        // Extract image from response
        const candidates = data?.candidates;
        if (!candidates || candidates.length === 0) {
            console.error("[NanoBanana] No candidates in response");
            return NextResponse.json(
                { error: "No image generated - no candidates returned" },
                { status: 500 }
            );
        }

        const parts = candidates[0]?.content?.parts;
        if (!parts || parts.length === 0) {
            console.error("[NanoBanana] No parts in response");
            return NextResponse.json(
                { error: "No image generated - no parts returned" },
                { status: 500 }
            );
        }

        // Find the image part (inlineData)
        const imagePart = parts.find(
            (part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData
        );

        if (!imagePart || !imagePart.inlineData) {
            console.error("[NanoBanana] No image data in response parts");
            return NextResponse.json(
                { error: "No image data in response" },
                { status: 500 }
            );
        }

        const { mimeType, data: imageBase64 } = imagePart.inlineData;
        const buffer = Buffer.from(imageBase64, "base64");

        console.log(`[NanoBanana] Success! Image size: ${buffer.length}, type: ${mimeType}`);

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": mimeType || "image/png",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("[NanoBanana] Image generation error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `שגיאה ביצירת תמונה: ${message}` },
            { status: 500 }
        );
    }
}
