/**
 * CORE social layer — lets friends look each other up by Player ID and compare real stats.
 *
 * SAFE BY DESIGN: every method resolves to an empty/false fallback when the backend is not
 * ready, the user is signed out, or the required columns/view don't exist yet. So pages keep
 * working on derived (illustrative) stats until the `0003_player_social.sql` migration is
 * applied. Nothing here writes to or reads from the DB destructively.
 *
 * Requires (after migration): a world-readable `player_cards` view exposing ONLY
 *   player_id, display_name, core_power, core_rank, core_xp, core_level, stat_* , stats_updated_at
 * plus `player_id` + `stat_*` columns on `profiles`. See supabase/migrations/0003_player_social.sql.
 */
(function () {
  if (typeof window === 'undefined') return;

  var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var _client = null, _loading = null;

  function ready() { return !!(window.CORE_CONFIG && window.CORE_BACKEND_READY); }

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (_loading) return _loading;
    _loading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = SDK; s.async = true;
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    return _loading;
  }

  function getClient() {
    if (_client) return Promise.resolve(_client);
    if (!ready()) return Promise.resolve(null);
    return loadSdk().then(function () {
      var c = window.CORE_CONFIG;
      // Reuse the SDK GoTrue session created by core-accounts.js (same storage key) so
      // publishMe() runs as the signed-in user without a second login.
      _client = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      return _client;
    }).catch(function () { return null; });
  }

  // display key -> DB column
  var STAT_COLS = [
    ['strength', 'stat_strength'], ['focus', 'stat_focus'], ['wealth', 'stat_wealth'],
    ['health', 'stat_health'], ['social', 'stat_social'], ['purpose', 'stat_purpose'],
  ];

  /**
   * Look up real player cards by Player ID.
   * @param {string[]} ids  e.g. ['CORE-K7Q2-9XMP', ...]
   * @returns {Promise<Object>} map id -> { stats:{strength..}, power, rank, name, xp, level, real:true }
   *          Resolves to {} on ANY failure so callers fall back to derived stats.
   */
  function fetchProfiles(ids) {
    ids = (ids || []).filter(Boolean);
    if (!ids.length) return Promise.resolve({});
    return getClient().then(function (sb) {
      if (!sb) return {};
      return sb.from('player_cards').select('*').in('player_id', ids).then(function (r) {
        if (r.error || !r.data) return {};
        var out = {};
        r.data.forEach(function (row) {
          var stats = {};
          STAT_COLS.forEach(function (p) { stats[p[0]] = row[p[1]] || 0; });
          out[row.player_id] = {
            stats: stats, power: row.core_power || 0, rank: row.core_rank || 'Player',
            name: row.display_name || '', xp: row.core_xp || 0, level: row.core_level || 1, real: true,
          };
        });
        return out;
      });
    }).catch(function () { return {}; });
  }

  /**
   * Publish the current user's stats so friends can see them. No-op without an auth session.
   * @param {Object} card { playerId, name, power, rank, xp, level, stats:{strength..} }
   * @returns {Promise<boolean>} true on success, false otherwise (never throws).
   */
  function publishMe(card) {
    if (!card || !card.playerId) return Promise.resolve(false);
    return getClient().then(function (sb) {
      if (!sb) return false;
      return sb.auth.getUser().then(function (u) {
        var user = u && u.data && u.data.user;
        if (!user) return false;
        var patch = {
          player_id: card.playerId, display_name: card.name || null,
          core_power: card.power || 0, core_rank: card.rank || null,
          core_xp: card.xp || 0, core_level: card.level || 1,
        };
        STAT_COLS.forEach(function (p) { patch[p[1]] = (card.stats && card.stats[p[0]]) || 0; });
        try { patch.stats_updated_at = new Date().toISOString(); } catch (e) {}
        return sb.from('profiles').update(patch).eq('id', user.id).then(function (r) { return !r.error; });
      });
    }).catch(function () { return false; });
  }

  window.coreSocial = { ready: ready, fetchProfiles: fetchProfiles, publishMe: publishMe };
})();
