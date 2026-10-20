/**
 * Tipos del updater.
 *
 * `GithubRelease*` refleja sólo el subconjunto de la API de GitHub que usa la
 * app. `UpdateInfo` es el modelo interno ya normalizado: no depende del JSON
 * de GitHub y se puede persistir en AsyncStorage sin problemas.
 */

export type GithubReleaseAsset = {
  name: string;
  size: number;
  content_type?: string;
  /** URL directa de descarga del asset. */
  browser_download_url: string;
  /** SHA-256 opcional que expone la API; reservado para validaciones futuras. */
  digest?: string | null;
};

export type GithubRelease = {
  /** Tag original, por ejemplo `v1.6.1`. */
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url?: string;
  published_at: string;
  /** Los drafts y prereleases se descartan al buscar actualizaciones. */
  draft: boolean;
  prerelease: boolean;
  assets: GithubReleaseAsset[];
};

/** Release listo para mostrar y descargar. */
export type UpdateInfo = {
  /** Versión normalizada, sin la "v" inicial. Ej: "1.6.0". */
  version: string;
  /** Tag original de GitHub. Ej: "v1.6.0". */
  tag: string;
  /** Nombre visible del release; si falta, se usa el tag. */
  name: string;
  /** Cuerpo del release, ya recortado. Puede estar vacío. */
  notes: string;
  publishedAt: string;
  releaseUrl: string;
  assetName: string;
  /** Tamaño esperado del APK en bytes. Se usa para validar la descarga. */
  size: number;
  downloadUrl: string;
  digest?: string | null;
};

/**
 * Estados de la máquina del updater:
 *
 * idle -> checking -> up-to-date | available
 * available -> downloading -> ready
 * checking/downloading -> error
 *
 * `ready` significa que el APK está descargado y validado, no que ya se haya
 * instalado. Después de abrir el instalador se sigue en `ready` hasta que
 * Android actualiza la app o el usuario vuelve sin instalar.
 */
export type UpdaterPhase =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";
