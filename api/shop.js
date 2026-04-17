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
    const now = new Date();
    const items = [];
    const seen = new Set();

    // Collect ALL entries from ALL sections of the shop
    const allEntries = [];
    const shopData = raw?.data || {};

    // Main entries
    if (shopData.entries) allEntries.push(...shopData.entries);

    // Some API versions nest under named sections
    for (const key of Object.keys(shopData)) {
      const section = shopData[key];
      if (Array.isArray(section)) {
        for (const entry of section) {
          if (entry && (entry.items || entry.bundle)) allEntries.push(entry);
        }
      } else if (section && Array.isArray(section.entries)) {
        allEntries.push(...section.entries);
      }
    }

    for (const entry of allEntries) {
      const price = entry.finalPrice || entry.regularPrice || 0;
      const entryItems = entry.items || [];
      const bundle = entry.bundle;

      if (bundle && bundle.name) {
        const key = 'bundle_' + bundle.name;
        if (!seen.has(key)) {
          seen.add(key);
          const bundleImg = bundle.image
            || entryItems.find(i => i.images?.featured)?.images?.featured
            || entryItems.find(i => i.images?.icon)?.images?.icon || '';
          items.push({ name: bundle.name, type: 'Bundle', rarity: '', description: bundle.info || '', image: bundleImg, price });
        }
      }

      for (const item of entryItems) {
        const key = item.id || item.name;
        if (!key || seen.has(key)) continue;
        if (!item.name || item.name.startsWith('TBD') || item.name === 'Random') continue;
        seen.add(key);
        items.push({
          name: item.name,
          type: item.type?.value || 'Cosmetic',
          rarity: item.rarity?.value || '',
          description: item.description || '',
          image: item.images?.featured || item.images?.icon || item.images?.smallIcon || '',
          price
        });
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
        'Cache-Control': 'no-cache, no-store'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, items: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
