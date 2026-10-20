export type GithubReleaseAsset = {
  name: string;
  size: number;
  content_type?: string;
  browser_download_url: string;
  digest?: string | null;
};

export type GithubRelease = {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url?: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: GithubReleaseAsset[];
};

export type UpdateInfo = {
  /** Versión normalizada, sin la "v" inicial. Ej: "1.6.0". */
  version: string;
  /** Tag original de GitHub. Ej: "v1.6.0". */
  tag: string;
  name: string;
  notes: string;
  publishedAt: string;
  releaseUrl: string;
  assetName: string;
  size: number;
  downloadUrl: string;
  digest?: string | null;
};

export type UpdaterPhase =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";
