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
      const bundle = entry.bundle;

      // Bundle card — use bundle name + best image
      if (bundle && bundle.name) {
        const key = 'bundle_' + bundle.name;
        if (!seen.has(key)) {
          seen.add(key);
          const bundleImg = bundle.image
            || entryItems.find(i => i.images?.featured)?.images?.featured
            || entryItems.find(i => i.images?.icon)?.images?.icon || '';
          items.push({
            name: bundle.name,
            type: 'Bundle',
            rarity: '',
            description: bundle.info || '',
            image: bundleImg,
            price
          });
        }
      }

      // Always also add individual items (even in bundles)
      for (const item of entryItems) {
        const key = item.id || item.name;
        if (key && !seen.has(key)) {
          seen.add(key);
          const type = item.type?.value || 'Cosmetic';
          // Skip generic/placeholder items
          if (!item.name || item.name.startsWith('TBD') || item.name === 'Random') continue;
          items.push({
            name: item.name,
            type,
            rarity: item.rarity?.value || '',
            description: item.description || '',
            image: item.images?.featured || item.images?.icon || item.images?.smallIcon || '',
            price: bundle ? 0 : price  // 0 price for bundle sub-items
          });
        }
      }
    }

    // Remove bundle sub-items with 0 price if they appear in a bundle card already
    const bundleNames = new Set(items.filter(i=>i.type==='Bundle').map(i=>i.name));
    const finalItems = items.filter(i => !(i.price === 0 && i.type !== 'Bundle'));

    const data = {
      updated: now.toISOString().slice(0,16).replace('T',' ') + ' UTC',
      date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      count: finalItems.length,
      items: finalItems
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
