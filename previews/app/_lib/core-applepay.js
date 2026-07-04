/**
 * core-applepay.js — self-contained Apple Pay confirmation sheet.
 *
 * Ported from the inline sheet in 07-trial.html so the pay step can run as the
 * FINAL gate (e.g. on 19-rank-reveal, just before entering the app/dashboard).
 *
 * Usage:
 *   <script src="_lib/core-applepay.js"></script>
 *   coreApplePay.open({
 *     onAuthorized: () => location.href = '20-dashboard.html',
 *     onDeclined:   () => location.href = '20-dashboard.html',  // free tier
 *   });
 *
 * Reads coreOnboardTrial.plan ('annual' | 'monthly') from localStorage to set
 * the price rows. Mimics the native PassKit/StoreKit hold-to-confirm handshake.
 */
(function () {
  if (typeof window === 'undefined' || window.coreApplePay) return;

  var HOLD_MS = 900;
  var injected = false;
  var cbAuth = null, cbDecline = null;
  var customRows = null;   // optional per-open line-items (e.g. coin packs), set via open({rows})
  var holdTimer = null, holdRaf = null, holdStart = 0;

  var CSS = '' +
    '.cap-back { position:absolute; inset:0; background:rgba(0,0,0,0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter:blur(6px); z-index:945; opacity:0; pointer-events:none; transition: opacity .25s; }' +
    '.cap-back.on { opacity:1; pointer-events:auto; }' +
    '.cap-sheet { position:absolute; left:8px; right:8px; bottom:8px; z-index:946; background: rgba(28,28,32,0.96); border-radius:22px; padding:6px 18px 16px; transform: translateY(110%); transition: transform .35s cubic-bezier(.22,1,.36,1); box-shadow:0 -20px 60px rgba(0,0,0,0.6); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Chakra Petch",sans-serif; }' +
    '.cap-sheet.on { transform: translateY(0); }' +
    '.cap-grab { width:36px; height:5px; background:rgba(255,255,255,0.20); border-radius:999px; margin:8px auto 14px; }' +
    '.cap-head { display:flex; align-items:center; justify-content:space-between; padding:2px 4px 12px; border-bottom:0.5px solid rgba(255,255,255,0.10); }' +
    '.cap-logo { display:flex; align-items:center; gap:6px; color:#fff; font-weight:600; font-size:17px; letter-spacing:-0.4px; }' +
    '.cap-close { color:rgba(255,255,255,0.45); font-size:14px; cursor:pointer; padding:4px 8px; }' +
    '.cap-merchant { display:flex; align-items:center; gap:10px; padding:14px 4px; border-bottom:0.5px solid rgba(255,255,255,0.10); }' +
    '.cap-mlogo { width:40px; height:40px; border-radius:10px; background:linear-gradient(145deg,#fff,#dbe9ff); color:#050510; font-size:18px; font-weight:800; display:grid; place-items:center; box-shadow:0 0 14px rgba(74,143,255,0.30); }' +
    '.cap-mname { font-size:14px; color:#fff; font-weight:600; letter-spacing:-0.15px; }' +
    '.cap-rows { padding:8px 4px; }' +
    '.cap-row { display:flex; align-items:center; justify-content:space-between; padding:7px 0; font-size:13px; color:rgba(255,255,255,0.65); }' +
    '.cap-row strong { color:rgba(255,255,255,0.90); font-weight:500; letter-spacing:-0.1px; }' +
    '.cap-row.total { border-top:0.5px solid rgba(255,255,255,0.10); margin-top:4px; padding-top:11px; font-size:14px; }' +
    '.cap-row.total strong { font-weight:700; font-size:17px; }' +
    '.cap-card { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.05); margin:10px 0 14px; font-size:13px; color:#fff; cursor:pointer; transition: background .15s; }' +
    '.cap-card:hover { background:rgba(255,255,255,0.08); }' +
    '.cap-card-mark { font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif; font-size:10px; font-weight:800; letter-spacing:0.10em; padding:4px 8px; border-radius:4px; background:linear-gradient(135deg,#1a1f71,#2c3a9a); color:#fff; min-width:42px; text-align:center; }' +
    '.cap-card-mark.mc { background:linear-gradient(135deg,#eb001b,#f79e1b); }' +
    '.cap-card-mark.amex { background:linear-gradient(135deg,#006fcf,#1c8ad6); }' +
    '.cap-default { margin-left:auto; font-size:9px; letter-spacing:0.16em; color:rgba(255,255,255,0.45); font-weight:700; }' +
    '.cap-card-chev { color:rgba(255,255,255,0.35); font-size:16px; margin-left:4px; }' +
    '.cap-pay { width:100%; padding:16px; border-radius:14px; border:none; background:#fff; color:#000; font-family:inherit; font-size:16px; font-weight:600; cursor:pointer; box-shadow:0 6px 22px rgba(255,255,255,0.10); position:relative; min-height:56px; overflow:hidden; display:flex; align-items:center; justify-content:center; user-select:none; -webkit-user-select:none; }' +
    '.cap-pay span:not(.cap-hold-ring) { align-items:center; gap:8px; }' +
    '.cap-pay .cap-pay-default { display:flex; }' +
    '.cap-pay .cap-pay-doing, .cap-pay .cap-pay-done { display:none; }' +
    '.cap-faceid svg { color:#000; }' +
    '.cap-faceid-anim svg { color:#000; animation: capFaceScan 1.2s ease-in-out infinite; }' +
    '@keyframes capFaceScan { 0%,100% { opacity:0.55; transform:scale(0.95); } 50% { opacity:1; transform:scale(1.05); } }' +
    '.cap-hold-ring { position:absolute; inset:0; pointer-events:none; background:linear-gradient(90deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.10) var(--hold,0%), transparent var(--hold,0%)); transition: background .05s linear; }' +
    '.cap-sheet.holding .cap-pay { background:#f0f0f0; }' +
    '.cap-sheet.authorizing .cap-pay-default { display:none; }' +
    '.cap-sheet.authorizing .cap-pay-doing { display:flex; }' +
    '.cap-sheet.authorizing .cap-pay { background:#ddd; color:#444; }' +
    '.cap-sheet.done .cap-pay-default, .cap-sheet.done .cap-pay-doing { display:none; }' +
    '.cap-sheet.done .cap-pay-done { display:flex; }' +
    '.cap-sheet.done .cap-pay { background:#34D399; color:#050510; }' +
    '.cap-fineprint { font-size:11px; color:rgba(255,255,255,0.42); text-align:center; margin-top:10px; letter-spacing:-0.05px; line-height:15px; }' +
    '.cap-decline { text-align:center; margin-top:14px; padding:8px; color:rgba(255,255,255,0.50); font-size:14px; cursor:pointer; }' +
    '.cap-decline:hover { color:#fff; }';

  var FACE_SVG = '<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;"><path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2"/><circle cx="9" cy="11" r=".7" fill="currentColor"/><circle cx="15" cy="11" r=".7" fill="currentColor"/><path d="M9 15c1 1 4 1 5 0"/></svg>';
  var APPLE_SVG = '<svg viewBox="0 0 24 24" fill="#fff" style="width:18px;height:18px;"><path d="M17.6 12.4c0-2.3 1.9-3.4 2-3.4-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.4 0 1.9.8 3.1.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8 0-.1-2.6-1-2.7-4z"/><path d="M15.3 5.8c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.5 2.7-1.3z"/></svg>';

  function planRows() {
    if (customRows) return customRows;   // caller-supplied line-items (coin packs, gifts…)
    var plan = 'monthly';
    try { var t = JSON.parse(localStorage.getItem('coreOnboardTrial') || '{}'); if (t.plan) plan = t.plan; } catch (e) {}
    var future = plan === 'annual' ? '$44.99/yr · cancel any time' : '$7.99/mo · cancel any time';
    var label = plan === 'annual' ? 'Core Pro · annual' : 'Core Pro · monthly';
    return '<div class="cap-row"><span>Subscription</span><strong>' + label + '</strong></div>' +
           '<div class="cap-row"><span>Free trial</span><strong>7 days</strong></div>' +
           '<div class="cap-row"><span>In 7 days</span><strong>' + future + '</strong></div>' +
           '<div class="cap-row total"><span>Due today</span><strong style="color:#fff;">$0.00</strong></div>';
  }

  function track(name, props) { try { if (window.coreTrack) window.coreTrack(name, props || {}); } catch (e) {} }

  function build() {
    if (injected) return;
    injected = true;
    var style = document.createElement('style');
    style.id = 'capStyle';
    style.textContent = CSS;
    document.head.appendChild(style);

    var host = document.querySelector('.phone') || document.body;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var back = document.createElement('div');
    back.className = 'cap-back'; back.id = 'capBack';

    var sheet = document.createElement('div');
    sheet.className = 'cap-sheet'; sheet.id = 'capSheet';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML =
      '<div class="cap-grab"></div>' +
      '<div class="cap-head"><div class="cap-logo">' + APPLE_SVG + ' Pay</div><div class="cap-close" id="capClose"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px;display:block;"><path d="M6 6l12 12M18 6L6 18"/></svg></div></div>' +
      '<div class="cap-merchant"><div class="cap-mlogo">C</div><div class="cap-mname">Core</div></div>' +
      '<div class="cap-rows" id="capRows">' + planRows() + '</div>' +
      '<div class="cap-card" id="capCard"><span class="cap-card-mark" id="capCardMark">VISA</span><span id="capCardLine">···· 4242</span><span class="cap-default">DEFAULT</span><span class="cap-card-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M9 6l6 6-6 6"/></svg></span></div>' +
      '<button class="cap-pay" id="capPay">' +
        '<span class="cap-pay-default"><span class="cap-faceid">' + FACE_SVG + '</span> Hold to confirm with Face&nbsp;ID</span>' +
        '<span class="cap-pay-doing"><span class="cap-faceid-anim">' + FACE_SVG + '</span> Authenticating…</span>' +
        '<span class="cap-pay-done"><svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;"><path d="M5 13l4 4L19 7"/></svg> Done</span>' +
        '<span class="cap-hold-ring" id="capHoldRing"></span>' +
      '</button>' +
      '<div class="cap-fineprint">Cancel any time at Settings - Apple ID - Subscriptions. First charge on day 7.</div>' +
      '<div class="cap-decline" id="capDecline">Not now · continue free</div>';

    host.appendChild(back);
    host.appendChild(sheet);

    back.addEventListener('click', dismiss);
    sheet.querySelector('#capClose').addEventListener('click', dismiss);
    sheet.querySelector('#capDecline').addEventListener('click', decline);
    sheet.querySelector('#capCard').addEventListener('click', cycleCard);
    bindHold(sheet.querySelector('#capPay'));
  }

  var CARDS = [
    { mark: 'VISA', cls: '', line: '···· 4242' },
    { mark: 'MC', cls: 'mc', line: '···· 5454' },
    { mark: 'AMEX', cls: 'amex', line: '···· 0005' },
  ];
  var cardIdx = 0;
  function cycleCard() {
    cardIdx = (cardIdx + 1) % CARDS.length;
    var c = CARDS[cardIdx];
    var m = document.getElementById('capCardMark'), l = document.getElementById('capCardLine');
    if (m) { m.textContent = c.mark; m.className = 'cap-card-mark ' + c.cls; }
    if (l) l.textContent = c.line;
    track('apple_pay_card_changed', { card: c.mark });
  }

  function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }

  function bindHold(btn) {
    if (!btn || btn.__capBound) return;
    btn.__capBound = true;
    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('touchstart', startHold, { passive: false });
    btn.addEventListener('mouseup', cancelHold);
    btn.addEventListener('mouseleave', cancelHold);
    btn.addEventListener('touchend', cancelHold);
    btn.addEventListener('touchcancel', cancelHold);
  }
  function startHold(e) {
    if (e) e.preventDefault();
    var sheet = document.getElementById('capSheet');
    if (!sheet || sheet.classList.contains('authorizing') || sheet.classList.contains('done')) return;
    sheet.classList.add('holding');
    haptic(10);
    holdStart = Date.now();
    var ring = document.getElementById('capHoldRing');
    (function tick() {
      var pct = Math.min(100, ((Date.now() - holdStart) / HOLD_MS) * 100);
      if (ring) ring.style.setProperty('--hold', pct + '%');
      if (pct < 100) holdRaf = requestAnimationFrame(tick);
    })();
    holdTimer = setTimeout(function () { cancelHold(); authorize(); }, HOLD_MS);
  }
  function cancelHold(e) {
    if (e) e.preventDefault();
    var sheet = document.getElementById('capSheet');
    if (sheet) sheet.classList.remove('holding');
    if (holdTimer) clearTimeout(holdTimer);
    if (holdRaf) cancelAnimationFrame(holdRaf);
    holdTimer = null; holdRaf = null;
    var ring = document.getElementById('capHoldRing');
    if (ring) ring.style.setProperty('--hold', '0%');
  }

  function authorize() {
    var sheet = document.getElementById('capSheet');
    if (!sheet) return;
    sheet.classList.remove('holding');
    sheet.classList.add('authorizing');
    track('apple_pay_connect_started', {});
    haptic(18);
    setTimeout(function () {
      sheet.classList.remove('authorizing');
      sheet.classList.add('done');
      haptic([12, 60, 24]);
      try {
        var t = JSON.parse(localStorage.getItem('coreOnboardTrial') || '{}');
        t.applePayConnected = true; t.applePayConnectedAt = Date.now(); t.paid = true;
        localStorage.setItem('coreOnboardTrial', JSON.stringify(t));
        localStorage.removeItem('corePayPending');
      } catch (e) {}
      track('apple_pay_connected', {});
      setTimeout(function () {
        dismiss(true);
        if (typeof cbAuth === 'function') cbAuth();
      }, 760);
    }, 1100);
  }

  function decline() {
    track('apple_pay_declined', {});
    try { localStorage.removeItem('corePayPending'); localStorage.setItem('coreFreeTier', '1'); } catch (e) {}
    dismiss(true);
    if (typeof cbDecline === 'function') cbDecline();
    else if (typeof cbAuth === 'function') cbAuth();
  }

  function open(opts) {
    opts = opts || {};
    cbAuth = opts.onAuthorized || null;
    cbDecline = opts.onDeclined || null;
    customRows = opts.rows || null;
    build();
    // reset visual state in case of re-open
    var sheet = document.getElementById('capSheet');
    if (sheet) sheet.classList.remove('authorizing', 'done', 'holding');
    var rows = document.getElementById('capRows');
    if (rows) rows.innerHTML = planRows();
    requestAnimationFrame(function () {
      document.getElementById('capBack').classList.add('on');
      document.getElementById('capSheet').classList.add('on');
    });
    track('apple_pay_sheet_opened', {});
  }

  function dismiss(silent) {
    var b = document.getElementById('capBack'), s = document.getElementById('capSheet');
    if (b) b.classList.remove('on');
    if (s) { s.classList.remove('on'); setTimeout(function () { s.classList.remove('done'); }, 360); }
    if (!silent) track('apple_pay_sheet_dismissed', {});
  }

  window.coreApplePay = { open: open, dismiss: dismiss };
})();
