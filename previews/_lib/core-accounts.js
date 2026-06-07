/*
 * core-accounts.js — account / session API for the CORE preview.
 *
 * Two backends behind one API:
 *
 *   1. SUPABASE  (when window.CORE_BACKEND_READY === true)
 *      Real auth + persistent profiles table. Use this for production.
 *
 *   2. LOCAL     (fallback when no Supabase config)
 *      localStorage-only simulator. Convincing for design previews,
 *      lost on cache clear, can't cross devices, never authenticates
 *      anyone for real.
 *
 * The shape of the API is identical in both modes so sign-in pages,
 * the trial flow, and the dashboard don't have to know which one is
 * running.
 *
 * Public API on `window.coreAccounts`:
 *
 *   isReal()                -> true when Supabase is wired
 *   current()               -> Promise<account|null> (or sync account|null in local mode)
 *   list()                  -> array (LOCAL only — for the picker UI)
 *   findOrCreate(opts)      -> Promise<{account, isNew}>  /  {account, isNew}
 *   signIn(accountId)       -> Promise<account>            /  account
 *   signInWithOAuth(provider) -> Promise<void>   (Supabase only — redirects away)
 *   signInWithEmailOtp(email) -> Promise<void>   (Supabase only — sends OTP)
 *   verifyEmailOtp(email, token) -> Promise<{account, isNew}>  (Supabase only)
 *   updateCurrent(patcher)  -> Promise<account>            /  account
 *   signOut()               -> Promise<void>               /  void
 *
 * The legacy localStorage flags (coreOnboardComplete, coreOnboardTrial)
 * are mirrored from the active account so existing gated pages keep
 * working without changes.
 */

