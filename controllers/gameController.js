/**
 * Gamification: XP, levels, badges, leaderboard, missions.
 *
 * Level formula: level = floor(sqrt(xp / 50)) + 1
 *   xp 0-49     -> lvl 1
 *   xp 50-199   -> lvl 2
 *   xp 200-449  -> lvl 3   etc.
 */
const { query, withTransaction } = require('../config/database');
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');

const computeLevel = (xp) => Math.floor(Math.sqrt((xp || 0) / 50)) + 1;
const xpForLevel = (lvl) => 50 * (lvl - 1) ** 2;

// GET /game/me
const profile = asyncHandler(async (req, res) => {
  const u = await query('SELECT id,name,avatar_url,xp,level FROM users WHERE id = $1', [req.user.id]);
  const badges = await query(
    `SELECT b.code,b.name,b.description,b.icon,b.xp_reward,ub.earned_at
     FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
     WHERE ub.user_id = $1 ORDER BY ub.earned_at DESC`,
    [req.user.id]
  );
  const recent = await query(
    `SELECT action, points, metadata, created_at FROM xp_logs
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [req.user.id]
  );

  const me = u.rows[0];
  const lvl = computeLevel(me.xp);
  return ok(res, {
    ...me,
    level: lvl,
    xp_to_next: Math.max(xpForLevel(lvl + 1) - me.xp, 0),
    badges: badges.rows,
    recent_xp: recent.rows,
  });
});

// POST /game/award   { action, points, metadata? }
const awardXp = asyncHandler(async (req, res) => {
  const { action, points, metadata } = req.body;
  if (!action || typeof points !== 'number') throw new ApiError('action and numeric points required');

  const result = await withTransaction(async (c) => {
    await c.query(
      `INSERT INTO xp_logs (user_id,action,points,metadata) VALUES ($1,$2,$3,$4)`,
      [req.user.id, action, points, metadata ? JSON.stringify(metadata) : '{}']
    );
    const upd = await c.query(
      `UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp,level`,
      [points, req.user.id]
    );
    const newXp = upd.rows[0].xp;
    const newLevel = computeLevel(newXp);
    if (newLevel !== upd.rows[0].level) {
      await c.query('UPDATE users SET level = $1 WHERE id = $2', [newLevel, req.user.id]);
    }
    return { xp: newXp, level: newLevel };
  });

  return ok(res, result, 'XP awarded');
});

// GET /game/leaderboard?limit=
const leaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await query(
    `SELECT id,name,avatar_url,xp,level FROM users
     WHERE is_active = TRUE
     ORDER BY xp DESC LIMIT $1`,
    [limit]
  );
  return ok(res, rows.map((r, idx) => ({ ...r, rank: idx + 1 })));
});

// GET /game/badges    - all available
const allBadges = asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM badges ORDER BY xp_reward ASC');
  return ok(res, rows);
});

// POST /game/badges/:code/grant   - admin or auto by rule
const grantBadge = asyncHandler(async (req, res) => {
  const { rows: badgeRows } = await query('SELECT id,xp_reward FROM badges WHERE code = $1', [req.params.code]);
  if (!badgeRows[0]) throw new ApiError('Badge not found', 404);
  const badge = badgeRows[0];

  const result = await withTransaction(async (c) => {
    const insert = await c.query(
      `INSERT INTO user_badges (user_id,badge_id) VALUES ($1,$2)
       ON CONFLICT (user_id,badge_id) DO NOTHING RETURNING id`,
      [req.user.id, badge.id]
    );
    if (!insert.rows[0]) return { granted: false };
    await c.query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [badge.xp_reward, req.user.id]);
    await c.query(
      `INSERT INTO xp_logs (user_id,action,points,metadata) VALUES ($1,'badge',$2,$3)`,
      [req.user.id, badge.xp_reward, JSON.stringify({ code: req.params.code })]
    );
    return { granted: true };
  });
  return ok(res, result);
});

// GET /game/missions   - simple curated list (could be DB-backed later)
const missions = asyncHandler(async (_req, res) => {
  return ok(res, [
    { id: 'visit_3_today',     title: 'Tourist Mode',         description: 'Visit 3 destinations today',        xp: 30 },
    { id: 'review_a_place',    title: 'Voice of the Trip',    description: 'Leave a review on any place',      xp: 20 },
    { id: 'listen_audio_tour', title: 'Stories from Stones',  description: 'Listen to one audio tour',         xp: 15 },
    { id: 'find_hidden_gem',   title: 'Off the Beaten Path',  description: 'Discover one hidden gem',          xp: 50 },
    { id: 'plan_a_trip',       title: 'Master Planner',       description: 'Create one trip with itinerary',   xp: 40 },
  ]);
});

module.exports = { profile, awardXp, leaderboard, allBadges, grantBadge, missions };
