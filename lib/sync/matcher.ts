import { MALAnime, AnimeMatch } from "./types";

/**
 * Normalize title for matching
 * - Convert to lowercase
 * - Remove special characters
 * - Normalize whitespace
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Remove special chars, keep letters and numbers
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Calculate similarity score between two titles
 */
function calculateTitleScore(
  kujiraWords: string[],
  malWords: string[],
  normalizedKujira: string,
  normalizedMAL: string
): number {
  // Exact match
  if (normalizedKujira === normalizedMAL) {
    return 1.0;
  }

  if (kujiraWords.length === 0 || malWords.length === 0) {
    return 0.0;
  }

  // Word matching
  let matches = 0;
  for (const kw of kujiraWords) {
    for (const mw of malWords) {
      if (kw === mw && kw.length > 2) {
        matches++;
        break;
      }
    }
  }

  const wordScore = matches / Math.max(kujiraWords.length, malWords.length);

  // Substring matching
  if (normalizedKujira.length < normalizedMAL.length) {
    if (normalizedMAL.includes(normalizedKujira) && normalizedKujira.length > 3) {
      return 0.9;
    }
  } else if (normalizedKujira.includes(normalizedMAL) && normalizedMAL.length > 3) {
    return 0.85;
  }

  return wordScore * 0.8;
}

/**
 * Calculate score for a single MAL anime against the search title
 */
function calculateAnimeScore(
  kujiraTitle: string,
  anime: MALAnime
): number {
  const normalizedKujira = normalizeTitle(kujiraTitle);
  const kujiraWords = normalizedKujira.split(" ");

  const titles: string[] = [anime.title];
  
  if (anime.alternative_titles?.en) {
    titles.push(anime.alternative_titles.en);
  }
  if (anime.alternative_titles?.ja) {
    titles.push(anime.alternative_titles.ja);
  }
  if (anime.alternative_titles?.synonyms) {
    titles.push(...anime.alternative_titles.synonyms);
  }

  let maxScore = 0.0;
  for (const title of titles) {
    const normalized = normalizeTitle(title);
    const titleWords = normalized.split(" ");
    const score = calculateTitleScore(kujiraWords, titleWords, normalizedKujira, normalized);
    if (score > maxScore) {
      maxScore = score;
    }
  }

  return maxScore;
}

/**
 * Find best matching anime from MAL search results
 */
export function findBestMatch(
  kujiraTitle: string,
  searchResults: MALAnime[]
): AnimeMatch | null {
  if (searchResults.length === 0) {
    return null;
  }

  let bestMatch: AnimeMatch | null = null;
  let bestScore = 0.0;

  for (const anime of searchResults) {
    const score = calculateAnimeScore(kujiraTitle, anime);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        malId: anime.id,
        title: anime.title,
        titleEN: anime.alternative_titles?.en,
        titleJP: anime.alternative_titles?.ja,
        score,
        numEpisodes: anime.num_episodes,
      };
    }
  }

  // Only return match if confidence is above threshold
  if (bestScore < 0.3) {
    console.log(`[Matcher] No good match found for "${kujiraTitle}" (best score: ${bestScore})`);
    return null;
  }

  console.log(`[Matcher] Matched "${kujiraTitle}" to "${bestMatch?.title}" (score: ${bestScore})`);
  return bestMatch;
}

/**
 * Get all matches with scores for manual selection
 */
export function getAllMatches(
  kujiraTitle: string,
  searchResults: MALAnime[]
): AnimeMatch[] {
  const matches: AnimeMatch[] = [];

  for (const anime of searchResults) {
    const score = calculateAnimeScore(kujiraTitle, anime);

    matches.push({
      malId: anime.id,
      title: anime.title,
      titleEN: anime.alternative_titles?.en,
      titleJP: anime.alternative_titles?.ja,
      score,
      numEpisodes: anime.num_episodes,
    });
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}
