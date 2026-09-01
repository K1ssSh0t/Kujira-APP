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
        <View className="flex-1 p-4 bg-background">
            <ProviderSelector
                provider={provider}
                onProviderChange={handleProviderChange}
            />

            <TextInput
                className="h-12 border border-border rounded-lg px-4 mb-4 text-foreground"
                placeholder="Buscar anime..."
                placeholderTextColor="gray"
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
            />

            {loading ? (
                <ActivityIndicator size="large" className="flex-1" />
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.url}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => handleAnimePress(item)}
                            className="flex-row items-center mb-4 p-2 bg-card rounded-lg"
                        >
                            <Image
                                source={getImageSource(item.image, provider)}
                                className="w-16 h-24 rounded-md mr-4"
                            />
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-foreground">
                                    {item.name}
                                </Text>
                                <Text className="text-muted-foreground">
                                    {item.type}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}
