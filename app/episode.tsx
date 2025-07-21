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
import { X } from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as IntentLauncher from 'expo-intent-launcher';

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

  const [playerModalVisible, setPlayerModalVisible] = React.useState(false);
  const [selectedServer, setSelectedServer] = React.useState<Server | null>(null);

  const [videoPlayerVisible, setVideoPlayerVisible] = React.useState(false);
  const [videoSource, setVideoSource] = React.useState<{
    uri: string;
    headers?: Record<string, string>;
  } | null>(null);

  const player = useVideoPlayer(videoSource?.uri || '');

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
    if (videoSource?.uri) {
      player.play();
    }
  }, [videoSource, player]);

  const handleServerPress = (server: Server) => {
    setSelectedServer(server);
    setPlayerModalVisible(true);
  };

  const openInPlayer = (playerType: 'mpv' | 'vlc' | 'browser' | 'expo') => {
    if (!selectedServer) return;

    const sourceUrl = selectedServer.source;

    if (playerType === 'expo') {
      let headers: Record<string, string> | undefined;
      if (selectedServer.name === 'YourUpload') {
        headers = {
          Referer: selectedServer.url,
        };
      }
      setVideoSource({ uri: sourceUrl, headers });
      setVideoPlayerVisible(true);
      setPlayerModalVisible(false);
      return;
    }

    if (playerType === 'browser') {
      Linking.openURL(selectedServer.url).catch((e) => console.error("Couldn't load page", e));
      setPlayerModalVisible(false);
      return;
    }

    if (Platform.OS === 'android') {
      const packages = {
        mpv: 'is.xyz.mpv',
        vlc: 'org.videolan.vlc',
      };
      const playerPackage = packages[playerType];

      let extras: Record<string, any> = {};
      if (selectedServer.name === 'YourUpload') {
        extras['android.intent.extra.HEADERS'] = `Referer\t${selectedServer.url}\n`;
      }

      IntentLauncher.startActivityAsync('android.intent.action.VIEW', {

        data: sourceUrl,
        packageName: playerPackage,
        extra: extras,
      }).catch((err) => {
        console.error(`Failed to open ${playerType} with IntentLauncher, trying browser.`, err);
        Linking.openURL(selectedServer.url).catch((e) => console.error("Couldn't load page", e));
      });
    } else {
      Linking.openURL(sourceUrl).catch((err) => console.error("Couldn't load page", err));
    }

    setPlayerModalVisible(false);
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
              onPress={() => handleServerPress(server)}
              disabled={!isPressable}
            >
              <Text>{server.name}</Text>
            </Button>
          );
        })}
      </View>

      <Modal
        animationType='fade'
        transparent={true}
        visible={playerModalVisible}
        onRequestClose={() => setPlayerModalVisible(false)}
      >
        <View className='flex-1 justify-center items-center bg-black/80 p-4'>
          <View className='w-full max-w-sm bg-card rounded-2xl p-6'>
            <TouchableOpacity
              className='absolute top-4 right-4 z-10'
              onPress={() => setPlayerModalVisible(false)}
            >
              <X size={24} className='text-muted-foreground' />
            </TouchableOpacity>
            <Text className='text-xl font-bold text-foreground mb-4'>Open with...</Text>
            <View className='gap-y-3'>
              <Button onPress={() => openInPlayer('expo')}>
                <Text>Play in App</Text>
              </Button>
              <Button onPress={() => openInPlayer('mpv')}>
                <Text>MPV</Text>
              </Button>
              <Button onPress={() => openInPlayer('vlc')}>
                <Text>VLC</Text>
              </Button>
              <Button variant='secondary' onPress={() => openInPlayer('browser')}>
                <Text>Browser</Text>
              </Button>
            </View>
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
        supportedOrientations={['portrait', 'landscape']}
      >
        <View className='flex-1 bg-black justify-center'>
          {videoSource && (
            <VideoView
              player={player}
              style={{ flex: 1 }}
              contentFit="contain"
            // controls={true}
            />
          )}
          <TouchableOpacity
            className='absolute top-10 right-5 z-10'
            onPress={() => {
              setVideoPlayerVisible(false);
              setVideoSource(null);
              player.pause();
            }}
          >
            <X size={30} color='white' />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}