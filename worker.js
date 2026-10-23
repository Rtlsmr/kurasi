// Kurasi AI Worker v5
// - Tema: 3 look per tema (Llama 3.3 70B fast + JSON mode, jauh lebih cepat).
// - Gambar: ilustrasi fashion dari FLUX.1 schnell.
// Binding Workers AI dengan nama variabel: AI.

const TEXT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const BACKUP_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

const COLORS = [
'putih', 'cream', 'beige', 'mocca', 'cokelat', 'abumuda', 'abutua', 'hitam', 'navy',
'wine', 'merah', 'terracotta', 'mustard', 'olive', 'peach', 'birumuda', 'sage',
'dustypink', 'lilac', 'mint', 'fuchsia'
];

const CORS = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
return new Response(JSON.stringify(body), {
status,
headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
});
}

const PERSONA = {
hijab: "Kamu adalah stylist fashion muslimah Indonesia. Tugasmu menerjemahkan sebuah tema atau dresscode menjadi tepat 3 pilihan look wanita yang sopan dan bisa dipakai dengan hijab (lengan panjang, bawahan panjang).",
wanita: "Kamu adalah stylist fashion wanita Indonesia. Tugasmu menerjemahkan sebuah tema atau dresscode menjadi tepat 3 pilihan look wanita yang rapi dan mudah dipadukan dari isi lemari.",
pria: "Kamu adalah stylist fashion pria Indonesia. Tugasmu menerjemahkan sebuah tema atau dresscode menjadi tepat 3 pilihan look pria (kemeja, kaos, celana, blazer, jaket) yang mudah dipadukan dari isi lemari."
};

const RULES = "Balas HANYA dengan JSON: {\"looks\":[{\"name\":\"...\",\"desc\":\"...\",\"visual\":\"...\",\"colors\":[\"...\"],\"motif\":\"boleh\",\"outer\":false,\"maxAccent\":2}]}\nAturan:\n- name: nama look yang menarik dan khas tema, maksimal 4 kata, bahasa Indonesia.\n- desc: satu kalimat bahasa Indonesia, maksimal 20 kata, sebutkan setiap pakaian lengkap dengan warna dan panjangnya. Contoh: Kemeja motif bunga mint lengan pendek, celana pendek beige, sneakers putih.\n- visual: terjemahan desc ke bahasa Inggris untuk ilustrator, pakaian dan warnanya harus sama persis. Contoh: mint floral short-sleeve shirt, beige shorts, white sneakers.\n- colors: 2 sampai 6 warna yang dipakai di desc, HANYA dari daftar ini: " + COLORS.join(', ') + ".\n- motif: wajib jika tema butuh satu item bermotif, hindari jika harus polos, selain itu boleh.\n- outer: true jika look memakai outer, blazer, atau cardigan.\n- maxAccent: jumlah warna non-netral yang boleh dipakai sekaligus, 1 sampai 3.\n- Ketiga look harus berbeda jelas satu sama lain.";

const SCHEMA = {
type: 'object',
properties: {
looks: {
type: 'array',
items: {
type: 'object',
properties: {
name: { type: 'string' },
desc: { type: 'string' },
visual: { type: 'string' },
colors: { type: 'array', items: { type: 'string' } },
motif: { type: 'string' },
outer: { type: 'boolean' },
maxAccent: { type: 'integer' }
},
required: ['name', 'desc', 'visual', 'colors', 'motif', 'outer', 'maxAccent']
}
}
},
required: ['looks']
};

function extractJson(text) {
const start = text.search(/\{\s*"looks"/);
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
visual: String(l.visual || '').slice(0, 300),
colors,
motif: ['boleh', 'hindari', 'wajib'].includes(l.motif) ? l.motif : 'boleh',
outer: !!l.outer,
maxAccent: Math.min(Math.max(parseInt(l.maxAccent, 10) || 2, 1), 3),
};
}).filter((l) => l.colors.length >= 2).slice(0, 3);
}

function textOf(res) {
if (typeof res === 'string') return res;
if (res && typeof res.response === 'string') return res.response;
if (res && res.response && typeof res.response === 'object') return JSON.stringify(res.response);
if (res && res.choices && res.choices[0]) return res.choices[0].message?.content || res.choices[0].text || '';
return JSON.stringify(res);
}

async function makeLooks(env, who, theme) {
const messages = [
{ role: 'system', content: PERSONA[who] + "\n\n" + RULES },
{ role: 'user', content: 'Tema: ' + theme + (who === 'pria' ? ' (untuk pria)' : (who === 'wanita' ? ' (untuk wanita tanpa hijab)' : ' (untuk wanita berhijab)')) },
];
const tries = [
{ model: TEXT_MODEL, opts: { messages, max_tokens: 900, temperature: 0.5, response_format: { type: 'json_schema', json_schema: SCHEMA } } },
{ model: TEXT_MODEL, opts: { messages, max_tokens: 900, temperature: 0.5 } },
{ model: BACKUP_MODEL, opts: { messages, max_tokens: 900, temperature: 0.4 } },
];
let last = '';
for (const t of tries) {
try {
const res = await env.AI.run(t.model, t.opts);
last = textOf(res);
const looks = clean(extractJson(last));
if (looks.length) return { looks, model: t.model };
} catch (e) {
last = String(e && e.message || e);
if (/limit|quota|4006|neuron/i.test(last)) throw e;
}
}
return { looks: [], raw: last.slice(0, 2000) };
}

export default {
async fetch(request, env) {
if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
if (request.method === 'GET') return json({ ok: true, app: 'Kurasi AI', text: TEXT_MODEL, image: IMAGE_MODEL });
if (request.method !== 'POST') return json({ error: 'Gunakan POST' }, 405);
if (!env.AI) return json({ error: 'Binding Workers AI dengan nama AI belum dipasang' }, 500);

let b = {};
try { b = await request.json(); } catch (e) {}

try {
if (b.type === 'image') {
const prompt = String(b.prompt || '').trim().slice(0, 1800);
if (!prompt) return json({ error: 'Prompt gambar kosong' }, 400);
const out = await env.AI.run(IMAGE_MODEL, { prompt, steps: 4 });
if (!out || !out.image) return json({ error: 'Gambar belum bisa dibuat' }, 502);
return json({ image: out.image });
}

const theme = String(b.theme || '').trim().slice(0, 60);
if (!theme) return json({ error: 'Nama tema kosong' }, 400);
const who = b.gender === 'pria' ? 'pria' : (b.hijab === false ? 'wanita' : 'hijab');
const r = await makeLooks(env, who, theme);
if (b.debug) return json({ theme, who, ...r });
if (!r.looks.length) return json({ error: 'AI tidak memberi look yang bisa dipakai' }, 502);
return json({ theme, who, looks: r.looks });
} catch (e) {
const msg = String(e && e.message || e);
if (/limit|quota|4006|neuron/i.test(msg)) return json({ error: 'Jatah AI gratis hari ini habis' }, 429);
return json({ error: 'AI sedang tidak bisa dihubungi' }, 502);
}
},
};
