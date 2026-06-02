/*
 * core-push.js — native push registration (Capacitor: APNs on iOS, FCM on Android).
 *
 * On a native build it requests notification permission, registers with the OS,
 * captures the device token, and persists it to the live backend
 * (Supabase `profiles` via coreAccounts.savePushToken). On the web it no-ops
 * gracefully (no device token exists outside the native shell).
 *
 * The backend sender (APNs/FCM dispatch + scheduler) already lives in
 * `backend/lib/notifications/*`. This file is only the client half.
 *
 * Public API on window.corePush:
 *   enable()  → Promise<{ok:boolean, reason?:string}>  request perm + register
 *   flush()   → replay a stored token to the backend (e.g. after sign-in)
 *   isNative()/platform()
 */
(function () {
  'use strict';
  var LS_KEY = 'corePush';

  function log() {
    try { console.log.apply(console, ['[core-push]'].concat([].slice.call(arguments))); } catch (e) {}
  }
  function isNative() {
    try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
    catch (e) { return false; }
  }
  function platform() {
    try { return (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web'; }
    catch (e) { return 'web'; }
  }
  function tz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
  }

  // Persist the token: localStorage (always) + Supabase profiles (live backend)
  // + an optional Next.js backend register endpoint if one is configured.
  function persist(token, plat) {
    if (!token) return;
    var rec = { token: token, platform: plat, optedIn: true, tz: tz(), ts: Date.now() };
    try { localStorage.setItem(LS_KEY, JSON.stringify(rec)); } catch (e) {}

    // 1) Live backend — Supabase profiles
    try {
      if (window.coreAccounts && typeof window.coreAccounts.savePushToken === 'function') {
        Promise.resolve(window.coreAccounts.savePushToken({ token: token, platform: plat, timezone: rec.tz }))
          .catch(function (err) { log('savePushToken failed', err); });
      }
    } catch (e) { log('savePushToken threw', e); }

    // 2) Optional Next.js backend route (set window.CORE_CONFIG.PUSH_REGISTER_URL to enable)
    try {
      var url = (window.CORE_CONFIG && window.CORE_CONFIG.PUSH_REGISTER_URL) || '';
      if (url) {
        fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: token, kind: plat, timezone: rec.tz })
        }).catch(function (err) { log('backend register failed', err); });
      }
    } catch (e) {}
  }

  function pnPlugin() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
  }

  var _bound = false;
  function bindListeners(PN) {
    if (_bound) return;
    _bound = true;
    PN.addListener('registration', function (tok) {
      var t = tok && (tok.value || tok.token);
      if (!t) return;
      log('registration token', String(t).slice(0, 12) + '…');
      persist(t, platform() === 'ios' ? 'ios' : 'android');
    });
    PN.addListener('registrationError', function (err) { log('registrationError', err); });
    PN.addListener('pushNotificationReceived', function (n) { log('received (foreground)', n && n.title); });
    PN.addListener('pushNotificationActionPerformed', function (a) {
      // Deep-link: notifications carry { data: { url: "20-dashboard.html" } }
      var url = a && a.notification && a.notification.data && a.notification.data.url;
      if (url) { try { window.location.href = url; } catch (e) {} }
    });
  }

  async function enableNative() {
    var PN = pnPlugin();
    if (!PN) { log('PushNotifications plugin missing'); return { ok: false, reason: 'plugin_missing' }; }
    bindListeners(PN);
    var perm = await PN.checkPermissions();
    if (perm.receive !== 'granted') perm = await PN.requestPermissions();
    if (perm.receive !== 'granted') return { ok: false, reason: 'denied' };
    await PN.register(); // → fires 'registration' → persist()
    return { ok: true };
  }

  async function enableWeb() {
    // No native token on the web. Honor the browser permission so the toggle
    // still means something during design previews / installed-PWA testing.
    try {
      if ('Notification' in window) {
        var p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
        return { ok: p === 'granted', reason: p };
      }
    } catch (e) {}
    return { ok: false, reason: 'unsupported' };
  }

  window.corePush = {
    isNative: isNative,
    platform: platform,
    enable: async function () {
      try { return isNative() ? await enableNative() : await enableWeb(); }
      catch (e) { log('enable error', e); return { ok: false, reason: 'error' }; }
    },
    flush: function () {
      try {
        var rec = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
        if (rec && rec.token) persist(rec.token, rec.platform);
      } catch (e) {}
    }
  };
})();
