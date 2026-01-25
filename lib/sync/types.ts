// MyAnimeList Sync Types

export type SyncProvider = "myanimelist";

// Backend API URL - change this to your deployed Kujira backend
export const KUJIRA_BACKEND_URL = "https://kujira.unusualoticramo.workers.dev";

export interface MALConfig {
    // Note: clientId and clientSecret are no longer stored client-side
    // They are now managed by the Kujira backend
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

// Backend auth init response
export interface AuthInitResponse {
    authUrl: string;
    state: string;
}

// Backend token response
export interface BackendTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
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
