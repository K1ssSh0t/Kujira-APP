import * as React from 'react';
import {
  View,
  ActivityIndicator,
  Linking,
  ScrollView,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';
import { Server, X } from 'lucide-react-native';
import { VideoView, useVideoPlayer, VideoSource } from 'expo-video';
import * as IntentLauncher from 'expo-intent-launcher';
import { extractStreamTapeUrl } from '~/lib/extractors/streamtape';
import { fetchMp4Link } from '~/lib/extractors/voe';

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

  const [videoPlayerVisible, setVideoPlayerVisible] = React.useState(false);
  const [videoSource, setVideoSource] = React.useState<VideoSource | null>(null);
  const [isOptionModalVisible, setOptionModalVisible] = React.useState(false);
  const [selectedServer, setSelectedServer] = React.useState<Server | null>(null);

  const player = useVideoPlayer(videoSource);

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

  React.useEffect(() => {
    if (videoPlayerVisible && player) {
      player.play();
    }
  }, [videoPlayerVisible, player]);

  const handleServerPress = (server: Server) => {
    setSelectedServer(server);
    setOptionModalVisible(true);
  };

  const handleInternalPlay = async () => {
    if (!selectedServer) return;

    let sourceUrl = selectedServer.source;
    const headers = {
      'Referer': selectedServer.url,
    };
    if (selectedServer.name === 'Stape') {
      // console.log('Extracting StreamTape URL for internal player');
      sourceUrl = await extractStreamTapeUrl(selectedServer.url)
    }
    if (selectedServer.name == "Voe") {
      // console.log('Extracting MP4 link from Voe');
      sourceUrl = await fetchMp4Link(selectedServer.url, 'https://voe.sx/') as string;
      // console.log('Extracted MP4 link:', sourceUrl);
    }
    console.log('Playing video internally', sourceUrl, headers);
    setVideoSource({ uri: sourceUrl, headers });
    setVideoPlayerVisible(true);
    setOptionModalVisible(false);
    setSelectedServer(null);
  };

  const handleExternalPlay = async () => {
    if (!selectedServer) return;

    const server = selectedServer;
    let sourceUrl = server.source;
    setOptionModalVisible(false);
    setSelectedServer(null);

    if (Platform.OS === 'android') {
      const headersArray = Object.entries({
        Referer: server.url,
      }).map(([key, value]) => `${key}: ${value}`);

      const extras = {
        'android.intent.extra.HTTP_HEADERS': headersArray,
      };
      if (server.name == 'Stape') {
        // console.log('Extracting StreamTape URL for external player');
        sourceUrl = await extractStreamTapeUrl(server.url);
        // console.log('Extracted StreamTape URL:', sourceUrl);
      }
      if (server.name == "Voe") {
        // console.log('Extracting MP4 link from Voe');
        sourceUrl = await fetchMp4Link(server.url, 'https://voe.sx/') as string;
        // console.log('Extracted MP4 link:', sourceUrl);
      }
      console.log('Opening video with IntentLauncher', sourceUrl, extras);
      IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: sourceUrl,
        extra: extras,
        type: 'video/*',
      }).catch((err) => {
        console.error('Failed to open with IntentLauncher, trying browser.', err);
        Linking.openURL(server.url).catch((e) => console.error("Couldn't load page", e));
      });
    } else {
      Linking.openURL(sourceUrl).catch(() => {
        Linking.openURL(server.url).catch((e) => console.error("Couldn't load page", e));
      });
    }
  };

  const closeOptionModal = () => {
    setOptionModalVisible(false);
    setSelectedServer(null);
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
          const validSources = ['streamtape', 'voe', 'YourUpload', 'Stape'];
          // const isPressable = validSources.includes(server.name);
          const isPressable = validSources.some(name => server.name.toLowerCase().includes(name.toLowerCase()));
          return (
            <Button
              key={server.name}
              variant='outline'
              className='w-full'
              onPress={() => handleServerPress(server)}
              disabled={!isPressable}>
              <Text>{server.name}</Text>
            </Button>
          );
        })}
      </View>

      <Modal
        visible={isOptionModalVisible}
        onRequestClose={closeOptionModal}
        transparent
        animationType='fade'>
        <View className='flex-1 justify-center items-center bg-black/50 p-4'>
          <View className='bg-card p-6 rounded-lg w-full max-w-sm'>
            <Text className='text-lg font-bold text-foreground text-center mb-4'>
              Seleccionar reproductor
            </Text>
            <View className='gap-y-2'>
              <Button onPress={handleInternalPlay}>
                <Text>Interno</Text>
              </Button>
              <Button onPress={handleExternalPlay} variant='secondary'>
                <Text>Externo</Text>
              </Button>
            </View>
            <Button
              onPress={closeOptionModal}
              variant='ghost'
              className='mt-4'>
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
        supportedOrientations={['portrait', 'landscape']}>
        <View className='flex-1 bg-black justify-center'>
          {videoSource && (
            <VideoView
              player={player}
              style={{ flex: 1 }}
              contentFit='contain'
            // controls={true}
            />
          )}
          <TouchableOpacity
            className='absolute top-10 right-5 z-10'
            onPress={() => {
              setVideoPlayerVisible(false);
              setVideoSource(null);
              player.pause();
            }}>
            <X size={30} color='white' />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}
