import AsyncStorage from "@react-native-async-storage/async-storage";
import { SyncConfig, MALConfig, KUJIRA_BACKEND_URL } from "./types";
import axios from "axios";

const SYNC_CONFIG_KEY = "@kujira/sync_config";
const AUTH_STATE_KEY = "@kujira/auth_state";

/**
 * Save auth state temporarily during OAuth flow
 */
export async function saveAuthState(state: string): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_STATE_KEY, state);
  } catch (error) {
    console.log("[Sync Config] Failed to save auth state:", error);
    throw error;
  }
}

/**
 * Get auth state from temporary storage
 */
export async function getAuthState(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_STATE_KEY);
  } catch (error) {
    console.log("[Sync Config] Failed to get auth state:", error);
    return null;
  }
}

/**
 * Clear auth state after OAuth flow completes
 */
export async function clearAuthState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_STATE_KEY);
  } catch (error) {
    console.log("[Sync Config] Failed to clear auth state:", error);
  }
}

/**
 * Load sync configuration from AsyncStorage
 */
export async function loadSyncConfig(): Promise<SyncConfig | null> {
  try {
    const configJson = await AsyncStorage.getItem(SYNC_CONFIG_KEY);
    if (!configJson) {
      return null;
    }
    return JSON.parse(configJson) as SyncConfig;
  } catch (error) {
    console.log("[Sync Config] Failed to load config:", error);
    return null;
  }
}

/**
 * Save sync configuration to AsyncStorage
 */
export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  try {
    const configJson = JSON.stringify(config);
    await AsyncStorage.setItem(SYNC_CONFIG_KEY, configJson);
  } catch (error) {
    console.log("[Sync Config] Failed to save config:", error);
    throw error;
  }
}

/**
 * Update MAL tokens in config
 */
export async function updateMALTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  username?: string
): Promise<void> {
  try {
    const config = await loadSyncConfig();
    
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);

    const updatedConfig: SyncConfig = {
      provider: "myanimelist",
      mal: {
        accessToken,
        refreshToken,
        tokenExpiry: expiryDate.toISOString(),
        username: username || config?.mal?.username,
      },
      lastSyncAt: config?.lastSyncAt,
      autoSync: config?.autoSync ?? true,
    };

    await saveSyncConfig(updatedConfig);
  } catch (error) {
    console.log("[Sync Config] Failed to update tokens:", error);
    throw error;
  }
}

/**
 * Refresh tokens via Kujira backend
 */
export async function refreshTokensViaBackend(): Promise<void> {
  try {
    const config = await loadSyncConfig();
    
    if (!config?.mal?.refreshToken) {
      throw new Error("No refresh token available");
    }

    console.log("[Sync Config] Refreshing tokens via backend...");

    const response = await axios.post(
      `${KUJIRA_BACKEND_URL}/auth/mal/refresh`,
      { refresh_token: config.mal.refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );

    await updateMALTokens(
      response.data.access_token,
      response.data.refresh_token,
      response.data.expires_in,
      config.mal.username
    );

    console.log("[Sync Config] Tokens refreshed successfully");
  } catch (error) {
    console.log("[Sync Config] Failed to refresh tokens:", error);
    throw error;
  }
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(): Promise<void> {
  try {
    const config = await loadSyncConfig();
    if (!config) return;

    config.lastSyncAt = new Date().toISOString();
    await saveSyncConfig(config);
  } catch (error) {
    console.log("[Sync Config] Failed to update last sync:", error);
  }
}

/**
 * Clear all sync configuration (logout)
 */
export async function clearSyncConfig(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SYNC_CONFIG_KEY);
  } catch (error) {
    console.log("[Sync Config] Failed to clear config:", error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const config = await loadSyncConfig();
    if (!config || !config.mal.accessToken) {
      return false;
    }

    // Check if token is expired
    const expiry = new Date(config.mal.tokenExpiry);
    const now = new Date();
    
    // Consider expired if less than 5 minutes remaining
    const fiveMinutes = 5 * 60 * 1000;
    return expiry.getTime() - now.getTime() > fiveMinutes;
  } catch (error) {
    console.log("[Sync Config] Failed to check auth:", error);
    return false;
  }
}

/**
 * Get MAL config
 */
export async function getMALConfig(): Promise<MALConfig | null> {
  try {
    const config = await loadSyncConfig();
    return config?.mal || null;
  } catch (error) {
    console.log("[Sync Config] Failed to get MAL config:", error);
    return null;
  }
}
