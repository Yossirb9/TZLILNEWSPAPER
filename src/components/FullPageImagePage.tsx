
import React from 'react';
import MagazinePage from './MagazinePage';
import ArticleImage from './ArticleImage';

interface FullPageImagePageProps {
    prompt: string;
    pageNumber: number;
    overlayText?: string; // Optional quote or "Did you know?"
}

export default function FullPageImagePage({ prompt, pageNumber, overlayText }: FullPageImagePageProps) {
    return (
        <MagazinePage pageNumber={pageNumber} noPadding>
            <div className="w-full h-full relative">
                <ArticleImage
                    prompt={prompt} // The prompt should ask for a vertical poster
                    alt="Full page illustration"
                    className="w-full h-full object-cover"
                    model="gemini-3-pro-image-preview" // Use best model for full page
                />

                {/* Optional Overlay Text */}
                {overlayText && (
                    <div className="absolute bottom-16 left-8 right-8 bg-black/60 text-white p-6 rounded-xl backdrop-blur-sm border-l-4 border-yellow-400">
                        <p className="text-xl md:text-2xl font-bold text-center leading-relaxed">
                            "{overlayText}"
                        </p>
                    </div>
                )}

                {/* Decorative elements */}
                <div className="absolute top-4 right-4 bg-white/90 text-black px-4 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-widest">
                    POSTER
                </div>
            </div>
        </MagazinePage>
    );
}
