import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { toast } from "sonner-native";
import { getUserInfo } from "~/lib/sync/mal-client";
import { updateMALTokens, clearAuthState } from "~/lib/sync/config";

export default function AuthCallbackScreen() {
  const router = useRouter();
  // Backend redirects with tokens in query params
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: string;
    error?: string;
    error_description?: string;
  }>();
  const [processing, setProcessing] = React.useState(true);
  const [message, setMessage] = React.useState("Processing authentication...");

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log("[Auth Callback] Received params:", Object.keys(params));
      
      // Check for error in callback
      if (params.error) {
        console.log("[Auth Callback] Error from backend:", params.error);
        setMessage("Authentication failed");
        toast.error("Authentication Failed", {
          description: params.error_description || params.error || "Unknown error",
        });
        setTimeout(() => {
          router.replace("/(tabs)/config");
        }, 2000);
        return;
      }

      // Check for tokens - backend now sends tokens directly
      if (!params.access_token || !params.refresh_token || !params.expires_in) {
        console.log("[Auth Callback] Missing tokens in callback");
        setMessage("Missing authentication data");
        toast.error("Authentication Failed", {
          description: "No tokens received from server",
        });
        setTimeout(() => {
          router.replace("/(tabs)/config");
        }, 2000);
        return;
      }

      console.log("[Auth Callback] Tokens received successfully");

      setMessage("Saving tokens...");
      
      // Save tokens
      const expiresIn = parseInt(params.expires_in, 10);
      await updateMALTokens(
        params.access_token,
        params.refresh_token,
        expiresIn,
        undefined // username will be updated after getting user info
      );

      console.log("[Auth Callback] Tokens saved, now getting user info...");

      setMessage("Getting user info...");
      
      const userInfo = await getUserInfo();

      console.log("[Auth Callback] User info retrieved:", userInfo.name);

      // Update config with username
      await updateMALTokens(
        params.access_token,
        params.refresh_token,
        expiresIn,
        userInfo.name
      );

      // Clear the auth state from storage
      await clearAuthState();

      setMessage("Success!");
      
      toast.success("Connected Successfully", {
        description: `Welcome, ${userInfo.name}!`,
      });

      setTimeout(() => {
        router.replace("/(tabs)/config");
      }, 1500);
    } catch (error: any) {
      console.log("[Auth Callback] ERROR:", error);
      console.log("[Auth Callback] Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
      setMessage("Authentication failed");
      toast.error("Authentication Failed", {
        description: error.message || "Please try again",
        duration: 4000,
      });
      setTimeout(() => {
        router.replace("/(tabs)/config");
      }, 3000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-background p-4">
      <ActivityIndicator size="large" className="mb-4" />
      <Text className="text-lg text-foreground text-center">{message}</Text>
    </View>
  );
}
