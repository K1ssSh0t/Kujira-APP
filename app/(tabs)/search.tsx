import * as React from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  ImageBackground,
  Pressable,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type Provider = 'tioanime' | 'animeflv';

const BASE_API_URL = 'https://kujira.unusualoticramo.workers.dev';

interface Anime {
  name: string;
  image: string;
  url: string;
  type: string;
}

interface AnimeDetails {
  title: string;
  img: string;
  synopsis: string;
  genres: string[];
  episodes: { name: string; url: string }[];
}

export default function Screen() {
  const router = useRouter();
  const [provider, setProvider] = React.useState<Provider>('tioanime');
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<Anime[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedAnime, setSelectedAnime] = React.useState<Anime | null>(null);
  const [animeDetails, setAnimeDetails] = React.useState<AnimeDetails | null>(null);
  const [modalLoading, setModalLoading] = React.useState(false);

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setResults([]);
    setSearch('');
  };

  const handleSearch = async () => {
    if (!search) return;
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch(`${BASE_API_URL}/${provider}/search?title=${search}`);
      let data = await response.json();

      if (provider === 'animeflv') {
        data = data.map((item: Anime) => ({
          ...item,
          image: `${item.image}`,
        }));
      }

      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimePress = async (anime: Anime) => {
    setSelectedAnime(anime);
    setModalVisible(true);
    setModalLoading(true);
    setAnimeDetails(null);

    try {
      const detailsUrl = `${BASE_API_URL}${anime.url}`;
      const response = await fetch(detailsUrl);
      const json = await response.json();
      setAnimeDetails(json);
    } catch (error) {
      console.error('Failed to fetch anime details:', error);
    }
    setModalLoading(false);
  };

  const handleEpisodePress = (url: string) => {
    setModalVisible(false);
    router.push(`/episode?url=${encodeURIComponent(url)}`);
  };

  return (
    <View className="flex-1 p-4 bg-background">
      <View className="flex-row justify-center mb-4 p-1 bg-muted rounded-lg">
        <Pressable
          onPress={() => handleProviderChange('tioanime')}
          className={cn(
            'flex-1 p-2 items-center rounded-md',
            provider === 'tioanime' && 'bg-primary'
          )}
        >
          <Text className={cn(provider === 'tioanime' && 'text-primary-foreground')}>
            TioAnime
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleProviderChange('animeflv')}
          className={cn(
            'flex-1 p-2 items-center rounded-md',
            provider === 'animeflv' && 'bg-primary'
          )}
        >
          <Text className={cn(provider === 'animeflv' && 'text-primary-foreground')}>
            AnimeFLV
          </Text>
        </Pressable>
      </View>

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
              <Image source={{ uri: item.image }} className="w-16 h-24 rounded-md mr-4" />
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">{item.name}</Text>
                <Text className="text-muted-foreground">{item.type}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/80">
          <View className="w-11/12 h-5/6 bg-card rounded-2xl p-4">
            <TouchableOpacity
              className="absolute top-4 right-4 z-10"
              onPress={() => setModalVisible(false)}
            >
              <X size={24} className="text-foreground" />
            </TouchableOpacity>
            {modalLoading || !animeDetails ? (
              <ActivityIndicator size="large" className="flex-1" />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <ImageBackground
                  source={{ uri: animeDetails.img }}
                  className="w-full h-56 rounded-xl overflow-hidden mb-4"
                />
                <Text className="text-2xl font-bold mb-2 text-foreground">{animeDetails.title}</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {animeDetails.genres.map((genre) => (
                    <View key={genre} className="bg-secondary px-3 py-1 rounded-full">
                      <Text className="text-secondary-foreground text-xs">{genre}</Text>
                    </View>
                  ))}
                </View>
                <Text className="text-base text-muted-foreground mb-4">
                  {animeDetails.synopsis}
                </Text>
                <Text className="text-xl font-bold mb-2 text-foreground">Episodes</Text>
                {animeDetails.episodes.map((ep) => (
                  <Pressable key={ep.url} onPress={() => handleEpisodePress(ep.url)}>
                    <View className="bg-secondary p-3 rounded-lg mb-2">
                      <Text className="text-secondary-foreground">{ep.name}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}