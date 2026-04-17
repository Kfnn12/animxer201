export interface AnimeResult {
  id: string;
  title: string;
  poster: string;
  type: string;
  duration: string;
  sub: string;
  dub: string;
}

export interface TrendingAnime {
  id: string;
  title: string;
  poster: string;
  description: string;
}

export interface AnimeInfo {
  title: string;
  description: string;
  poster: string;
  episodes: Episode[];
  recommended?: AnimeResult[];
}

export interface Episode {
  id: string;
  number: string;
  title: string;
}

export interface Server {
  id: string;
  serverId: string;
  type: string; // "sub" or "dub"
  name: string;
}

export interface NextAiringEpisode {
  airingAt: number;
  episode: number;
}

export interface AiringScheduleItem {
  title: string;
  poster: string;
  time: number;
  episode: number;
}
