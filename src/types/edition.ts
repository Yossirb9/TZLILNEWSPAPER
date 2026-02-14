export interface ArticleContent {
  title: string;
  subtitle: string;
  content: string;
  image_prompt: string;
  sidebar: {
    title: string;
    content: string;
  };
  quote: string;
  teaser?: string;
  footer_comic: {
    yellow_character: string;
    red_character: string;
  };
}

export interface FunZoneContent {
  trivia: {
    question: string;
    answer: string;
  }[];
  word_search_words: string[];
  find_waldo_prompt: string;
  riddle: {
    question: string;
    answer: string;
  };
}

export interface ComicPanel {
  panel_number: number;
  scene_description: string;
  characters: string[];
  dialogue: {
    character: string;
    text: string;
  }[];
  sound_effect?: string;
}

export interface ComicContent {
  title: string;
  image_prompt: string;
  panels: ComicPanel[];
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

export interface Edition {
  headline: ArticleContent;
  science: ArticleContent;
  innovation: ArticleContent;
  music: ArticleContent;
  nature: ArticleContent;
  heritage: ArticleContent;
  customArticle?: ArticleContent;
  funZone: FunZoneContent;
  comic: ComicContent;
  generatedAt: string;
}
