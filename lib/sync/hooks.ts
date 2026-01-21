import { useState, useEffect, useCallback } from "react";
import { SyncConfig, SyncResult } from "./types";
import { loadSyncConfig, isAuthenticated } from "./config";
import { syncAllHistoryToMAL, syncAllLibraryToMAL, syncAllToMAL } from "./service";

/**
 * Hook to get current sync status
 */
export function useSyncStatus() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const loadedConfig = await loadSyncConfig();
      setConfig(loadedConfig);

      const isAuth = await isAuthenticated();
      setAuthenticated(isAuth);
    } catch (error) {
      console.error("[useSyncStatus] Failed to load status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return {
    config,
    authenticated,
    loading,
    reload: loadStatus,
  };
}

/**
 * Hook for manual sync operations
 */
export function useManualSync() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  const syncHistory = useCallback(async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    
    try {
      const syncResult = await syncAllHistoryToMAL();
      setResult(syncResult);
      
      if (!syncResult.success) {
        setError(syncResult.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sync history");
    } finally {
      setSyncing(false);
    }
  }, []);

  const syncLibrary = useCallback(async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    
    try {
      const syncResult = await syncAllLibraryToMAL();
      setResult(syncResult);
      
      if (!syncResult.success) {
        setError(syncResult.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sync library");
    } finally {
      setSyncing(false);
    }
  }, []);

  const syncAll = useCallback(async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    
    try {
      const syncResult = await syncAllToMAL();
      setResult(syncResult);
      
      if (!syncResult.success) {
        setError(syncResult.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sync");
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    syncing,
    error,
    result,
    syncHistory,
    syncLibrary,
    syncAll,
  };
}
