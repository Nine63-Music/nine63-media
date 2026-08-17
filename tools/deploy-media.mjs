#!/usr/bin/env node
/**
 * Media deployer for external hosting
 * -----------------------------------
 * Uploads the Beats/ folder to a public GitHub repo so it can be streamed
 * from the free jsDelivr CDN. This keeps the Vercel deploy small — the
 * free Vercel tier caps uploads at 100MB and the media is ~413MB.
 *
 * Prerequisites: a GitHub personal access token with `repo` scope.
 *   - classic token: Settings → Developer settings → Personal access tokens
 *   - or fine-grained token with `Contents: read and write` on the repo
 *
 * Run:
 *   $env:GH_TOKEN = "ghp_xxx"
 *   node tools/deploy-media.mjs [github-username] [repo-name] [--create]
 *
 * On success it prints the CDN base URL to put in data/site.js:
 *   assetBase: "https://cdn.jsdelivr.net/gh/<user>/<repo>@latest"
 *
 * The script is resumable: it compares each local file's git blob SHA
 * against the repo and only uploads what changed, so re-running after an
 * interrupted upload continues where it left off.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BEATS_DIR = path.join(ROOT, 'Beats');
const API = 'https://api.github.com';

const args = process.argv.slice(2);
const wantCreate = args.includes('--create');
const rest = args.filter((a) => a !== '--create');
const argUser = rest[0];
const repo = rest[1] || 'nine63-media';
const token = process.env.GH_TOKEN || '';

if (!token) {
  console.error('Missing GitHub token. Set GH_TOKEN=ghp_xxx (see header comment).');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'nine63-media-deployer',
};

async function gh(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${method} ${url} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

async function main() {
  if (!fs.existsSync(BEATS_DIR)) {
    console.error(`No Beats/ folder at ${BEATS_DIR}`);
    process.exit(1);
  }

  const who = await gh('GET', '/user');
  const owner = argUser || who.login;
  console.log(`Authenticated as ${who.login}; uploading to ${owner}/${repo}`);

  let exists = true;
  try {
    await gh('GET', `/repos/${owner}/${repo}`);
  } catch {
    exists = false;
  }
  if (!exists) {
    if (!wantCreate) {
      console.error(`Repo ${owner}/${repo} does not exist. Re-run with --create to make it public.`);
      process.exit(1);
    }
    const isOrg = owner.toLowerCase() !== who.login.toLowerCase();
    const endpoint = isOrg ? `/orgs/${owner}/repos` : '/user/repos';
    await gh('POST', endpoint, { name: repo, private: false, description: 'NINE63 MUSIC beat library (served via jsDelivr)' });
    console.log(`Created public repo ${owner}/${repo}${isOrg ? ' (org)' : ''}`);
  } else {
    console.log(`Repo ${owner}/${repo} exists (uploading/updating files)`);
  }

  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  })(BEATS_DIR);
  files.sort();

  const gitSha = (buffer) =>
    crypto
      .createHash('sha1')
      .update(`blob ${buffer.length}\0`)
      .update(buffer)
      .digest('hex');

  const meta = await gh('GET', `/repos/${owner}/${repo}`);
  let remoteSha = new Map();
  try {
    const tree = await gh('GET', `/repos/${owner}/${repo}/git/trees/${meta.default_branch}?recursive=1`);
    remoteSha = new Map(
      (tree.tree || []).filter((t) => t.type === 'blob').map((t) => [t.path, t.sha])
    );
  } catch {
    console.log('Empty repo — all files will be uploaded');
  }

  const toUpload = [];
  const skipped = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const buffer = fs.readFileSync(file);
    if (remoteSha.get(rel) === gitSha(buffer)) skipped.push(rel);
    else toUpload.push({ file, rel, buffer });
  }
  console.log(`${skipped.length} already up to date, ${toUpload.length} to upload`);

  let done = 0;
  for (const { file, rel, buffer } of toUpload) {
    await gh('PUT', `/repos/${owner}/${repo}/contents/${encodeURIComponent(rel).replace(/%2F/g, '/')}`, {
      message: `Add ${path.basename(rel)}`,
      content: buffer.toString('base64'),
    });
    done++;
    console.log(`  [${done}/${toUpload.length}] ${rel}`);
  }

  const base = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@latest`;
  console.log('\nDone. Set this in data/site.js before deploying:');
  console.log(`  assetBase: "${base}"`);
  console.log('\nFiles may take a minute to appear on jsDelivr (cache). If a file');
  console.log('looks stale after a re-upload, purge it at https://www.jsdelivr.com/tools/purge');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
