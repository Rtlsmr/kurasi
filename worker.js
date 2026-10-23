// Kurasi AI Worker
// Menyusun 3 look untuk tema apa pun memakai Cloudflare Workers AI (paket gratis).
// Pasang di dashboard Cloudflare: Workers & Pages > Create > Worker, tempel kode ini,
// lalu tambahkan binding Workers AI dengan nama variabel: AI.

const MODEL = '@cf/google/gemma-4-26b-a4b-it';

const COLORS = [
  'putih', 'cream', 'beige', 'mocca', 'cokelat', 'abumuda', 'abutua', 'hitam', 'navy',
  'wine', 'merah', 'terracotta', 'mustard', 'olive', 'peach', 'birumuda', 'sage',
  'dustypink', 'lilac', 'mint', 'fuchsia'
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

const SYSTEM = `Kamu adalah stylist fashion muslimah Indonesia. Tugasmu menerjemahkan sebuah tema atau dresscode menjadi tepat 3 pilihan look yang sopan dan bisa dipakai dengan hijab.

Balas HANYA dengan JSON valid, tanpa teks lain, dengan bentuk:
{"looks":[{"name":"...","desc":"...","colors":["..."],"motif":"boleh|hindari|wajib","outer":true|false,"maxAccent":2}]}

Aturan:
- "name": nama look singkat, maksimal 4 kata, bahasa Indonesia.
- "desc": satu kalimat bahasa Indonesia, maksimal 18 kata, menjelaskan gaya dan siluet.
- "colors": 2 sampai 6 warna, HANYA dari daftar ini: ${COLORS.join(', ')}.
- "motif": "wajib" jika tema butuh satu item bermotif (misalnya batik, bunga tropis), "hindari" jika look harus polos, selain itu "boleh".
- "outer": true jika look sebaiknya memakai outer, blazer, atau cardigan.
- "maxAccent": jumlah warna non-netral yang boleh dipakai sekaligus, 1 sampai 3. Pakai 3 hanya untuk look yang memang ramai warna.
- Ketiga look harus berbeda satu sama lain.`;

function extractJson(text) {
  const start = text.indexOf('{"looks"') > -1 ? text.indexOf('{"looks"') : text.search(/\{\s*"looks"/);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch (e) { return null; }
      }
    }
  }
  return null;
}

const ALIAS = {
  white: 'putih', offwhite: 'cream', krem: 'cream', ivory: 'cream', gading: 'cream', nude: 'beige', khaki: 'beige', camel: 'mocca',
  coklat: 'cokelat', brown: 'cokelat', chocolate: 'cokelat', coffee: 'mocca', mocha: 'mocca', taupe: 'mocca',
  abu: 'abumuda', abuabu: 'abumuda', grey: 'abumuda', gray: 'abumuda', lightgrey: 'abumuda', darkgrey: 'abutua', charcoal: 'abutua',
  black: 'hitam', navyblue: 'navy', birutua: 'navy', darkblue: 'navy',
  maroon: 'wine', burgundy: 'wine', marun: 'wine', red: 'merah', crimson: 'merah', scarlet: 'merah',
  orange: 'terracotta', oranye: 'terracotta', jingga: 'terracotta', rust: 'terracotta', bata: 'terracotta', coral: 'peach', salmon: 'peach',
  yellow: 'mustard', kuning: 'mustard', gold: 'mustard', emas: 'mustard',
  green: 'sage', hijau: 'sage', hijaumuda: 'sage', hijautua: 'olive', army: 'olive', khakigreen: 'olive', emerald: 'olive',
  tosca: 'mint', toska: 'mint', teal: 'mint', turquoise: 'mint', aqua: 'mint', tosa: 'mint',
  blue: 'birumuda', biru: 'birumuda', skyblue: 'birumuda', babyblue: 'birumuda', lightblue: 'birumuda',
  pink: 'dustypink', merahmuda: 'dustypink', rose: 'dustypink', blush: 'dustypink', dustyrose: 'dustypink',
  purple: 'lilac', ungu: 'lilac', lavender: 'lilac', lavendel: 'lilac', violet: 'lilac',
  magenta: 'fuchsia', hotpink: 'fuchsia', fuschia: 'fuchsia', pinkterang: 'fuchsia',
};

function toPalette(c) {
  const k = String(c).toLowerCase().replace(/[^a-z]/g, '');
  if (COLORS.includes(k)) return k;
  if (ALIAS[k]) return ALIAS[k];
  for (const key of Object.keys(ALIAS)) if (k.includes(key)) return ALIAS[key];
  for (const p of COLORS) if (k.includes(p)) return p;
  return null;
}

function clean(data) {
  const looks = Array.isArray(data && data.looks) ? data.looks : [];
  return looks.map((l) => {
    const colors = [...new Set((l.colors || []).map(toPalette).filter(Boolean))];
    return {
      name: String(l.name || 'Look').slice(0, 40),
      desc: String(l.desc || '').slice(0, 160),
      colors,
      motif: ['boleh', 'hindari', 'wajib'].includes(l.motif) ? l.motif : 'boleh',
      outer: !!l.outer,
      maxAccent: Math.min(Math.max(parseInt(l.maxAccent, 10) || 2, 1), 3),
    };
  }).filter((l) => l.colors.length >= 2).slice(0, 3);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method === 'GET') return json({ ok: true, app: 'Kurasi AI', model: MODEL });
    if (request.method !== 'POST') return json({ error: 'Gunakan POST' }, 405);
    if (!env.AI) return json({ error: 'Binding Workers AI dengan nama AI belum dipasang' }, 500);

    let theme = '', debug = false;
    try { const b = await request.json(); theme = String(b.theme || '').trim().slice(0, 60); debug = !!b.debug; } catch (e) {}
    if (!theme) return json({ error: 'Nama tema kosong' }, 400);

    try {
      const res = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Tema: ${theme}` },
        ],
        max_tokens: 2500,
        temperature: 0.6,
      });
      let text = '';
      if (typeof res === 'string') text = res;
      else if (res && typeof res.response === 'string') text = res.response;
      else if (res && res.response && typeof res.response === 'object') text = JSON.stringify(res.response);
      else if (res && res.choices && res.choices[0]) text = res.choices[0].message?.content || res.choices[0].text || '';
      else text = JSON.stringify(res);

      const looks = clean(extractJson(text));
      if (debug) return json({ theme, looks, raw: (text || JSON.stringify(res)).slice(0, 3000), keys: res && typeof res === 'object' ? Object.keys(res) : typeof res });
      if (!looks.length) return json({ error: 'AI tidak memberi look yang bisa dipakai' }, 502);
      return json({ theme, looks });
    } catch (e) {
      const msg = String(e && e.message || e);
      if (/limit|quota|4006|neuron/i.test(msg)) return json({ error: 'Jatah AI gratis hari ini habis' }, 429);
      return json({ error: 'AI sedang tidak bisa dihubungi' }, 502);
    }
  },
};
