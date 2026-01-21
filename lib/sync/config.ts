import AsyncStorage from "@react-native-async-storage/async-storage";
import { SyncConfig, MALConfig } from "./types";

const SYNC_CONFIG_KEY = "@kujira/sync_config";
const PKCE_VERIFIER_KEY = "@kujira/pkce_verifier";

/**
 * Save PKCE code verifier temporarily during OAuth flow
 */
export async function savePKCEVerifier(verifier: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  } catch (error) {
    console.log("[Sync Config] Failed to save PKCE verifier:", error);
    throw error;
  }
}

/**
 * Get PKCE code verifier from temporary storage
 */
export async function getPKCEVerifier(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PKCE_VERIFIER_KEY);
  } catch (error) {
    console.log("[Sync Config] Failed to get PKCE verifier:", error);
    return null;
  }
}

/**
 * Clear PKCE code verifier after OAuth flow completes
 */
export async function clearPKCEVerifier(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PKCE_VERIFIER_KEY);
  } catch (error) {
    console.log("[Sync Config] Failed to clear PKCE verifier:", error);
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
        clientId: config?.mal?.clientId || "",
        clientSecret: config?.mal?.clientSecret || "",
        accessToken,
        refreshToken,
        tokenExpiry: expiryDate.toISOString(),
        username,
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
 * Update client credentials (Client ID and Secret)
 */
export async function updateClientCredentials(
  clientId: string,
  clientSecret: string
): Promise<void> {
  try {
    const config = await loadSyncConfig();
    
    const updatedConfig: SyncConfig = {
      provider: "myanimelist",
      mal: {
        clientId,
        clientSecret,
        accessToken: config?.mal?.accessToken || "",
        refreshToken: config?.mal?.refreshToken || "",
        tokenExpiry: config?.mal?.tokenExpiry || "",
        username: config?.mal?.username,
      },
      lastSyncAt: config?.lastSyncAt,
      autoSync: config?.autoSync ?? true,
    };

    await saveSyncConfig(updatedConfig);
  } catch (error) {
    console.log("[Sync Config] Failed to update credentials:", error);
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
