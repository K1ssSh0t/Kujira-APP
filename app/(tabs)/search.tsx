import * as React from "react";
import {
    View,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    Image,
} from "react-native";
import { Text } from "~/components/ui/text";
import { useRouter } from "expo-router";
import { Search, SearchX } from "lucide-react-native";
import { useColorScheme } from "~/lib/useColorScheme";
import { ProviderSelector, Provider } from "~/components/ProviderSelector";
import { getCache, setCache } from "~/lib/cache";

const BASE_API_URL = "https://kujira.unusualoticramo.workers.dev";

interface Anime {
    name: string;
    image: string;
    url: string;
    type: string;
}

function getImageSource(uri: string, provider: Provider) {
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

export default function Screen() {
    const router = useRouter();
    const [provider, setProvider] = React.useState<Provider>("tioanime");
    const [search, setSearch] = React.useState("");
    const [results, setResults] = React.useState<Anime[]>([]);
    const [loading, setLoading] = React.useState(false);
    const { isDarkColorScheme } = useColorScheme();

    const handleProviderChange = (newProvider: Provider) => {
        setProvider(newProvider);
        setResults([]);
        setSearch("");
    };

    const handleSearch = async () => {
        if (!search) return;
        setLoading(true);
        setResults([]);

        const cacheKey = `search_anime_${provider}_${search}`;
        const cachedData = await getCache<Anime[]>(cacheKey);

        if (cachedData) {
            setResults(cachedData);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                `${BASE_API_URL}/${provider}/search?title=${search}`,
            );
            let data = await response.json();

            if (provider === "animeflv") {
                data = data.map((item: Anime) => ({
                    ...item,
                    image: item.image?.startsWith("http") ? item.image : `https://animeflv.net${item.image}`,
                }));
            }
            if (provider === "monoschinos") {
                data = data.map((item: Anime) => ({
                    ...item,
                    image: item.image?.startsWith("http") ? item.image : `https://monoschinos.lol${item.image}`,
                }));
            }

            setResults(data);
            await setCache(cacheKey, data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnimePress = (anime: Anime) => {
        router.push({
            pathname: "/anime-details",
            params: {
                url: anime.url,
                provider: provider,
            },
        });
    };

    return (
        <View className="flex-1 px-4 pt-5 bg-background">
            <Text className="text-[28px] font-extrabold tracking-tight text-foreground">Search</Text>
            <Text className="text-[13px] text-muted-foreground mt-0.5 mb-3">
                {results.length > 0 && !loading ? `${results.length} results` : "Explore by title"}
            </Text>
            <ProviderSelector
                provider={provider}
                onProviderChange={handleProviderChange}
            />

            <View className="relative mb-3">
                <View className="absolute left-4 top-0 bottom-0 justify-center z-10" pointerEvents="none">
                    <Search size={18} color={isDarkColorScheme ? "#A1A1AA" : "#636366"} />
                </View>
                <TextInput
                    className="h-12 bg-card border border-border rounded-2xl pl-11 pr-4 text-[15px] text-foreground"
                    placeholder="Buscar anime..."
                    placeholderTextColor={isDarkColorScheme ? "#A1A1AA" : "#636366"}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" className="flex-1" color="#8B5CF6" />
            ) : results.length === 0 ? (
                <View className="flex-1 justify-center items-center gap-3 px-8 pb-24">
                    <View className="w-16 h-16 rounded-full bg-secondary dark:bg-white/10 items-center justify-center">
                        <SearchX size={28} color="#7C3AED" />
                    </View>
                    <Text className="text-muted-foreground text-center text-[15px] leading-6">
                        {search ? `No results for "${search}".` : "Type a title above to start searching."}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.url}
                    contentContainerClassName="pt-1 pb-32"
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => handleAnimePress(item)}
                            className="flex-row items-center mb-2.5 p-2.5 bg-card border border-border/60 rounded-[18px]"
                            activeOpacity={0.7}
                        >
                            <Image
                                source={getImageSource(item.image, provider)}
                                className="w-16 h-24 rounded-xl mr-3 bg-secondary"
                            />
                            <View className="flex-1 pr-1">
                                <Text className="text-[15px] font-semibold text-foreground leading-5" numberOfLines={2}>
                                    {item.name}
                                </Text>
                                <View className="self-start mt-1.5 px-2.5 py-1 rounded-full bg-[#8B5CF6]/12 dark:bg-[#8B5CF6]/20">
                                    <Text className="text-[11px] font-bold text-[#5B21B6] dark:text-[#C4B5FD]">
                                        {item.type}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}
