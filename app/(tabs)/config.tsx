import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
} from "react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { toast } from "sonner-native";
import { useSyncStatus, useManualSync } from "~/lib/sync/hooks";
import {
  updateClientCredentials,
  clearSyncConfig,
  savePKCEVerifier,
} from "~/lib/sync/config";
import {
  generatePKCE,
  initiateMALAuth,
} from "~/lib/sync/mal-client";
import { PKCEChallenge } from "~/lib/sync/types";

export default function ConfigScreen() {
  const { config, authenticated, loading: statusLoading, reload } = useSyncStatus();
  const { syncing, result, syncHistory, syncLibrary, syncAll } = useManualSync();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [pkceChallenge, setPkceChallenge] = useState<PKCEChallenge | null>(null);

  useEffect(() => {
    if (config?.mal) {
      setClientId(config.mal.clientId || "");
      setClientSecret(config.mal.clientSecret || "");
    }
  }, [config]);

  const handleSaveCredentials = async () => {
    if (!clientId.trim()) {
      toast.error("Client ID Required", {
        description: "Please enter your MyAnimeList Client ID",
      });
      return;
    }

    setSaving(true);
    try {
      await updateClientCredentials(clientId.trim(), clientSecret.trim());
      toast.success("Credentials Saved", {
        description: "You can now connect to MyAnimeList",
      });
      reload();
    } catch (error: any) {
      toast.error("Failed to Save", {
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectMAL = async () => {
    if (!clientId.trim()) {
      toast.error("Client ID Required", {
        description: "Please enter and save your Client ID first",
      });
      return;
    }

    setAuthenticating(true);
    try {
      // Generate PKCE challenge
      const pkce = await generatePKCE();
      setPkceChallenge(pkce);

      // Save the code verifier for later use in the callback
      await savePKCEVerifier(pkce.codeVerifier);

      console.log("[Config] PKCE verifier saved, opening browser...");

      // Initiate OAuth flow
      // The browser will redirect to /auth-callback which handles the rest
      const authResult = await initiateMALAuth(clientId.trim(), pkce);

      console.log("[Config] Auth result:", authResult.type);

      // Note: If using WebBrowser, the callback is handled by auth-callback.tsx
      // We don't need to do anything here except reload the config after
      if (authResult.type === "dismiss" || authResult.type === "cancel") {
        toast.info("Authentication Cancelled");
      }
      
      // Reload config to show updated connection status
      reload();
    } catch (error: any) {
      console.log("[Config] MAL auth error:", error);
      toast.error("Authentication Failed", {
        description: error.message || "Please check your credentials",
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

  const openMALDeveloperPortal = () => {
    Linking.openURL("https://myanimelist.net/apiconfig");
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

      {/* Credentials Section */}
      <View className="bg-card p-4 rounded-lg mb-4 border border-border">
        <Text className="text-lg font-semibold text-foreground mb-2">
          MyAnimeList Credentials
        </Text>
        <Text className="text-sm text-muted-foreground mb-3">
          Enter your MAL API credentials. Don't have one?{" "}
          <Text
            className="text-primary underline"
            onPress={openMALDeveloperPortal}
          >
            Create MAL App
          </Text>
        </Text>

        <Text className="text-sm font-medium text-foreground mb-1">
          Client ID
        </Text>
        <TextInput
          className="bg-background border border-border rounded-md px-3 py-2 mb-3 text-foreground"
          value={clientId}
          onChangeText={setClientId}
          placeholder="Enter Client ID"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        <Text className="text-sm font-medium text-foreground mb-1">
          Client Secret (Optional)
        </Text>
        <TextInput
          className="bg-background border border-border rounded-md px-3 py-2 mb-3 text-foreground"
          value={clientSecret}
          onChangeText={setClientSecret}
          placeholder="Enter Client Secret (optional)"
          placeholderTextColor="#999"
          autoCapitalize="none"
          secureTextEntry
        />

        <Button
          onPress={handleSaveCredentials}
          disabled={saving || !clientId.trim()}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text>Save Credentials</Text>
          )}
        </Button>
      </View>

      {/* Connection Actions */}
      {!authenticated ? (
        <View className="bg-card p-4 rounded-lg mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">
            Connect Account
          </Text>
          <Button
            onPress={handleConnectMAL}
            disabled={authenticating || !clientId.trim()}
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
