import * as WebBrowser from "expo-web-browser";
import axios, { AxiosInstance } from "axios";
import {
  MALAnime,
  MALUser,
  MALSearchResponse,
  MALAnimeDetailsResponse,
  MALStatus,
  AuthInitResponse,
  KUJIRA_BACKEND_URL,
} from "./types";
import { getMALConfig, updateMALTokens, refreshTokensViaBackend, saveAuthState } from "./config";

// Important: This is required for web browser to close properly after auth
WebBrowser.maybeCompleteAuthSession();

const MAL_API_BASE = "https://api.myanimelist.net/v2";

/**
 * Create axios instance with MAL authentication
 */
async function createAuthenticatedClient(): Promise<AxiosInstance> {
  const config = await getMALConfig();
  
  if (!config || !config.accessToken) {
    throw new Error("Not authenticated with MyAnimeList");
  }

  // Check if token needs refresh
  const expiry = new Date(config.tokenExpiry);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiry.getTime() - now.getTime() < fiveMinutes) {
    // Token expired or about to expire, refresh it via backend
    await refreshTokensViaBackend();
    const refreshedConfig = await getMALConfig();
    if (!refreshedConfig) {
      throw new Error("Failed to refresh token");
    }
    config.accessToken = refreshedConfig.accessToken;
  }

  return axios.create({
    baseURL: MAL_API_BASE,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}

/**
 * Initiate OAuth2 authentication flow via Kujira backend
 * The backend handles PKCE and client credentials
 */
export async function initiateMALAuth(): Promise<WebBrowser.WebBrowserAuthSessionResult> {
  try {
    // Get auth URL from backend
    console.log("[MAL Auth] Requesting auth URL from backend...");
    
    const response = await axios.get<AuthInitResponse>(
      `${KUJIRA_BACKEND_URL}/auth/mal/init?client=app`
    );

    const { authUrl, state } = response.data;
    
    console.log("[MAL Auth] Got auth URL, state:", state);

    // Save state for validation later (optional, backend handles CSRF)
    await saveAuthState(state);

    // Open browser for user to authenticate
    // The callback will be handled by the backend, which will redirect to kujira-app://auth-callback
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      "kujira-app://auth-callback"
    );

    return result;
  } catch (error: any) {
    console.log("[MAL Auth] Failed to initiate auth:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "Failed to initiate authentication");
  }
}

/**
 * Check if backend MAL OAuth is configured
 */
export async function checkBackendStatus(): Promise<{ configured: boolean; message: string }> {
  try {
    const response = await axios.get(`${KUJIRA_BACKEND_URL}/auth/mal/status`);
    return response.data;
  } catch (error: any) {
    console.log("[MAL Auth] Failed to check backend status:", error.message);
    return { configured: false, message: "Backend not reachable" };
  }
}

/**
 * Get current user info
 */
export async function getUserInfo(): Promise<MALUser> {
  try {
    const client = await createAuthenticatedClient();
    const response = await client.get<MALUser>("/users/@me", {
      params: {
        fields: "id,name,picture,gender,birthday,location,joined_at",
      },
    });

    return response.data;
  } catch (error: any) {
    console.log("[MAL API] Get user info failed:", error.response?.data || error.message);
    throw new Error("Failed to get user info");
  }
}

/**
 * Search anime by title
 */
export async function searchAnime(title: string, limit: number = 10): Promise<MALAnime[]> {
  try {
    const client = await createAuthenticatedClient();
    const response = await client.get<MALSearchResponse>("/anime", {
      params: {
        q: title,
        limit,
        nsfw: true,
        fields: "id,title,main_picture,alternative_titles,num_episodes,status,mean,my_list_status",
      },
    });

    return response.data.data.map((item) => item.node);
  } catch (error: any) {
    console.log("[MAL API] Search anime failed:", error.response?.data || error.message);
    throw new Error("Failed to search anime");
  }
}

/**
 * Get anime details by ID
 */
export async function getAnimeDetails(animeId: number): Promise<MALAnimeDetailsResponse> {
  try {
    const client = await createAuthenticatedClient();
    const response = await client.get<MALAnimeDetailsResponse>(`/anime/${animeId}`, {
      params: {
        fields: "id,title,main_picture,alternative_titles,num_episodes,status,my_list_status",
      },
    });

    return response.data;
  } catch (error: any) {
    console.log("[MAL API] Get anime details failed:", error.response?.data || error.message);
    throw new Error("Failed to get anime details");
  }
}

/**
 * Update anime list status
 */
export async function updateAnimeListStatus(
  animeId: number,
  status?: MALStatus,
  score?: number,
  numEpisodesWatched?: number
): Promise<void> {
  try {
    const client = await createAuthenticatedClient();
    
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (score !== undefined) params.append("score", score.toString());
    if (numEpisodesWatched !== undefined) {
      params.append("num_watched_episodes", numEpisodesWatched.toString());
    }

    await client.patch(`/anime/${animeId}/my_list_status`, params.toString());

    console.log(`[MAL API] Updated anime ${animeId}:`, {
      status,
      score,
      numEpisodesWatched,
    });
  } catch (error: any) {
    console.log("[MAL API] Update anime list failed:", error.response?.data || error.message);
    throw new Error("Failed to update anime list");
  }
}

/**
 * Delete anime from list
 */
export async function deleteAnimeFromList(animeId: number): Promise<void> {
  try {
    const client = await createAuthenticatedClient();
    await client.delete(`/anime/${animeId}/my_list_status`);

    console.log(`[MAL API] Deleted anime ${animeId} from list`);
  } catch (error: any) {
    console.log("[MAL API] Delete anime failed:", error.response?.data || error.message);
    throw new Error("Failed to delete anime from list");
  }
}
