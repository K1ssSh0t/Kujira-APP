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
}

const extractors: ExtractorEntry[] = [
    {
        names: ['Stape', 'Streamtape', 'StreamTape'],
        fn: async (url) => {
            const result = await extractStreamTapeUrl(url);
            return result || null;
        },
    },
    {
        names: ['Voe', 'Voex', 'VoeStream'],
        fn: async (url) => {
            const result = await fetchMp4Link(url, 'https://voe.sx/');
            return result || null;
        },
    },
    {
        names: ['Uqload'],
        fn: async (url, referer) => {
            const result = await extractUqloadUrl(url, referer);
            return result || null;
        },
    },
    {
        names: ['Mp4Upload', 'Mp4upload'],
        fn: async (url, referer) => {
            const result = await extractMp4UploadUrl(url, referer);
            if (!result) return null;
            return result;
        },
    },
    {
        names: ['YourUpload', 'Yourupload'],
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
