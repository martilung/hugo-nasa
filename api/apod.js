// NASA päevapildi (APOD) ja eestikeelse tõlke API (Vercel Serverless Function)

let cachedResult = null;
let cachedDayKey = null;

function getEstonianDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Tallinn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function formatEstonianDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('et-EE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    })
      .format(date)
      .toLocaleUpperCase('et-EE');
  } catch {
    return (dateStr || '').toLocaleUpperCase('et-EE');
  }
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#038;/g, '&')
    .replace(/&#8211;|&#8212;/g, '–')
    .replace(/&#039;|&#8217;/g, "'")
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function cleanExplanationText(rawHtml) {
  if (!rawHtml) return '';
  let text = decodeHtmlEntities(rawHtml);
  text = text.replace(/<strong>\s*Tomorrow's picture:[\s\S]*$/i, '');
  text = text.replace(/^\s*<strong>\s*Explanation:\s*<\/strong>\s*/i, '');
  text = text.replace(/^\s*Explanation:\s*/i, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s*--\s*/g, ' – ');
  text = text.replace(/Tomorrow's picture:[\s\S]*$/i, '');
  return text.replace(/\s+/g, ' ').trim();
}

async function fetchFromNasaOfficialFeed() {
  const res = await fetch('https://science.nasa.gov/feed/apod-basic/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HugoNasaApod/1.0)' },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`NASA APOD voo päring ebaõnnestus (${res.status})`);

  const xml = await res.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const itemXml of items) {
    const hdUrlMatch = itemXml.match(/<apod:hdurl>([\s\S]*?)<\/apod:hdurl>/i);
    const ogImageMatch = itemXml.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    const imageUrl = decodeHtmlEntities(hdUrlMatch?.[1] || ogImageMatch?.[1] || '').trim();
    if (!imageUrl || imageUrl.includes('nasa-logo')) continue;

    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const expMatch =
      itemXml.match(/<apod:explanation>([\s\S]*?)<\/apod:explanation>/i) ||
      itemXml.match(/<description>([\s\S]*?)<\/description>/i);
    const creditMatch = itemXml.match(/<apod:credit>([\s\S]*?)<\/apod:credit>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    let dateStr = getEstonianDateKey();
    if (pubDateMatch?.[1]) {
      const parsedDate = new Date(pubDateMatch[1].trim());
      if (!Number.isNaN(parsedDate.getTime())) {
        dateStr = parsedDate.toISOString().split('T')[0];
      }
    }

    const title = decodeHtmlEntities(titleMatch?.[1] || 'Astronomy Picture of the Day')
      .replace(/<[^>]+>/g, '')
      .trim();
    const explanation = cleanExplanationText(expMatch?.[1] || '');
    const copyright = decodeHtmlEntities(creditMatch?.[1] || 'NASA')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,;:.])/g, '$1')
      .trim();
    const webImageUrl = imageUrl.replace(/([?&])w=\d+(&h=\d+)?/, '$1w=1600');

    return {
      date: dateStr,
      title,
      explanation,
      url: webImageUrl,
      hdurl: imageUrl,
      copyright: copyright || 'NASA'
    };
  }

  throw new Error('NASA voost ei leitud ühtegi pilti');
}

async function fetchNasaApod() {
  try {
    return await fetchFromNasaOfficialFeed();
  } catch (feedErr) {
    console.warn('NASA RSS voog ebaõnnestus, proovin REST API-t:', feedErr.message);
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}&thumbs=true`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`NASA API viga (${res.status})`);
    const data = await res.json();
    return {
      date: data.date || getEstonianDateKey(),
      title: data.title || 'Astronomy Picture of the Day',
      explanation: cleanExplanationText(data.explanation || ''),
      url: data.url,
      hdurl: data.hdurl || data.url,
      copyright: data.copyright || 'NASA'
    };
  }
}

async function translateToEstonian(text) {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=et&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((s) => (Array.isArray(s) ? s[0] : '')).join('').trim();
        if (translated) return translated;
      }
    }
  } catch (err) {
    console.warn('Tõlketeenus ebaõnnestus:', err.message);
  }
  return text;
}

function toPrintUppercase(text) {
  return (text || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('et-EE');
}

async function getDailySpacePicture() {
  const todayKey = getEstonianDateKey();
  if (cachedResult && cachedDayKey === todayKey) return cachedResult;

  const nasaData = await fetchNasaApod();
  const [titleTr, expTr] = await Promise.all([
    translateToEstonian(nasaData.title || ''),
    translateToEstonian(nasaData.explanation || '')
  ]);

  const result = {
    date: nasaData.date || todayKey,
    formattedDate: formatEstonianDate(nasaData.date || todayKey),
    titleEt: toPrintUppercase(titleTr),
    explanationEt: toPrintUppercase(expTr),
    titleOriginal: toPrintUppercase(nasaData.title || ''),
    imageUrl: nasaData.url,
    hdImageUrl: nasaData.hdurl || nasaData.url,
    copyright: nasaData.copyright ? toPrintUppercase(nasaData.copyright.replace(/\n/g, ' ')) : 'NASA',
    fetchedDay: todayKey
  };

  cachedResult = result;
  cachedDayKey = todayKey;
  return result;
}

module.exports = async function handler(req, res) {
  try {
    const data = await getDailySpacePicture();
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'KOSMOSEPILDI LAADIMINE EBAÕNNESTUS. PALUN PROOVI HETKE PÄRAST UUESTI.',
      details: error.message
    }));
  }
};
