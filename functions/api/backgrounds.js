// GET /api/backgrounds — daftar desain strip untuk kiosk (publik)
import { BG_PREFIX, BG_ID_RE, json, toItem, readSettings } from '../_lib/common.js';

export async function onRequestGet({ env }) {
  if (!env.PHOTOS) return json({ items: [], settings: { hideBuiltin: false } });

  const items = [];
  let cursor;
  do {
    const res = await env.PHOTOS.list({ prefix: BG_PREFIX, include: ['customMetadata'], cursor, limit: 500 });
    for (const o of res.objects) {
      if (BG_ID_RE.test(o.key.slice(BG_PREFIX.length))) items.push(toItem(o));
    }
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);

  items.sort((a, b) => a.created - b.created);
  return json({ items, settings: await readSettings(env) }, 200, { 'Cache-Control': 'public, max-age=15' });
}
