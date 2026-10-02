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
import { Clapperboard } from "lucide-react-native";
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
            className="w-full aspect-[2/3] rounded-[20px] bg-secondary dark:bg-white/10"
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
            <Card className="w-full rounded-[20px] overflow-hidden border border-border/60 shadow-md shadow-black/10 dark:shadow-black/50">
                <ImageBackground
                    source={getImageSource(item.img, provider)}
                    className="w-full aspect-[2/3] justify-end bg-secondary dark:bg-white/5"
                >
                    {/* Episode badge */}
                    <View className="absolute top-2 left-2 bg-[#7C3AED] px-2.5 py-1 rounded-full shadow-sm shadow-black/30">
                        <Text className="text-white text-[11px] font-extrabold tracking-wide">
                            {item.episode}
                        </Text>
                    </View>

                    {/* Info button */}
                    <TouchableOpacity
                        className="absolute top-2 right-2 bg-black/60 border border-white/20 w-8 h-8 items-center justify-center rounded-full"
                        hitSlop={10}
                        onPress={(e) => {
                            e.stopPropagation(); // Prevent card press from firing
                            handleInfoPress(item);
                        }}
                    >
                        <Info size={15} color="white" />
                    </TouchableOpacity>

                    {/* Bottom gradient + title */}
                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
                        style={{
                            paddingHorizontal: 12,
                            paddingTop: 44,
                            paddingBottom: 12,
                        }}
                    >
                        <CardTitle
                            numberOfLines={2}
                            className="text-white text-[13px] font-semibold leading-[16px]"
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
        <View className="flex-1 px-3 pt-2 bg-background">
            <View className="flex-row items-center justify-between px-1 mb-2 gap-2">
                <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-[22px] font-extrabold tracking-tight text-foreground">Latest</Text>
                    <View className="px-2 py-1 rounded-full bg-[#8B5CF6]/12 dark:bg-[#8B5CF6]/20">
                        <Text className="text-[11px] font-bold text-[#5B21B6] dark:text-[#C4B5FD]">
                            {!loading && !error && data.length > 0 ? `${data.length} fresh` : "Fresh"}
                        </Text>
                    </View>
                </View>
                <ProviderSelector
                    provider={provider}
                    onProviderChange={setProvider}
                    compact
                />
            </View>

            {loading ? (
                renderSkeleton()
            ) : error ? (
                <View className="flex-1 justify-center items-center gap-4 px-8">
                    <View className="w-16 h-16 rounded-full bg-secondary items-center justify-center">
                        <WifiOff size={28} className="text-muted-foreground" />
                    </View>
                    <Text className="text-muted-foreground text-center text-[15px] leading-6">
                        {error}
                    </Text>
                    <Button onPress={() => setProvider((p) => p)} className="h-12 rounded-2xl px-6">
                        <Text>Reintentar</Text>
                    </Button>
                </View>
            ) : data.length === 0 ? (
                <View className="flex-1 justify-center items-center gap-3 px-8 pb-24">
                    <View className="w-16 h-16 rounded-full bg-secondary dark:bg-white/10 items-center justify-center">
                        <Clapperboard size={28} color="#7C3AED" />
                    </View>
                    <Text className="text-muted-foreground text-center text-[15px] leading-6">
                        No episodes found. Try another provider.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item, index) =>
                        `${provider}-${item.title}-${index}`
                    }
                    contentContainerClassName="gap-1 pt-0 pb-32"
                    numColumns={2}
                    key={provider}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}
