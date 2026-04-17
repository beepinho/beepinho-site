export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Content-Type', 'application/json');

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
    const entries = raw?.data?.entries || [];

    for (const entry of entries) {
      const price = entry.finalPrice || entry.regularPrice || 0;
      const entryItems = entry.brItems || entry.items || [];
      const bundle = entry.bundle;

      if (bundle && bundle.name) {
        const key = 'bundle_' + bundle.name;
        if (!seen.has(key)) {
          seen.add(key);
          const bundleImg = bundle.image
            || entryItems.find(i => i.images?.featured)?.images?.featured
            || entryItems.find(i => i.images?.icon)?.images?.icon || '';
          items.push({ name: bundle.name, type: 'Bundle', rarity: '', image: bundleImg, price });
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
          image: item.images?.featured || item.images?.icon || item.images?.smallIcon || '',
          price
        });
      }
    }

    res.status(200).json({
      updated: now.toISOString().slice(0,16).replace('T',' ') + ' UTC',
      date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      count: items.length,
      items
    });
  } catch (e) {
    res.status(500).json({ error: e.message, items: [] });
  }
}
