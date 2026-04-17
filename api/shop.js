export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const r = await fetch('https://fortnite-api.com/v2/shop', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const raw = await r.json();
    const entries = raw?.data?.entries || [];
    const now = new Date();
    const items = [];

    for (const entry of entries) {
      const price = entry.finalPrice || 0;
      const bundle = entry.bundle;
      if (bundle) {
        items.push({
          name: bundle.name || 'Bundle',
          type: 'Bundle',
          rarity: entry.items?.[0]?.rarity?.value || '',
          description: bundle.info || '',
          image: bundle.image || '',
          price
        });
      } else {
        for (const item of (entry.items || [])) {
          items.push({
            name: item.name || 'Unknown',
            type: item.type?.value || 'Cosmetic',
            rarity: item.rarity?.value || '',
            description: item.description || '',
            image: item.images?.icon || item.images?.smallIcon || '',
            price
          });
        }
      }
    }

    const data = {
      updated: now.toISOString().slice(0,16).replace('T',' ') + ' UTC',
      date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      count: items.length,
      items
    };

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, items: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
