import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Network from "expo-network";
import * as React from "react";
import { Alert, AppState, Platform } from "react-native";
import { toast } from "sonner-native";

import {
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_STORAGE_KEYS,
} from "./config";
import { fetchLatestRelease, isNewerVersion, parseVersion } from "./github";
import {
  cleanupOldUpdateApks,
  downloadUpdateApk,
  findDownloadedUpdateApk,
  installUpdateApk,
  openUnknownSourcesSettings,
} from "./install";
import type { UpdateInfo, UpdaterPhase } from "./types";

type CheckOptions = {
  /** Ignora el intervalo de 24 h (botón manual). */
  force?: boolean;
  /** No muestra toasts de resultados normales. */
  silent?: boolean;
};

type UpdaterPreferences = {
  autoCheck: boolean;
  autoDownload: boolean;
  wifiOnly: boolean;
};

type UpdaterContextValue = {
  currentVersion: string;
  currentBuild: string | null;
  phase: UpdaterPhase;
  release: UpdateInfo | null;
  progress: number;
  error: string | null;
  lastCheckedAt: number | null;
  autoCheck: boolean;
  autoDownload: boolean;
  wifiOnly: boolean;
  isAndroid: boolean;
  checkForUpdates: (options?: CheckOptions) => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  openInstallSettings: () => Promise<void>;
  setAutoCheck: (value: boolean) => void;
  setAutoDownload: (value: boolean) => void;
  setWifiOnly: (value: boolean) => void;
};

const UpdaterContext = React.createContext<UpdaterContextValue | null>(null);

/**
 * El updater sólo tiene sentido en la app instalada. En Expo Go no se puede
 * instalar un APK propio y las versiones nativas no representan a Kujira.
 */
const IS_ANDROID =
  Platform.OS === "android" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const DEFAULT_PREFERENCES: UpdaterPreferences = {
  autoCheck: true,
  autoDownload: true,
  wifiOnly: true,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Ocurrió un error inesperado.";
}

function readBoolean(value: string | null | undefined, fallback: boolean): boolean {
  if (value === null || value === undefined) return fallback;
  return value === "1";
}

