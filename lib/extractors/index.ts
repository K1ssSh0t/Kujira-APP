import { extractStreamTapeUrl } from './streamtape';
import { fetchMp4Link } from './voe';
import { extractUqloadUrl } from './uqload';
import { extractMp4UploadUrl } from './mp4upload';
import { extractYourUploadUrl } from './yourupload';

export interface ExtractorResult {
    url: string;
    quality?: number | string;
}

type ExtractorFn = (url: string, referer?: string) => Promise<string | ExtractorResult | null>;

interface ExtractorEntry {
    names: string[];
    fn: ExtractorFn;
    referer?: string;
    // true  -> reproduce bien en reproductor externo (MPV/VLC); no necesita Referer.
    // false -> solo funciona en el reproductor interno porque el CDN exige el header
    //          Referer, que los players externos no envian de forma fiable.
    externalSupported: boolean;
}

const extractors: ExtractorEntry[] = [
    {
        names: ['Stape', 'Streamtape', 'StreamTape'],
        externalSupported: true,
        fn: async (url) => {
            const result = await extractStreamTapeUrl(url);
            return result || null;
        },
    },
    {
        names: ['Voe', 'Voex', 'VoeStream'],
        externalSupported: true,
        fn: async (url) => {
            const result = await fetchMp4Link(url, 'https://voe.sx/');
            return result || null;
        },
    },
    {
        names: ['Uqload'],
        externalSupported: true,
        fn: async (url, referer) => {
            const result = await extractUqloadUrl(url, referer);
            return result || null;
        },
    },
    {
        names: ['Mp4Upload', 'Mp4upload'],
        externalSupported: false,
        fn: async (url, referer) => {
            const result = await extractMp4UploadUrl(url, referer);
            if (!result) return null;
            return result;
        },
    },
    {
        names: ['YourUpload', 'Yourupload'],
        externalSupported: false,
        fn: async (url, referer) => {
            const result = await extractYourUploadUrl(url, referer);
            if (!result) return null;
            return result;
        },
    },
];

export function findExtractor(serverName: string): ExtractorEntry | undefined {
    const lower = serverName.toLowerCase();
    return extractors.find((e) =>
        e.names.some((name) => lower.includes(name.toLowerCase()))
    );
}

export function getSupportedServers(): string[] {
    return extractors.flatMap((e) => e.names);
}

/**
 * Indica si un servidor reproduce bien en reproductor externo (MPV/VLC).
 * false => solo funciona en el reproductor interno (el CDN exige Referer).
 * Devuelve false si no hay extractor para ese servidor.
 */
export function isExternalSupported(serverName: string): boolean {
    return findExtractor(serverName)?.externalSupported ?? false;
}
