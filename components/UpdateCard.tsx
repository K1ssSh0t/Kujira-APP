import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
} from "lucide-react-native";
import * as React from "react";
import {
  ActivityIndicator,
  Linking,
  Switch,
  View,
} from "react-native";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Text } from "~/components/ui/text";
import { formatBytes } from "~/lib/updater/github";
import { useUpdater } from "~/lib/updater/useUpdater";
import type { UpdaterPhase } from "~/lib/updater/types";

const STATUS: Record<
  UpdaterPhase,
  { label: string; container: string; text: string }
> = {
  idle: {
    label: "Listo",
    container: "bg-secondary",
    text: "text-muted-foreground",
  },
  checking: {
    label: "Buscando",
    container: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
  },
  "up-to-date": {
    label: "Al día",
    container: "bg-green-500/15",
    text: "text-green-600 dark:text-green-400",
  },
  available: {
    label: "Disponible",
    container: "bg-primary/15",
    text: "text-primary",
  },
  downloading: {
    label: "Descargando",
    container: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
  },
  ready: {
    label: "Lista",
    container: "bg-green-500/15",
    text: "text-green-600 dark:text-green-400",
  },
  error: {
    label: "Error",
    container: "bg-destructive/15",
    text: "text-destructive",
  },
};

function cleanReleaseNotes(notes: string): string {
  return notes
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

function SettingToggle({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between gap-3 py-2 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-foreground">
          {label}
        </Text>
        <Text className="text-[11px] text-muted-foreground mt-0.5">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#3f3f46", true: "#8B5CF6" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

export function UpdateCard() {
  const {
    currentBuild,
    currentVersion,
    phase,
    release,
    progress,
    error,
    lastCheckedAt,
    autoCheck,
    autoDownload,
    wifiOnly,
    isAndroid,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    openInstallSettings,
    setAutoCheck,
    setAutoDownload,
    setWifiOnly,
  } = useUpdater();

  if (!isAndroid) return null;

  const status = STATUS[phase];
  const isBusy = phase === "checking" || phase === "downloading";
  const isDownloadAction =
    phase === "ready" ||
    Boolean(release && (phase === "available" || phase === "error"));
  const notes = release?.notes ? cleanReleaseNotes(release.notes) : "";
  const showInstallSettings = Boolean(
    error && /instalador|apps desconocidas/i.test(error),
  );

  const handlePrimaryAction = () => {
    if (phase === "ready") {
      void installUpdate();
      return;
    }
    if (release && (phase === "available" || phase === "error")) {
      void downloadUpdate();
      return;
    }
    void checkForUpdates({ force: true });
  };

  const primaryLabel =
    phase === "ready"
      ? "Instalar actualización"
      : release && (phase === "available" || phase === "error")
        ? "Descargar actualización"
        : phase === "checking"
          ? "Buscando actualizaciones..."
          : "Buscar actualizaciones";

  return (
    <View className="bg-card p-5 rounded-[20px] mb-3 border border-border/60">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[15px] font-bold text-foreground">
            Actualizaciones
          </Text>
          <Text className="text-[12px] text-muted-foreground mt-0.5">
            Instalada: v{currentVersion}
            {currentBuild ? ` (${currentBuild})` : ""}
          </Text>
          <Text className="text-[11px] text-muted-foreground mt-0.5">
            Último chequeo:{" "}
            {lastCheckedAt
              ? new Date(lastCheckedAt).toLocaleString()
              : "todavía no se buscó"}
          </Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${status.container}`}>
          <Text className={`text-[11px] font-semibold ${status.text}`}>
            {status.label}
          </Text>
        </View>
      </View>

      {release && (
        <View className="mt-3 bg-secondary/60 rounded-2xl p-3 border border-border/40">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-1.5 flex-1">
              <Download size={14} color="#A78BFA" />
              <Text className="text-[13px] font-bold text-foreground">
                v{release.version} disponible
              </Text>
            </View>
            <Text className="text-[11px] text-muted-foreground">
              {formatBytes(release.size)}
            </Text>
          </View>

          {notes ? (
            <Text
              className="text-[12px] leading-5 text-muted-foreground mt-2"
              numberOfLines={8}
            >
              {notes}
            </Text>
          ) : (
            <Text className="text-[12px] text-muted-foreground mt-2">
              Sin notas de release.
            </Text>
          )}

          <Button
            variant="link"
            size="sm"
            className="self-start h-8 px-0 mt-1"
            onPress={() => {
              Linking.openURL(release.releaseUrl).catch(() => undefined);
            }}
          >
            <ExternalLink size={13} color="#A78BFA" />
            <Text className="text-primary text-[12px]">
              Ver en GitHub
            </Text>
          </Button>
        </View>
      )}

      {phase === "downloading" && (
        <View className="mt-3">
          <Progress
            value={progress}
            className="h-2"
            indicatorClassName="bg-primary"
          />
          <Text className="text-[11px] text-muted-foreground mt-1.5">
            Descargando APK... {progress}%
          </Text>
        </View>
      )}

      {phase === "checking" && (
        <View className="flex-row items-center gap-2 mt-3">
          <ActivityIndicator size="small" color="#A78BFA" />
          <Text className="text-[12px] text-muted-foreground">
            Consultando GitHub Releases...
          </Text>
        </View>
      )}

      {phase === "up-to-date" && (
        <View className="flex-row items-center gap-2 mt-3">
          <CheckCircle2 size={16} color="#22C55E" />
          <Text className="text-[12px] text-green-600 dark:text-green-400">
            Ya tenés la última versión publicada.
          </Text>
        </View>
      )}

      {phase === "ready" && (
        <View className="mt-3">
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={16} color="#22C55E" />
            <Text className="flex-1 text-[12px] text-green-600 dark:text-green-400">
              APK descargado. Confirmá la instalación en Android.
            </Text>
          </View>
          {!error && (
            <Button
              variant="link"
              size="sm"
              className="self-start h-7 px-0 mt-1"
              onPress={() => {
                openInstallSettings().catch(() => undefined);
              }}
            >
              <Text className="text-primary text-[12px]">
                Abrir ajustes de instalación
              </Text>
            </Button>
          )}
        </View>
      )}

      {error && (
        <View className="mt-3 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
          <View className="flex-row items-start gap-2">
            <AlertCircle size={15} color="#F87171" />
            <Text className="flex-1 text-[12px] leading-5 text-destructive">
              {error}
            </Text>
          </View>
          {showInstallSettings && (
            <Button
              variant="link"
              size="sm"
              className="self-start h-7 px-0 mt-1"
              onPress={() => {
                openInstallSettings().catch(() => undefined);
              }}
            >
              <Text className="text-primary text-[12px]">
                Abrir ajustes de instalación
              </Text>
            </Button>
          )}
        </View>
      )}

      <Button
        onPress={handlePrimaryAction}
        disabled={isBusy}
        className="h-12 rounded-2xl mt-4"
      >
        {phase === "checking" || phase === "downloading" ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            {isDownloadAction ? (
              <Download size={17} color="white" />
            ) : (
              <RefreshCw size={17} color="white" />
            )}
            <Text>{primaryLabel}</Text>
          </>
        )}
      </Button>

      {release && !isBusy && (
        <Button
          variant="link"
          size="sm"
          className="self-center h-8 px-2 mt-1"
          onPress={() => {
            void checkForUpdates({ force: true });
          }}
        >
          <Text className="text-primary text-[12px]">Buscar de nuevo</Text>
        </Button>
      )}

      <View className="mt-4 pt-2 border-t border-border/60">
        <SettingToggle
          label="Buscar automáticamente"
          description="Al abrir o volver a la app, como máximo una vez cada 24 h."
          value={autoCheck}
          onValueChange={setAutoCheck}
        />
        <SettingToggle
          label="Descargar automáticamente"
          description="Baja el APK apenas encuentra una versión nueva."
          value={autoDownload}
          onValueChange={setAutoDownload}
        />
        <SettingToggle
          label="Solo por Wi-Fi"
          description="Evita gastar datos móviles al bajar el APK."
          value={wifiOnly}
          onValueChange={setWifiOnly}
          disabled={!autoDownload}
        />
      </View>

      <Text className="text-[11px] leading-4 text-muted-foreground mt-2">
        Las actualizaciones se descargan desde GitHub Releases. Android siempre
        pide confirmación antes de instalar el APK.
      </Text>
    </View>
  );
}