(function () {
  /* ──────────────────────────────────────────────────────────────────
   * Shared helpers — used by both backends.
   * ────────────────────────────────────────────────────────────────── */
  function mirrorToLegacyFlags(account) {
    try {
      if (account && account.onboarded) {
        localStorage.setItem('coreOnboardComplete', '1');
      } else {
        localStorage.removeItem('coreOnboardComplete');
      }
      if (account && account.trialState) {
        localStorage.setItem('coreOnboardTrial', JSON.stringify(account.trialState));
      }
      if (account) {
        localStorage.setItem('coreLastSeen', String(Date.now()));
      }
    } catch (e) {}
  }
  function clearLegacyFlags() {
    try {
      localStorage.removeItem('coreOnboardComplete');
      localStorage.removeItem('coreOnboardTrial');
    } catch (e) {}
  }

  /* ──────────────────────────────────────────────────────────────────
   * LOCAL backend — localStorage simulator. Same code as before.
   * ────────────────────────────────────────────────────────────────── */
  const LOCAL = (function () {
    const KEY = 'core.accounts.v1';

    function read() {
      try {
        const v = JSON.parse(localStorage.getItem(KEY));
        if (v && typeof v === 'object') return v;
      } catch (e) {}
      return { accounts: [], activeAccountId: null, migrated: false };
    }
    function write(state) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }
    function makeId(provider, identifier) {
      return provider + ':' + String(identifier || '').toLowerCase().trim();
    }
    function adoptLegacyTrialIfAny(account, state) {
      if (state.migrated) return;
      state.migrated = true;
      let legacy = null;
      try { legacy = JSON.parse(localStorage.getItem('coreOnboardTrial') || 'null'); } catch (e) {}
      const wasOnboarded = (function () {
        try { return localStorage.getItem('coreOnboardComplete') === '1'; } catch (e) { return false; }
      })();
      if (legacy) {
        account.trialState = legacy;
        if (legacy.name && !account.displayName) account.displayName = legacy.name;
      }
      if (wasOnboarded) account.onboarded = true;
    }

    return {
      isReal() { return false; },
      list() { return read().accounts.slice(); },
      current() {
        const s = read();
        return s.accounts.find(a => a.id === s.activeAccountId) || null;
      },
      findOrCreate(opts) {
        const provider = String(opts && opts.provider || '').toLowerCase();
        const identifier = String(opts && opts.identifier || '');
        if (!provider || !identifier) throw new Error('provider + identifier required');
        const id = makeId(provider, identifier);
        const s = read();
        let account = s.accounts.find(a => a.id === id);
        let isNew = false;
        if (!account) {
          account = {
            id, provider, identifier,
            displayName: opts.displayName || identifier.split('@')[0] || 'New user',
            createdAt: Date.now(), lastSeenAt: Date.now(),
            onboarded: false, trialState: null,
          };
          adoptLegacyTrialIfAny(account, s);
          s.accounts.push(account);
          isNew = true;
        }
        account.lastSeenAt = Date.now();
        write(s);
        return { account, isNew };
      },
      signIn(accountId) {
        const s = read();
        const account = s.accounts.find(a => a.id === accountId);
        if (!account) return null;
        s.activeAccountId = accountId;
        account.lastSeenAt = Date.now();
        write(s);
        mirrorToLegacyFlags(account);
        return account;
      },
      updateCurrent(patcher) {
        const s = read();
        const account = s.accounts.find(a => a.id === s.activeAccountId);
        if (!account || typeof patcher !== 'function') return null;
        patcher(account);
        account.lastSeenAt = Date.now();
        write(s);
        mirrorToLegacyFlags(account);
        return account;
      },
      savePushToken({ token, platform }) {
        const s = read();
        const account = s.accounts.find(a => a.id === s.activeAccountId);
        if (account && token) {
          account.pushToken = token;
          account.pushPlatform = platform;
          account.pushOptedIn = true;
          write(s);
        }
        return Promise.resolve(!!(account && token));
      },
      signOut() {
        const s = read();
        s.activeAccountId = null;
        write(s);
        clearLegacyFlags();
      },
    };
  })();

  /* ──────────────────────────────────────────────────────────────────
   * SUPABASE backend — real auth + Postgres-backed profiles.
   * Loaded lazily via the official UMD bundle from a CDN. The first
   * call that needs it awaits the loader.
   * ────────────────────────────────────────────────────────────────── */
  const SUPA = (function () {
    let _client = null;
    let _loading = null;

    function loadSdk() {
      if (window.supabase && window.supabase.createClient) return Promise.resolve();
      if (_loading) return _loading;
      _loading = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
        s.async = true;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error('supabase SDK failed to load')); };
        document.head.appendChild(s);
      });
      return _loading;
    }

    async function getClient() {
      if (_client) return _client;
      await loadSdk();
      const cfg = window.CORE_CONFIG || {};
      _client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      return _client;
    }

    function profileToAccount(profile, authUser) {
      if (!profile) return null;
      return {
        id: profile.id,
        provider: (authUser && authUser.app_metadata && authUser.app_metadata.provider) || 'email',
        identifier: (authUser && authUser.email) || profile.id,
        displayName: profile.display_name || (authUser && authUser.email) || 'User',
        createdAt: profile.created_at ? Date.parse(profile.created_at) : Date.now(),
        lastSeenAt: profile.last_seen_at ? Date.parse(profile.last_seen_at) : Date.now(),
        onboarded: !!profile.onboarded,
        trialState: profile.trial_state || null,
        completedTrialAt: profile.completed_trial_at ? Date.parse(profile.completed_trial_at) : null,
        signedInWith: profile.signed_in_with || null,
        signedInAt: profile.signed_in_at ? Date.parse(profile.signed_in_at) : null,
      };
    }

    /* Pending-write queue ------------------------------------------------
     * If a profile UPDATE fails (offline, transient), we stash the exact
     * DB-ready patch here so it isn't lost, and replay it on the next
     * successful load. Only the latest patch per user is kept. */
    const PENDING_KEY = 'corePendingProfileSync';
    function readPending() {
      try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch (e) { return null; }
    }
    function writePending(entry) {
      try { entry ? localStorage.setItem(PENDING_KEY, JSON.stringify(entry)) : localStorage.removeItem(PENDING_KEY); } catch (e) {}
    }
    // One attempt + one retry. Resolves to the error (or null on success).
    async function pushProfilePatch(sb, id, patch) {
      let { error } = await sb.from('profiles').update(patch).eq('id', id);
      if (error) { ({ error } = await sb.from('profiles').update(patch).eq('id', id)); }
      return error || null;
    }
    // Replay a stashed patch for this user, if any. Best-effort; clears on success.
    async function flushPending(sb, userId) {
      const pending = readPending();
      if (!pending || pending.id !== userId || !pending.patch) return;
      const err = await pushProfilePatch(sb, userId, pending.patch);
      if (!err) { writePending(null); }
      else { console.error('[core-accounts] pending profile sync still failing — kept for retry', err); }
    }

    async function loadCurrentProfile() {
      const sb = await getClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      // Recover any onboarding/trial write that failed on a previous session.
      await flushPending(sb, user.id);
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) { console.error('[core-accounts] profile READ failed', error); return null; }
      let profile = data;
      // If the trigger that auto-creates profile rows hasn't fired (rare),
      // upsert one ourselves so the rest of the flow works.
      if (!profile) {
        const ins = await sb.from('profiles').insert({
          id: user.id,
          display_name: (user.user_metadata && user.user_metadata.name) || (user.email && user.email.split('@')[0]) || 'New user',
        }).select('*').single();
        if (ins.error) { console.error('[core-accounts] profile INSERT failed', ins.error); return null; }
        profile = ins.data;
      }
      return profileToAccount(profile, user);
    }

    return {
      isReal() { return true; },
      list() { return []; }, // not applicable for real backend
      async current() {
        const account = await loadCurrentProfile();
        mirrorToLegacyFlags(account);
        return account;
      },
      async findOrCreate(opts) {
        // For Supabase, we don't pre-create — auth flow creates the user.
        // This method only resolves what's already there for the current session.
        const account = await loadCurrentProfile();
        return { account, isNew: !!(account && !account.onboarded) };
      },
      async signIn() {
        // No-op for Supabase — the OAuth / OTP flow itself constitutes signing in.
        const account = await loadCurrentProfile();
        mirrorToLegacyFlags(account);
        return account;
      },
      async signInWithOAuth(provider) {
        const sb = await getClient();
        const cfg = window.CORE_CONFIG || {};
        const { error } = await sb.auth.signInWithOAuth({
          provider: provider,
          options: { redirectTo: cfg.OAUTH_REDIRECT_URL },
        });
        if (error) throw error;
      },
      async signInWithEmailOtp(email) {
        const sb = await getClient();
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      },
      async verifyEmailOtp(email, token) {
        const sb = await getClient();
        const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
        const account = await loadCurrentProfile();
        return { account, isNew: !!(account && !account.onboarded) };
      },
      async updateCurrent(patcher) {
        const sb = await getClient();
        const account = await loadCurrentProfile();
        if (!account || typeof patcher !== 'function') return null;
        patcher(account);
        const patch = {
          display_name: account.displayName,
          onboarded: !!account.onboarded,
          trial_state: account.trialState,
          completed_trial_at: account.completedTrialAt ? new Date(account.completedTrialAt).toISOString() : null,
          signed_in_with: account.signedInWith,
          signed_in_at: account.signedInAt ? new Date(account.signedInAt).toISOString() : null,
          last_seen_at: new Date().toISOString(),
        };
        const error = await pushProfilePatch(sb, account.id, patch);
        if (error) {
          // Don't lose the write: stash the DB-ready patch so the next successful
          // load (flushPending) replays it. Prevents the "marked onboarded locally
          // but onboarded=false in DB -> re-onboarding on next device" data loss.
          writePending({ id: account.id, patch: patch });
          console.error('[core-accounts] profile UPDATE failed — queued for retry on next load', error);
          return null;
        }
        writePending(null); // succeeded — drop any stale queued patch
        mirrorToLegacyFlags(account);
        return account;
      },
      async savePushToken({ token, platform, timezone }) {
        if (!token) return null;
        const sb = await getClient();
        const account = await loadCurrentProfile();
        if (!account) return null;
        const col = platform === 'ios' ? 'push_token_ios'
                  : platform === 'android' ? 'push_token_android'
                  : 'push_token_web';
        const patch = { [col]: token, push_opted_in: true };
        if (timezone) patch.timezone = timezone;
        const error = await pushProfilePatch(sb, account.id, patch);
        if (error) { console.error('[core-accounts] savePushToken failed', error); return null; }
        return true;
      },
      async signOut() {
        const sb = await getClient();
        await sb.auth.signOut();
        clearLegacyFlags();
      },
    };
  })();

  /* ──────────────────────────────────────────────────────────────────
   * Public router — picks LOCAL or SUPA on every call. Lets pages
   * upgrade to real backend just by editing core-config.js, no other
   * changes needed.
   * ────────────────────────────────────────────────────────────────── */
  window.coreAccounts = {
    isReal() { return !!window.CORE_BACKEND_READY; },
    list() { return LOCAL.list(); },
    current() {
      return window.CORE_BACKEND_READY ? SUPA.current() : LOCAL.current();
    },
    findOrCreate(opts) {
      return window.CORE_BACKEND_READY ? SUPA.findOrCreate(opts) : LOCAL.findOrCreate(opts);
    },
    signIn(accountId) {
      return window.CORE_BACKEND_READY ? SUPA.signIn(accountId) : LOCAL.signIn(accountId);
    },
    signInWithOAuth(provider) {
      if (!window.CORE_BACKEND_READY) {
        throw new Error('Real backend not configured — paste Supabase keys into _lib/core-config.js');
      }
      return SUPA.signInWithOAuth(provider);
    },
    signInWithEmailOtp(email) {
      if (!window.CORE_BACKEND_READY) {
        throw new Error('Real backend not configured — paste Supabase keys into _lib/core-config.js');
      }
      return SUPA.signInWithEmailOtp(email);
    },
    verifyEmailOtp(email, token) {
      if (!window.CORE_BACKEND_READY) {
        throw new Error('Real backend not configured — paste Supabase keys into _lib/core-config.js');
      }
      return SUPA.verifyEmailOtp(email, token);
    },
    updateCurrent(patcher) {
      return window.CORE_BACKEND_READY ? SUPA.updateCurrent(patcher) : LOCAL.updateCurrent(patcher);
    },
    savePushToken(opts) {
      return window.CORE_BACKEND_READY ? SUPA.savePushToken(opts) : LOCAL.savePushToken(opts);
    },
    signOut() {
      return window.CORE_BACKEND_READY ? SUPA.signOut() : LOCAL.signOut();
    },
  };

  // If we're using the real backend, hydrate the session on script load
  // so pages that read `current()` synchronously see the right state.
  if (window.CORE_BACKEND_READY) {
    SUPA.current().catch(function () { /* ignore — first load no session */ });
  }
})();
