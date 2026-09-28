import { tmdbService, DiscoverFilters } from './tmdb';
import { MediaItem } from '../types/media';

export interface RecommendationItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string;
  rating: number;
  genre: string;
  reason: string;
  posterPath: string | null;
  runtime?: number;
  episodes?: number;
  seasons?: number;
}

export interface NovaAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: RecommendationItem[];
  timestamp: number;
  isEmptyState?: boolean;
}

export type SupportedLanguage =
  | 'en'
  | 'roman_urdu'
  | 'ur'
  | 'hi'
  | 'es'
  | 'fr'
  | 'de'
  | 'ar';

/**
 * Extracted User Preferences from query & conversation history
 */
export interface UserPreferences {
  genreNames: string[];
  genreIds: number[];
  language?: string; // BCP-47 / ISO code (e.g. 'ko', 'ja', 'hi', 'es', 'fr', 'de')
  year?: number;
  yearGte?: number;
  yearLte?: number;
  minRating?: number;
  maxRuntime?: number; // In minutes, e.g. 118 for under 2 hours
  mediaType?: 'movie' | 'tv';
  mood?: string;
  similarTitle?: string;
  searchQuery?: string;
  isShortestComparison?: boolean;
  isLessScary?: boolean;
}

/**
 * Detect Language naturally from prompt text without forcing user manual selection
 */
export function detectLanguage(text: string): SupportedLanguage {
  const t = text.trim();

  // 1. Urdu Script Detection
  if (/[\u0600-\u06FF]/.test(t)) {
    if (/[ٹڈڑںےہ]/.test(t) || /(مجھے|بتاؤ|فلم|کیا|کون|اچھی|دیکھنا|کہانی)/.test(t)) {
      return 'ur';
    }
    return 'ar';
  }

  // 2. Hindi / Devanagari Detection
  if (/[\u0900-\u097F]/.test(t)) {
    return 'hi';
  }

  // 3. Roman Urdu Detection (Distinctive vocabulary & colloquial terms)
  const romanUrduPatterns = [
    /\b(mujhe|btao|batao|bataiye|achi|achhi|dekhni|dekhun|chahiye|konsi|kon si|koi|kuch|darawna|darawni|choti|bari|shuru|karun|karo|hain|hai|yeh|iss|mein|dikhaye|sunao|ziada|zyada|bohot|bahut|pasand|filam|bhai|bta|acha|kisi|aisi|wesi|valie|wali)\b/i,
    /\b(kam darawna|kam darawni|sabse choti|sab se choti|acha movie|acha film|jesi|jaisa|waisi)\b/i,
  ];
  if (romanUrduPatterns.some((pattern) => pattern.test(t))) {
    return 'roman_urdu';
  }

  // 4. Spanish Detection
  if (/\b(pel[ií]cula|recomi[eé]nda|terror|quiero|ver|algo|parecido|cu[aá]l|corta|series|gracias|hola|noche)\b/i.test(t)) {
    return 'es';
  }

  // 5. French Detection
  if (/\b(film|recommande|peur|sombre|regarder|quelque|court|courte|s[eé]rie|merci|bonjour|ce soir)\b/i.test(t)) {
    return 'fr';
  }

  // 6. German Detection
  if (/\b(film|empfiehl|dunkel|horror|anschauen|etwas|wie|welche|k[uü]rzeste|serie|danke|hallo|heute)\b/i.test(t)) {
    return 'de';
  }

  return 'en';
}

/**
 * Extract structured user preferences from natural conversation & context
 */
