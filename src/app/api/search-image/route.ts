import { NextResponse } from "next/server";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

export async function POST(request: Request) {
    if (!TAVILY_API_KEY) {
        return NextResponse.json(
            { error: "TAVILY_API_KEY is not configured" },
            { status: 500 }
        );
    }

    try {
        const { query } = await request.json();

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        console.log(`[SearchImage] Searching Tavily for: "${query}"`);

        // Call Tavily Search API with include_images
        const tavilyResponse = await fetch(TAVILY_SEARCH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: `${query} high resolution -clipart -cartoon`,
                search_depth: "basic",
                include_images: true,
                include_image_descriptions: true,
                max_results: 5,
            }),
        });

        if (!tavilyResponse.ok) {
            const errorText = await tavilyResponse.text();
            console.error("[SearchImage] Tavily API error:", tavilyResponse.status, errorText.substring(0, 300));
            return NextResponse.json(
                { error: `Tavily API error: ${tavilyResponse.status}` },
                { status: 500 }
            );
        }

        const data = await tavilyResponse.json();

        // Extract images from Tavily response
        const images = data.images;
        if (!images || images.length === 0) {
            console.log("[SearchImage] No images found by Tavily");
            return NextResponse.json({ error: "No images found" }, { status: 404 });
        }

        // Get the first valid image URL
        // Tavily returns images as array of { url, description } or just URLs
        let imageUrl: string | null = null;
        for (const img of images) {
            const url = typeof img === "string" ? img : img.url;
            if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                // Skip SVGs and tiny icons
                if (url.endsWith(".svg") || url.includes("favicon") || url.includes("logo")) {
                    continue;
                }
                imageUrl = url;
                break;
            }
        }

        if (!imageUrl) {
            console.log("[SearchImage] No valid image URLs found");
            return NextResponse.json({ error: "No valid images found" }, { status: 404 });
        }

        console.log(`[SearchImage] Found image: ${imageUrl}`);

        // Proxy the image to avoid CORS issues
        const imageResponse = await fetch(imageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "image/*",
            },
        });

        if (!imageResponse.ok) {
            // If proxy fails, return the URL directly for the client to try
            return NextResponse.json({ imageUrl }, { status: 200 });
        }

        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
        const buffer = Buffer.from(await imageResponse.arrayBuffer());

        console.log(`[SearchImage] Proxied image. Size: ${buffer.length}, Type: ${contentType}`);

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("[SearchImage] Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: `Image search error: ${message}` },
            { status: 500 }
        );
    }
}
