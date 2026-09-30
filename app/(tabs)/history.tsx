import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Text } from "~/components/ui/text";
import { getHistory, HistoryItem } from "~/lib/history";
import { useFocusEffect, useRouter } from "expo-router";

function getImageSource(uri: string, provider: string) {
  if (provider === "monoschinos" && uri) {
    return {
      uri,
      headers: {
        Referer: "https://monoschinos.lol/",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      },
    };
  }
  return { uri };
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const fetchHistory = async () => {
        setLoading(true);
        const historyData = await getHistory();
        setHistory(historyData);
        setLoading(false);
      };

      fetchHistory();
    }, [])
  );

  const handlePress = (item: HistoryItem) => {
    router.push({
      pathname: "/episode",
      params: {
        url: item.episodeId,
        provider: item.provider,
        animeTitle: item.title,
        animeImage: item.image,
      },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-4 pt-5">
      <Text className="text-[28px] font-extrabold tracking-tight text-foreground">Historial</Text>
      <Text className="text-[13px] text-muted-foreground mt-0.5 mb-4">
        {history.length} episodios vistos
      </Text>
      {history.length === 0 ? (
        <View className="flex-1 justify-center items-center pb-24">
          <Text className="text-[15px] text-muted-foreground text-center">
            No hay historial de episodios.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.episodeId}
          contentContainerClassName="pb-32"
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center mb-2.5 p-2.5 bg-card border border-border/60 rounded-[18px]"
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <Image
                source={getImageSource(item.image, item.provider)}
                className="w-[72px] h-[104px] rounded-xl bg-secondary"
              />
              <View className="ml-3 flex-1 pr-1">
                <Text className="text-[15px] font-semibold text-foreground leading-5" numberOfLines={2}>
                  {item.title}
                </Text>
                <View className="self-start mt-1.5 px-2.5 py-1 rounded-full bg-[#8B5CF6]/12 dark:bg-[#8B5CF6]/20">
                  <Text className="text-[11px] font-bold text-[#5B21B6] dark:text-[#C4B5FD]">
                    Episodio {item.episodeNumber}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground mt-1.5" numberOfLines={1}>
                  {new Date(item.watchedAt).toLocaleDateString()}{" · "}{item.provider}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
