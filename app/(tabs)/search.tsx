import * as React from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';
import { useRouter } from 'expo-router';

type Provider = 'tioanime' | 'animeflv';

const BASE_API_URL = 'https://kujira.unusualoticramo.workers.dev';

interface Anime {
  name: string;
  image: string;
  url: string;
  type: string;
}

export default function Screen() {
  const router = useRouter();
  const [provider, setProvider] = React.useState<Provider>('tioanime');
  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<Anime[]>([]);
  const [loading, setLoading] = React.useState(false);

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

  const handleAnimePress = (anime: Anime) => {
    // router.push({
    //   pathname: '/anime-details' as any,
    //   params: { url: anime.url, title: anime.name, image: anime.image },
    // });
    router.push(`/anime-details?url=${encodeURIComponent(anime.url)}`);
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
    </View>
  );
}
