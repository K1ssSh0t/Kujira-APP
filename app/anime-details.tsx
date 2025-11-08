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
