import { WatchStatus } from "../watchlist";
import { HistoryItem, getHistory } from "../history";
import { WatchlistItem, getWatchlist } from "../watchlist";
import { SyncResult, MALStatus } from "./types";
import { isAuthenticated, updateLastSync } from "./config";
import { searchAnime, getAnimeDetails, updateAnimeListStatus } from "./mal-client";
import { findBestMatch } from "./matcher";

/**
 * Convert Kujira WatchStatus to MAL status
 */
function convertToMALStatus(status: WatchStatus): MALStatus {
  const mapping: Record<WatchStatus, MALStatus> = {
    watching: "watching",
    completed: "completed",
    plan_to_watch: "plan_to_watch",
    on_hold: "on_hold",
    dropped: "dropped",
  };
  return mapping[status];
}

/**
 * Sync a single episode to MyAnimeList
 * This is called automatically when a user watches an episode
 */
export async function syncEpisodeToMAL(
  animeTitle: string,
  episodeNumber: number
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    message: "",
    errors: [],
  };

  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      result.message = "Not authenticated with MyAnimeList";
      result.errors = ["Please connect your MyAnimeList account in Settings"];
      return result;
    }

    console.log(`[Sync Service] Syncing episode ${episodeNumber} of "${animeTitle}"`);

    // Search for anime in MAL
    const searchResults = await searchAnime(animeTitle, 10);
    
    // Find best match
    const match = findBestMatch(animeTitle, searchResults);
    
    if (!match) {
      result.message = `No match found for "${animeTitle}"`;
      result.errors = [`Could not find "${animeTitle}" in MyAnimeList`];
      return result;
    }

    // Get current MAL status
    const animeDetails = await getAnimeDetails(match.malId);
    const currentEpisodes = animeDetails.my_list_status?.num_episodes_watched || 0;
    const totalEpisodes = animeDetails.num_episodes || 999;

    // Only update if this episode is newer than what's in MAL
    if (episodeNumber > currentEpisodes && episodeNumber <= totalEpisodes) {
      // Determine status
      let status: MALStatus = "watching";
      if (episodeNumber >= totalEpisodes && totalEpisodes > 0) {
        status = "completed";
      }

      await updateAnimeListStatus(match.malId, status, undefined, episodeNumber);

      result.success = true;
      result.message = `Updated "${animeTitle}" episode ${episodeNumber} on MAL`;
      result.updated = [`${animeTitle} - Episode ${episodeNumber}`];

      await updateLastSync();
    } else {
      result.success = true;
      result.message = `Episode ${episodeNumber} already synced`;
    }

    return result;
  } catch (error: any) {
    console.log("[Sync Service] Episode sync failed:", error);
    result.success = false;
    result.message = "Failed to sync episode";
    result.errors = [error.message || "Unknown error"];
    return result;
  }
}

/**
 * Sync library status to MyAnimeList
 * This is called automatically when a user adds/updates an anime in their library
 */
export async function syncLibraryStatusToMAL(
  animeTitle: string,
  status: WatchStatus
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    message: "",
    errors: [],
  };

  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      result.message = "Not authenticated with MyAnimeList";
      result.errors = ["Please connect your MyAnimeList account in Settings"];
      return result;
    }

    console.log(`[Sync Service] Syncing "${animeTitle}" with status "${status}"`);

    // Search for anime in MAL
    const searchResults = await searchAnime(animeTitle, 10);
    
    // Find best match
    const match = findBestMatch(animeTitle, searchResults);
    
    if (!match) {
      result.message = `No match found for "${animeTitle}"`;
      result.errors = [`Could not find "${animeTitle}" in MyAnimeList`];
      return result;
    }

    // Convert status
    const malStatus = convertToMALStatus(status);

    // Update in MAL
    await updateAnimeListStatus(match.malId, malStatus);

    result.success = true;
    result.message = `Updated "${animeTitle}" status to "${status}" on MAL`;
    result.uploaded = [`${animeTitle} - ${status}`];

    await updateLastSync();

    return result;
  } catch (error: any) {
    console.log("[Sync Service] Library status sync failed:", error);
    result.success = false;
    result.message = "Failed to sync library status";
    result.errors = [error.message || "Unknown error"];
    return result;
  }
}

