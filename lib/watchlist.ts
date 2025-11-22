import AsyncStorage from "@react-native-async-storage/async-storage";

const WATCHLIST_KEY = "watchlist";

export type WatchStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";

export interface WatchlistItem {
  animeId: string; // URL part or unique ID
  title: string;
  image: string;
  status: WatchStatus;
  updatedAt: number;
  provider: string;
}

export const addToWatchlist = async (
  item: Omit<WatchlistItem, "updatedAt">
): Promise<void> => {
  try {
    const watchlistItem: WatchlistItem = {
      ...item,
      updatedAt: Date.now(),
    };

    const watchlist = await getWatchlist();
    const existingIndex = watchlist.findIndex(
      (w) => w.animeId === watchlistItem.animeId
    );

    if (existingIndex !== -1) {
      watchlist[existingIndex] = watchlistItem;
    } else {
      watchlist.unshift(watchlistItem);
    }

    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  } catch (error) {
    console.error("Error adding to watchlist:", error);
  }
};

export const removeFromWatchlist = async (animeId: string): Promise<void> => {
  try {
    const watchlist = await getWatchlist();
    const newWatchlist = watchlist.filter((item) => item.animeId !== animeId);
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(newWatchlist));
  } catch (error) {
    console.error("Error removing from watchlist:", error);
  }
};

export const getWatchlist = async (): Promise<WatchlistItem[]> => {
  try {
    const watchlist = await AsyncStorage.getItem(WATCHLIST_KEY);
    return watchlist ? JSON.parse(watchlist) : [];
  } catch (error) {
    console.error("Error getting watchlist:", error);
    return [];
  }
};

export const getWatchlistItem = async (animeId: string): Promise<WatchlistItem | undefined> => {
    try {
        const watchlist = await getWatchlist();
        return watchlist.find((item) => item.animeId === animeId);
    } catch (error) {
        console.error("Error getting watchlist item:", error);
        return undefined;
    }
}
