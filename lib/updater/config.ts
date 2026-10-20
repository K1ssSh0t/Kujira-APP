export const GITHUB_OWNER = "K1ssSh0t";
export const GITHUB_REPO = "Kujira-APP";
export const GITHUB_REPO_FULL = `${GITHUB_OWNER}/${GITHUB_REPO}`;

export const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO_FULL}/releases?per_page=100`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_REPO_FULL}/releases`;

/** Cada cuánto se busca una actualización automáticamente. */
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Prefijo de los APK temporales en la caché de la app. */
export const UPDATE_APK_PREFIX = "kujira-update-";

/**
 * Preferencias y último chequeo. Se guardan como strings en AsyncStorage.
 * Los valores por defecto son "1" (activado).
 */
export const UPDATE_STORAGE_KEYS = {
  autoCheck: "@kujira/updater/auto-check",
  autoDownload: "@kujira/updater/auto-download",
  wifiOnly: "@kujira/updater/wifi-only",
  lastCheck: "@kujira/updater/last-check",
  pendingRelease: "@kujira/updater/pending-release",
} as const;
