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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import axios from 'axios';
import { addToWatchlist, getWatchlistItem, removeFromWatchlist, WatchStatus } from '~/lib/watchlist';

const BASE_API_URL = 'https://kujira.unusualoticramo.workers.dev';

interface AnimeDetails {
  title: string;
  img: string;
  synopsis: string;
  genres: string[];
  episodes: { name: string; url: string }[];
}

export default function AnimeDetailsScreen() {
  const router = useRouter();
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
    <View className="flex-1 bg-card">

      {loading || !details ? (
        <ActivityIndicator size="large" className="flex-1" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageBackground
            source={{ uri: details.img }}
            className="w-full h-64"
          />
          <View className="p-4">
            <Text className="text-2xl font-bold mb-2">{details.title}</Text>

            {/* Watchlist Controls */}
            <View className="mb-4">
              <Text className="text-lg font-semibold mb-2">Add to Library</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {statuses.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() => handleStatusChange(s.value)}
                    className={`px-4 py-2 rounded-full border ${watchStatus === s.value
                      ? 'bg-primary border-primary'
                      : 'bg-background border-border'
                      } mr-2`}
                    activeOpacity={1}
                  >
                    <Text
                      className={`${watchStatus === s.value ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="flex-row flex-wrap gap-2 mb-4">
              {[...new Set(details.genres)].map((genre, index) => (
                <View key={`${genre}-${index}`} className="bg-secondary px-3 py-1 rounded-full">
                  <Text className="text-secondary-foreground text-xs">{genre}</Text>
                </View>
              ))}
            </View>
            <Text className="text-base text-muted-foreground mb-4">
              {details.synopsis}
            </Text>
            <Text className="text-xl font-bold mb-2">Episodes</Text>
            {details.episodes.map((ep) => (
              <Pressable
                key={ep.url}
                onPress={() => handleEpisodePress(ep.url)}
              >
                <View className="bg-secondary p-3 rounded-lg mb-2">
                  <Text className="text-secondary-foreground">{ep.name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
