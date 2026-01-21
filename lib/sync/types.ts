// MyAnimeList Sync Types

export type SyncProvider = "myanimelist";

export interface MALConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string; // ISO date string
  username?: string;
}

export interface SyncConfig {
  provider: SyncProvider;
  mal: MALConfig;
  lastSyncAt?: string; // ISO date string
  autoSync: boolean;
}

// MyAnimeList API Types
export interface MALAnime {
  id: number;
  title: string;
  main_picture?: {
    medium?: string;
    large?: string;
  };
  alternative_titles?: {
    synonyms?: string[];
    en?: string;
    ja?: string;
  };
  num_episodes?: number;
  status?: string;
  mean?: number;
  my_list_status?: {
    status: MALStatus;
    score: number;
    num_episodes_watched: number;
    is_rewatching: boolean;
    updated_at: string;
  };
}

export type MALStatus = 
  | "watching" 
  | "completed" 
  | "on_hold" 
  | "dropped" 
  | "plan_to_watch";

export interface MALUser {
  id: number;
  name: string;
  picture?: string;
  gender?: string;
  birthday?: string;
  location?: string;
  joined_at?: string;
}

export interface MALSearchResponse {
  data: Array<{
    node: MALAnime;
  }>;
  paging?: {
    next?: string;
    previous?: string;
  };
}

export interface MALAnimeDetailsResponse {
  id: number;
  title: string;
  main_picture?: {
    medium?: string;
    large?: string;
  };
  alternative_titles?: {
    synonyms?: string[];
    en?: string;
    ja?: string;
  };
  num_episodes?: number;
  status?: string;
  my_list_status?: {
    status: MALStatus;
    score: number;
    num_episodes_watched: number;
  };
}

// Matching Types
export interface AnimeMatch {
  malId: number;
  title: string;
  titleEN?: string;
  titleJP?: string;
  score: number; // 0-1 confidence score
  numEpisodes?: number;
}

// Sync Result Types
export interface SyncResult {
  success: boolean;
  message: string;
  uploaded?: string[];
  updated?: string[];
  errors?: string[];
}

// OAuth2 Types
export interface OAuth2TokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
}
