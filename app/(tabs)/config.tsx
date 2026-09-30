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
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-32">
      <Text className="text-[28px] font-extrabold tracking-tight text-foreground">
        MyAnimeList Sync
      </Text>
      <Text className="text-[13px] text-muted-foreground mt-0.5 mb-4">
        Conecta y sincroniza tu progreso
      </Text>

      {/* Connection Status */}
      <View className="bg-card p-4 rounded-[20px] mb-3 border border-border/60">
        <Text className="text-[15px] font-bold text-foreground mb-2.5">
          Connection Status
        </Text>
        {authenticated && config?.mal?.username ? (
          <View>
            <View className="bg-green-500/15 px-3 py-2.5 rounded-xl mb-2 flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-green-500" />
              <Text className="text-green-600 dark:text-green-400 font-semibold text-[14px]">
                Connected as {config.mal.username}
              </Text>
            </View>
            {config.lastSyncAt && (
              <Text className="text-xs text-muted-foreground">
                Last sync:{" "}
                {new Date(config.lastSyncAt).toLocaleString()}
              </Text>
            )}
          </View>
        ) : (
          <View className="bg-amber-500/15 px-3 py-2.5 rounded-xl flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-amber-500" />
            <Text className="text-amber-600 dark:text-amber-400 font-semibold text-[14px]">
              Not connected
            </Text>
          </View>
        )}
      </View>

      {/* Backend Status */}
      {backendReady === false && (
        <View className="bg-destructive/10 p-4 rounded-[20px] mb-3 border border-destructive/20">
          <Text className="text-destructive font-bold text-[14px] mb-1">
            Backend Not Configured
          </Text>
          <Text className="text-[13px] leading-5 text-muted-foreground">
            The Kujira backend needs to be configured with MAL credentials.
            Contact the app administrator.
          </Text>
        </View>
      )}

      {/* Connection Actions */}
      {!authenticated ? (
        <View className="bg-card p-5 rounded-[20px] mb-3 border border-border/60">
          <Text className="text-[15px] font-bold text-foreground mb-1.5">
            Connect Account
          </Text>
          <Text className="text-[13px] leading-5 text-muted-foreground mb-4">
            Connect your MyAnimeList account to sync your watch history and library.
            No API credentials needed - Kujira handles everything!
          </Text>
          <Button
            onPress={handleConnectMAL}
            disabled={authenticating || backendReady === false}
            className="h-12 rounded-2xl"
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
          <View className="bg-card p-5 rounded-[20px] mb-3 border border-border/60">
            <Text className="text-[15px] font-bold text-foreground mb-1">
              Manual Sync
            </Text>
            <Text className="text-[13px] text-muted-foreground mb-4">
              Sync your local data to MyAnimeList
            </Text>

            <View className="gap-y-2.5">
              <Button
                onPress={handleSyncHistory}
                disabled={syncing}
                variant="outline"
                className="h-12 rounded-2xl"
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
                className="h-12 rounded-2xl"
              >
                {syncing ? (
                  <ActivityIndicator />
                ) : (
                  <Text>Sync Library</Text>
                )}
              </Button>

              <Button onPress={handleSyncAll} disabled={syncing} className="h-12 rounded-2xl">
                {syncing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text>Sync All Data</Text>
                )}
              </Button>
            </View>

            {syncing && (
              <Text className="text-[13px] text-muted-foreground mt-3 text-center">
                Syncing... This may take a while
              </Text>
            )}
          </View>

          {/* Disconnect Section */}
          <View className="bg-card p-5 rounded-[20px] mb-3 border border-border/60">
            <Text className="text-[15px] font-bold text-foreground mb-3">
              Disconnect
            </Text>
            <Button
              onPress={handleDisconnect}
              variant="destructive"
              className="h-12 rounded-2xl"
            >
              <Text>Disconnect MyAnimeList</Text>
            </Button>
          </View>
        </>
      )}

      {/* Info Section */}
      <View className="bg-secondary/60 p-4 rounded-[20px] mb-4 border border-border/40">
        <Text className="text-[13px] leading-5 text-muted-foreground">
          Auto-sync is enabled by default. Your watch history and library
          changes will be automatically synced to MyAnimeList when you watch
          episodes or update your library.
        </Text>
      </View>
    </ScrollView>
  );
}
