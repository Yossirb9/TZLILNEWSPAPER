export interface ArticleContent {
  title: string;
  subtitle: string;
  content: string;
  image_prompt: string;
  image_type?: "REAL" | "ART";
  image_search_query?: string;
  sidebar: {
    title: string;
    content: string;
  };
  quote: string;
  full_page_image_prompt?: string;
  custom_image_url?: string;
  teaser?: string;
  footer_comic: {
    yellow_character: string;
    red_character: string;
  };
  topic?: string;
  is_two_page?: boolean;
}

export interface FunZoneContent {
  trivia: {
    question: string;
    answer: string;
  }[];
  word_search_words: string[];
  riddle: {
    question: string;
    answer: string;
  };
  crossword: {
    clue: string;
    answer: string;
  }[];
  tashchetz?: {
    clue: string;
    answer: string;
  }[];
}

export interface WordPlacement {
  word: string;
  startRow: number;
  startCol: number;
  direction: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up";
}

export interface WordSearchGrid {
  grid: string[][];
  words: string[];
  placements: WordPlacement[];
}

export interface RecommendationContent {
  type: string; // ספר / הצגה / תוכנית / פודקאסט
  title: string;
  creator: string;
  description: string;
  age_range: string;
  image_prompt: string;
  image_type?: "REAL" | "ART";
  image_search_query?: string;
  why: string;
}

export interface Edition {
  headline: ArticleContent;
  science: ArticleContent;
  innovation: ArticleContent;
  music: ArticleContent;
  nature: ArticleContent;
  heritage: ArticleContent;
  customArticle?: ArticleContent;
  funZone: FunZoneContent;
  recommendation?: RecommendationContent;
  twoPageSection?: string;
  generatedAt: string;
}
