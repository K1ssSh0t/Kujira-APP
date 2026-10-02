import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    FlatList,
    Image,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { Text } from "~/components/ui/text";
import { getWatchlist, WatchlistItem, WatchStatus } from "~/lib/watchlist";
import { useFocusEffect, useRouter } from "expo-router";
import { cn } from "~/lib/utils";

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

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: watchlist.length };
        for (const item of watchlist) {
            c[item.status] = (c[item.status] ?? 0) + 1;
        }
        return c;
    }, [watchlist]);

    const activeFilterLabel = filters.find((f) => f.value === filter)?.label ?? "";

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background px-4 pt-2">
            <View className="flex-row items-center gap-2">
                <Text className="text-[22px] font-extrabold tracking-tight text-foreground">Library</Text>
                <View className="px-2 py-1 rounded-full bg-[#8B5CF6]/12 dark:bg-[#8B5CF6]/20">
                    <Text className="text-[11px] font-bold text-[#5B21B6] dark:text-[#C4B5FD]">
                        {filter === "all"
                            ? `${watchlist.length} saved`
                            : `${filteredList.length} of ${watchlist.length} · ${activeFilterLabel}`}
                    </Text>
                </View>
            </View>

            {/* Filter Chips */}
            <View className="mt-2 mb-3 -mx-4">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerClassName="flex-row gap-2 px-4"
                >
                    {filters.map((f) => {
                        const count = counts[f.value] ?? (f.value === "all" ? watchlist.length : 0);
                        return (
                            <TouchableOpacity
                                key={f.value}
                                onPress={() => setFilter(f.value)}
                                className={cn(
                                    "px-3.5 py-2 rounded-full border mr-0 flex-row items-center gap-1.5",
                                    filter === f.value
                                        ? "bg-[#7C3AED] border-[#7C3AED]"
                                        : "bg-card border-border"
                                )}
                                activeOpacity={0.7}
                            >
                                <Text
                                    className={cn(
                                        "text-[13px]",
                                        filter === f.value ? "text-white font-bold" : "text-foreground font-medium"
                                    )}
                                >
                                    {f.label}
                                </Text>
                                <Text
                                    className={cn(
                                        "text-[11px] font-bold",
                                        filter === f.value ? "text-white/80" : "text-muted-foreground"
                                    )}
                                >
                                    {count}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {filteredList.length === 0 ? (
                <View className="flex-1 justify-center items-center pb-24">
                    <Text className="text-[15px] text-muted-foreground text-center">
                        No anime found in this category.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredList}
                    keyExtractor={(item) => item.animeId}
                    contentContainerClassName="pb-32"
                    showsVerticalScrollIndicator={false}
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
                                <View className="bg-[#8B5CF6]/12 dark:bg-[#8B5CF6]/20 self-start px-2.5 py-1 rounded-full mt-1.5">
                                    <Text className="text-[11px] font-bold text-[#5B21B6] dark:text-[#C4B5FD] capitalize">
                                        {item.status.replace(/_/g, " ")}
                                    </Text>
                                </View>
                                <Text className="text-xs text-muted-foreground mt-1.5" numberOfLines={1}>
                                    {new Date(item.updatedAt).toLocaleDateString()}
                                    {" · "}
                                    {item.provider}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}
