function unbase(str: string, radix: number): number {
    if (radix <= 36) return parseInt(str, radix);
    const alphabet =
        radix <= 62
            ? '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, radix)
            : ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'.slice(0, radix);
    const dict = new Map<string, number>();
    for (let i = 0; i < alphabet.length; i++) dict.set(alphabet[i], i);
    return str.split('').reverse().reduce((acc, ch, idx) => acc + (dict.get(ch) ?? 0) * Math.pow(radix, idx), 0);
}

function unpackPacked(js: string): string | null {
    const match = js.match(/}\s*\('([\s\S]*)',\s*(.*?),\s*(\d+),\s*'([^']*)'\.split\('\|'\)/);
    if (!match) return null;
    const payload = match[1].replace(/\\'/g, "'");
    const radix = parseInt(match[2], 10) || 36;
    const count = parseInt(match[3], 10) || 0;
    const symtab = match[4].split('|');
    if (symtab.length !== count) return null;
    const wordRegex = /\b[a-zA-Z0-9_]+\b/g;
    return payload.replace(wordRegex, (word) => {
        const x = unbase(word, radix);
        const value = symtab[x];
        return value !== undefined && value !== '' ? value : word;
    });
}

export async function extractUqloadUrl(pageUrl: string, referer?: string): Promise<string | null> {
    console.log(`[Uqload] Fetching embed page: ${pageUrl}`);

    // Step 1: Fetch embed page to get file_code
    const res = await fetch(pageUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            ...(referer ? { Referer: referer } : {}),
        }
    });
    const html = await res.text();
    console.log(`[Uqload] Embed response: ${res.status}, length: ${html.length}`);

    // Step 2: Extract file_code from URL path
    const path = new URL(pageUrl).pathname.replace('.html', '');
    const fileCode = path.split('/').pop()?.split('-').pop();
    if (!fileCode) {
        console.log(`[Uqload] Could not extract file_code from URL`);
        return null;
    }
    console.log(`[Uqload] File code: ${fileCode}`);

    // Step 3: POST to /dl to get the video page
    const baseUrl = `${new URL(pageUrl).protocol}//${new URL(pageUrl).host}`;
    const dlRes = await fetch(`${baseUrl}/dl`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            'Referer': pageUrl,
        },
        body: new URLSearchParams({
            op: 'embed',
            file_code: fileCode,
            auto: '1',
            referer: '',
        }).toString(),
    });
    const dlHtml = await dlRes.text();
    console.log(`[Uqload] DL response: ${dlRes.status}, length: ${dlHtml.length}`);

    // Step 4: Unpack P.A.C.K.E.R. JS and find video URL
    const hasPacked = dlHtml.includes("eval(function(p,a,c,k,e,");
    console.log(`[Uqload] Has packed JS: ${hasPacked}`);

    const unpacked = unpackPacked(dlHtml);
    if (!unpacked) {
        console.log(`[Uqload] Failed to unpack JS`);
        return null;
    }

    // Step 5: Find HLS/MP4 URL in unpacked JS
    const sourceMatch = unpacked.match(/file:\s*"([^"]+)"[^}]*?\}/);
    if (sourceMatch) {
        console.log(`[Uqload] Extracted URL: ${sourceMatch[1]}`);
        return sourceMatch[1];
    }
    const m3u8Match = unpacked.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
    if (m3u8Match) {
        console.log(`[Uqload] Extracted M3U8: ${m3u8Match[0]}`);
        return m3u8Match[0];
    }

    console.log(`[Uqload] No video URL found in unpacked JS`);
    return null;
}
