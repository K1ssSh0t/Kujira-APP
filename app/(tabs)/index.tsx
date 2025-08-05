import * as React from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  ImageBackground,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Card, CardTitle } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';
import { Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type Provider = 'tioanime' | 'animeflv';

const API_URLS: Record<Provider, string> = {
  tioanime: 'https://kujira.unusualoticramo.workers.dev/tioanime/latest',
  animeflv: 'https://kujira.unusualoticramo.workers.dev/animeflv/latest',
};

interface Anime {
  title: string;
  url: string;
  img: string;
  episode: string;
}

export default function Screen() {
  const router = useRouter();
  const [provider, setProvider] = React.useState<Provider>('tioanime');
  const [data, setData] = React.useState<Anime[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(API_URLS[provider]);
        let json = await response.json();

        if (provider === 'animeflv') {
          json = json.map((item: Anime) => ({
            ...item,
            img: `https://animeflv.net${item.img}`,
          }));
        }

        setData(json);
      } catch (e) {
        setError('Failed to fetch data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [provider]);

  const handleInfoPress = (anime: Anime) => {
    const animeUrlSlug = anime.url.replace(/\/episode\//, '/anime/').replace(/-\d+$/, '');
    // router.push({
    //   pathname: '/anime-details' as any,
    //   params: { url: animeUrlSlug },
    // });
    router.push(`/anime-details?url=${encodeURIComponent(animeUrlSlug)}`);
  };

  const handleCardPress = (url: string) => {
    router.push(`/episode?url=${encodeURIComponent(url)}`);
  };

  const renderItem = ({ item }: { item: Anime }) => (
    <Pressable onPress={() => handleCardPress(item.url)} className='flex-1/2 p-1'>
      <Card className='w-full rounded-2xl overflow-hidden border-0'>
        <ImageBackground source={{ uri: item.img }} className='w-full h-64 justify-end'>
          <View className='bg-black/60 p-3'>
            <CardTitle className='text-white text-base font-bold mb-1'>
              {item.title}
            </CardTitle>
            <Text className='text-white/80 text-sm'>{item.episode}</Text>
          </View>
          <TouchableOpacity
            className='absolute top-2 right-2 bg-secondary dark:bg-secondary-foreground p-2 rounded-full'
            onPress={(e) => {
              e.stopPropagation(); // Prevent card press from firing
              handleInfoPress(item);
            }}
          >
            <Info size={20} className='text-secondary-foreground dark:text-primary' />
          </TouchableOpacity>
        </ImageBackground>
      </Card>
    </Pressable>
  );

  return (
    <View className='flex-1 p-4 bg-background'>
      <View className='flex-row justify-center mb-4 p-1 bg-muted rounded-lg'>
        <Pressable
          onPress={() => setProvider('tioanime')}
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
          onPress={() => setProvider('animeflv')}
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

      {loading ? (
        <View className='flex-1 justify-center items-center'>
          <ActivityIndicator size='large' />
        </View>
      ) : error ? (
        <View className='flex-1 justify-center items-center'>
          <Text>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${provider}-${item.title}-${index}`}
          contentContainerClassName='gap-2'
          numColumns={1}
          key={provider}
        />
      )}
    </View>
  );
}