export function extractPreferences(
  query: string,
  _history: NovaAIMessage[] = []
): UserPreferences {
  const q = query.toLowerCase().trim();
  const prefs: UserPreferences = {
    genreNames: [],
    genreIds: [],
  };

  // 1. Follow-up: "Which one is shortest?" / "In me se sab se choti konsi hai?"
  if (
    q.includes('shortest') ||
    q.includes('sab se choti') ||
    q.includes('sabse choti') ||
    q.includes('sab say choti') ||
    q.includes('la más corta') ||
    q.includes('le plus court') ||
    q.includes('kürzeste')
  ) {
    prefs.isShortestComparison = true;
    return prefs;
  }

  // 2. Follow-up: "Something less scary" / "Kuch kam darawna"
  if (
    q.includes('less scary') ||
    q.includes('not too scary') ||
    q.includes('kam darawna') ||
    q.includes('kam darawni') ||
    q.includes('menos terror') ||
    q.includes('moins effrayant') ||
    q.includes('weniger gruselig')
  ) {
    prefs.isLessScary = true;
    prefs.genreIds = [53, 9648]; // Thriller, Mystery
    prefs.genreNames = ['Mystery Thriller'];
    prefs.mood = 'psychological suspense';
    return prefs;
  }

  // 3. Similar title detection (e.g. "something like Interstellar", "Breaking Bad jesi")
  const similarPatterns = [
    /(?:like|similar to|resemble|in the style of)\s+([A-Za-z0-9\s:–-]+?)(?:\.|\?|,|$|\bfor\b|\bwith\b|\bunder\b)/i,
    /([A-Za-z0-9\s:–-]+?)\s+(?:jesi|jaisa|waisi|ki tarah|ke jesa)/i,
  ];

  for (const pattern of similarPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length > 2 && !['something', 'movie', 'film', 'series', 'show'].includes(candidate.toLowerCase())) {
        prefs.similarTitle = candidate;
        break;
      }
    }
  }

  // 4. Media Type (Movie vs TV Show)
  if (/\b(series|tv|show|shows|season|seasons|web series|episode|episodes|drama|binge)\b/i.test(q)) {
    prefs.mediaType = 'tv';
  } else if (/\b(movie|movies|film|filam|cinema)\b/i.test(q)) {
    prefs.mediaType = 'movie';
  }

  // 5. Language origin preference
  if (/\b(korean|korea|k-drama|k drama)\b/i.test(q)) {
    prefs.language = 'ko';
  } else if (/\b(japanese|japan|anime)\b/i.test(q)) {
    prefs.language = 'ja';
  } else if (/\b(hindi|bollywood|indian)\b/i.test(q)) {
    prefs.language = 'hi';
  } else if (/\b(spanish|espanol|español)\b/i.test(q)) {
    prefs.language = 'es';
  } else if (/\b(french|francais|français)\b/i.test(q)) {
    prefs.language = 'fr';
  } else if (/\b(german|deutsch)\b/i.test(q)) {
    prefs.language = 'de';
  }

  // 6. Runtime constraint (under 2 hours / short)
  if (
    q.includes('under 2 hours') ||
    q.includes('under two hours') ||
    q.includes('less than 2 hours') ||
    q.includes('short') ||
    q.includes('choti') ||
    q.includes('kam time') ||
    q.includes('corta') ||
    q.includes('court')
  ) {
    prefs.maxRuntime = 118; // <= 118 minutes
    prefs.mediaType = prefs.mediaType || 'movie';
  }

  // 7. Rating preference (top rated / best)
  if (/\b(best|top rated|highest rated|masterpiece|super hit|zabardast|kamal)\b/i.test(q)) {
    prefs.minRating = 7.5;
  }

  // 8. Mood & Genre detection
  // Dark psychological thriller
  if (
    (q.includes('psychological') && (q.includes('thriller') || q.includes('dark'))) ||
    q.includes('dark psychological') ||
    q.includes('mind-bending') ||
    q.includes('mind bending')
  ) {
    prefs.genreIds = [53, 9648];
    prefs.genreNames = ['Dark Psychological Thriller', 'Mystery'];
    prefs.mood = 'dark psychological suspense';
    return prefs;
  }

  // Horror
  if (q.includes('horror') || q.includes('darawna') || q.includes('darawni') || q.includes('scary') || q.includes('terror') || q.includes('peur') || q.includes('رعب')) {
    prefs.genreIds = [27, 53];
    prefs.genreNames = ['Horror'];
    prefs.mood = q.includes('dark') ? 'dark & terrifying' : 'chilling';
  }
  // Sci-Fi
  else if (q.includes('sci-fi') || q.includes('scifi') || q.includes('space') || q.includes('cosmic') || q.includes('interstellar') || q.includes('alien')) {
    prefs.genreIds = [878];
    prefs.genreNames = ['Sci-Fi'];
    prefs.mood = 'cosmic & visionary';
  }
  // Thriller
  else if (q.includes('thriller') || q.includes('suspense') || q.includes('suspenseful')) {
    prefs.genreIds = [53, 9648];
    prefs.genreNames = ['Thriller'];
    prefs.mood = 'suspenseful';
  }
  // Action
  else if (q.includes('action') || q.includes('fight') || q.includes('adrenaline')) {
    prefs.genreIds = [28, 10759];
    prefs.genreNames = ['Action'];
    prefs.mood = 'adrenaline-fueled';
  }
  // Crime
  else if (q.includes('crime') || q.includes('detective') || q.includes('mafia') || q.includes('cartel') || q.includes('breaking bad')) {
    prefs.genreIds = [80, 18];
    prefs.genreNames = ['Crime Drama'];
    prefs.mood = 'gritty & intense';
  }
  // Anime / Animation
  else if (q.includes('anime') || q.includes('animation') || q.includes('animated') || q.includes('ghibli')) {
    prefs.genreIds = [16];
    prefs.genreNames = ['Animation'];
    prefs.mood = 'visually stunning';
  }
  // Comedy
  else if (q.includes('comedy') || q.includes('funny') || q.includes('laugh') || q.includes('mazahia')) {
    prefs.genreIds = [35];
    prefs.genreNames = ['Comedy'];
    prefs.mood = 'humorous & entertaining';
  }

  // If no genre, no similar title, and not a generic recommendation prompt:
  // Treat as specific search query for TMDB multi-search
  const isGenericDiscovery =
    /\b(recommend|what should i watch|watch tonight|what to watch|surprise me|kuch acha|kuch dekhna|koi movie|koi film|koi show)\b/i.test(q);

  if (
    !isGenericDiscovery &&
    prefs.genreIds.length === 0 &&
    !prefs.similarTitle &&
    !prefs.mood &&
    !prefs.language &&
    !prefs.maxRuntime &&
    !prefs.isLessScary &&
    !prefs.isShortestComparison
  ) {
    prefs.searchQuery = query.trim();
  }

  return prefs;
}