/**
 * Sync entire history to MyAnimeList (manual sync)
 */
export async function syncAllHistoryToMAL(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    message: "",
    updated: [],
    errors: [],
  };

  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      result.success = false;
      result.message = "Not authenticated with MyAnimeList";
      result.errors = ["Please connect your MyAnimeList account in Settings"];
      return result;
    }

    console.log("[Sync Service] Starting full history sync");

    // Get all history
    const history = await getHistory();
    
    if (history.length === 0) {
      result.message = "No history to sync";
      return result;
    }

    // Group by anime title and get max episode for each
    const animeEpisodes = new Map<string, number>();
    
    for (const item of history) {
      const current = animeEpisodes.get(item.title) || 0;
      if (item.episodeNumber > current) {
        animeEpisodes.set(item.title, item.episodeNumber);
      }
    }

    // Sync each anime
    for (const [title, maxEpisode] of animeEpisodes) {
      try {
        const syncResult = await syncEpisodeToMAL(title, maxEpisode);
        if (syncResult.success && syncResult.updated) {
          result.updated?.push(...syncResult.updated);
        } else if (syncResult.errors) {
          result.errors?.push(...syncResult.errors);
        }
      } catch (error: any) {
        result.errors?.push(`${title}: ${error.message}`);
      }
    }

    if (result.errors && result.errors.length > 0) {
      result.success = false;
      result.message = `Synced ${result.updated?.length || 0} anime with ${result.errors.length} errors`;
    } else {
      result.message = `Successfully synced ${result.updated?.length || 0} anime from history`;
    }

    await updateLastSync();

    return result;
  } catch (error: any) {
    console.log("[Sync Service] Full history sync failed:", error);
    result.success = false;
    result.message = "Failed to sync history";
    result.errors = [error.message || "Unknown error"];
    return result;
  }
}

/**
 * Sync entire library to MyAnimeList (manual sync)
 */
export async function syncAllLibraryToMAL(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    message: "",
    uploaded: [],
    errors: [],
  };

  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      result.success = false;
      result.message = "Not authenticated with MyAnimeList";
      result.errors = ["Please connect your MyAnimeList account in Settings"];
      return result;
    }

    console.log("[Sync Service] Starting full library sync");

    // Get all watchlist items
    const watchlist = await getWatchlist();
    
    if (watchlist.length === 0) {
      result.message = "No library items to sync";
      return result;
    }

    // Sync each item
    for (const item of watchlist) {
      try {
        const syncResult = await syncLibraryStatusToMAL(item.title, item.status);
        if (syncResult.success && syncResult.uploaded) {
          result.uploaded?.push(...syncResult.uploaded);
        } else if (syncResult.errors) {
          result.errors?.push(...syncResult.errors);
        }
      } catch (error: any) {
        result.errors?.push(`${item.title}: ${error.message}`);
      }
    }

    if (result.errors && result.errors.length > 0) {
      result.success = false;
      result.message = `Synced ${result.uploaded?.length || 0} anime with ${result.errors.length} errors`;
    } else {
      result.message = `Successfully synced ${result.uploaded?.length || 0} anime from library`;
    }

    await updateLastSync();

    return result;
  } catch (error: any) {
    console.log("[Sync Service] Full library sync failed:", error);
    result.success = false;
    result.message = "Failed to sync library";
    result.errors = [error.message || "Unknown error"];
    return result;
  }
}

/**
 * Sync everything (history + library)
 */
export async function syncAllToMAL(): Promise<SyncResult> {
  const historyResult = await syncAllHistoryToMAL();
  const libraryResult = await syncAllLibraryToMAL();

  const combinedResult: SyncResult = {
    success: historyResult.success && libraryResult.success,
    message: `History: ${historyResult.message}. Library: ${libraryResult.message}`,
    updated: [...(historyResult.updated || []), ...(libraryResult.updated || [])],
    uploaded: [...(historyResult.uploaded || []), ...(libraryResult.uploaded || [])],
    errors: [...(historyResult.errors || []), ...(libraryResult.errors || [])],
  };

  return combinedResult;
}
