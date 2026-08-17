/**
 * ACLASS catalog generator
 * -------------------------
 * Scans the `Beats/` folder, reads real ID3 metadata from each MP3, infers
 * genre from the producer's own folder structure, matches artwork from the
 * `images/` subfolder, and writes a ready-to-use `data/beats.js` manifest.
 *
 * Run:  node tools/generate-catalog.mjs
 *
 * The generator is idempotent. Manual corrections (genre, mood, bpm, key,
 * artwork, description, featured...) live in `data/overrides.json` and are
 * merged on top of the inferred values, so re-running the generator never
 * destroys your edits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BEATS_DIR = path.join(ROOT, 'Beats');
const OUT_FILE = path.join(ROOT, 'data', 'beats.js');
const OVERRIDES_FILE = path.join(ROOT, 'data', 'overrides.json');

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const BRAND = {
  name: 'NINE63 MUSIC',
  producer: '963 Beats',
};

/** Editorial mapping: curated genre folder -> moods (editable). */
const FOLDER_META = {
  'new jazz x melodic trap x experimental trap': {
    name: 'New Jazz · Melodic Trap · Experimental',
    moods: ['Melodic', 'Atmospheric', 'Experimental'],
    tagline: 'Bouncy, airy, sample-soft productions that float instead of hit.',
  },
  'plug x new wave x smooth trap x laid back': {
    name: 'Plug · New Wave · Smooth Trap · Laid Back',
    moods: ['Chill', 'Smooth', 'Dreamy'],
    tagline: 'Low-key and luxurious. Pockets of space for melodies to breathe.',
  },
  'supertrap x darkology x lovemusic x new planet': {
    name: 'Supertrap · Darkology · Love Music · New Planet',
    moods: ['Dark', 'Cinematic', 'Aggressive'],
    tagline: 'Heavy-hitting, dark and cinematic. Built for big moments.',
  },
  'uk drill x usa drill x jersey x chriaq': {
    name: 'UK Drill · USA Drill · Jersey · Chriaq',
    moods: ['Aggressive', 'High Energy', 'Gloomy'],
    tagline: 'Hard drums, sliding bass, streets-level energy. No compromise.',
  },
};

const JUNK_IMAGES = ['default.jpg', 'default.jpeg', 'download.png', 'download.jpg'];

const ACCENT_FOLDER = {
  'new jazz x melodic trap x experimental trap': 'amber',
  'plug x new wave x smooth trap x laid back': 'sage',
  'supertrap x darkology x lovemusic x new planet': 'ember',
  'uk drill x usa drill x jersey x chriaq': 'steel',
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const syncSafe = (b, o) =>
  ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);

const bigEndian = (b, o) => (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];

function decodeText(buf, enc) {
  try {
    if (enc === 0) return buf.toString('latin1').replace(/\0.*$/, '');
    if (enc === 1) {
      const s = buf.toString('utf16le').replace(/^\ufeff/, '');
      return s.split('\0')[0];
    }
    if (enc === 2) return buf.toString('utf16le').replace(/^\ufeff/, '').split('\0')[0];
    return buf.toString('utf8').replace(/\0.*$/, '');
  } catch {
    return '';
  }
}

