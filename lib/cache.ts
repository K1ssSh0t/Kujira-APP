import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "cache_";
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutes

interface CacheData<T> {
  timestamp: number;
  data: T;
}

export const setCache = async <T>(key: string, data: T): Promise<void> => {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const cacheData: CacheData<T> = {
    timestamp: Date.now(),
    data,
  };
  await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const item = await AsyncStorage.getItem(cacheKey);

  if (!item) {
    return null;
  }

  const cacheData: CacheData<T> = JSON.parse(item);

  if (Date.now() - cacheData.timestamp > CACHE_EXPIRATION) {
    await AsyncStorage.removeItem(cacheKey);
    return null;
  }

  return cacheData.data;
};
