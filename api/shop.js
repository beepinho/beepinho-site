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
    const seen = new Set();

    for (const entry of entries) {
      const price = entry.finalPrice || 0;
      const entryItems = entry.items || [];

      // If it's a bundle with multiple items, use the bundle as one card
      if (entry.bundle && entry.bundle.name) {
        const key = entry.bundle.name;
        if (!seen.has(key)) {
          seen.add(key);
          // Find the best image from bundle items
          const bundleImg = entry.bundle.image ||
            entryItems.find(i => i.images?.featured)?.images?.featured ||
            entryItems.find(i => i.images?.icon)?.images?.icon || '';
          items.push({
            name: entry.bundle.name,
            type: 'Bundle',
            rarity: '',
            description: entry.bundle.info || '',
            image: bundleImg,
            price
          });
        }
      } else {
        // Individual items
        for (const item of entryItems) {
          const key = item.id || item.name;
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              name: item.name || 'Unknown',
              type: item.type?.value || 'Cosmetic',
              rarity: item.rarity?.value || '',
              description: item.description || '',
              image: item.images?.featured || item.images?.icon || item.images?.smallIcon || '',
              price
            });
          }
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
