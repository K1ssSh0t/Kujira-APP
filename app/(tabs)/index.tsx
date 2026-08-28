import * as React from "react";
import {
    View,
    FlatList,
    ImageBackground,
    Pressable,
    TouchableOpacity,
    Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Card, CardTitle } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Info, WifiOff } from "~/lib/icons/lucide";
import { useRouter } from "expo-router";
import { ProviderSelector, Provider } from "~/components/ProviderSelector";
import { getCache, setCache } from "~/lib/cache";

const API_URLS: Record<Provider, string> = {
    tioanime: "https://kujira.unusualoticramo.workers.dev/tioanime/latest",
    animeflv: "https://kujira.unusualoticramo.workers.dev/animeflv/latest",
    animeav1: "https://kujira.unusualoticramo.workers.dev/animeav1/latest",
    monoschinos:
        "https://kujira.unusualoticramo.workers.dev/monoschinos/latest",
};

interface Anime {
    title: string;
    url: string;
    img: string;
    episode: string;
}

function SkeletonPoster() {
    const opacity = React.useRef(new Animated.Value(0.4)).current;

    React.useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.4,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={{ opacity }}
            className="w-full aspect-[2/3] rounded-2xl bg-secondary"
        />
    );
}

export default function Screen() {
    const router = useRouter();
    const [provider, setProvider] = React.useState<Provider>("tioanime");
    const [data, setData] = React.useState<Anime[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const cacheKey = `latest_anime_${provider}`;
            const cachedData = await getCache<Anime[]>(cacheKey);

            if (cachedData) {
                setData(cachedData);
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(API_URLS[provider]);
                let json = await response.json();

                if (provider === "animeflv") {
                    json = json.map((item: Anime) => ({
                        ...item,
                        img: `https://animeflv.net${item.img}`,
                    }));
                }
                if (provider === "monoschinos") {
                    json = json.map((item: Anime) => ({
                        ...item,
                        img: item.img?.startsWith("http") ? item.img : `https://monoschinos.lol${item.img}`,
                    }));
                }

                setData(json);
                await setCache(cacheKey, json);
            } catch (e) {
                setError("Failed to fetch data");
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [provider]);

    const handleInfoPress = (anime: Anime) => {
        const animeUrlSlug = anime.url
            .replace(/\/episode\//, "/anime/")
            .replace(/-\d+$/, "");
        router.push({
            pathname: "/anime-details",
            params: {
                url: animeUrlSlug,
                provider: provider,
            },
        });
    };

    const handleCardPress = (item: Anime) => {
        router.push({
            pathname: "/episode",
            params: {
                url: item.url,
                provider: provider,
                animeTitle: item.title,
                animeImage: item.img,
            },
        });
    };

    const renderItem = ({ item }: { item: Anime }) => (
        <Pressable
            onPress={() => handleCardPress(item)}
            className="flex-1 p-1.5 active:opacity-80"
        >
            <Card className="w-full rounded-2xl overflow-hidden border-0">
                <ImageBackground
                    source={{ uri: item.img }}
                    className="w-full aspect-[2/3] justify-end bg-secondary"
                >
                    {/* Episode badge */}
                    <View className="absolute top-2 left-2 bg-primary px-2 py-1 rounded-md">
                        <Text className="text-primary-foreground text-xs font-bold">
                            {item.episode}
                        </Text>
                    </View>

                    {/* Info button */}
                    <TouchableOpacity
                        className="absolute top-2 right-2 bg-black/60 border border-white/20 p-2 rounded-full"
                        onPress={(e) => {
                            e.stopPropagation(); // Prevent card press from firing
                            handleInfoPress(item);
                        }}
                    >
                        <Info size={18} color="white" />
                    </TouchableOpacity>

                    {/* Bottom gradient + title */}
                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.85)"]}
                        style={{
                            paddingHorizontal: 12,
                            paddingTop: 40,
                            paddingBottom: 12,
                        }}
                    >
                        <CardTitle
                            numberOfLines={2}
                            className="text-white text-sm font-bold leading-tight"
                        >
                            {item.title}
                        </CardTitle>
                    </LinearGradient>
                </ImageBackground>
            </Card>
        </Pressable>
    );

    const renderSkeleton = () => (
        <View className="flex-row flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} className="w-1/2 p-1.5">
                    <SkeletonPoster />
                </View>
            ))}
        </View>
    );

    return (
        <View className="flex-1 p-4 bg-background">
            <ProviderSelector
                provider={provider}
                onProviderChange={setProvider}
            />

            {loading ? (
                renderSkeleton()
            ) : error ? (
                <View className="flex-1 justify-center items-center gap-4 px-8">
                    <WifiOff size={48} className="text-muted-foreground" />
                    <Text className="text-muted-foreground text-center">
                        {error}
                    </Text>
                    <Button onPress={() => setProvider((p) => p)}>
                        <Text>Reintentar</Text>
                    </Button>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item, index) =>
                        `${provider}-${item.title}-${index}`
                    }
                    contentContainerClassName="gap-1 pt-2 pb-4"
                    numColumns={2}
                    key={provider}
                />
            )}
        </View>
    );
}
