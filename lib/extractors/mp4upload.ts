export async function extractMp4UploadUrl(pageUrl: string, referer?: string): Promise<{ url: string; quality?: number } | null> {
    console.log(`[Mp4Upload] Fetching: ${pageUrl}`);
    const idMatch = pageUrl.match(/mp4upload\.com\/(?:embed-)?([A-Za-z0-9]+)/);
    const realUrl = idMatch ? `https://www.mp4upload.com/embed-${idMatch[1]}.html` : pageUrl;
    console.log(`[Mp4Upload] Real URL: ${realUrl}`);

    const res = await fetch(realUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            ...(referer ? { Referer: referer } : {}),
        }
    });
    const html = await res.text();
    console.log(`[Mp4Upload] Response status: ${res.status}, HTML length: ${html.length}`);

    const srcMatch = html.match(/player\.src\(\{[\s\S]*?src:\s*"([^"]+?)"/);
    if (!srcMatch) {
        console.log(`[Mp4Upload] No player.src found. First 2000 chars:\n${html.slice(0, 2000)}`);
        return null;
    }

    console.log(`[Mp4Upload] Extracted URL: ${srcMatch[1]}`);
    return { url: srcMatch[1] };
}