/** Parse ID3v2 metadata. Returns an object of frame values. */
function parseID3(buf) {
  if (buf.length < 10 || buf.toString('ascii', 0, 3) !== 'ID3') return null;
  const major = buf[3];
  let off = 10;
  const tagSize = syncSafe(buf, 6);
  const end = Math.min(buf.length, off + tagSize);
  const out = {};
  while (off + 10 <= end) {
    const id = buf.toString('ascii', off, off + 4);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    let size;
    if (major >= 4) size = syncSafe(buf, off + 4);
    else size = bigEndian(buf, off + 4);
    const dataStart = off + 10;
    const dataEnd = Math.min(buf.length, dataStart + size);
    if (size < 0) break;
    const payload = buf.subarray(dataStart, dataEnd);
    if (id === 'TXXX') {
      const enc = payload[0];
      let i = 1;
      while (i < payload.length && payload[i] !== 0) i++;
      if (i >= payload.length) { off = dataEnd; continue; }
      const desc = decodeText(payload.subarray(1, i), enc);
      const val = decodeText(payload.subarray(i + 1), enc);
      out[`TXXX:${desc.toUpperCase()}`] = val;
    } else if (id === 'APIC') {
      const enc = payload[0];
      let i = 1;
      while (i < payload.length && payload[i] !== 0) i++;
      if (i >= payload.length) { off = dataEnd; continue; }
      const mime = payload.subarray(1, i).toString('latin1');
      const type = payload[i + 1];
      let j = i + 2;
      while (j < payload.length && payload[j] !== 0) j++;
      const img = payload.subarray(j + 1);
      if (img.length > 0) out.APIC = { mime, type, data: img };
    } else if (/^T/.test(id)) {
      const enc = payload[0];
      out[id] = decodeText(payload.subarray(1), enc).replace(/\u0000/g, '');
    } else if (/^W/.test(id)) {
      out[id] = payload.toString('latin1').replace(/\0.*$/, '');
    }
    off = dataEnd;
  }
  return out;
}

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';

const cleanTitle = (base) => {
  const t = base
    .replace(/\.[A-Za-z0-9]+$/, '')
    .replace(/\.[A-Za-z0-9]+$/, '')
    .replace(/\s*[|–·:\-—]\s*.*$/i, '')
    .replace(/\s*Prod\.?\s*by\s+.*$/i, '')
    .replace(/\s*\(?[Ii]\)?$/i, '')
    .replace(/[«»"']/g, '')
    .trim();
  return t || base;
};

/** Handles tags like "963 Beats - Being - 150BPM - Supertrap Type". */
function parseProducerTitle(tag) {
  const m = /^963\s*Beats\s*-\s*(.+?)\s*-\s*(\d+)\s*BPM\s*-\s*(.+)$/i.exec((tag || '').trim());
  if (!m) return null;
  const name = m[1].trim();
  const bpm = parseInt(m[2], 10);
  const type = m[3].trim();
  if (!name || name.toLowerCase() === '963 beats') return null;
  return { name, bpm, type };
}

const titleWords = (s) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );

const relativePath = (file) => path.relative(ROOT, file).split(path.sep).join('/');

/* ------------------------------------------------------------------ */
/* Collect beats                                                       */
/* ------------------------------------------------------------------ */

const folderSlugs = new Map();

function genreMetaFor(folderName) {
  const parts = folderName.split(/\s+x\s+/).map((p) => p.trim()).filter(Boolean);
  const genres = parts.map((p) => ({
    name: p.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/^Uk\b/i, 'UK').replace(/^Usa\b/i, 'USA'),
    slug: slugify(p),
  }));
  const meta = FOLDER_META[folderName] || {
    name: folderName,
    moods: [],
    tagline: '',
  };
  const moods = (meta.moods || []).map((m) => ({ name: m, slug: slugify(m) }));
  return { genres, moods, meta, folderSlug: slugify(folderName) };
}

