import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { toast } from "sonner-native";
import {
  exchangeCodeForToken,
  getUserInfo,
} from "~/lib/sync/mal-client";
import { updateMALTokens, loadSyncConfig } from "~/lib/sync/config";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [processing, setProcessing] = React.useState(true);
  const [message, setMessage] = React.useState("Processing authentication...");

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log("[Auth Callback] Received params:", params);
      
      // Check for error in callback
      if (params.error) {
        console.log("[Auth Callback] Error from MAL:", params.error);
        setMessage("Authentication failed");
        toast.error("Authentication Failed", {
          description: params.error || "Unknown error",
        });
        setTimeout(() => {
          router.replace("/(tabs)/config");
        }, 2000);
        return;
      }

      // Check for code parameter
      if (!params.code) {
        console.log("[Auth Callback] No code received. Params:", params);
        setMessage("No authorization code received");
        toast.error("Authentication Failed", {
          description: "No authorization code received",
        });
        setTimeout(() => {
          router.replace("/(tabs)/config");
        }, 2000);
        return;
      }

      console.log("[Auth Callback] Authorization code received:", params.code.substring(0, 10) + "...");

      // Get stored config to retrieve credentials
      const config = await loadSyncConfig();
      
      if (!config?.mal?.clientId) {
        setMessage("Missing credentials");
        toast.error("Configuration Error", {
          description: "Client ID not found. Please configure credentials first.",
        });
        setTimeout(() => {
          router.replace("/(tabs)/config");
        }, 2000);
        return;
      }

      // Get the PKCE code verifier that was saved before starting auth
      const { getPKCEVerifier, clearPKCEVerifier } = await import("~/lib/sync/config");
      const codeVerifier = await getPKCEVerifier();
      
      console.log("[Auth Callback] Code verifier retrieved:", codeVerifier ? "YES" : "NO");
      
      if (!codeVerifier) {
        console.log("[Auth Callback] PKCE verifier not found in storage");
        setMessage("Missing PKCE verifier");
        toast.error("Authentication Error", {
          description: "PKCE verifier not found. Please try connecting again.",
        });
        setTimeout(() => {
          router.replace("/(tabs)/config");
        }, 2000);
        return;
      }
      
      console.log("[Auth Callback] Starting token exchange...");
      console.log("[Auth Callback] Client ID:", config.mal.clientId);
      console.log("[Auth Callback] Has Client Secret:", !!config.mal.clientSecret);
      
      setMessage("Exchanging authorization code...");
      
      const tokenResponse = await exchangeCodeForToken(
        params.code,
        codeVerifier,
        config.mal.clientId,
        config.mal.clientSecret || ""
      );
      
      console.log("[Auth Callback] Token exchange successful");

      setMessage("Saving tokens...");
      
      // Save tokens FIRST before calling getUserInfo
      await updateMALTokens(
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_in,
        undefined // username will be updated after getting user info
      );

      console.log("[Auth Callback] Tokens saved, now getting user info...");

      setMessage("Getting user info...");
      
      const userInfo = await getUserInfo();

      console.log("[Auth Callback] User info retrieved:", userInfo.name);

      // Update config with username
      await updateMALTokens(
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_in,
        userInfo.name
      );

      // Clear the PKCE verifier from storage
      await clearPKCEVerifier();

      setMessage("Success!");
      
      toast.success("Connected Successfully", {
        description: `Welcome, ${userInfo.name}!`,
      });

      setTimeout(() => {
        router.replace("/(tabs)/config");
      }, 1500);
    } catch (error: any) {
      console.log("[Auth Callback] ❌ ERROR:", error);
      console.log("[Auth Callback] ❌ Error details:", {
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
