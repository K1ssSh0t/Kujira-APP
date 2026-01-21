import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import axios, { AxiosInstance } from "axios";
import {
  MALAnime,
  MALUser,
  MALSearchResponse,
  MALAnimeDetailsResponse,
  OAuth2TokenResponse,
  PKCEChallenge,
  MALStatus,
} from "./types";
import { getMALConfig, updateMALTokens } from "./config";

// Important: This is required for web browser to close properly after auth
WebBrowser.maybeCompleteAuthSession();

const MAL_AUTH_URL = "https://myanimelist.net/v1/oauth2/authorize";
const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
const MAL_API_BASE = "https://api.myanimelist.net/v2";

/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE(): Promise<PKCEChallenge> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const codeVerifier = base64URLEncode(randomBytes);
  
  // For MAL, we use plain challenge (not SHA256)
  const codeChallenge = codeVerifier;

  return { codeVerifier, codeChallenge };
}

function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

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
    // Token expired or about to expire, refresh it
    await refreshAccessToken();
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
 * Initiate OAuth2 authentication flow
 */
export async function initiateMALAuth(
  clientId: string,
  pkce: PKCEChallenge
): Promise<WebBrowser.WebBrowserAuthSessionResult> {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "kujira-app",
    path: "auth-callback",
  });

  console.log("[MAL Auth] Redirect URI:", redirectUri);
  console.log("[MAL Auth] Code Challenge:", pkce.codeChallenge);

  const authUrl = `${MAL_AUTH_URL}?` +
    `client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code_challenge=${pkce.codeChallenge}` +
    `&code_challenge_method=plain` +
    `&state=${Math.random().toString(36)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  return result;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string
): Promise<OAuth2TokenResponse> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "kujira-app",
      path: "auth-callback",
    });

    console.log("[MAL Auth] Exchange params:");
    console.log("  - Redirect URI:", redirectUri);
    console.log("  - Code (first 10 chars):", code.substring(0, 10));
    console.log("  - Code Verifier (first 10 chars):", codeVerifier.substring(0, 10));
    console.log("  - Client ID:", clientId);
    console.log("  - Has Client Secret:", !!clientSecret);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    if (clientSecret) {
      params.append("client_secret", clientSecret);
    }
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", codeVerifier);

    console.log("[MAL Auth] Exchanging code for token...");
    console.log("[MAL Auth] POST to:", MAL_TOKEN_URL);

    const response = await axios.post<OAuth2TokenResponse>(
      MAL_TOKEN_URL,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("[MAL Auth] Token exchange successful");
    return response.data;
  } catch (error: any) {
    console.log("[MAL Auth] ❌ Token exchange failed:");
    console.log("  - Status:", error.response?.status);
    console.log("  - Data:", error.response?.data);
    console.log("  - Headers:", error.response?.headers);
    console.log("  - Message:", error.message);
    console.log("  - Full error:", JSON.stringify(error.response?.data, null, 2));
    
    // Throw a more detailed error
    const errorMsg = error.response?.data?.error_description || 
                     error.response?.data?.error || 
                     error.message || 
                     "Unknown error";
    throw new Error(`Token exchange failed: ${errorMsg}`);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<void> {
  try {
    const config = await getMALConfig();
    
    if (!config || !config.refreshToken) {
      throw new Error("No refresh token available");
    }

    const params = new URLSearchParams();
    params.append("client_id", config.clientId);
    params.append("client_secret", config.clientSecret);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", config.refreshToken);

    console.log("[MAL Auth] Refreshing access token...");

    const response = await axios.post<OAuth2TokenResponse>(
      MAL_TOKEN_URL,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    await updateMALTokens(
      response.data.access_token,
      response.data.refresh_token,
      response.data.expires_in,
      config.username
    );

    console.log("[MAL Auth] Token refreshed successfully");
  } catch (error: any) {
    console.log("[MAL Auth] ❌ Token refresh failed:", error.response?.data || error.message);
    throw new Error("Failed to refresh access token");
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
    console.log("[MAL API] ❌ Get user info failed:", error.response?.data || error.message);
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
    console.log("[MAL API] ❌ Search anime failed:", error.response?.data || error.message);
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
    console.log("[MAL API] ❌ Get anime details failed:", error.response?.data || error.message);
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
    console.log("[MAL API] ❌ Update anime list failed:", error.response?.data || error.message);
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
    console.log("[MAL API] ❌ Delete anime failed:", error.response?.data || error.message);
    throw new Error("Failed to delete anime from list");
  }
}