function collectBeats() {
  const folders = fs
    .readdirSync(BEATS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'));

  const beats = [];

  for (const folder of folders) {
    const folderPath = path.join(BEATS_DIR, folder.name);
    const info = genreMetaFor(folder.name);
    folderSlugs.set(info.folderSlug, {
      slug: info.folderSlug,
      name: folder.name,
      displayName: info.meta.name || folder.name,
      tagline: info.meta.tagline || '',
      genres: info.genres.map((g) => g.name),
      moods: info.moods.map((m) => m.name),
      accent: ACCENT_FOLDER[folder.name] || 'amber',
      beatCount: 0,
    });

    const mp3s = fs
      .readdirSync(folderPath)
      .filter((f) => /\.mp3$/i.test(f) && fs.statSync(path.join(folderPath, f)).isFile())
      .sort();

    for (const file of mp3s) {
      const abs = path.join(folderPath, file);
      const stat = fs.statSync(abs);
      const buf = fs.readFileSync(abs);
      const id3 = parseID3(buf);

      const rawTitle = id3?.TIT2 || cleanTitle(file);
      const parsed = parseProducerTitle(rawTitle);
      const titleFromFile = cleanTitle(file);
      const title = titleFromFile && titleFromFile.toLowerCase() !== '963 beats'
        ? titleFromFile
        : (parsed ? parsed.name : titleFromFile);
      const bpmRaw = id3?.TBPM || (parsed ? String(parsed.bpm) : '');
      const bpm = /^\d+(\.\d+)?$/.test(bpmRaw.trim()) ? Math.round(parseFloat(bpmRaw)) : null;
      const key = (id3?.TKEY || '').trim() || null;
      const yearRaw = id3?.TDRC || id3?.TYER || '';
      const year = /^\d{4}/.test(yearRaw) ? parseInt(yearRaw.slice(0, 4), 10) : null;
      const playCountRaw = id3?.['TXXX:SERATO_PLAYCOUNT'];
      const playCount = /^\d+$/.test(playCountRaw || '') ? parseInt(playCountRaw, 10) : 0;

      let art = null;
      if (id3?.APIC && id3.APIC.data.length > 0) {
        const { mime, data } = id3.APIC;
        const ext = mime.includes('png') ? 'png' : 'jpg';
        const destDir = path.join(ROOT, 'data', 'covers');
        fs.mkdirSync(destDir, { recursive: true });
        const dest = path.join(destDir, `${slugify(title)}.${ext}`);
        if (!fs.existsSync(dest)) fs.writeFileSync(dest, data);
        art = relativePath(dest);
      }

      beats.push({
        file: relativePath(abs),
        artwork: art,
        title,
        titleSlug: slugify(title),
        bpm,
        key,
        year,
        playCount,
        addedAt: stat.mtime,
        collection: info.folderSlug,
        genres: info.genres.map((g) => g.slug),
        moods: info.moods.map((m) => m.slug),
        embeddedArt: !!art,
      });
    }
  }
  return beats;
}

/* ------------------------------------------------------------------ */
/* Artwork assignment                                                  */
/* ------------------------------------------------------------------ */

function assignArtwork(beats, folderName) {
  const imgDir = path.join(BEATS_DIR, folderName, 'images');
  if (!fs.existsSync(imgDir)) return;
  const images = fs
    .readdirSync(imgDir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .filter((f) => !JUNK_IMAGES.includes(f.toLowerCase()))
    .sort()
    .map((f) => relativePath(path.join(imgDir, f)));

  const remaining = [...images];
  const named = new Map(); // beatTitleLower -> imagePath
  for (const img of remaining) {
    const base = path.basename(img, path.extname(img));
    const words = titleWords(base);
    const cleaned = base.toLowerCase().replace(/\s*(prod[.]?\s*by\s*963\s*beats)\s*/i, '').replace(/[()@]/g, '');
    const cleanedWords = titleWords(cleaned);
    for (const beat of beats) {
      const beatLower = beat.title.toLowerCase();
      const tw = titleWords(beat.title);
      let match = false;
      if (beatLower === cleaned.trim()) match = true;
      else if (tw.size > 0 && cleanedWords.size > 0 && tw.size <= 4) {
        const inter = [...tw].filter((w) => cleanedWords.has(w));
        if (inter.length >= Math.min(2, tw.size)) match = true;
      }
      if (match && !named.has(beat.title)) { named.set(beat.title, img); break; }
    }
  }
  for (const beat of beats) {
    if (named.has(beat.title)) {
      beat.artwork = named.get(beat.title);
    }
  }
  const leftover = images.filter((img) => !named.has(img) && !Object.values(Object.fromEntries([...named].map(([t, i]) => [t, i]))).includes(img));
  const needArt = beats.filter((b) => !b.artwork);
  for (let i = 0; i < needArt.length && leftover.length > 0; i++) {
    needArt[i].artwork = leftover[i % leftover.length];
  }
}

/* ------------------------------------------------------------------ */
/* Overrides                                                           */
/* ------------------------------------------------------------------ */

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return { beats: {}, featured: [], descriptions: {} };
  try {
    return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
  } catch (e) {
    console.warn('[warn] could not parse data/overrides.json:', e.message);
    return { beats: {}, featured: [], descriptions: {} };
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function build() {
  console.log('[generate] scanning', BEATS_DIR);
  let beats = collectBeats();
  const folders = fs.readdirSync(BEATS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const folder of folders) {
    assignArtwork(beats.filter((b) => slugify(b.collection) === slugify(folder.name)), folder.name);
  }

  const overrides = loadOverrides();

  // Merge overrides (keyed by either exact title or source file path)
  beats = beats.map((b, idx) => {
    const o = overrides.beats?.[b.title] || overrides.beats?.[b.file] || {};
    const merged = { ...b, ...o };
    if (o.genres) merged.genres = o.genres.map((g) => slugify(g));
    if (o.moods) merged.moods = o.moods.map((m) => slugify(m));
    return merged;
  });

  // Feature flags: mark top-played per collection by default (overridable).
  const featured = new Set(overrides.featured || []);
  if (featured.size === 0) {
    for (const f of new Set(beats.map((b) => b.collection))) {
      beats
        .filter((b) => b.collection === f)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 3)
        .forEach((b) => featured.add(b.title));
    }
  }

  const out = beats.map((b) => ({
    id: `${b.collection}--${b.titleSlug}`,
    title: b.title,
    slug: b.titleSlug,
    file: b.file,
    artwork: b.artwork || null,
    bpm: b.bpm,
    key: b.key,
    year: b.year,
    playCount: b.playCount,
    addedAt: b.addedAt instanceof Date ? b.addedAt.toISOString().slice(0, 10) : null,
    collection: b.collection,
    genres: b.genres,
    moods: b.moods,
    tags: [...new Set([...titleWords(b.title)])].slice(0, 6),
    producer: overrides.producer || BRAND.producer,
    featured: featured.has(b.title),
    description: b.description || overrides.descriptions?.[b.title] || null,
  }));

  // Disambiguate duplicate slugs (same title in different collections).
  const seenSlugs = new Map();
  for (const b of out) {
    const base = b.slug;
    let n = seenSlugs.get(base) || 0;
    seenSlugs.set(base, n + 1);
    b.slug = n === 0 ? base : `${base}-${n + 1}`;
  }

  // Genre & mood master lists (deduped across collections)
  const genreMap = new Map();
  const moodMap = new Map();
  for (const f of folders) {
    const info = genreMetaFor(f.name);
    for (const g of info.genres) if (!genreMap.has(g.slug)) genreMap.set(g.slug, g);
    for (const m of info.moods) if (!moodMap.has(m.slug)) moodMap.set(m.slug, m);
  }

  const folderList = [];
  for (const f of folders) {
    const info = genreMetaFor(f.name);
    const slug = info.folderSlug;
    const count = out.filter((b) => b.collection === slug).length;
    folderList.push({
      slug,
      name: f.name,
      displayName: info.meta.name || f.name,
      tagline: info.meta.tagline || '',
      genres: info.genres.map((g) => g.name),
      moods: info.moods.map((m) => m.name),
      accent: ACCENT_FOLDER[f.name] || 'amber',
      beatCount: count,
    });
  }

  const payload = {
    brand: BRAND,
    generatedAt: new Date().toISOString(),
    folders: folderList,
    genres: [...genreMap.values()],
    moods: [...moodMap.values()],
    beats: out,
  };

  const js = `// AUTOGENERATED by tools/generate-catalog.mjs — do not edit by hand.\n// Re-run \`node tools/generate-catalog.mjs\` after adding beats.\nwindow.ACLASS_DATA = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(OUT_FILE, js);
  console.log(`[generate] wrote ${OUT_FILE} (${out.length} beats, ${genreMap.size} genres, ${moodMap.size} moods)`);
}

build();
