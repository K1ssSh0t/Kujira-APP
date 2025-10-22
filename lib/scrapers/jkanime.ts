import axios from "axios";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
    "&nbsp;": " ",
  };
  return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
}
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.8,en;q=0.5",
          Connection: "keep-alive",
        },
      });

      if (response.status === 403 && i < retries - 1) {
        await delay(2000 * (i + 1));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(2000 * (i + 1));
    }
  }
  throw new Error("All retries failed");
}

const URL = "https://jkanime.net/";

const axiosInstance = axios.create({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.8,en;q=0.5",
  },
});

interface Server {
  name: string;
  url: string;
  source: string;
}

interface EpisodeData {
  title: string;
  numberEpisode: string;
  servers: Server[];
}

type AnimeResult = {
  name: string;
  url: string;
  image: string;
  type: string;
};

type LatestAnime = {
  title: string;
  url: string;
  img: string;
  episode: number;
  episodeNumber: string;
  date: string;
};

type AnimeEpisode = {
  name: string;
  url: string;
  num: number;
};

type AnimeRelated = {
  title: string;
  url: string;
  img: string;
};

type AnimeData = {
  title: string;
  title_alt: string;
  img: string;
  status: boolean;
  synopsis: string;
  genres: string[];
  episodes: AnimeEpisode[];
  related: AnimeRelated[];
};

/* ================================
   🧩 FUNCIONES DE EXTRACCIÓN CON REGEX
=================================== */

function extractTitle(html: string): string {
  const match = html.match(
    /<div class="anime_info">[\s\S]*?<h3[^>]*>(.*?)<\/h3>/i
  );
  return match ? match[1].trim() : "";
}

function extractAltTitles(html: string): string {
  const match = html.match(
    /<div class="alternativost"[^>]*id="c"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (!match) return "";
  const raw = match[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return raw;
}

function extractImage(html: string): string {
  const match = html.match(
    /<div class="anime_pic"[^>]*>\s*<img[^>]+src="([^"]+)"/i
  );
  return match ? match[1] : "";
}

function extractStatus(html: string): boolean {
  const match = html.match(/<div[^>]*class="enemision[^"]*">(.*?)<\/div>/i);
  const text = match ? match[1].toLowerCase() : "";
  return text.includes("concluido") || text.includes("finalizado");
}