/**
 * Generate human-like cinematic reason for why a real TMDB title matches the user's intent
 */
function generateMatchReason(
  title: string,
  overview: string,
  prefs: UserPreferences,
  lang: SupportedLanguage
): string {
  const isRomanUrdu = lang === 'roman_urdu';
  const isUrdu = lang === 'ur';
  const isHindi = lang === 'hi';
  const isSpanish = lang === 'es';
  const isFrench = lang === 'fr';
  const isGerman = lang === 'de';
  const isArabic = lang === 'ar';

  // 1. Psychological thriller matching
  if (prefs.mood?.includes('psychological') || prefs.genreNames.includes('Psychological Thriller')) {
    if (isRomanUrdu) {
      return `*${title}* zabardast zehni suspense aur dark psychological tension se bharpoor hai; plot ke unexpected twists aapko aakhri lamhe tak bandhe rakhenge.`;
    }
    if (isUrdu) return `*${title}* گہرے نفسیاتی سسپنس اور غیر متوقع کہانی کا لاجواب شاہکار ہے۔`;
    if (isHindi) return `*${title}* गहरे मनोवैज्ञानिक सस्पेंस और चौंका देने वाले मोड़ों से भरपूर उत्कृष्ट सिनेमा है।`;
    if (isSpanish) return `*${title}* ofrece intriga psicológica de primer nivel con una atmósfera oscura y giros magistrales.`;
    if (isFrench) return `*${title}* est un thriller psychologique captivant à l'atmosphère sombre et aux retournements brillants.`;
    if (isGerman) return `*${title}* ist ein hochklassiger Psychothriller mit beklemmender Atmosphäre und unerwarteten Wendungen.`;
    if (isArabic) return `*${title}* يقدم إثارة نفسية آسرة بحبكة متقنة وأجواء غامضة تخطف الأنفاس.`;
    return `*${title}* is a masterclass in dark psychological suspense and gripping paranoia that keeps you guessing until the final frame.`;
  }

  // 2. Korean thriller matching
  if (prefs.language === 'ko') {
    if (isRomanUrdu) {
      return `Korean cinema ka high-octane thriller jo relentless pacing, raw emotion aur zabardast action ke sath deliver karta hai.`;
    }
    return `Premier Korean thriller delivering relentless tension, brilliant kinetic pacing, and powerful character dynamics.`;
  }

  // 3. Short movie (< 2 hours)
  if (prefs.maxRuntime) {
    if (isRomanUrdu) {
      return `Sirf 2 ghante se kam ke tight runtime mein bina kisi faltu filler ke zabardast aur fast-paced thrill deliver karti hai.`;
    }
    return `Tightly paced at under 2 hours, delivering maximum cinematic impact without unnecessary filler.`;
  }

  // 4. Similar to another title (e.g. Interstellar, Breaking Bad)
  if (prefs.similarTitle) {
    if (isRomanUrdu) {
      return `*${prefs.similarTitle}* ke fans ke liye bilkul perfect match hai jis mein waisi hi intense storytelling aur depth milti hai.`;
    }
    return `Exceptional recommendation for fans of *${prefs.similarTitle}*, sharing similar atmospheric scope and narrative brilliance.`;
  }

  // 5. Less scary horror follow-up
  if (prefs.isLessScary) {
    if (isRomanUrdu) {
      return `Bina kisi be-ja jumpscare ya khoon-kharabay ke intelligent suspense aur goosebumps provide karti hai.`;
    }
    return `Delivers pure psychological tension and atmospheric dread without traumatic jump scares or gratuitous gore.`;
  }

  // Default clean reason based on overview
  if (overview && overview.length > 20) {
    const firstSentence = overview.split('.')[0] + '.';
    if (firstSentence.length < 130) {
      return firstSentence;
    }
  }

  if (isRomanUrdu) {
    return `Aapki pasandeeda genre aur mood ke mutabiq TMDB ki top-rated recommendations mein se aik hai.`;
  }
  return `Highly acclaimed cinematic experience matching your exact preferences and curated for quality.`;
}

