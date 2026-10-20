/**
 * Configuración del updater Android.
 *
 * La API de GitHub se consulta sin token, por lo que el repositorio debe ser
 * público. El workflow publica tags semver (`vX.Y.Z`) y un APK llamado
 * `kujira-app-vX.Y.Z.apk`; los releases viejos con tags `build-*` se ignoran.
 */

export const GITHUB_OWNER = "K1ssSh0t";
export const GITHUB_REPO = "Kujira-APP";
export const GITHUB_REPO_FULL = `${GITHUB_OWNER}/${GITHUB_REPO}`;

export const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO_FULL}/releases?per_page=100`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_REPO_FULL}/releases`;

/**
 * Ventana de caché de chequeos exitosos. También es el intervalo máximo entre
 * chequeos automáticos al abrir o volver a la app. Un chequeo manual con
 * `force` ignora esta ventana.
 */
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Prefijo de los archivos temporales en la caché de la app.
 * La descarga usa `<prefijo><version>.apk.part` y el APK listo es
 * `<prefijo><version>.apk`.
 */
export const UPDATE_APK_PREFIX = "kujira-update-";

/**
 * Preferencias y último chequeo. Se guardan como strings en AsyncStorage.
 * Las preferencias usan "1" (activado) y "0" (desactivado). `pendingRelease`
 * guarda el JSON del último release detectado para poder reanudar la descarga
 * después de cerrar la app.
 */
export const UPDATE_STORAGE_KEYS = {
  autoCheck: "@kujira/updater/auto-check",
  autoDownload: "@kujira/updater/auto-download",
  wifiOnly: "@kujira/updater/wifi-only",
  lastCheck: "@kujira/updater/last-check",
  pendingRelease: "@kujira/updater/pending-release",
} as const;
