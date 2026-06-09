// /api/admin/roster — list / upsert team brain access roles
// Auth: X-Admin-Password header must match BRAIN_ADMIN_PASSWORD env var

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function ok(res, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  return res.status(200).json(body);
}
function fail(res, status, msg) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  return res.status(status).json({ error: msg });
}

const ALLOWED_ORIGINS = new Set([
  'https://fluxio.work',
  'https://www.fluxio.work',
  'http://localhost:5173',
  'http://localhost:3000',
]);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return ok(res, {});

  // Origin / Referer check — exact equality, not startsWith (prevents lookalike domains)
  const origin = req.headers.origin ?? '';
  const referer = (req.headers.referer ?? '').replace(/\/$/, '');
  const originAllowed = ALLOWED_ORIGINS.has(origin);
  const refAllowed = [...ALLOWED_ORIGINS].some(o => referer === o || referer.startsWith(o + '/'));
  if (!originAllowed && !refAllowed) return fail(res, 403, 'forbidden');

  // Admin password gate — must match BRAIN_ADMIN_PASSWORD env var
  const adminPw = process.env.BRAIN_ADMIN_PASSWORD;
  if (adminPw && req.headers['x-admin-password'] !== adminPw) return fail(res, 403, 'forbidden');

  if (req.method === 'GET') {
    const { data: users, error: ue } = await supabase
      .from('brain_user_roles')
      .select('*')
      .order('display_name');
    if (ue) return fail(res, 500, ue.message);

    const { data: roles, error: re } = await supabase
      .from('brain_access_roles')
      .select('role, allowed_projects, blocked_tags')
      .order('role');
    if (re) return fail(res, 500, re.message);

    return ok(res, { users: users ?? [], roles: roles ?? [] });
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (!Array.isArray(body?.upsert)) return fail(res, 400, 'expects {upsert: [{slack_user_id, display_name, role}, ...]}');

    const rows = body.upsert.filter(u => u.slack_user_id && u.role && u.role.toLowerCase() !== 'skip');
    const skipIds = body.upsert.filter(u => u.role && u.role.toLowerCase() === 'skip').map(u => u.slack_user_id);

    let upserted = 0, deleted = 0;
    if (rows.length) {
      const { error } = await supabase.from('brain_user_roles').upsert(rows, { onConflict: 'slack_user_id' });
      if (error) return fail(res, 500, error.message);
      upserted = rows.length;
    }
    if (skipIds.length) {
      const { error } = await supabase.from('brain_user_roles').delete().in('slack_user_id', skipIds);
      if (error) return fail(res, 500, error.message);
      deleted = skipIds.length;
    }
    return ok(res, { ok: true, upserted, deleted });
  }

  return fail(res, 405, 'GET or POST only');
}