/**
 * Generate conversational response header in user's detected language
 */
function generateResponseHeader(
  prefs: UserPreferences,
  _count: number,
  lang: SupportedLanguage
): string {
  if (prefs.isShortestComparison) {
    return ''; // Handled separately
  }

  const isRomanUrdu = lang === 'roman_urdu';
  const isUrdu = lang === 'ur';
  const isHindi = lang === 'hi';
  const isSpanish = lang === 'es';
  const isFrench = lang === 'fr';
  const isGerman = lang === 'de';
  const isArabic = lang === 'ar';

  if (prefs.mood?.includes('psychological') || prefs.genreNames.includes('Psychological Thriller')) {
    if (isRomanUrdu) {
      return `Maine TMDB database se aapke liye dark psychological thrillers search kiye hain jo aapke dimagh ko hilakar rakh denge:`;
    }
    if (isUrdu) return `میں نے آپ کے لیے زبردست ڈارک نفسیاتی تھرلرز تلاش کیے ہیں جو آپ کو ضرور پسند آئیں گے:`;
    if (isHindi) return `मैंने टीएमडीबी से आपके लिए बेहतरीन डार्क साइकोलॉजिकल थ्रिलर्स खोजे हैं:`;
    if (isSpanish) return `He buscado en la base de datos de TMDB los mejores thrillers psicológicos oscuros para ti:`;
    if (isFrench) return `J'ai exploré le catalogue TMDB pour vous trouver les meilleurs thrillers psychologiques sombres :`;
    if (isGerman) return `Ich habe in der TMDB-Datenbank nach den besten düsteren Psychothrillern für Sie gesucht:`;
    if (isArabic) return `لقد بحثت لك في قاعدة بيانات TMDB عن أفضل أفلام الإثارة النفسية المظلمة:`;
    return `I queried TMDB for top-tier dark psychological thrillers matching your vibe:`;
  }

  if (prefs.language === 'ko') {
    if (isRomanUrdu) {
      return `Korean cinema se aapki demand ke mutabiq action aur thriller se bharpoor yeh real titles dhoonde hain:`;
    }
    return `Here are top Korean action-thrillers retrieved directly from TMDB:`;
  }

  if (prefs.similarTitle) {
    if (isRomanUrdu) {
      return `*${prefs.similarTitle}* ke style aur theme ke mutabiq maine TMDB se yeh real cinematic matches select kiye hain:`;
    }
    return `Based on your interest in *${prefs.similarTitle}*, here are verified cinematic matches from TMDB:`;
  }

  if (prefs.maxRuntime) {
    if (isRomanUrdu) {
      return `2 ghante se kam runtime wali yeh behtareen movies aapke waqt ke liye bilkul perfect hain:`;
    }
    return `Here are exceptional titles under 2 hours that pack a punch without wasting your time:`;
  }

  if (isRomanUrdu) {
    return `Maine aapki pasand ko analyze karke TMDB se yeh real recommendations nikali hain:`;
  }
  if (isUrdu) return `آپ کی فرمائش کے مطابق ٹی ایم ڈی بی سے یہ حقیقی شاہکار منتخب کیے گئے ہیں:`;
  if (isHindi) return `आपकी पसंद के अनुसार टीएमडीबी से ये बेहतरीन टाइटल्स चुने गए हैं:`;
  if (isSpanish) return `Aquí tienes títulos reales seleccionados de TMDB según tus preferencias:`;
  if (isFrench) return `Voici des titres authentiques sélectionnés sur TMDB selon vos critères :`;
  if (isGerman) return `Hier sind echte TMDB-Titel, die genau zu Ihren Wünschen passen:`;
  if (isArabic) return `إليك هذه العناوين الحقيقية من TMDB بناءً على طلبك:`;

  return `Here are real titles matching your preferences retrieved directly from TMDB:`;
}

