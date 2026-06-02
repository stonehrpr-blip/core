/**
 * CORE analytics chokepoint.
 *
 * Include with: <script src="analytics.js"></script>
 *
 * Usage:
 *   coreTrack('screen_view', { screen: 'dashboard' });
 *   coreTrack('slip_logged', { habit: 'vape' });
 *
 * To swap in PostHog/Mixpanel/Amplitude later, change the implementation
 * inside `coreTrack` once and every screen picks it up.
 *
 * Standardized event names (keep this list authoritative):
 *
 *   screen_view              { screen, params? }   — fired on page load
 *   trial_step_view          { step }
 *   trial_step_complete      { from, to }
 *   trial_promise_signed     {}
 *   trial_started            { tone, checkin }
 *   trial_exit_intent_shown  { step }
 *   trial_exit_intent_dismissed { step }
 *   trial_exit_intent_left   { step }
 *   slip_logged              { habit, time_of_day }
 *   habit_opened             { habit }
 *   stat_opened              { stat }
 *   coach_msg_sent           { len }
 *   coach_action_confirmed   { action }
 *   recovery_started         { habit }
 *   recovery_completed       { habit, reflected }
 *   pricing_viewed           { plan_seen }
 *   paywall_viewed           { trigger }
 *   subscription_started     { plan, source }
 *   subscription_cancelled   { reason? }
 *   referral_link_opened     { ref }
 *   demo_state_set           { state }
 */
(function() {
  if (typeof window === 'undefined') return;

  // Persistent anonymous id (resets on localStorage clear or signOut).
  function getAid() {
    try {
      var aid = localStorage.getItem('coreAid');
      if (!aid) {
        aid = 'a_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
        localStorage.setItem('coreAid', aid);
      }
      return aid;
    } catch(e) { return 'a_anon'; }
  }

  function coreTrack(event, props) {
    try {
      var payload = Object.assign({
        ts: Date.now(),
        aid: getAid(),
        path: location.pathname.split('/').pop() || 'unknown',
        url: location.href,
      }, props || {});

      // Single swap-point. Replace this body to ship to real analytics.
      console.log('[analytics]', event, payload);

      // window.posthog && window.posthog.capture(event, payload);
      // window.mixpanel && window.mixpanel.track(event, payload);
      // window.amplitude && window.amplitude.track(event, payload);

      // Drop into a session-local ring buffer for inspector overlays.
      try {
        var ring = JSON.parse(sessionStorage.getItem('coreAnalyticsRing') || '[]');
        ring.push({ event: event, payload: payload });
        if (ring.length > 200) ring = ring.slice(-200);
        sessionStorage.setItem('coreAnalyticsRing', JSON.stringify(ring));
      } catch(e){}
    } catch(e){}
  }

  // Auto-fire a screen_view on page load using the file name as the screen id.
  function autoScreenView() {
    var name = (location.pathname.split('/').pop() || 'index').replace('.html','');
    if (!name) name = 'index';
    coreTrack('screen_view', { screen: name });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoScreenView);
  } else {
    autoScreenView();
  }

  window.coreTrack = coreTrack;
})();
