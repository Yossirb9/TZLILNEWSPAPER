import { ComicContent } from "@/types/edition";
import MagazinePage from "./MagazinePage";
import ArticleImage from "./ArticleImage";

interface ComicPageProps {
  comic: ComicContent;
  pageNumber: number;
}

export default function ComicPage({ comic, pageNumber }: ComicPageProps) {
  return (
    <MagazinePage pageNumber={pageNumber} noPadding>
      <div className="comic-page h-full w-full relative group">

        {/* Title Overlay - absolute top */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-6 bg-gradient-to-b from-white/90 via-white/70 to-transparent">
          <div className="flex items-center justify-center gap-2 text-2xl font-black text-gray-800 drop-shadow-sm border-2 border-black/10 bg-white/80 rounded-full py-2 px-6 w-fit mx-auto backdrop-blur-sm">
            <span>💬</span>
            <span>{comic.title}</span>
            <span>💬</span>
          </div>
        </div>

        {/* Full page comic image - fills 100% */}
        <div className="w-full h-full relative rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm transition-all duration-300 group-hover:shadow-md">
          <ArticleImage
            prompt={comic.image_prompt}
            alt={`קומיקס: ${comic.title}`}
            className="w-full h-full object-cover"
            model="gemini-3-pro-image-preview"
          />
        </div>
      </div>
    </MagazinePage>
  );
}
