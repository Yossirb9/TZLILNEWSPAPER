"use client";

import { RecommendationContent } from "@/types/edition";
import MagazinePage from "./MagazinePage";
import ArticleImage from "./ArticleImage";

interface RecommendationPageProps {
    recommendation: RecommendationContent;
    pageNumber: number;
}

const typeIcons: Record<string, string> = {
    "ספר": "📚",
    "הצגה": "🎭",
    "תוכנית": "📺",
    "פודקאסט": "🎧",
};

export default function RecommendationPage({ recommendation, pageNumber }: RecommendationPageProps) {
    const icon = typeIcons[recommendation.type] || "⭐";

    return (
        <MagazinePage pageNumber={pageNumber}>
            <div className="recommendation-page h-full flex flex-col">
                {/* Header Banner */}
                <div className="shrink-0 text-center mb-4">
                    <div
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl shadow-lg"
                        style={{
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "white",
                        }}
                    >
                        <span className="text-3xl">🌟</span>
                        <h1 className="text-2xl font-black tracking-wide">פינת ההמלצה</h1>
                        <span className="text-3xl">🌟</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center gap-5">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-4xl">{icon}</span>
                        <span
                            className="text-lg font-bold px-4 py-1 rounded-full shadow-sm"
                            style={{
                                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                                color: "white",
                            }}
                        >
                            {recommendation.type}
                        </span>
                    </div>

                    {/* Image */}
                    <div className="w-[65%] mx-auto">
                        <ArticleImage
                            prompt={recommendation.image_prompt || `Colorful illustration for ${recommendation.type}: ${recommendation.title}`}
                            alt={recommendation.title}
                            className="w-full aspect-[4/3] object-cover rounded-2xl shadow-xl border-4 border-white"
                            model="gemini-3-pro-image-preview"
                            imageType={recommendation.image_type}
                            searchQuery={recommendation.image_search_query}
                        />
                    </div>

                    {/* Title & Creator */}
                    <div className="text-center px-6">
                        <h2 className="text-3xl font-black text-gray-800 mb-1 leading-tight">
                            {recommendation.title}
                        </h2>
                        <p className="text-lg font-semibold text-purple-700">
                            {recommendation.creator}
                        </p>
                    </div>

                    {/* Description Card */}
                    <div
                        className="mx-6 p-5 rounded-xl shadow-md border-2 text-center"
                        style={{
                            backgroundColor: "#fef9ff",
                            borderColor: "#e9d5ff",
                        }}
                    >
                        <p className="text-base text-gray-700 leading-relaxed font-medium">
                            {recommendation.description}
                        </p>
                    </div>

                    {/* Why Section */}
                    <div className="flex items-center gap-3 mx-6 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                        <span className="text-3xl shrink-0">💡</span>
                        <div>
                            <h3 className="font-bold text-yellow-800 text-sm mb-1">למה כדאי?</h3>
                            <p className="text-sm text-yellow-900 font-medium">{recommendation.why}</p>
                        </div>
                    </div>

                    {/* Spacer */}
                    <div className="mt-auto mb-2" />
                </div>
            </div>
        </MagazinePage>
    );
}