function extractSynopsis(html: string): string {
  const match = html.match(
    /<div class="anime_info">[\s\S]*?<div class="scroll">([\s\S]*?)<\/div>/i
  );
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

function extractGenres(html: string): string[] {
  const blockMatch = html.match(
    /<ul[^>]*class="anime_data"[^>]*>([\s\S]*?)<\/ul>/i
  );
  if (!blockMatch) return [];
  const block = blockMatch[1];
  const genreMatch = block.match(/<li>.*?Generos:([\s\S]*?)<\/li>/i);
  if (!genreMatch) return [];
  return Array.from(genreMatch[1].matchAll(/<a[^>]*>(.*?)<\/a>/g)).map((m) =>
    m[1].trim()
  );
}

function extractEpisodes(html: string, animeSlug: string): AnimeEpisode[] {
  let total = 0;
  const match = html.match(/Episodios:\s*(\d+)/i);
  if (match) total = parseInt(match[1], 10);
  const episodes: AnimeEpisode[] = [];
  for (let i = 1; i <= total; i++) {
    episodes.push({
      name: `Episodio ${i}`,
      url: `/jkanime/episode/${animeSlug}-${i}`,
      num: i,
    });
  }
  return episodes;
}

function extractAnimeSlug(html: string, title: string): string {
  const scriptMatch = html.match(/search_episode\/\d+\/([^'"]+)/);
  if (scriptMatch) return scriptMatch[1];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractRelatedAnimes(html: string): AnimeRelated[] {
  const matches = Array.from(
    html.matchAll(/<h5 id="aditional"[^>]*>.*?<\/h5>([\s\S]*?)(?=<h5|$)/g)
  );
  const related: AnimeRelated[] = [];

  for (const m of matches) {
    const section = m[1];
    const links = Array.from(
      section.matchAll(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/g)
    );
    for (const l of links) {
      const href = l[1];
      const text = l[2].replace(/\(.*?\)/, "").trim();
      const slug = href
        .replace(/^https?:\/\/(?:www\.)?jkanime\.net\/?/, "")
        .split(/[?#]/)[0];
      related.push({
        title: text,
        url: `/jkanime/anime/${slug}`,
        img: "",
      });
    }
  }
  return related;
}

/* ================================
   🧠 GET ANIME INFO
=================================== */
export async function GetAnimeInfo(anime: string): Promise<AnimeData | null> {
  try {
    const response = await axiosInstance.get(`${URL}${anime}`);
    const html = response.data as string;

    const title = extractTitle(html);
    if (!title) return null;

    const slug = extractAnimeSlug(html, title);

    return {
      title,
      title_alt: extractAltTitles(html),
      img: extractImage(html),
      status: extractStatus(html),
      synopsis: extractSynopsis(html),
      genres: extractGenres(html),
      episodes: extractEpisodes(html, slug),
      related: extractRelatedAnimes(html),
    };
  } catch (error) {
    console.error("Error extracting anime info:", error);
    return null;
  }
}

/* ================================
   🎬 GET EPISODE INFO
=================================== */
export async function GetEpisodeInfo(
  episode: string
): Promise<EpisodeData | null> {
  try {
    const match = episode.match(/^(.*)-(\d+)$/);
    const response = await axiosInstance.get(`${URL}${match![1]}/${match![2]}`);
    const html = response.data as string;

    const h1Match = html.match(
      /<h1[^>]*>\s*Episodio\s+(\d+)\s*-\s*(.*?)<\/h1>/i
    );
    const title = h1Match ? h1Match[2].trim() : "";
    const numberEpisode = h1Match ? h1Match[1] : "";

    // Buscar servidores
    const scriptMatch = html.match(/var servers\s*=\s*(\[.*?\]);/s);
    const servers: Server[] = [];

    if (scriptMatch) {
      try {
        const cleanJson = scriptMatch[1]
          .replace(/(\w+):/g, '"$1":')
          .replace(/'/g, '"')
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]");
        const serversData = JSON.parse(cleanJson);
        for (const s of serversData) {
          const decodedUrl =
            typeof Buffer === "undefined"
              ? atob(s.remote)
              : Buffer.from(s.remote, "base64").toString("utf8");
          servers.push({
            name: s.server,
            url: decodedUrl,
            source: "",
          });
        }
      } catch (err) {
        console.error("Error parsing servers:", err);
      }
    }

    return { title, numberEpisode, servers };
  } catch (error) {
    console.error("Error extracting episode info:", error);
    return null;
  }
}

/* ================================
   🕒 GET LATEST ANIME
=================================== */
export async function GetLatest(): Promise<LatestAnime[]> {
  try {
    const response = await fetchWithRetry(URL, 5);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();

    const latestAnimes: LatestAnime[] = [];
    // Primero extraemos el contenido del div con id="animes"
    const animesSectionRegex =
      /<div class="tab-pane fade show active" id="animes" role="tabpanel" aria-labelledby="animes-tab">([\s\S]*?)<\/div><\/div><\/div><\/div><\/div>/;
    const animesMatch = html.match(animesSectionRegex);
    console.log(animesMatch);

    if (!animesMatch) {
      return latestAnimes;
    }

    const animesContent = animesMatch[0];

    // Regex para encontrar cada card de anime
    const animeCardRegex =
      /<div class="mb-4 d-flex align-items-stretch mb-3 dir1">([\s\S]*?)<\/div><\/div><\/div>/g;

    let cardMatch;
    while ((cardMatch = animeCardRegex.exec(animesContent)) !== null) {
      const cardContent = cardMatch[0];

      // Extraer título
      const titleRegex = /<h5 class="strlimit card-title">([^<]*)<\/h5>/;
      const titleMatch = cardContent.match(titleRegex);
      const title = titleMatch ? titleMatch[1].trim() : "";

      // Extraer URL
      const urlRegex = /<a href="([^"]*)"/;
      const urlMatch = cardContent.match(urlRegex);
      const url = urlMatch ? urlMatch[1] : "";

      // Extraer imagen
      const imgRegex = /<img class="card-img-top" src="([^"]*)"/;
      const imgMatch = cardContent.match(imgRegex);
      const img = imgMatch ? imgMatch[1] : "";

      // Extraer episodio y número de episodio
      const episodeRegex = /<span class="badge badge-primary">([^<]*)<\/span>/;
      const episodeMatch = cardContent.match(episodeRegex);
      const episodeNumber = episodeMatch ? episodeMatch[1] : "";

      // Extraer número del episodio (solo el número)
      const episodeNumMatch = episodeNumber.match(/\d+/);
      const episode = episodeNumMatch ? parseInt(episodeNumMatch[0], 10) : 0;

      // Extraer fecha
      const dateRegex =
        /<span class="badge ml-2 badge-secondary"><i class="ti ti-clock-hour-5"><\/i> ([^<]*)<\/span>/;
      const dateMatch = cardContent.match(dateRegex);
      const date = dateMatch ? dateMatch[1].trim() : "";

      if (title && url && img) {
        latestAnimes.push({
          title,
          url,
          img,
          episode,
          episodeNumber,
          date,
        });
      }
    }

    return latestAnimes;
  } catch (error) {
    console.error("Error fetching latest animes:", error);
    return [];
  }
}

/* ================================
   🔍 GET ANIME BY FILTER
=================================== */
export async function GetAnimeByFilter(title: string): Promise<AnimeResult[]> {
  try {
    const response = await axiosInstance.get(`${URL}buscar/${title}`);
    const html = response.data as string;
    const results: AnimeResult[] = [];

    const blocks = Array.from(
      html.matchAll(
        /<div[^>]*class="col-lg-2 col-md-6 col-sm-6"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g
      )
    );

    for (const block of blocks) {
      const section = block[1];
      const name =
        section.match(/<h5[^>]*>\s*<a[^>]*>(.*?)<\/a>/)?.[1].trim() || "";
      const href =
        section.match(/<h5[^>]*>\s*<a[^>]+href="([^"]+)"/)?.[1] || "";
      const url = href.replace("https://jkanime.net/", "").replace(/\//g, "");
      const styleMatch = section.match(/background-image:\s*url\("([^"]+)"\)/);
      const img = styleMatch ? styleMatch[1] : "";
      const type =
        section.match(/<li[^>]*class="anime"[^>]*>(.*?)<\/li>/)?.[1].trim() ||
        "";

      if (name && url && img) {
        results.push({
          name,
          url: `/jkanime/anime/${url}`,
          image: img,
          type,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error fetching filtered animes:", error);
    return [];
  }
}
