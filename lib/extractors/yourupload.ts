export async function extractYourUploadUrl(pageUrl: string, referer?: string): Promise<{ url: string; quality?: string } | null> {
    console.log(`[YourUpload] Fetching: ${pageUrl}`);
    const res = await fetch(pageUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            ...(referer ? { Referer: referer } : {}),
        }
    });
    const html = await res.text();
    console.log(`[YourUpload] Response status: ${res.status}, HTML length: ${html.length}`);

    const quality = html.match(/(\d{3,4}p)/)?.[1];
    const jwMatch = html.match(/var jwplayerOptions\s*=\s*\{([\s\S]*?)\},\s*\n/);
    if (!jwMatch) {
        console.log(`[YourUpload] No jwplayerOptions found. First 2000 chars:\n${html.slice(0, 2000)}`);
        return null;
    }
    const data = `{${jwMatch[1].replace(/file/g, '"file"').replace(/'/g, '"')}}`;
    try {
        const parsed = JSON.parse(data);
        if (parsed.file) {
            console.log(`[YourUpload] Extracted URL: ${parsed.file}`);
            return { url: parsed.file, quality };
        }
    } catch (e) {
        console.log(`[YourUpload] JSON parse failed: ${e}`);
    }
    const fileMatch = data.match(/"file"\s*:\s*"([^"]+)"/);
    if (fileMatch) {
        console.log(`[YourUpload] Fallback match: ${fileMatch[1]}`);
        return { url: fileMatch[1], quality };
    }
    console.log(`[YourUpload] No URL found`);
    return null;
}
