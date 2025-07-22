import { Parser } from 'htmlparser2';
import { DomHandler, Element } from 'domhandler';
import { findOne, textContent } from 'domutils';
// import { atob } from 'react-native-quick-base64';

export async function fetchMp4Link(pageUrl: string, referer?: string): Promise<string | null> {
    // 1) Traer HTML
    const res1 = await fetch(pageUrl, { headers: referer ? { Referer: referer } : undefined });
    let html = await res1.text();

    // 2) Seguir redirect JS
    const redirectMatch = html.match(/window\.location\.href\s*=\s*'([^']+)'/);
    if (redirectMatch) {
        const res2 = await fetch(redirectMatch[1], { headers: referer ? { Referer: referer } : undefined });
        html = await res2.text();
    }

    // 3) Parsear DOM
    const handler = new DomHandler();
    const parser = new Parser(handler);
    parser.write(html);
    parser.end();
    const root = handler.root;

    // 4) Extraer el <script type="application/json">
    const scriptEl = findOne(
        (node): node is Element =>
            node.type === 'script' &&
            node.attribs['type'] === 'application/json',
        root
    );
    if (!scriptEl) return null;
    const raw = textContent(scriptEl).trim();
    const encoded = raw.match(/\["(.+)"\]/)?.[1];
    if (!encoded) return null;

    // 5) Funciones de descifrado
    const rot13 = (s: string) =>
        s.replace(/[A-Za-z]/g, c => {
            const base = c <= 'Z' ? 65 : 97;
            return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
        });
    const replacer = (s: string) =>
        s.replace(/@\$|\^\^|~@|%\?|\*~|!!|#&/g, '_');
    const removeUnders = (s: string) => s.replace(/_/g, '');
    const charShift = (s: string, shift: number) =>
        Array.from(s).map(ch => String.fromCharCode(ch.charCodeAt(0) - shift)).join('');
    const reverse = (s: string) => s.split('').reverse().join('');

    try {
        let data = rot13(encoded);
        data = replacer(data);
        data = removeUnders(data);
        data = atob(data);
        data = charShift(data, 3);
        data = reverse(data);
        data = atob(data);

        const obj = JSON.parse(data);
        return obj.direct_access_url || null;
    } catch {
        return null;
    }
}

// // Ejemplo de uso
// (async () => {
//   const mp4 = await fetchMp4Link('https://voe.sx/e/tuCodigo', 'https://voe.sx/');
//   console.log('MP4 URL:', mp4);
// })();
