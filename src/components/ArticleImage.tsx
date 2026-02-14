"use client";

import { useState, useEffect, useCallback } from "react";

interface ArticleImageProps {
    prompt: string;
    alt: string;
    className?: string;
    illustrationType?: boolean;
    model?: string;
}

export default function ArticleImage({
    prompt,
    alt,
    className = "",
    model,
}: ArticleImageProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const generateImage = useCallback(async () => {
        if (!prompt) return;

        let cancelled = false;
        try {
            setLoading(true);
            setError(false);

            // Revoke old URL if exists
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
                setImageUrl(null);
            }

            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, model }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const blob = await response.blob();
            if (cancelled) return;

            const url = URL.createObjectURL(blob);
            setImageUrl(url);
            setLoading(false);
        } catch (err) {
            console.error("Image generation failed:", err);
            if (!cancelled) {
                setError(true);
                setLoading(false);
            }
        }
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt, model]); // imageUrl is not a dependency for generation logic

    useEffect(() => {
        generateImage();
        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prompt]);

    const handleRegenerate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        generateImage();
    };

    if (!prompt) return null;

    if (error) {
        return (
            <div className={`bg-gray-50 flex flex-col items-center justify-center text-gray-400 p-4 rounded-xl border border-gray-200 ${className} group relative`}>
                <span className="text-2xl mb-1">🖼️</span>
                <span className="text-center text-xs">אין תמונה</span>
                <button
                    onClick={handleRegenerate}
                    className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-white text-xs z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="נסה שוב"
                >
                    🔄
                </button>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-gray-100 rounded-xl ${className} group`}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse z-20">
                    <span className="text-2xl">🎨</span>
                </div>
            )}

            {/* Regenerate Button - Visible on Hover */}
            {!loading && (
                <button
                    onClick={handleRegenerate}
                    className="absolute top-3 right-3 bg-white/80 p-2 rounded-full shadow-md hover:bg-white text-gray-700 z-30 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                    title="צור תמונה מחדש"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            )}

            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-700 ${loading ? "opacity-0" : "opacity-100"}`}
                />
            )}
        </div>
    );
}
