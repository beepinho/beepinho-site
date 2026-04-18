export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const r = await fetch('https://fortnite-api.com/v2/news', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const raw = await r.json();

    const cards = [];
    const modes = ['br', 'stw', 'creative'];

    for (const mode of modes) {
      const section = raw?.data?.[mode];
      if (!section) continue;
      const motds = section.motds || [];
      for (const item of motds) {
        if (!item.title) continue;
        cards.push({
          title: item.title,
          body: item.body || '',
          image: item.image || item.tileImage || '',
          mode: mode.toUpperCase(),
          id: item.id || item.title
        });
      }
    }

    return new Response(JSON.stringify({ cards }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, cards: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