function parsePendingRelease(raw: string | null | undefined): UpdateInfo | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<UpdateInfo> | null;
    if (
      !parsed ||
      typeof parsed.version !== "string" ||
      typeof parsed.tag !== "string" ||
      typeof parsed.downloadUrl !== "string" ||
      !parseVersion(parsed.version)
    ) {
      return null;
    }

    return {
      version: parsed.version,
      tag: parsed.tag,
      name: typeof parsed.name === "string" ? parsed.name : parsed.tag,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      publishedAt:
        typeof parsed.publishedAt === "string" ? parsed.publishedAt : "",
      releaseUrl:
        typeof parsed.releaseUrl === "string" ? parsed.releaseUrl : "",
      assetName: typeof parsed.assetName === "string" ? parsed.assetName : "",
      size:
        typeof parsed.size === "number" && Number.isFinite(parsed.size)
          ? parsed.size
          : 0,
      downloadUrl: parsed.downloadUrl,
      digest: typeof parsed.digest === "string" ? parsed.digest : null,
    };
  } catch {
    return null;
  }
}

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const currentVersion = React.useMemo(
    () =>
      Application.nativeApplicationVersion ??
      Constants.expoConfig?.version ??
      "0.0.0",
    [],
  );
  const currentBuild = Application.nativeBuildVersion ?? null;

  const [phase, setPhase] = React.useState<UpdaterPhase>("idle");
  const [release, setReleaseState] = React.useState<UpdateInfo | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = React.useState<number | null>(null);
  const [preferences, setPreferences] =
    React.useState<UpdaterPreferences>(DEFAULT_PREFERENCES);
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false);
  const [appState, setAppState] = React.useState(AppState.currentState);

  const releaseRef = React.useRef<UpdateInfo | null>(null);
  const downloadedPathRef = React.useRef<string | null>(null);
  const preferencesRef = React.useRef<UpdaterPreferences>(DEFAULT_PREFERENCES);
  const lastCheckedAtRef = React.useRef<number | null>(null);
  const checkingRef = React.useRef(false);
  const downloadingRef = React.useRef(false);
  const autoInstallRef = React.useRef(false);
  const installLaunchedRef = React.useRef<string | null>(null);
  const pendingAutoDownloadRef = React.useRef(false);

  const updateRelease = React.useCallback((next: UpdateInfo | null) => {
    releaseRef.current = next;
    setReleaseState(next);
  }, []);

  // Cargar preferencias y último chequeo.
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          UPDATE_STORAGE_KEYS.autoCheck,
          UPDATE_STORAGE_KEYS.autoDownload,
          UPDATE_STORAGE_KEYS.wifiOnly,
          UPDATE_STORAGE_KEYS.lastCheck,
          UPDATE_STORAGE_KEYS.pendingRelease,
        ]);

        const values = new Map(entries);
        const loaded: UpdaterPreferences = {
          autoCheck: readBoolean(
            values.get(UPDATE_STORAGE_KEYS.autoCheck),
            DEFAULT_PREFERENCES.autoCheck,
          ),
          autoDownload: readBoolean(
            values.get(UPDATE_STORAGE_KEYS.autoDownload),
            DEFAULT_PREFERENCES.autoDownload,
          ),
          wifiOnly: readBoolean(
            values.get(UPDATE_STORAGE_KEYS.wifiOnly),
            DEFAULT_PREFERENCES.wifiOnly,
          ),
        };
        const storedLastCheck = Number(values.get(UPDATE_STORAGE_KEYS.lastCheck));
        const loadedLastCheck =
          Number.isFinite(storedLastCheck) && storedLastCheck > 0
            ? storedLastCheck
            : null;

        // Restaurar una actualización pendiente de una sesión anterior.
        let pending = parsePendingRelease(
          values.get(UPDATE_STORAGE_KEYS.pendingRelease),
        );
        let pendingPhase: UpdaterPhase | null = null;
        let pendingApkPath: string | null = null;

        if (pending) {
          if (isNewerVersion(currentVersion, pending.version)) {
            pendingApkPath = await findDownloadedUpdateApk(
              pending.version,
              pending.size,
            );
            pendingPhase = pendingApkPath ? "ready" : "available";
          } else {
            pending = null;
            AsyncStorage.removeItem(
              UPDATE_STORAGE_KEYS.pendingRelease,
            ).catch(() => undefined);
          }
        }

        if (IS_ANDROID) {
          // Conserva el APK pendiente (si existe) y borra restos de versiones
          // anteriores, incluidas descargas parciales.
          await cleanupOldUpdateApks(pendingApkPath ?? undefined);
        }

        if (cancelled) return;

        preferencesRef.current = loaded;
        lastCheckedAtRef.current = loadedLastCheck;
        setPreferences(loaded);
        setLastCheckedAt(loadedLastCheck);

        if (pending && pendingPhase) {
          updateRelease(pending);
          downloadedPathRef.current = pendingApkPath;
          pendingAutoDownloadRef.current = pendingPhase === "available";
          setPhase(pendingPhase);
        }
      } catch {
        // Si AsyncStorage falla, usamos los valores por defecto.
      } finally {
        if (!cancelled) setPreferencesLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentVersion, updateRelease]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  const persistPreference = React.useCallback(
    (key: string, value: boolean) => {
      AsyncStorage.setItem(key, value ? "1" : "0").catch(() => undefined);
    },
    [],
  );

  const setAutoCheck = React.useCallback(
    (value: boolean) => {
      preferencesRef.current = {
        ...preferencesRef.current,
        autoCheck: value,
      };
      setPreferences(preferencesRef.current);
      persistPreference(UPDATE_STORAGE_KEYS.autoCheck, value);
    },
    [persistPreference],
  );

  const setAutoDownload = React.useCallback(
    (value: boolean) => {
      preferencesRef.current = {
        ...preferencesRef.current,
        autoDownload: value,
      };
      setPreferences(preferencesRef.current);
      persistPreference(UPDATE_STORAGE_KEYS.autoDownload, value);
    },
    [persistPreference],
  );

  const setWifiOnly = React.useCallback(
    (value: boolean) => {
      preferencesRef.current = {
        ...preferencesRef.current,
        wifiOnly: value,
      };
      setPreferences(preferencesRef.current);
      persistPreference(UPDATE_STORAGE_KEYS.wifiOnly, value);
    },
    [persistPreference],
  );

  const performDownload = React.useCallback(
    async (info: UpdateInfo) => {
      if (!IS_ANDROID || downloadingRef.current) return;

      downloadingRef.current = true;
      autoInstallRef.current = true;
      installLaunchedRef.current = null;
      setPhase("downloading");
      setProgress(0);
      setError(null);

      try {
        const path = await downloadUpdateApk(info, setProgress);
        downloadedPathRef.current = path;
        setPhase("ready");
        toast.success(`v${info.version} descargada`, {
          description: "Abriendo el instalador de Android...",
        });
      } catch (downloadError) {
        downloadedPathRef.current = null;
        autoInstallRef.current = false;
        const message = getErrorMessage(downloadError);
        setError(message);
        setPhase("error");
        toast.error("No se pudo descargar la actualización", {
          description: message,
        });
      } finally {
        downloadingRef.current = false;
      }
    },
    [],
  );

  const maybeAutoDownload = React.useCallback(
    async (info: UpdateInfo) => {
      if (!preferencesRef.current.autoDownload) return;

      try {
        const network = await Network.getNetworkStateAsync();
        const isUnmetered =
          network.type === Network.NetworkStateType.WIFI ||
          network.type === Network.NetworkStateType.ETHERNET;
        const isOffline =
          network.isConnected === false ||
          network.isInternetReachable === false ||
          network.type === Network.NetworkStateType.NONE;

        if (isOffline) {
          toast.info(`Actualización v${info.version} disponible`, {
            description: "Conectate a internet para descargarla.",
          });
          return;
        }

        if (preferencesRef.current.wifiOnly && !isUnmetered) {
          toast.info(`Actualización v${info.version} disponible`, {
            description:
              "Conectate a Wi-Fi o descargala manualmente desde Config.",
          });
          return;
        }

        await performDownload(info);
      } catch {
        // Si no se pudo consultar el tipo de red, no bloqueamos la descarga.
        await performDownload(info);
      }
    },
    [performDownload],
  );

  const checkForUpdates = React.useCallback(
    async ({ force = false, silent = false }: CheckOptions = {}) => {
      if (!IS_ANDROID || checkingRef.current) return;

      if (
        !force &&
        lastCheckedAtRef.current &&
        Date.now() - lastCheckedAtRef.current < UPDATE_CHECK_INTERVAL_MS
      ) {
        return;
      }

      checkingRef.current = true;
      setPhase("checking");
      setError(null);

      try {
        const latest = await fetchLatestRelease();
        const now = Date.now();
        lastCheckedAtRef.current = now;
        setLastCheckedAt(now);
        await AsyncStorage.setItem(
          UPDATE_STORAGE_KEYS.lastCheck,
          String(now),
        ).catch(() => undefined);

        if (!latest || !isNewerVersion(currentVersion, latest.version)) {
          if (
            downloadedPathRef.current &&
            releaseRef.current &&
            isNewerVersion(currentVersion, releaseRef.current.version)
          ) {
            setPhase("ready");
            return;
          }

          updateRelease(null);
          downloadedPathRef.current = null;
          autoInstallRef.current = false;
          installLaunchedRef.current = null;
          pendingAutoDownloadRef.current = false;
          AsyncStorage.removeItem(
            UPDATE_STORAGE_KEYS.pendingRelease,
          ).catch(() => undefined);
          setPhase("up-to-date");
          if (!silent) {
            toast.success("Kujira está actualizado", {
              description: `Versión ${currentVersion}`,
            });
          }
          return;
        }

        // Si ya se había descargado esta misma versión, no la pisamos.
        if (
          releaseRef.current?.version === latest.version &&
          downloadedPathRef.current
        ) {
          setPhase("ready");
          return;
        }

        updateRelease(latest);
        downloadedPathRef.current = null;
        autoInstallRef.current = false;
        installLaunchedRef.current = null;
        pendingAutoDownloadRef.current = false;
        await AsyncStorage.setItem(
          UPDATE_STORAGE_KEYS.pendingRelease,
          JSON.stringify(latest),
        ).catch(() => undefined);
        setPhase("available");
        toast.info(`Actualización disponible: v${latest.version}`, {
          description:
            "Se instala con la confirmación de Android. También podés manejarla desde Config.",
        });

        await maybeAutoDownload(latest);
      } catch (checkError) {
        const message = getErrorMessage(checkError);
        setError(message);
        setPhase(downloadedPathRef.current ? "ready" : "error");
        if (!silent) {
          toast.error("No se pudo buscar actualizaciones", {
            description: message,
          });
        }
      } finally {
        checkingRef.current = false;
      }
    },
    [currentVersion, maybeAutoDownload, updateRelease],
  );

  const downloadUpdate = React.useCallback(async () => {
    const info = releaseRef.current;
    if (!info) {
      toast.info("No hay una actualización disponible");
      return;
    }
    await performDownload(info);
  }, [performDownload]);

  const installUpdate = React.useCallback(async () => {
    const path = downloadedPathRef.current;
    if (!path) {
      toast.error("No hay una actualización descargada", {
        description: "Descargala de nuevo desde esta misma pantalla.",
      });
      return;
    }

    try {
      installLaunchedRef.current = releaseRef.current?.tag ?? null;
      const installPromise = installUpdateApk(path);
      toast.info("Abriendo instalador", {
        description: "Confirmá la instalación para actualizar Kujira.",
      });
      await installPromise;
      setError(null);
    } catch (installError) {
      const message = getErrorMessage(installError);
      setError(message);

      if (/ya no está disponible/i.test(message)) {
        downloadedPathRef.current = null;
        autoInstallRef.current = false;
        setPhase("available");
      }

      Alert.alert(
        "No se pudo abrir el instalador",
        `${message}\n\nSi Android bloquea la instalación, activá "Instalar apps desconocidas" para Kujira y volvé a intentar.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Abrir ajustes",
            onPress: () => {
              openUnknownSourcesSettings().catch(() => undefined);
            },
          },
        ],
      );
    }
  }, []);

  const openInstallSettings = React.useCallback(async () => {
    await openUnknownSourcesSettings();
  }, []);

  // Auto-instalar cuando la descarga termina y la app está en primer plano.
  React.useEffect(() => {
    if (!IS_ANDROID) return;
    if (phase !== "ready" || !autoInstallRef.current) return;
    if (appState !== "active") return;

    const tag = release?.tag;
    if (!tag || installLaunchedRef.current === tag) return;

    autoInstallRef.current = false;
    installLaunchedRef.current = tag;
    void installUpdate();
  }, [appState, installUpdate, phase, release]);

  // Reanudar la descarga de una actualización pendiente de una sesión anterior.
  React.useEffect(() => {
    if (!preferencesLoaded || !IS_ANDROID) return;
    if (!pendingAutoDownloadRef.current) return;
    if (phase !== "available" || !releaseRef.current) return;
    if (!preferences.autoDownload) return;

    pendingAutoDownloadRef.current = false;
    void maybeAutoDownload(releaseRef.current);
  }, [
    maybeAutoDownload,
    phase,
    preferences.autoDownload,
    preferencesLoaded,
  ]);

  // Chequeo automático al iniciar y al volver a primer plano.
  React.useEffect(() => {
    if (!preferencesLoaded || !IS_ANDROID) return;
    if (!preferences.autoCheck || appState !== "active") return;
    if (releaseRef.current) return;

    const last = lastCheckedAtRef.current;
    if (last && Date.now() - last < UPDATE_CHECK_INTERVAL_MS) return;

    void checkForUpdates({ silent: true });
  }, [appState, checkForUpdates, preferences.autoCheck, preferencesLoaded]);

  const value = React.useMemo<UpdaterContextValue>(
    () => ({
      currentVersion,
      currentBuild,
      phase,
      release,
      progress,
      error,
      lastCheckedAt,
      autoCheck: preferences.autoCheck,
      autoDownload: preferences.autoDownload,
      wifiOnly: preferences.wifiOnly,
      isAndroid: IS_ANDROID,
      checkForUpdates,
      downloadUpdate,
      installUpdate,
      openInstallSettings,
      setAutoCheck,
      setAutoDownload,
      setWifiOnly,
    }),
    [
      checkForUpdates,
      currentBuild,
      currentVersion,
      downloadUpdate,
      error,
      installUpdate,
      lastCheckedAt,
      openInstallSettings,
      phase,
      preferences.autoCheck,
      preferences.autoDownload,
      preferences.wifiOnly,
      progress,
      release,
      setAutoCheck,
      setAutoDownload,
      setWifiOnly,
    ],
  );

  return (
    <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>
  );
}

export function useUpdater(): UpdaterContextValue {
  const context = React.useContext(UpdaterContext);
  if (!context) {
    throw new Error("useUpdater debe usarse dentro de UpdaterProvider");
  }
  return context;
}
