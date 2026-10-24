// Kurasi AI Worker v6
// - Tema: 3 look per tema (Llama 3.3 70B fast + JSON mode).
// - Gambar model: ilustrasi fashion dari FLUX.1 schnell.
// - Foto item: dikenali Llama 4 Scout (kategori, nama, warna, motif),
//   lalu digambar ulang jadi ilustrasi flat-lay oleh FLUX.2 klein. Foto tidak disimpan.
// Binding Workers AI dengan nama variabel: AI.

const TEXT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const BACKUP_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const ITEM_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const VISION_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const CATS = ['hijab', 'scarf', 'atasan', 'bawahan', 'gamis', 'outer', 'sepatu', 'tas', 'aksesoris'];

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

const ITEM_STYLE = 'Photorealistic e-commerce product photo, the item laid flat and centered, front view, true-to-life fabric texture, folds and color, soft natural studio light, subtle soft shadow, plain pure white background, single item only, no person, no mannequin, no hanger, no hands, no text, no logo.';

function dataUrlBytes(u) {
const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(String(u || ''));
if (!m || m[2].length > 900000) return null;
const bin = atob(m[2]);
const bytes = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
return { bytes, type: 'image/' + m[1].toLowerCase().replace('jpg', 'jpeg') };
}

async function itemImage(env, b) {
const form = new FormData();
const img = b.photo ? dataUrlBytes(b.photo) : null;
const what = String(b.text || '').trim().slice(0, 300);
let prompt;
if (img) {
form.append('input_image_0', new Blob([img.bytes], { type: img.type }), 'item.' + img.type.split('/')[1]);
prompt = 'Recreate the clothing item from image 0' + (what ? ' (' + what + ')' : '') + ' as a clean product image. Keep exactly the same garment type, cut, length, color, material and pattern. ' + (String(b.style || '').slice(0, 500) || ITEM_STYLE);
} else {
if (!what) return null;
prompt = 'A ' + what + '. ' + (String(b.style || '').slice(0, 500) || ITEM_STYLE);
}
form.append('prompt', prompt);
form.append('width', '512');
form.append('height', '512');
const fr = new Response(form);
const out = await env.AI.run(ITEM_MODEL, { multipart: { body: fr.body, contentType: fr.headers.get('content-type') } });
return out && out.image ? out.image : null;
}

const ITEM_SCHEMA = {
type: 'object',
properties: {
cat: { type: 'string' },
name: { type: 'string' },
color: { type: 'string' },
motif: { type: 'boolean' },
en: { type: 'string' }
},
required: ['cat', 'name', 'color', 'motif', 'en']
};

const ITEM_RULES = 'Kamu membantu mencatat isi lemari pakaian. Lihat foto, kenali SATU item pakaian atau aksesori utama di foto, lalu balas HANYA JSON: {"cat":"...","name":"...","color":"...","motif":false,"en":"..."}\n- cat: salah satu dari ' + CATS.join(', ') + '. hijab = kerudung/jilbab/pashmina; scarf = syal leher; atasan = kemeja, kaos, blouse, sweater, tunik; bawahan = celana, rok, kulot, jeans; gamis = gamis, dress, terusan; outer = jaket, blazer, cardigan, coat; aksesoris = jam, gelang, kalung, kacamata, topi, ikat pinggang.\n- name: nama singkat bahasa Indonesia tanpa warna, maksimal 3 kata, sebut bahan atau model jika jelas. Contoh: Jaket kulit, Kaos, Jeans, Rok plisket, Sandal hak.\n- color: warna dominan, HANYA dari daftar: ' + COLORS.join(', ') + '.\n- motif: true jika bermotif (bunga, garis, kotak, batik, polkadot), false jika polos.\n- en: deskripsi singkat bahasa Inggris untuk ilustrator, sertakan warna, bahan, potongan, panjang. Contoh: black leather biker jacket with silver zips.';

