import { requireNativeModule } from "expo-modules-core";

interface VideoProxyNativeModule {
    /** Inicia el servidor proxy local (idempotente) y devuelve el puerto. */
    start(): Promise<number>;
    /** Detiene el servidor proxy local. */
    stop(): Promise<void>;
}

// En plataformas sin el modulo nativo (web/iOS no implementado) esto lanzaria,
// por eso lo envolvemos y exponemos helpers que degradan con gracia.
let nativeModule: VideoProxyNativeModule | null = null;
try {
    nativeModule = requireNativeModule<VideoProxyNativeModule>("VideoProxy");
} catch {
    nativeModule = null;
}

export const isVideoProxyAvailable = nativeModule !== null;

let cachedPort: number | null = null;

/** Arranca el proxy (si hace falta) y devuelve el puerto, o null si no esta disponible. */
export async function startVideoProxy(): Promise<number | null> {
    if (!nativeModule) return null;
    if (cachedPort != null) return cachedPort;
    cachedPort = await nativeModule.start();
    return cachedPort;
}

/**
 * Devuelve una URL local que reenvia al CDN agregando el header Referer.
 * Si el proxy no esta disponible, devuelve la URL original sin cambios.
 */
export async function getProxiedUrl(
    targetUrl: string,
    referer?: string,
): Promise<string> {
    const port = await startVideoProxy();
    if (port == null) return targetUrl;
    const u = encodeURIComponent(targetUrl);
    const r = encodeURIComponent(referer ?? "");
    // La ruta /video.mp4 es solo cosmetica: algunos players infieren el tipo
    // a partir de la extension de la URL.
    return `http://127.0.0.1:${port}/video.mp4?url=${u}&referer=${r}`;
}
