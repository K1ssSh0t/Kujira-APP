import * as React from "react";
import {
    View,
    ActivityIndicator,
    Linking,
    ScrollView,
    Platform,
    Modal,
    TouchableOpacity,
    ImageBackground,
    Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { X, SkipForward } from "lucide-react-native";
import {
    Server,
    ChevronRight,
    Monitor,
    ExternalLink,
    Info,
} from "~/lib/icons/lucide";
import { VideoView, useVideoPlayer, VideoSource } from "expo-video";
import * as IntentLauncher from "expo-intent-launcher";
import { findExtractor, ExtractorResult } from "~/lib/extractors";
import { getProxiedUrl } from "~/modules/video-proxy";
import axios from "axios";
import { addToHistory } from "~/lib/history";
import { syncEpisodeToMAL } from "~/lib/sync/service";

interface Server {
    name: string;
    url: string;
    source: string;
}

interface EpisodeDetails {
    title: string;
    numberEpisode: string;
    servers: Server[];
}

const BASE_API_URL = "https://kujira.unusualoticramo.workers.dev";

// Mismo User-Agent que usan los extractores; algunos hosts (Mp4Upload) ademas del
// Referer validan el UA para servir el video.
const VIDEO_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";

export default function EpisodeScreen() {
    const router = useRouter();
    const { url, provider, animeTitle, animeImage } = useLocalSearchParams<{
        url: string;
        provider: string;
        animeTitle?: string;
        animeImage?: string;
    }>();

    const goToAnimeDetails = () => {
        if (!url) return;
        const animeSlug = url
            .replace(/\/episode\//, "/anime/")
            .replace(/-\d+$/, "");
        router.push({
            pathname: "/anime-details",
            params: { url: animeSlug, provider },
        });
    };
    const [details, setDetails] = React.useState<EpisodeDetails | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const [videoPlayerVisible, setVideoPlayerVisible] = React.useState(false);
    const [videoSource, setVideoSource] = React.useState<VideoSource | null>(
        null,
    );
    const [isOptionModalVisible, setOptionModalVisible] = React.useState(false);
    const [selectedServer, setSelectedServer] = React.useState<Server | null>(
        null,
    );

    const player = useVideoPlayer(videoSource);

    React.useEffect(() => {
        if (!url) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                if (provider === "jkanime") {
                    const p = new URL(url).pathname;
                    const parts = p.split("/").filter(Boolean);
                    const { data: html } = await axios.get<string>(`${url}`);
                    const { data } = await axios.post<EpisodeDetails>(
                        `${BASE_API_URL}/jkanimev2/episode/${parts[0]}-${parts[1]}`,
                        {
                            html,
                        },
                    );

                    setDetails(data);
                } else {
                    const episodeUrl = `${BASE_API_URL}${url}`;
                    const response = await fetch(episodeUrl);
                    const json = await response.json();
                    setDetails(json);
                }
            } catch (e) {
                setError("Failed to fetch episode details");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [url]);

    React.useEffect(() => {
        if (videoPlayerVisible && player) {
            player.play();
        }
    }, [videoPlayerVisible, player]);

    const handleServerPress = (server: Server) => {
        setSelectedServer(server);
        setOptionModalVisible(true);
    };

    const addCurrentEpisodeToHistory = async () => {
        if (!animeTitle || !animeImage || !provider || !url || !details) return;

        try {
            const episodeNumberMatch = url.match(/-(\d+)$/);
            const episodeNumber = episodeNumberMatch
                ? parseInt(episodeNumberMatch[1], 10)
                : 0;

            const animeIdMatch = url.match(/\/([^\/]+)-\d+$/);
            const animeId = animeIdMatch ? animeIdMatch[1] : "";

            await addToHistory({
                episodeId: url,
                animeId: animeId,
                title: animeTitle,
                image: animeImage,
                episodeNumber: episodeNumber,
                provider: provider,
            });

            // Auto-sync to MyAnimeList
            if (episodeNumber > 0) {
                try {
                    const syncResult = await syncEpisodeToMAL(animeTitle, episodeNumber);
                    if (__DEV__) {
                        console.log(`[MAL Sync] Episode sync result:`, syncResult);
                    }
                } catch (syncError) {
                    // Fail silently - don't block video playback if sync fails
                    console.error("[MAL Sync] Failed to sync episode:", syncError);
                }
            }
        } catch (e) {
            console.error("Could not add to history", e);
        }
    };

    // Resuelve la URL directa del video usando el extractor del servidor (si existe).
    // El Referer siempre es la URL embed del servidor.
    const resolveSource = async (server: Server) => {
        let url = server.source;
        const extractor = findExtractor(server.name);
        if (extractor) {
            const result = await extractor.fn(server.url, server.url);
            if (result) {
                url =
                    typeof result === "string"
                        ? result
                        : (result as ExtractorResult).url;
            }
        }
        return { url, referer: server.url };
    };

    const handleInternalPlay = async () => {
        if (!selectedServer) return;
        await addCurrentEpisodeToHistory();

        const { url, referer } = await resolveSource(selectedServer);
        setVideoSource({ uri: url, headers: { Referer: referer } });
        setVideoPlayerVisible(true);
        setOptionModalVisible(false);
        setSelectedServer(null);
    };

    const handleExternalPlay = async () => {
        if (!selectedServer) return;
        await addCurrentEpisodeToHistory();

        const server = selectedServer;
        setOptionModalVisible(false);
        setSelectedServer(null);

        const { url, referer } = await resolveSource(server);

        // Reproductores externos (MPV/VLC) no pueden mandar el header Referer que
        // exigen algunos CDN (Mp4Upload, Uqload, YourUpload), por lo que el video
        // abre y se cierra al instante. Lo enrutamos por un proxy HTTP local que
        // inyecta el Referer; el player apunta a 127.0.0.1 y nunca ve el CDN directo.
        // Si el proxy no esta disponible, getProxiedUrl devuelve la URL original.
        const playUrl = await getProxiedUrl(url, referer);

        const openVideoUrl = () =>
            Linking.openURL(playUrl).catch(() =>
                Linking.openURL(server.url).catch(() => {}),
            );

        if (Platform.OS === "android") {
            const title = `${animeTitle ?? ""} - Ep ${
                details?.numberEpisode ?? ""
            }`.trim();
            // Ademas del proxy, mandamos los headers en todos los formatos de extra
            // conocidos por si el player los aprovecha (p.ej. MX Player).
            IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
                data: playUrl,
                type: "video/*",
                extra: {
                    // Formato "Key: Value"
                    "android.intent.extra.HTTP_HEADERS": [
                        `Referer: ${referer}`,
                        `User-Agent: ${VIDEO_UA}`,
                    ],
                    // MX Player: array alternado [clave, valor, clave, valor]
                    headers: [
                        "Referer",
                        referer,
                        "User-Agent",
                        VIDEO_UA,
                    ],
                    title,
                },
            }).catch(openVideoUrl);
        } else {
            openVideoUrl();
        }
    };

    const seekBy = (seconds: number) => {
        if (!player) return;
        if (typeof player.seekBy === "function") {
            player.seekBy(seconds);
        } else {
            player.currentTime = player.currentTime + seconds;
        }
    };

    const closeOptionModal = () => {
        setOptionModalVisible(false);
        setSelectedServer(null);
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error || !details) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <Text className="text-destructive">
                    {error || "Could not load details"}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background">
            {/* Episode hero */}
            <View className="w-full h-56">
                <ImageBackground
                    source={animeImage ? { uri: animeImage } : undefined}
                    className="w-full h-full justify-end bg-secondary"
                >
                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.85)"]}
                        style={{
                            paddingHorizontal: 24,
                            paddingTop: 60,
                            paddingBottom: 20,
                        }}
                    >
                        {animeTitle && (
                            <Text
                                className="text-white/80 text-sm font-medium"
                                numberOfLines={1}
                            >
                                {animeTitle}
                            </Text>
                        )}
                        <Text
                            className="text-white text-2xl font-bold leading-tight"
                            numberOfLines={2}
                        >
                            {details.title} - {details.numberEpisode}
                        </Text>
                    </LinearGradient>
                </ImageBackground>
            </View>

            <View className="p-6">
                {/* Go to anime details */}
                <Button
                    variant="outline"
                    className="w-full mb-6 flex-row gap-2"
                    onPress={goToAnimeDetails}
                >
                    <Info size={18} className="text-foreground" />
                    <Text>Ver anime</Text>
                </Button>

                <Text className="text-lg font-semibold text-foreground mb-3">
                    Servidores disponibles
                </Text>
                <View className="gap-y-2">
                    {details.servers.map((server) => {
                        const isPressable = !!findExtractor(server.name);
                        return (
                            <Pressable
                                key={server.name}
                                onPress={() => handleServerPress(server)}
                                disabled={!isPressable}
                                className={
                                    isPressable
                                        ? "active:opacity-70"
                                        : "opacity-40"
                                }
                            >
                                <Card className="flex-row items-center p-4 rounded-xl border-border">
                                    <Server
                                        size={20}
                                        className="text-muted-foreground"
                                    />
                                    <Text className="flex-1 ml-3 text-foreground font-medium">
                                        {server.name}
                                    </Text>
                                    {isPressable && (
                                        <ChevronRight
                                            size={20}
                                            className="text-muted-foreground"
                                        />
                                    )}
                                </Card>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <Modal
                visible={isOptionModalVisible}
                onRequestClose={closeOptionModal}
                transparent
                animationType="fade"
            >
                <View className="flex-1 justify-center items-center bg-black/50 p-4">
                    <View className="bg-card p-6 rounded-2xl w-full max-w-sm border border-border">
                        <Text className="text-lg font-bold text-foreground text-center">
                            Seleccionar reproductor
                        </Text>
                        <Text className="text-sm text-muted-foreground text-center mb-5">
                            ¿Cómo quieres ver este episodio?
                        </Text>
                        <View className="gap-y-2">
                            <Button
                                onPress={handleInternalPlay}
                                className="flex-row gap-2"
                            >
                                <Monitor
                                    size={18}
                                    className="text-primary-foreground"
                                />
                                <Text>Interno</Text>
                            </Button>
                            <Button
                                onPress={handleExternalPlay}
                                variant="secondary"
                                className="flex-row gap-2"
                            >
                                <ExternalLink
                                    size={18}
                                    className="text-secondary-foreground"
                                />
                                <Text>Externo</Text>
                            </Button>
                        </View>
                        <Button
                            onPress={closeOptionModal}
                            variant="ghost"
                            className="mt-4"
                        >
                            <Text>Cancelar</Text>
                        </Button>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={videoPlayerVisible}
                onRequestClose={() => {
                    setVideoPlayerVisible(false);
                    setVideoSource(null);
                    player.pause();
                }}
                supportedOrientations={["portrait", "landscape"]}
            >
                <View className="flex-1 bg-black justify-center">
                    {videoSource && (
                        <VideoView
                            player={player}
                            style={{ flex: 1 }}
                            contentFit="contain"
                        />
                    )}
                    {videoSource && (
                        <View className="absolute bottom-20 self-center flex-row items-center bg-black/50 rounded-full px-4 py-2">
                            <TouchableOpacity
                                className="flex-row items-center gap-1 px-3 py-1"
                                onPress={() => seekBy(85)}
                            >
                                <SkipForward size={22} color="white" />
                                <Text className="text-white text-xs">
                                    Saltar intro
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <TouchableOpacity
                        className="absolute top-10 right-5 z-10 bg-black/50 rounded-full p-2"
                        onPress={() => {
                            setVideoPlayerVisible(false);
                            setVideoSource(null);
                            player.pause();
                        }}
                    >
                        <X size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </ScrollView>
    );
}