async function classify(env, photo) {
const messages = [
{ role: 'system', content: ITEM_RULES },
{ role: 'user', content: [{ type: 'text', text: 'Kenali item di foto ini.' }, { type: 'image_url', image_url: { url: photo } }] },
];
const tries = [
{ messages, max_tokens: 200, temperature: 0.2, response_format: { type: 'json_schema', json_schema: ITEM_SCHEMA } },
{ messages, max_tokens: 200, temperature: 0.2 },
];
let last = '';
for (const t of tries) {
try {
const res = await env.AI.run(VISION_MODEL, t);
last = textOf(res);
let j = null;
try { j = JSON.parse(last); } catch (e) {
const s = last.indexOf('{'), e2 = last.lastIndexOf('}');
if (s > -1 && e2 > s) { try { j = JSON.parse(last.slice(s, e2 + 1)); } catch (e3) {} }
}
if (j && j.cat) {
const cat = String(j.cat).toLowerCase().trim();
return {
cat: CATS.includes(cat) ? cat : null,
name: String(j.name || '').replace(/\s+/g, ' ').trim().slice(0, 40),
color: toPalette(j.color || ''),
motif: !!j.motif,
en: String(j.en || '').slice(0, 200),
};
}
} catch (e) {
last = String(e && e.message || e);
if (/limit|quota|4006|neuron/i.test(last)) throw e;
}
}
return { error: 'tidak terbaca', raw: last.slice(0, 500) };
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
if (request.method === 'GET') return json({ ok: true, app: 'Kurasi AI', v: 6, text: TEXT_MODEL, image: IMAGE_MODEL, item: ITEM_MODEL, vision: VISION_MODEL });
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

if (b.type === 'item') {
const image = await itemImage(env, b);
if (!image) return json({ error: 'Ilustrasi item belum bisa dibuat' }, 502);
return json({ image });
}

if (b.type === 'classify') {
if (!dataUrlBytes(b.photo)) return json({ error: 'Foto tidak terbaca' }, 400);
const r = await classify(env, b.photo);
if (r.error && !b.debug) return json({ error: 'Item di foto belum bisa dikenali' }, 502);
return json(r);
}

if (b.type === 'shade') { const q = String(b.q || '').trim().slice(0, 160); if (!q) return json({ error: 'Nama shade kosong' }, 400); const res = await env.AI.run(TEXT_MODEL, { messages: [{ role: 'system', content: 'You are a professional makeup artist with deep knowledge of cosmetic brands sold in Indonesia. Given a brand, product and shade name, return the approximate swatch color of that exact shade as a hex code. If you do not know the exact shade, estimate it from the shade name and product type and lower "sure". Answer only JSON: {"hex":"#RRGGBB","name":"short color description in Indonesian","sure":0.0-1.0}.' }, { role: 'user', content: q }], max_tokens: 80, temperature: 0.1, response_format: { type: 'json_schema', json_schema: { type: 'object', properties: { hex: { type: 'string' }, name: { type: 'string' }, sure: { type: 'number' } }, required: ['hex'] } } }); const t = textOf(res); const m = t.match(/#[0-9a-fA-F]{6}/); if (!m) return json({ error: 'Warna shade belum ketemu' }, 502); let j = {}; try { j = JSON.parse(t); } catch (e) {} return json({ hex: m[0].toUpperCase(), name: String(j.name || '').slice(0, 30), sure: +j.sure || 0 }); }

const theme = String(b.theme || '').trim().slice(0, 60);
if (!theme) return json({ error: 'Nama tema kosong' }, 400);
const who = b.gender === 'pria' ? 'pria' : (b.hijab === false ? 'wanita' : 'hijab');
const r = await makeLooks(env, who, theme);
if (b.debug) return json({ theme, who, ...r });
if (!r.looks.length) return json({ error: 'AI tidak memberi look yang bisa dipakai' }, 502);
return json({ theme, who, looks: r.looks });
} catch (e) {
const msg = String(e && e.message || e);
if (/limit|quota|4006|neuron/i.test(msg)) return json({ error: 'Jatah AI gratis hari ini habis', raw: b.debug ? msg.slice(0, 300) : undefined }, 429);
return json({ error: 'AI sedang tidak bisa dihubungi', raw: b.debug ? msg.slice(0, 300) : undefined }, 502);
}
},
};
