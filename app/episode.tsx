import * as React from 'react';
import { View, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';

interface Server {
  name: string;
  url: string;
  source: string;
}

interface EpisodeDetails {
  title: string;
  servers: Server[];
}

const BASE_API_URL = 'https://kujira.unusualoticramo.workers.dev';

export default function EpisodeScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [details, setDetails] = React.useState<EpisodeDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!url) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const episodeUrl = `${BASE_API_URL}${url}`;
        const response = await fetch(episodeUrl);
        const json = await response.json();
        setDetails(json);
      } catch (e) {
        setError('Failed to fetch episode details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  const handleServerPress = (serverUrl: string) => {
    Linking.openURL(serverUrl).catch((err) =>
      console.error("Couldn't load page", err)
    );
  };

  if (loading) {
    return (
      <View className='flex-1 justify-center items-center bg-background'>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  if (error || !details) {
    return (
      <View className='flex-1 justify-center items-center bg-background'>
        <Text className='text-destructive'>{error || 'Could not load details'}</Text>
      </View>
    );
  }

  return (
    <ScrollView className='flex-1 bg-background p-6'>
      <Text className='text-3xl font-bold text-foreground mb-6 text-center'>
        {details.title}
      </Text>
      <View className='gap-y-4'>
        {details.servers.map((server) => {
          const isPressable = server.source && server.source !== 'unknown';
          return (
            <Button
              key={server.name}
              variant='outline'
              className='w-full'
              onPress={() => handleServerPress(server.url)}
              disabled={!isPressable}
            >
              <Text>{server.name}</Text>
            </Button>
          );
        })}
      </View>
    </ScrollView>
  );
}