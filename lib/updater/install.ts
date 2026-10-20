import * as Application from "expo-application";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";

import { UPDATE_APK_PREFIX } from "./config";
import type { UpdateInfo } from "./types";

export class InstallError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "InstallError";
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function getUpdateApkPath(version: string): string {
  if (!FileSystem.cacheDirectory) {
    throw new InstallError(
      "No se pudo acceder al almacenamiento temporal de la app.",
    );
  }
  return `${FileSystem.cacheDirectory}${UPDATE_APK_PREFIX}${version}.apk`;
}

function getPartialUpdateApkPath(version: string): string {
  return `${getUpdateApkPath(version)}.part`;
}

/**
 * Devuelve el path del APK ya descargado para esa versión, si existe.
 * Si se conoce el tamaño esperado, un archivo con otro tamaño se considera
 * una descarga incompleta y se descarta.
 */
export async function findDownloadedUpdateApk(
  version: string,
  expectedSize?: number,
): Promise<string | null> {
  try {
    const path = getUpdateApkPath(version);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists || !info.size || info.size <= 0) return null;

    if (expectedSize && expectedSize > 0 && info.size !== expectedSize) {
      await FileSystem.deleteAsync(path, { idempotent: true }).catch(
        () => undefined,
      );
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

/** Borra APK de versiones anteriores que hayan quedado en la caché. */
export async function cleanupOldUpdateApks(keepPath?: string): Promise<void> {
  if (!FileSystem.cacheDirectory) return;

  try {
    const entries = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    await Promise.all(
      entries
        .filter((name) => name.startsWith(UPDATE_APK_PREFIX))
        .map((name) => `${FileSystem.cacheDirectory}${name}`)
        .filter((uri) => uri !== keepPath)
        .map((uri) =>
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined),
        ),
    );
  } catch {
    // La limpieza es best-effort: no debe bloquear una actualización.
  }
}

export type DownloadProgressHandler = (percent: number) => void;

/**
 * Descarga el APK del release a la caché y devuelve el file:// URI.
 * Usa la API legacy de expo-file-system porque es la que expone progreso,
 * cancelación y getContentUriAsync en SDK 54.
 */
export async function downloadUpdateApk(
  info: UpdateInfo,
  onProgress?: DownloadProgressHandler,
): Promise<string> {
  if (Platform.OS !== "android") {
    throw new InstallError("Las actualizaciones solo están disponibles en Android.");
  }

  const destination = getUpdateApkPath(info.version);
  const partial = getPartialUpdateApkPath(info.version);

  const removePartialAndDestination = async () => {
    await Promise.all(
      [partial, destination].map((uri) =>
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(
          () => undefined,
        ),
      ),
    );
  };

  await cleanupOldUpdateApks();
  await removePartialAndDestination();

  let lastPercent = -1;
  const download = FileSystem.createDownloadResumable(
    info.downloadUrl,
    partial,
    {
      headers: {
        Accept: "application/octet-stream",
      },
    },
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        const percent = Math.min(
          100,
          Math.max(
            0,
            Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100),
          ),
        );
        if (percent !== lastPercent) {
          lastPercent = percent;
          onProgress?.(percent);
        }
      }
    },
  );

  let result: Awaited<ReturnType<typeof download.downloadAsync>>;
  try {
    result = await download.downloadAsync();
  } catch (error) {
    await removePartialAndDestination();
    throw new InstallError(
      "No se pudo descargar la actualización. Revisá tu conexión e intentá de nuevo.",
      { cause: error },
    );
  }

  if (!result) {
    await removePartialAndDestination();
    throw new InstallError("La descarga de la actualización se canceló.");
  }

  if (result.status < 200 || result.status >= 300) {
    await removePartialAndDestination();
    throw new InstallError(
      `La descarga falló con el código HTTP ${result.status}.`,
    );
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(partial);
    if (!fileInfo.exists || !fileInfo.size || fileInfo.size <= 0) {
      throw new InstallError("El APK descargado está vacío o incompleto.");
    }

    if (info.size > 0 && fileInfo.size !== info.size) {
      throw new InstallError(
        `El APK descargado está incompleto (${fileInfo.size} de ${info.size} bytes).`,
      );
    }

    // El archivo final sólo aparece cuando la descarga terminó y su tamaño es
    // correcto. Así una descarga interrumpida nunca se confunde con un APK
    // listo para instalar.
    await FileSystem.moveAsync({ from: partial, to: destination });
  } catch (error) {
    await removePartialAndDestination();
    if (error instanceof InstallError) throw error;
    throw new InstallError("No se pudo preparar el APK descargado.", {
      cause: error,
    });
  }

  onProgress?.(100);
  return destination;
}

/**
 * Abre el instalador de Android. El usuario siempre tiene que confirmar la
 * instalación; Android no permite hacerlo en silencio desde una app normal.
 */
export async function installUpdateApk(apkPath: string): Promise<void> {
  if (Platform.OS !== "android") {
    throw new InstallError("Las actualizaciones solo están disponibles en Android.");
  }

  let fileInfo;
  try {
    fileInfo = await FileSystem.getInfoAsync(apkPath);
  } catch (error) {
    throw new InstallError("No se pudo acceder al APK descargado.", {
      cause: error,
    });
  }

  if (!fileInfo.exists || !fileInfo.size || fileInfo.size <= 0) {
    throw new InstallError(
      "El APK descargado ya no está disponible. Descargalo de nuevo.",
    );
  }

  try {
    const contentUri = await FileSystem.getContentUriAsync(apkPath);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      type: "application/vnd.android.package-archive",
      // FLAG_GRANT_READ_URI_PERMISSION
      flags: 1,
    });
  } catch (error) {
    throw new InstallError(
      "No se pudo abrir el instalador de Android.",
      { cause: error },
    );
  }
}

/** Abre los ajustes de "Instalar apps desconocidas" para Kujira. */
export async function openUnknownSourcesSettings(): Promise<void> {
  if (Platform.OS !== "android") return;

  const packageName = Application.applicationId ?? "com.anonymous.KujiraAPP";

  try {
    await IntentLauncher.startActivityAsync(
      "android.settings.MANAGE_UNKNOWN_APP_SOURCES",
      { data: `package:${packageName}` },
    );
  } catch {
    await IntentLauncher.startActivityAsync("android.settings.SETTINGS").catch(
      () => undefined,
    );
  }
}