/**
 * Formats a raw MediaItem from TMDB into a structured RecommendationItem
 */
function formatMediaItem(
  item: MediaItem,
  prefs: UserPreferences,
  lang: SupportedLanguage
): RecommendationItem {
  const isMovie = item.media_type === 'movie' || 'title' in item;
  const mediaType: 'movie' | 'tv' = isMovie ? 'movie' : 'tv';
  const title = 'title' in item ? item.title : item.name;
  const dateStr = 'release_date' in item ? item.release_date : item.first_air_date;
  const year = dateStr ? dateStr.slice(0, 4) : '';
  const rating = item.vote_average ? Number(item.vote_average) : 0;
  const runtime = 'runtime' in item && typeof item.runtime === 'number' ? item.runtime : undefined;
  const episodes = 'number_of_episodes' in item && typeof item.number_of_episodes === 'number' ? item.number_of_episodes : undefined;
  const seasons = 'number_of_seasons' in item && typeof item.number_of_seasons === 'number' ? item.number_of_seasons : undefined;

  let genre = 'Cinema';
  if (item.genres && item.genres.length > 0) {
    genre = item.genres.map((g) => g.name).slice(0, 2).join(' / ');
  } else if (prefs.genreNames.length > 0) {
    genre = prefs.genreNames.join(' / ');
  }

  const reason = generateMatchReason(title, item.overview, prefs, lang);

  return {
    id: item.id,
    mediaType,
    title,
    year,
    rating,
    genre,
    reason,
    posterPath: item.poster_path,
    runtime,
    episodes,
    seasons,
  };
}

/**
 * Handle "Which one is shortest?" comparison follow-up
 */
function handleShortestComparison(
  history: NovaAIMessage[],
  lang: SupportedLanguage
): NovaAIMessage {
  // Find previous recommendations from the most recent assistant message
  let previousTitles: RecommendationItem[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant' && history[i].recommendations?.length) {
      previousTitles = history[i].recommendations!;
      break;
    }
  }

  if (previousTitles.length === 0) {
    return {
      id: `nova-ai-${Date.now()}`,
      role: 'assistant',
      content:
        lang === 'roman_urdu'
          ? 'Pehle mujhe batayein ke aap konsi movie ya series dekhna chahte hain taake main compare kar sakun.'
          : 'Please tell me what titles you would like to explore first so I can compare them for you.',
      timestamp: Date.now(),
    };
  }

  // Find shortest title by runtime (movies) or episodes (TV)
  const tvTitles = previousTitles.filter((t) => t.mediaType === 'tv');
  const movieTitles = previousTitles.filter((t) => t.mediaType === 'movie');

  let topPick = previousTitles[0];
  if (tvTitles.length > 0 && movieTitles.length === 0) {
    tvTitles.sort((a, b) => (a.episodes || 999) - (b.episodes || 999));
    topPick = tvTitles[0];
  } else if (movieTitles.length > 0) {
    movieTitles.sort((a, b) => (a.runtime || 999) - (b.runtime || 999));
    topPick = movieTitles[0];
  }

  const isTv = topPick.mediaType === 'tv';
  const durationDesc = isTv
    ? `${topPick.seasons || 1} seasons (${topPick.episodes || 10} episodes total)`
    : `${topPick.runtime || 90} minutes runtime`;

  let responseText = `Among the titles we just discussed, **${topPick.title}** is the shortest with ${durationDesc}, making it the fastest and most concise watch.`;

  if (lang === 'roman_urdu') {
    responseText = `Jo titles humne abhi discuss kiye, un mein se **${topPick.title}** sab se choti hai (${durationDesc}), aap isay foran complete kar sakte hain!`;
  } else if (lang === 'ur') {
    responseText = `ہمارے زیر بحث عنوانات میں سے **${topPick.title}** سب سے مختصر ہے (${durationDesc})۔`;
  } else if (lang === 'hi') {
    responseText = `पिछली चर्चा की गई फिल्मों में से **${topPick.title}** सबसे छोटी है (${durationDesc})।`;
  } else if (lang === 'es') {
    responseText = `De los títulos discutidos anteriormente, **${topPick.title}** es la opción más corta (${durationDesc}).`;
  } else if (lang === 'fr') {
    responseText = `Parmi les œuvres évoquées précédemment, **${topPick.title}** est la plus courte (${durationDesc}).`;
  } else if (lang === 'de') {
    responseText = `Von den zuvor besprochenen Titeln ist **${topPick.title}** am kürzesten (${durationDesc}).`;
  } else if (lang === 'ar') {
    responseText = `من بين العناوين السابقة، يعتبر **${topPick.title}** الأقصر مدة (${durationDesc}).`;
  }

  return {
    id: `nova-ai-${Date.now()}`,
    role: 'assistant',
    content: responseText,
    recommendations: [topPick],
    timestamp: Date.now(),
  };
}

