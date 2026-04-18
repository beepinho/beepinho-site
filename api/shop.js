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
    const entries = raw?.data?.entries || [];
    const sections = {};
    const seen = new Set();

    for (const entry of entries) {
      const price = entry.finalPrice || entry.regularPrice || 0;
      const entryItems = entry.brItems || entry.items || [];
      const bundle = entry.bundle;
      const sectionName = entry.layout?.name || entry.section?.name || 'Featured';
      const sectionRank = entry.layout?.rank ?? entry.section?.rank ?? 999;

      if (!sections[sectionName]) {
        sections[sectionName] = { name: sectionName, rank: sectionRank, items: [] };
      }

      if (bundle && bundle.name) {
        const key = 'bundle_' + bundle.name;
        if (!seen.has(key)) {
          seen.add(key);
          const bundleImg = bundle.image
            || entryItems.find(i => i.images?.featured)?.images?.featured
            || entryItems.find(i => i.images?.icon)?.images?.icon || '';
          sections[sectionName].items.push({
            name: bundle.name, type: 'Bundle', rarity: '',
            image: bundleImg, price, isBundle: true
          });
        }
      }

      for (const item of entryItems) {
        const key = item.id || item.name;
        if (!key || seen.has(key)) continue;
        if (!item.name || item.name.startsWith('TBD') || item.name === 'Random') continue;
        seen.add(key);
        sections[sectionName].items.push({
          name: item.name,
          type: item.type?.value || 'Cosmetic',
          rarity: item.rarity?.value || '',
          image: item.images?.featured || item.images?.icon || item.images?.smallIcon || '',
          price
        });
      }
    }

    const sortedSections = Object.values(sections)
      .filter(s => s.items.length > 0)
      .sort((a, b) => a.rank - b.rank);

    // Fallback: if no sections, return flat items
    const allItems = sortedSections.flatMap(s => s.items);

    return new Response(JSON.stringify({
      updated: now.toISOString().slice(0,16).replace('T',' ') + ' UTC',
      date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      sections: sortedSections,
      items: allItems
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, sections: [], items: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
