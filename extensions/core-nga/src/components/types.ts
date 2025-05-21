export type Credit = {
  name: string;
  roles?: string[];
}

export type Trophy = string[];

export type ExtData = {
  score?: number;
  rating?: string;
  views?: number;
  faves?: number;
  author_comments?: string;
  credits?: Credit[];
  trophies?: Trophy[];
}
