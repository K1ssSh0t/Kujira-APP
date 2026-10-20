import {
  GITHUB_RELEASES_PAGE,
  GITHUB_RELEASES_URL,
  GITHUB_REPO_FULL,
} from "./config";
import type {
  GithubRelease,
  GithubReleaseAsset,
  UpdateInfo,
} from "./types";

export class UpdaterError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "UpdaterError";
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

/** Quita la "v" inicial y espacios. */
export function normalizeVersion(value: string): string {
  return value.trim().replace(/^v/i, "");
}

/**
 * Acepta versiones semver simples: 1.6.0, v1.6.0, 1.6.0-beta.1.
 * Devuelve null para tags viejos tipo "build-123456".
 */
export function parseVersion(value: string): [number, number, number] | null {
  const match = normalizeVersion(value).match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;

  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] > right[index] ? 1 : -1;
    }
  }
  return 0;
}

export function isNewerVersion(current: string, candidate: string): boolean {
  return compareVersions(candidate, current) > 0;
}

function pickApkAsset(
  assets: GithubReleaseAsset[],
  version: string,
): GithubReleaseAsset | null {
  const apkAssets = (assets ?? []).filter(
    (asset) =>
      typeof asset?.name === "string" &&
      /\.apk$/i.test(asset.name) &&
      typeof asset.browser_download_url === "string",
  );

  if (apkAssets.length === 0) return null;

  // El workflow publica exactamente "kujira-app-vX.Y.Z.apk". Si el release
  // trae varios APK, preferimos el que corresponde a esta versión.
  const expectedName = `kujira-app-v${version}.apk`.toLowerCase();
  return (
    apkAssets.find((asset) => asset.name.toLowerCase() === expectedName) ??
    apkAssets.find((asset) => /^kujira-app-v.*\.apk$/i.test(asset.name)) ??
    apkAssets[0]
  );
}

export function formatBytes(bytes: number | undefined | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Devuelve el release semver más alto que tenga un APK adjunto.
 * Ignora drafts, prereleases y tags viejos tipo "build-<run_id>".
 */
export async function fetchLatestRelease(): Promise<UpdateInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Kujira-APP",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new UpdaterError(
          `No se pudieron leer los releases de ${GITHUB_REPO_FULL}. Verificá que el repositorio sea público.`,
        );
      }
      if (response.status === 403) {
        throw new UpdaterError(
          "GitHub limitó temporalmente las consultas. Probá de nuevo más tarde.",
        );
      }
      throw new UpdaterError(
        `GitHub respondió con un error (${response.status}).`,
      );
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new UpdaterError("GitHub devolvió una respuesta inesperada.");
    }

    const releases = (payload as GithubRelease[])
      .filter((release) => !release.draft && !release.prerelease)
      .map((release) => ({
        release,
        version: normalizeVersion(release.tag_name ?? ""),
      }))
      .filter(({ version }) => parseVersion(version) !== null)
      .sort((left, right) => compareVersions(right.version, left.version));

    for (const { release, version } of releases) {
      const asset = pickApkAsset(release.assets, version);
      if (!asset) continue;

      const notes = (release.body ?? "").trim();
      const tag = release.tag_name ?? "";
      return {
        version,
        tag,
        name: release.name?.trim() || tag,
        notes,
        publishedAt: release.published_at ?? "",
        releaseUrl:
          release.html_url ?? `${GITHUB_RELEASES_PAGE}/tag/${tag}`,
        assetName: asset.name,
        size: asset.size,
        downloadUrl: asset.browser_download_url,
        digest: asset.digest,
      };
    }

    // No hay releases semver con APK. No es un error: simplemente no hay nada
    // actualizable todavía.
    return null;
  } catch (error) {
    if (error instanceof UpdaterError) throw error;

    const name = (error as { name?: string } | null)?.name;
    if (name === "AbortError") {
      throw new UpdaterError(
        "La consulta a GitHub tardó demasiado. Revisá tu conexión.",
      );
    }

    throw new UpdaterError(
      "No se pudo conectar con GitHub para buscar actualizaciones.",
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
}