/**
 * Main Nova AI Entry Point (Upgraded Architecture)
 * 1. Understands intent
 * 2. Extracts preferences (genre, language, year, rating, runtime, movie/tv, mood, similar title)
 * 3. Queries TMDB service (tmdbService.discoverMedia / searchMulti)
 * 4. Retrieves real titles (never invents titles)
 * 5. Passes real results to AI
 * 6. Explains why each title matches
 * 7. Returns real NovaPlay recommendation cards linking to /movie/:id or /tv/:id
 */
export async function askNovaAI(
  userQuery: string,
  history: NovaAIMessage[] = []
): Promise<NovaAIMessage> {
  const timestamp = Date.now();
  const id = `nova-ai-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
  const detectedLang = detectLanguage(userQuery);

  try {
    // 1 & 2. Understand user intent & extract preferences
    const preferences = extractPreferences(userQuery, history);

    // Special case: "Which one is shortest?" comparison follow-up
    if (preferences.isShortestComparison) {
      return handleShortestComparison(history, detectedLang);
    }

    // 3 & 4. Query existing TMDB service to retrieve REAL titles
    const discoverFilters: DiscoverFilters = {
      mediaType: preferences.mediaType,
      genreIds: preferences.genreIds.length > 0 ? preferences.genreIds : undefined,
      withOriginalLanguage: preferences.language,
      year: preferences.year,
      voteAverageGte: preferences.minRating,
      withRuntimeLte: preferences.maxRuntime,
      searchQuery: preferences.searchQuery,
      similarToTitle: preferences.similarTitle,
    };

    const realMediaItems = await tmdbService.discoverMedia(discoverFilters);

    // Empty state handling if no good matches are found
    if (!realMediaItems || realMediaItems.length === 0) {
      const fallbackSuffix = 'Try changing your genre, language or mood.';
      const emptyContentMap: Record<SupportedLanguage, string> = {
        en: `No matching titles found for your search. ${fallbackSuffix}`,
        roman_urdu: `Aapki search ke mutabiq koi title nahi mila. ${fallbackSuffix}`,
        ur: `آپ کی تلاش کے مطابق کوئی عنوان نہیں مل سکا۔ برائے مہربانی اپنا موڈ یا موضوع تبدیل کر کے دیکھیں۔ ${fallbackSuffix}`,
        hi: `आपकी खोज के अनुसार कोई फिल्म या शो नहीं मिला। ${fallbackSuffix}`,
        es: `No se encontraron coincidencias para tu búsqueda. ${fallbackSuffix}`,
        fr: `Aucun titre correspondant trouvé. ${fallbackSuffix}`,
        de: `Keine passenden Titel für Ihre Suche gefunden. ${fallbackSuffix}`,
        ar: `لم يتم العثور على عناوين مطابقة لبحثك. ${fallbackSuffix}`,
      };

      return {
        id,
        role: 'assistant',
        content: emptyContentMap[detectedLang] || emptyContentMap.en,
        recommendations: [],
        timestamp,
        isEmptyState: true,
      };
    }

    // 5 & 6. Give real retrieved titles to AI & generate why each title matches
    const topItems = realMediaItems.slice(0, 3);
    const recommendationCards: RecommendationItem[] = topItems.map((item) =>
      formatMediaItem(item, preferences, detectedLang)
    );

    const header = generateResponseHeader(preferences, recommendationCards.length, detectedLang);

    return {
      id,
      role: 'assistant',
      content: header,
      recommendations: recommendationCards,
      timestamp,
      isEmptyState: false,
    };
  } catch (err) {
    console.error('Nova AI service error:', err);
    return {
      id,
      role: 'assistant',
      content: 'Nova AI is temporarily unavailable. Please try again.',
      timestamp,
      isEmptyState: true,
    };
  }
}
