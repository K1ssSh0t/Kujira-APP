import React, { useCallback, useState } from "react";
import {
    View,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { Text } from "~/components/ui/text";
import { getWatchlist, WatchlistItem, WatchStatus } from "~/lib/watchlist";
import { useFocusEffect, useRouter } from "expo-router";

export default function LibraryScreen() {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<WatchStatus | "all">("all");
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            const fetchWatchlist = async () => {
                setLoading(true);
                const data = await getWatchlist();
                setWatchlist(data);
                setLoading(false);
            };

            fetchWatchlist();
        }, [])
    );

    const handlePress = (item: WatchlistItem) => {
        router.push({
            pathname: "/anime-details",
            params: {
                url: item.animeId,
                provider: item.provider,
            },
        });
    };

    const filteredList =
        filter === "all"
            ? watchlist
            : watchlist.filter((item) => item.status === filter);

    const filters: { label: string; value: WatchStatus | "all" }[] = [
        { label: "All", value: "all" },
        { label: "Watching", value: "watching" },
        { label: "Plan to Watch", value: "plan_to_watch" },
        { label: "Completed", value: "completed" },
        { label: "On Hold", value: "on_hold" },
        { label: "Dropped", value: "dropped" },
    ];

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background p-4">
            <Text className="text-2xl font-bold text-foreground mb-4">Library</Text>

            {/* Filter Chips */}
            <View className="mb-4">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-2"
                >
                    {filters.map((f) => (
                        <TouchableOpacity
                            key={f.value}
                            onPress={() => setFilter(f.value)}
                            className={`px-4 py-2 rounded-full border ${filter === f.value
                                ? "bg-blue-700 "
                                : "bg-background "
                                } mr-2`}
                        >
                            <Text
                                className={`${filter === f.value
                                    ? "text-white"
                                    : "text-foreground"
                                    }`}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {filteredList.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-lg text-muted-foreground">
                        No anime found in this category.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredList}
                    keyExtractor={(item) => item.animeId}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className="flex-row items-center mb-4"
                            onPress={() => handlePress(item)}
                        >
                            <Image
                                source={{ uri: item.image }}
                                className="w-24 h-32 rounded-md"
                            />
                            <View className="ml-4 flex-1">
                                <Text className="text-lg font-bold text-foreground">
                                    {item.title}
                                </Text>
                                <View className="bg-secondary self-start px-2 py-1 rounded mt-1">
                                    <Text className="text-xs text-secondary-foreground capitalize">
                                        {item.status.replace(/_/g, " ")}
                                    </Text>
                                </View>
                                <Text className="text-sm text-muted-foreground mt-1">
                                    Updated: {new Date(item.updatedAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}
