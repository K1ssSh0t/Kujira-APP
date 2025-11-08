import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "history";

export interface HistoryItem {
  episodeId: string; // Episode URL
  animeId: string;
  title: string; // Anime Title
  image: string; // Anime Image
  episodeNumber: number;
  watchedAt: number;
  provider: string;
}

export const addToHistory = async (
  item: Omit<HistoryItem, "watchedAt">
): Promise<void> => {
  try {
    const historyItem: HistoryItem = {
      ...item,
      watchedAt: Date.now(),
    };

    const history = await getHistory();
    const existingIndex = history.findIndex(
      (h) => h.episodeId === historyItem.episodeId
    );

    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }

    history.unshift(historyItem);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error adding to history:", error);
  }
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const history = await AsyncStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error("Error getting history:", error);
    return [];
  }
};
