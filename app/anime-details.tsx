import * as React from 'react';
import {
  View,
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Check, ImageIcon } from '~/lib/icons/lucide';
import axios from 'axios';
import { addToWatchlist, getWatchlistItem, removeFromWatchlist, WatchStatus } from '~/lib/watchlist';
import { syncLibraryStatusToMAL } from '~/lib/sync/service';
import { useColorScheme } from '~/lib/useColorScheme';

const BASE_API_URL = 'https://kujira.unusualoticramo.workers.dev';

interface AnimeDetails {
  title: string;
  img: string;
  synopsis: string;
  genres: string[];
  episodes: { name: string; url: string }[];
}

function getImageSource(uri: string, provider?: string) {
  if (provider === 'monoschinos' && uri) {
    return {
      uri,
      headers: {
        Referer: 'https://monoschinos.lol/',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      },
    };
  }
  return { uri };
}

export default function AnimeDetailsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const cardColor = colorScheme === 'oled' ? 'hsl(0, 0%, 0%)' : colorScheme === 'dark' ? 'hsl(240, 10%, 3.9%)' : 'hsl(0, 0%, 100%)';
  const { url } = useLocalSearchParams<{ url: string }>();
  const { provider } = useLocalSearchParams<{ provider: string }>();
  const [details, setDetails] = React.useState<AnimeDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [watchStatus, setWatchStatus] = React.useState<WatchStatus | null>(null);
  const [isWatchlistLoading, setIsWatchlistLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDetails = async () => {
      if (!url) return;
      setLoading(true);
      try {
        if (provider === 'jkanime') {


          const p = new URL(url).pathname;
          const parts = p.split('/').filter(Boolean);
          const { data: html } = await axios.get<string>(`https://jkanime.net/${parts[0]}`);
          const { data } = await axios.post<AnimeDetails>(`${BASE_API_URL}/jkanimev2/anime/${parts[0]}`, {
            html
          });
          // console.log(data, "data");
          //TODO: PENDIENTE LA PARTE DE LOS EPISODIOS VIENE VACIO
          setDetails(data);
        } else {
          const detailsUrl = `${BASE_API_URL}${url}`;
          const response = await fetch(detailsUrl);
          const json = await response.json();
          setDetails(json);
        }
      } catch (error) {
        console.error('Failed to fetch anime details:', error);
      }
      setLoading(false);
    };

    fetchDetails();
  }, [url]);

  React.useEffect(() => {
    const checkWatchlist = async () => {
      if (!url) return;
      setIsWatchlistLoading(true);
      const item = await getWatchlistItem(url);
      setWatchStatus(item?.status || null);
      setIsWatchlistLoading(false);
    };
    checkWatchlist();
  }, [url]);

  const handleEpisodePress = (episodeUrl: string) => {
    if (!details) return;
    router.push({
      pathname: "/episode",
      params: {
        url: episodeUrl,
        provider: provider,
        animeTitle: details.title,
        animeImage: details.img,
      },
    });
  };

  const handleStatusChange = async (status: WatchStatus) => {
    if (!details || !url) return;

    if (status === watchStatus) {
      // If clicking the same status, remove it (toggle off)
      await removeFromWatchlist(url);
      setWatchStatus(null);
    } else {
      await addToWatchlist({
        animeId: url,
        title: details.title,
        image: details.img,
        status: status,
        provider: provider || 'unknown',
      });
      setWatchStatus(status);

      // Auto-sync to MyAnimeList
      try {
        const syncResult = await syncLibraryStatusToMAL(details.title, status);
        if (__DEV__) {
          console.log('[MAL Sync] Library status sync result:', syncResult);
        }
      } catch (syncError) {
        // Fail silently - don't block the UI if sync fails
        console.error('[MAL Sync] Failed to sync library status:', syncError);
      }
    }
  };

  const statuses: { label: string; value: WatchStatus }[] = [
    { label: 'Watching', value: 'watching' },
    { label: 'Plan to Watch', value: 'plan_to_watch' },
    { label: 'Completed', value: 'completed' },
    { label: 'On Hold', value: 'on_hold' },
    { label: 'Dropped', value: 'dropped' },
  ];

  return (
    <View className="flex-1 bg-background">

      {loading || !details ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
          {/* Cinematic hero */}
          <View className="w-full h-[400px]">
            <ImageBackground
              source={getImageSource(details.img, provider as string)}
              className="w-full h-full justify-end bg-secondary dark:bg-white/5"
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.45)', cardColor]}
                locations={[0, 0.55, 1]}
                style={{ paddingHorizontal: 20, paddingTop: 100, paddingBottom: 18 }}
              >
                <Text className="text-white text-[28px] font-extrabold leading-[32px] tracking-tight" numberOfLines={3}>
                  {details.title}
                </Text>
                {details.genres?.length > 0 && (
                  <Text className="text-white/70 text-[11px] font-semibold uppercase tracking-[1.5px] mt-2">
                    {[...new Set(details.genres)].slice(0, 3).join('  •  ')}
                  </Text>
                )}
              </LinearGradient>
            </ImageBackground>
          </View>

          <View className="px-5 pt-1">
            {/* Primary CTA */}
            {details.episodes.length > 0 && (
              <Button
                className="w-full mb-5 h-12 rounded-2xl flex-row gap-2"
                onPress={() => handleEpisodePress(details.episodes[0].url)}
              >
                <Play size={18} className="text-primary-foreground" />
                <Text>Ver {details.episodes[0].name}</Text>
              </Button>
            )}

            {/* Watchlist Controls */}
            <View className="mb-5">
              <Text className="text-[15px] font-bold mb-2.5">Mi biblioteca</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-2 pr-4">
                {statuses.map((s) => {
                  const active = watchStatus === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      onPress={() => handleStatusChange(s.value)}
                      className={`flex-row items-center px-4 py-2.5 rounded-full border ${active
                        ? 'bg-[#7C3AED] border-[#7C3AED]'
                        : 'bg-card border-border'
                        } mr-0`}
                      activeOpacity={0.7}
                    >
                      {active && (
                        <Check size={14} color="white" className="mr-1" />
                      )}
                      <Text
                        className={active ? 'text-white text-[13px] font-bold' : 'text-foreground text-[13px] font-medium'}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Genres */}
            <View className="flex-row flex-wrap gap-2 mb-5">
              {[...new Set(details.genres)].map((genre, index) => (
                <View
                  key={`${genre}-${index}`}
                  className="bg-secondary/70 dark:bg-white/10 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-secondary-foreground text-xs font-medium">{genre}</Text>
                </View>
              ))}
            </View>

            {/* Synopsis */}
            <Text className="text-[15px] font-bold mb-1.5">Sinopsis</Text>
            <Text className="text-[14px] text-muted-foreground leading-6 mb-6">
              {details.synopsis}
            </Text>

            {/* Episodes */}
            <View className="flex-row items-baseline gap-2 mb-3">
              <Text className="text-xl font-extrabold tracking-tight">Episodios</Text>
              <View className="px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 dark:bg-[#8B5CF6]/25">
                <Text className="text-[11px] font-bold text-[#5B21B6] dark:text-[#C4B5FD]">
                  {details.episodes.length}
                </Text>
              </View>
            </View>
            {details.episodes.length === 0 && (
              <Text className="text-[14px] text-muted-foreground leading-6 mb-2">
                Episodes will appear here once available.
              </Text>
            )}
            {details.episodes.map((ep) => (
              <Pressable
                key={ep.url}
                onPress={() => handleEpisodePress(ep.url)}
                className="active:opacity-70"
              >
                <Card className="flex-row items-center p-2.5 mb-2 rounded-[18px] border-border/60">
                  <View className="w-24 h-16 rounded-xl overflow-hidden bg-secondary dark:bg-white/10 items-center justify-center">
                    {details.img ? (
                      <ImageBackground
                        source={getImageSource(details.img, provider as string)}
                        className="w-full h-full"
                      />
                    ) : (
                      <ImageIcon size={20} className="text-muted-foreground" />
                    )}
                  </View>
                  <Text className="flex-1 ml-3 text-foreground text-[14px] font-medium" numberOfLines={2}>
                    {ep.name}
                  </Text>
                  <View className="w-9 h-9 rounded-full bg-[#7C3AED] items-center justify-center ml-2 shadow-sm shadow-black/20">
                    <Play size={15} color="white" />
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
