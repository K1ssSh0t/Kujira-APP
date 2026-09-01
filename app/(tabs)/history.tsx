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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-foreground mb-4">Historial</Text>
      {history.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg text-muted-foreground">
            No hay historial de episodios.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.episodeId}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center mb-4"
              onPress={() => handlePress(item)}
            >
              <Image
                source={getImageSource(item.image, item.provider)}
                className="w-24 h-32 rounded-md"
              />
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-foreground">
                  {item.title}
                </Text>
                <Text className="text-md text-muted-foreground">
                  Episodio {item.episodeNumber}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Visto:{" "}
                  {new Date(item.watchedAt).toLocaleDateString()}{" "}
                  {new Date(item.watchedAt).toLocaleTimeString()}
                </Text>
                <Text className="text-sm text-muted-foreground capitalize">
                  Proveedor: {item.provider}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
