import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { toast } from "sonner-native";
import { useSyncStatus, useManualSync } from "~/lib/sync/hooks";
import { clearSyncConfig } from "~/lib/sync/config";
import { initiateMALAuth, checkBackendStatus } from "~/lib/sync/mal-client";

export default function ConfigScreen() {
  const { config, authenticated, loading: statusLoading, reload } = useSyncStatus();
  const { syncing, result, syncHistory, syncLibrary, syncAll } = useManualSync();

  const [authenticating, setAuthenticating] = useState(false);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    const status = await checkBackendStatus();
    setBackendReady(status.configured);
    if (!status.configured) {
      console.log("[Config] Backend status:", status.message);
    }
  };

  const handleConnectMAL = async () => {
    if (!backendReady) {
      toast.error("Backend Not Ready", {
        description: "The Kujira backend is not configured for MAL authentication",
      });
      return;
    }

    setAuthenticating(true);
    try {
      console.log("[Config] Starting MAL authentication via backend...");

      // Initiate OAuth flow - backend handles everything
      const authResult = await initiateMALAuth();

      console.log("[Config] Auth result:", authResult.type);

      // The callback is handled by auth-callback.tsx
      if (authResult.type === "dismiss" || authResult.type === "cancel") {
        toast.info("Authentication Cancelled");
      }
      
      // Reload config to show updated connection status
      reload();
    } catch (error: any) {
      console.log("[Config] MAL auth error:", error);
      toast.error("Authentication Failed", {
        description: error.message || "Please try again",
      });
    } finally {
      setAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect MyAnimeList",
      "Are you sure you want to disconnect your MyAnimeList account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await clearSyncConfig();
              toast.success("Disconnected", {
                description: "Your MyAnimeList account has been disconnected",
              });
              reload();
            } catch (error: any) {
              toast.error("Failed to Disconnect", {
                description: error.message,
              });
            }
          },
        },
      ]
    );
  };

  const handleSyncHistory = async () => {
    await syncHistory();
    if (result) {
      if (result.success) {
        toast.success("History Synced", {
          description: `Synced ${result.updated?.length || 0} items`,
        });
      } else {
        toast.error("Sync Failed", {
          description: result.message,
        });
      }
    }
  };

  const handleSyncLibrary = async () => {
    await syncLibrary();
    if (result) {
      if (result.success) {
        toast.success("Library Synced", {
          description: `Synced ${result.uploaded?.length || 0} items`,
        });
      } else {
        toast.error("Sync Failed", {
          description: result.message,
        });
      }
    }
  };

  const handleSyncAll = async () => {
    await syncAll();
    if (result) {
      if (result.success) {
        const totalSynced =
          (result.updated?.length || 0) + (result.uploaded?.length || 0);
        toast.success("All Data Synced", {
          description: `Synced ${totalSynced} items`,
        });
      } else {
        toast.error("Sync Failed", {
          description: result.message,
        });
      }
    }
  };

  if (statusLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-foreground mb-4">
        MyAnimeList Sync
      </Text>

      {/* Connection Status */}
      <View className="bg-card p-4 rounded-lg mb-4 border border-border">
        <Text className="text-lg font-semibold text-foreground mb-2">
          Connection Status
        </Text>
        {authenticated && config?.mal?.username ? (
          <View>
            <View className="bg-green-500/20 px-3 py-2 rounded-md mb-2">
              <Text className="text-green-600 dark:text-green-400 font-medium">
                Connected as {config.mal.username}
              </Text>
            </View>
            {config.lastSyncAt && (
              <Text className="text-sm text-muted-foreground">
                Last sync:{" "}
                {new Date(config.lastSyncAt).toLocaleString()}
              </Text>
            )}
          </View>
        ) : (
          <View className="bg-yellow-500/20 px-3 py-2 rounded-md">
            <Text className="text-yellow-600 dark:text-yellow-400 font-medium">
              Not connected
            </Text>
          </View>
        )}
      </View>

      {/* Backend Status */}
      {backendReady === false && (
        <View className="bg-red-500/20 p-4 rounded-lg mb-4 border border-red-500/30">
          <Text className="text-red-600 dark:text-red-400 font-medium mb-1">
            Backend Not Configured
          </Text>
          <Text className="text-sm text-red-600 dark:text-red-400">
            The Kujira backend needs to be configured with MAL credentials.
            Contact the app administrator.
          </Text>
        </View>
      )}

      {/* Connection Actions */}
      {!authenticated ? (
        <View className="bg-card p-4 rounded-lg mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-2">
            Connect Account
          </Text>
          <Text className="text-sm text-muted-foreground mb-3">
            Connect your MyAnimeList account to sync your watch history and library.
            No API credentials needed - Kujira handles everything!
          </Text>
          <Button
            onPress={handleConnectMAL}
            disabled={authenticating || backendReady === false}
          >
            {authenticating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text>Connect with MyAnimeList</Text>
            )}
          </Button>
        </View>
      ) : (
        <>
          {/* Manual Sync Section */}
          <View className="bg-card p-4 rounded-lg mb-4 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-3">
              Manual Sync
            </Text>
            <Text className="text-sm text-muted-foreground mb-3">
              Sync your local data to MyAnimeList
            </Text>

            <View className="gap-y-2">
              <Button
                onPress={handleSyncHistory}
                disabled={syncing}
                variant="outline"
              >
                {syncing ? (
                  <ActivityIndicator />
                ) : (
                  <Text>Sync History</Text>
                )}
              </Button>

              <Button
                onPress={handleSyncLibrary}
                disabled={syncing}
                variant="outline"
              >
                {syncing ? (
                  <ActivityIndicator />
                ) : (
                  <Text>Sync Library</Text>
                )}
              </Button>

              <Button onPress={handleSyncAll} disabled={syncing}>
                {syncing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text>Sync All Data</Text>
                )}
              </Button>
            </View>

            {syncing && (
              <Text className="text-sm text-muted-foreground mt-2 text-center">
                Syncing... This may take a while
              </Text>
            )}
          </View>

          {/* Disconnect Section */}
          <View className="bg-card p-4 rounded-lg mb-4 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-3">
              Disconnect
            </Text>
            <Button
              onPress={handleDisconnect}
              variant="destructive"
            >
              <Text>Disconnect MyAnimeList</Text>
            </Button>
          </View>
        </>
      )}

      {/* Info Section */}
      <View className="bg-card p-4 rounded-lg mb-4 border border-border">
        <Text className="text-sm text-muted-foreground">
          Auto-sync is enabled by default. Your watch history and library
          changes will be automatically synced to MyAnimeList when you watch
          episodes or update your library.
        </Text>
      </View>
    </ScrollView>
  );
}
