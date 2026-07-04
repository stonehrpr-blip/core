#!/usr/bin/env python3
"""
Re-applies the Corbit onboarding upgrade to previews/07-trial.html and
previews/01-index.html. Idempotent: skips any patch whose marker already
exists. Exists because a worktree sync on Jul 3 19:32 clobbered these two
files after the upgrade landed; run it again if that ever happens:

    python3 previews/_lib/reapply-corbit-upgrade.py

What it adds: Corbit guide orb + tips, voice-calibration step 24,
identity step 23 into the live ORDER, CORE ID reflective card after the
portal, i18n hooks (titles + CTAs), fresh-start guard, steel re-theme.
"""
import re, sys, os

ROOT = os.path.join(os.path.dirname(__file__), '..')
TRIAL = os.path.join(ROOT, '07-trial.html')
INDEX = os.path.join(ROOT, '01-index.html')

applied, skipped, failed = [], [], []

def patch(s, name, old, new, count=1, marker=None):
    """Replace old->new unless marker (or new) already present."""
    probe = marker or new[:60]
    if probe in s:
        skipped.append(name); return s
    if old not in s:
        failed.append(name); return s
    applied.append(name)
    return s.replace(old, new, count)

# ═══════════════════════ 07-trial.html ═══════════════════════
t = open(TRIAL).read()

# -- i18n include --
t = patch(t, 'trial:i18n-include',
    '<meta charset="utf-8" />',
    '<meta charset="utf-8" />\n<script src="_lib/core-i18n.js"></script>',
    marker='core-i18n.js')

# -- flow order --
t = patch(t, 'trial:ORDER',
    'const ORDER = [1, 2, 4, 9, 22, 16, 0, 21];',
    'const ORDER = [1, 2, 4, 9, 23, 24, 22, 16, 0, 21];')

t = patch(t, 'trial:CHAPTERS',
    """  const CHAPTERS = [
    { ch: 'you',    label: 'You',        maxPos: 1  },  // name+age, profile
    { ch: 'habit',  label: 'Your habit', maxPos: 3  },  // what you're quitting, what pushed you
    { ch: 'plan',   label: 'Your plan',  maxPos: 5  },  // 30-day payoff, commitment
    { ch: 'commit', label: 'Commit',     maxPos: 7  },  // contract, portal
  ];""",
    """  const CHAPTERS = [
    { ch: 'you',    label: 'You',        maxPos: 1  },  // name+age, profile
    { ch: 'habit',  label: 'Your habit', maxPos: 3  },  // what you're quitting, what pushed you
    { ch: 'coach',  label: 'Your coach', maxPos: 5  },  // who you want to become, Corbit voice link
    { ch: 'plan',   label: 'Your plan',  maxPos: 7  },  // commitment, 30-day payoff
    { ch: 'commit', label: 'Commit',     maxPos: 9  },  // contract, portal
  ];""")

t = patch(t, 'trial:AUTO_ADVANCE',
    'const AUTO_ADVANCE = new Set([2, 4, 9]);',
    'const AUTO_ADVANCE = new Set([2, 4, 9, 23]);')

t = patch(t, 'trial:DECK_STEPS',
    'const DECK_STEPS = [1, 2, 4, 9, 23, 14, 22, 16];',
    'const DECK_STEPS = [1, 2, 4, 9, 23, 24, 14, 22, 16];')

t = patch(t, 'trial:on-autoadvance',
    "document.body.classList.toggle('on-autoadvance', n === 2 || n === 4 || n === 9);",
    "document.body.classList.toggle('on-autoadvance', n === 2 || n === 4 || n === 9 || n === 23);")

# -- CTA: fix stale "Type PROMISE" helper + voice-step branch --
t = patch(t, 'trial:refreshCTA',
    """      setCTA('Sign', !state.promised,
        state.promised ? 'Signed. Tap to seal it.' : 'Type PROMISE to continue');
    } else if (s === 1) {""",
    """      setCTA('Sign', !state.promised,
        state.promised ? 'Signed. Tap to seal it.' : 'Slide the handle to commit');
    } else if (s === 24) {
      setCTA(state.voiceDone ? 'Next' : 'Skip for now', false,
        state.voiceDone ? 'Corbit knows your voice' : 'Optional — you can do this later in Settings');
    } else if (s === 1) {""")

# -- CTA label translation --
t = patch(t, 'trial:setCTA-i18n',
    """  function setCTA(label, disabled, helper) {
    cta.textContent = '';""",
    """  // CTA labels follow the chosen language (coreLang) when a translation exists.
  const CTA_I18N = { 'Next':'cta.next', 'Continue':'cta.continue', 'Sign':'cta.sign', 'Skip for now':'cta.skipnow' };
  function setCTA(label, disabled, helper) {
    try {
      if (window.coreI18n && CTA_I18N[label]) label = coreI18n.t(CTA_I18N[label]) || label;
    } catch (e) {}
    cta.textContent = '';""",
    marker='CTA_I18N')

# -- state --
t = patch(t, 'trial:state.voiceDone',
    'identity:null, commitment:null,',
    """identity:null, commitment:null,
                  // Corbit voice link (step 24) — set true once the read-aloud passes
                  voiceDone:false,""",
    marker='voiceDone:false')

# -- setStep hooks --
t = patch(t, 'trial:setStep-hooks',
    """    if (n === 16) renderPlanScreen();
    if (n === 17) renderPaywall();""",
    """    if (n === 16) renderPlanScreen();
    if (n === 17) renderPaywall();
    if (n === 24 && window.__voiceStepEnter) window.__voiceStepEnter();  // Corbit voice calibration
    if (n !== 24 && window.__voiceStepLeave) window.__voiceStepLeave();  // stop mic when leaving
    if (window.__corbitOnStep) window.__corbitOnStep(n);            // Corbit guide bubble""",
    marker='__corbitOnStep(n)')

# -- portal -> CORE ID --
t = patch(t, 'trial:portal-hook',
    """      // connectAccount('card') marks payment connected, persists the trial,
      // and navigates (→ 08-rank-reveal → … → dashboard).
      if (typeof window.connectAccount === 'function') window.connectAccount('card');""",
    """      // The CORE ID card (reflective member card) is the payoff right after
      // "Start journey" — its Enter CORE button then runs connectAccount('card'),
      // which persists the trial and navigates (→ 08-rank-reveal → … → dashboard).
      if (typeof window.__showCoreId === 'function') window.__showCoreId();
      else if (typeof window.connectAccount === 'function') window.connectAccount('card');""",
    marker='__showCoreId === ')

# -- step-24 voice HTML + CSS (after the commitment step block) --
VOICE_STEP = '''
        <!-- STEP 24: Corbit voice link — read a line, words light up as Corbit hears them -->
        <div class="step" data-step="24">
          <div class="kicker">Step · Your coach</div>
          <h1 class="title" data-i18n-html="trial.t24">Say hi<br/><span class="g">to Corbit.</span></h1>
          <p class="copy">Read the line out loud — Corbit locks onto your voice as you speak.</p>

          <div class="voice-stage">
            <div class="corbit-mini" id="voiceOrb" aria-hidden="true">
              <span class="cm-ring"></span>
              <span class="cm-core"></span>
              <span class="cm-wave w1"></span>
              <span class="cm-wave w2"></span>
            </div>

            <div class="voice-line" id="voiceLine" aria-label="Line to read aloud"></div>

            <button type="button" class="voice-mic" id="voiceMic" aria-label="Start listening">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3"/>
                <path d="M5 11a7 7 0 0 0 14 0"/>
                <path d="M12 18v3"/>
              </svg>
              <span id="voiceMicLabel">Tap to speak</span>
            </button>
            <div class="voice-status" id="voiceStatus">Corbit is waiting to hear you.</div>
          </div>

          <div class="privacy-note" style="margin-top:auto;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
            <span>Processed on-device. Corbit never records or uploads audio.</span>
          </div>
        </div>
        <style>
          /* ── Corbit voice link (step 24) ── */
          .voice-stage { display:flex; flex-direction:column; align-items:center; gap:20px; margin-top:14px; }
          .corbit-mini { position:relative; width:86px; height:86px; }
          .corbit-mini .cm-core { position:absolute; inset:22px; border-radius:50%;
            background:radial-gradient(circle at 38% 32%, #ffffff 0%, #D6DBE2 34%, #8A909C 78%, #5C626C 100%);
            box-shadow:0 0 24px rgba(206,212,222,0.45), 0 0 60px rgba(206,212,222,0.18); }
          .corbit-mini .cm-ring { position:absolute; inset:6px; border-radius:50%;
            background:conic-gradient(from 0deg, transparent 0deg, rgba(226,231,238,0.9) 40deg, transparent 90deg,
              transparent 180deg, rgba(196,201,210,0.7) 220deg, transparent 270deg);
            -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
            mask:radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
            animation:corbitSpin 3.2s linear infinite; }
          .corbit-mini .cm-wave { position:absolute; inset:0; border-radius:50%;
            border:1.5px solid rgba(214,219,226,0.4); opacity:0; transform:scale(0.6); }
          .corbit-mini.listening .cm-wave { animation:corbitWave 1.6s ease-out infinite; }
          .corbit-mini.listening .cm-wave.w2 { animation-delay:.8s; }
          .corbit-mini.listening .cm-ring { animation-duration:1.1s; }
          .corbit-mini.done .cm-core { background:radial-gradient(circle at 38% 32%, #ffffff 0%, #F2F4F8 40%, #AEB6C4 100%);
            box-shadow:0 0 34px rgba(238,241,246,0.65), 0 0 90px rgba(206,212,222,0.30); }
          @keyframes corbitSpin { to { transform:rotate(360deg); } }
          @keyframes corbitWave { 0% { opacity:.55; transform:scale(0.62); } 100% { opacity:0; transform:scale(1.28); } }
          .voice-line { text-align:center; font-size:21px; line-height:1.55; font-weight:600; letter-spacing:-0.2px;
            max-width:300px; }
          .voice-line .vw { color:rgba(255,255,255,0.34); transition:color .22s ease, text-shadow .3s ease; }
          .voice-line .vw.heard { color:#ffffff; text-shadow:0 0 14px rgba(226,231,238,0.55); }
          .voice-mic { display:flex; align-items:center; gap:10px; padding:13px 22px; border-radius:999px;
            background:linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03));
            border:1px solid rgba(214,219,226,0.30); color:#EDF0F5; font-family:inherit; font-size:14px;
            font-weight:700; letter-spacing:-0.1px; cursor:pointer;
            box-shadow:0 1px 0 rgba(255,255,255,0.10) inset, 0 10px 26px rgba(0,0,0,0.36);
            transition:transform .14s cubic-bezier(.22,1,.36,1), border-color .2s, box-shadow .25s; }
          .voice-mic svg { width:18px; height:18px; }
          .voice-mic:active { transform:scale(0.96); }
          .voice-mic.listening { border-color:rgba(238,241,246,0.75);
            box-shadow:0 0 0 4px rgba(206,212,222,0.14), 0 0 26px rgba(206,212,222,0.28); }
          .voice-mic.done { opacity:0.5; pointer-events:none; }
          .voice-status { font-size:12px; color:var(--muted); letter-spacing:-0.05px; min-height:16px; text-align:center; }
          @media (prefers-reduced-motion: reduce) {
            .corbit-mini .cm-ring, .corbit-mini.listening .cm-wave { animation:none; }
          }
        </style>
'''
t = patch(t, 'trial:voice-step-html',
    '''            <div class="commit-label hint" id="commitLabel">tap or drag to set</div>
            <div class="commit-note" id="commitNote"></div>
          </div>
        </div>
''',
    '''            <div class="commit-label hint" id="commitLabel">tap or drag to set</div>
            <div class="commit-note" id="commitNote"></div>
          </div>
        </div>
''' + VOICE_STEP,
    marker='id="voiceLine"')

# -- Corbit guide + CORE ID markup + CSS (after home-indicator) --
GUIDE_AND_ID = '''
    <!-- ── CORBIT GUIDE — Siri-style helper orb + glass tip bubble ── -->
    <div class="corbit-guide" id="corbitGuide" aria-live="polite">
      <div class="cg-bubble" id="cgBubble">
        <div class="cg-head">
          <span class="cg-helix" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="cg-name">CORBIT</span>
        </div>
        <div class="cg-text" id="cgText"></div>
      </div>
      <button type="button" class="cg-orb" id="cgOrb" aria-label="Ask Corbit">
        <span class="cg-ring"></span>
        <span class="cg-core"></span>
      </button>
    </div>

    <!-- ── CORE ID — reflective member card, shown after "Start journey" ── -->
    <div class="core-id" id="coreIdScreen" aria-hidden="true">
      <svg class="rc-filters" aria-hidden="true">
        <defs>
          <filter id="rcMetal" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="noise"/>
            <feColorMatrix in="noise" type="luminanceToAlpha" result="noiseAlpha"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" result="rippled"/>
            <feSpecularLighting in="noiseAlpha" surfaceScale="22" specularConstant="1.4" specularExponent="20" lighting-color="#ffffff" result="light">
              <fePointLight x="0" y="0" z="300"/>
            </feSpecularLighting>
            <feComposite in="light" in2="rippled" operator="in" result="lightEffect"/>
            <feBlend in="lightEffect" in2="rippled" mode="screen"/>
          </filter>
        </defs>
      </svg>
      <div class="rc-kicker">YOUR CORE ID</div>
      <div class="rc-card">
        <video id="rcVideo" autoplay playsinline muted></video>
        <div class="rc-fallback" aria-hidden="true"></div>
        <div class="rc-noise"></div>
        <div class="rc-sheen"></div>
        <div class="rc-border"></div>
        <div class="rc-content">
          <div class="rc-head">
            <span class="rc-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
              SEALED · CORE
            </span>
            <span class="rc-dot"></span>
          </div>
          <div class="rc-body">
            <h2 class="rc-name" id="rcName">CORE MEMBER</h2>
            <p class="rc-role" id="rcSince">MEMBER SINCE 2026</p>
          </div>
          <div class="rc-foot">
            <div class="rc-idcol">
              <span class="rc-lab">ID NUMBER</span>
              <span class="rc-val" id="rcId">0000-0000-0000</span>
            </div>
            <svg class="rc-finger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 11a2 2 0 0 0-2 2v3.5"/><path d="M14 13.1V16a6.1 6.1 0 0 1-.5 2.5"/><path d="M8.6 16.4A4.5 4.5 0 0 1 8 14v-1a4 4 0 0 1 7.6-1.7"/><path d="M5.4 14.9A8 8 0 0 1 5 12.5a7 7 0 0 1 12.7-4"/><path d="M19 12.5a11 11 0 0 1-.6 3.6"/><path d="M17.2 18.9a9.4 9.4 0 0 1-1 1.7"/></svg>
          </div>
        </div>
      </div>
      <p class="rc-note">Your camera lights the metal — nothing is recorded.</p>
      <button type="button" class="rc-cta" id="rcEnter">
        Enter CORE
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </div>

    <style>
      /* ── Corbit guide ── */
      .corbit-guide { position:absolute; right:16px; bottom:136px; z-index:60;
        display:flex; flex-direction:column; align-items:flex-end; gap:10px;
        transition:opacity .3s ease, transform .3s ease; }
      .corbit-guide.hidden { opacity:0; pointer-events:none; transform:translateY(8px); }
      .cg-orb { position:relative; width:46px; height:46px; border-radius:50%; border:none; padding:0;
        background:transparent; cursor:pointer; -webkit-tap-highlight-color:transparent; }
      .cg-core { position:absolute; inset:10px; border-radius:50%;
        background:radial-gradient(circle at 38% 32%, #ffffff 0%, #D6DBE2 36%, #8A909C 78%, #545A64 100%);
        box-shadow:0 0 16px rgba(206,212,222,0.5), 0 4px 14px rgba(0,0,0,0.5);
        animation:cgBreathe 4.5s ease-in-out infinite; }
      .cg-ring { position:absolute; inset:2px; border-radius:50%;
        background:conic-gradient(from 0deg, transparent 0deg, rgba(226,231,238,0.95) 40deg, transparent 100deg,
          transparent 200deg, rgba(196,201,210,0.6) 250deg, transparent 320deg);
        -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px));
        mask:radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px));
        animation:cgSpin 3.4s linear infinite; }
      @keyframes cgSpin { to { transform:rotate(360deg); } }
      @keyframes cgBreathe { 0%,100% { transform:scale(1); } 50% { transform:scale(1.07); } }
      .cg-bubble { max-width:236px; padding:12px 14px 13px; border-radius:16px 16px 4px 16px;
        background:linear-gradient(180deg, rgba(24,26,32,0.92), rgba(12,13,17,0.94));
        -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px);
        border:1px solid rgba(214,219,226,0.22);
        box-shadow:0 1px 0 rgba(255,255,255,0.08) inset, 0 18px 44px rgba(0,0,0,0.55);
        opacity:0; transform:translateY(8px) scale(0.94); transform-origin:100% 100%;
        pointer-events:none; transition:opacity .28s cubic-bezier(.22,1,.36,1), transform .34s cubic-bezier(.22,1.4,.36,1); }
      .cg-bubble.on { opacity:1; transform:none; pointer-events:auto; }
      .cg-head { display:flex; align-items:center; gap:7px; margin-bottom:6px; }
      .cg-name { font-size:9.5px; font-weight:800; letter-spacing:0.26em; color:rgba(226,231,238,0.85); }
      .cg-text { font-size:13px; line-height:18px; color:rgba(255,255,255,0.92); letter-spacing:-0.1px; min-height:18px; }
      /* the little Mr-DNA helix — two strands of dots weaving */
      .cg-helix { display:inline-flex; gap:2.5px; height:12px; align-items:center; }
      .cg-helix i { width:3px; height:3px; border-radius:50%; background:#D6DBE2; opacity:0.9;
        animation:cgHelix 1.5s ease-in-out infinite; box-shadow:0 0 4px rgba(206,212,222,0.7); }
      .cg-helix i:nth-child(2n) { background:#8A909C; }
      .cg-helix i:nth-child(1) { animation-delay:0s; } .cg-helix i:nth-child(2) { animation-delay:.12s; }
      .cg-helix i:nth-child(3) { animation-delay:.24s; } .cg-helix i:nth-child(4) { animation-delay:.36s; }
      .cg-helix i:nth-child(5) { animation-delay:.48s; } .cg-helix i:nth-child(6) { animation-delay:.6s; }
      @keyframes cgHelix { 0%,100% { transform:translateY(-3.5px) scale(0.8); } 50% { transform:translateY(3.5px) scale(1.15); } }
      body.on-promise .corbit-guide { bottom:96px; }
      @media (prefers-reduced-motion: reduce) {
        .cg-ring, .cg-core, .cg-helix i { animation:none !important; }
      }

      /* ── CORE ID screen ── */
      .core-id { position:absolute; inset:0; z-index:80; background:#000;
        display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;
        padding:48px 28px 40px; opacity:0; pointer-events:none; transition:opacity .6s ease; }
      .core-id.on { opacity:1; pointer-events:auto; }
      .rc-filters { position:absolute; width:0; height:0; opacity:0; pointer-events:none; }
      .rc-kicker { font-size:11px; font-weight:800; letter-spacing:0.42em; text-indent:0.42em;
        color:rgba(226,231,238,0.75); opacity:0; }
      .core-id.on .rc-kicker { animation:rcFadeUp .5s .2s cubic-bezier(.22,1,.36,1) forwards; }
      .rc-card { position:relative; width:292px; height:440px; border-radius:20px; overflow:hidden;
        background:#101114; isolation:isolate;
        box-shadow:0 26px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.10) inset;
        opacity:0; transform:translateY(16px) scale(0.96); }
      .core-id.on .rc-card { animation:rcIn .8s .35s cubic-bezier(.22,1,.36,1) forwards; }
      @keyframes rcIn { to { opacity:1; transform:none; } }
      .rc-card video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
        transform:scale(1.2) scaleX(-1); z-index:0; opacity:0.9;
        filter:saturate(0) contrast(120%) brightness(105%) blur(12px) url(#rcMetal); }
      .core-id.no-cam .rc-card video { display:none; }
      .rc-fallback { position:absolute; inset:0; z-index:0; display:none;
        background:
          radial-gradient(120% 90% at 30% 10%, rgba(214,219,226,0.30) 0%, transparent 55%),
          radial-gradient(120% 100% at 80% 100%, rgba(138,144,156,0.28) 0%, transparent 60%),
          linear-gradient(155deg, #2A2D34 0%, #16171B 45%, #24262C 74%, #101114 100%); }
      .core-id.no-cam .rc-fallback { display:block; }
      .rc-noise { position:absolute; inset:0; z-index:1; opacity:0.4; pointer-events:none; mix-blend-mode:overlay;
        background-image:url("data:image/svg+xml,%3Csvg viewBox=\\'0 0 200 200\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\\'nf\\'%3E%3CfeTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.8\\' numOctaves=\\'3\\' stitchTiles=\\'stitch\\'/%3E%3C/filter%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' filter=\\'url(%23nf)\\'/%3E%3C/svg%3E"); }
      .rc-sheen { position:absolute; inset:0; z-index:2; pointer-events:none; mix-blend-mode:overlay;
        background:linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%,
          rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.3) 100%); }
      .rc-border { position:absolute; inset:0; border-radius:20px; padding:1px; z-index:20; pointer-events:none;
        background:linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.6) 100%);
        -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite:xor; mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite:exclude; }
      .rc-content { position:relative; z-index:10; height:100%; display:flex; flex-direction:column;
        justify-content:space-between; padding:26px; color:#fff; background:rgba(255,255,255,0.05); }
      .rc-head { display:flex; justify-content:space-between; align-items:center;
        border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:14px; }
      .rc-badge { display:flex; align-items:center; gap:6px; font-size:9.5px; font-weight:800; letter-spacing:0.12em;
        padding:4px 8px; background:rgba(255,255,255,0.10); border-radius:5px; border:1px solid rgba(255,255,255,0.2); }
      .rc-badge svg { width:12px; height:12px; }
      .rc-dot { width:7px; height:7px; border-radius:50%; background:#fff;
        box-shadow:0 0 8px rgba(255,255,255,0.8); animation:cgBreathe 3s ease-in-out infinite; }
      .rc-body { flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center;
        text-align:center; margin-bottom:1.6em; }
      .rc-name { font-size:23px; font-weight:800; letter-spacing:0.05em; margin:0 0 7px;
        text-shadow:0 2px 4px rgba(0,0,0,0.35); }
      .rc-role { font-size:10.5px; letter-spacing:0.2em; opacity:0.7; margin:0; text-transform:uppercase; }
      .rc-foot { display:flex; justify-content:space-between; align-items:flex-end;
        border-top:1px solid rgba(255,255,255,0.2); padding-top:20px; }
      .rc-idcol { display:flex; flex-direction:column; gap:4px; }
      .rc-lab { font-size:8.5px; letter-spacing:0.1em; opacity:0.6; }
      .rc-val { font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:13px; letter-spacing:0.05em; }
      .rc-finger { width:30px; height:30px; opacity:0.45; }
      .rc-note { font-size:11px; color:rgba(255,255,255,0.40); margin:0; letter-spacing:-0.05px; opacity:0; }
      .core-id.on .rc-note { animation:rcFadeUp .5s .7s cubic-bezier(.22,1,.36,1) forwards; }
      .rc-cta { display:flex; align-items:center; gap:8px; padding:15px 30px; border-radius:999px; border:none;
        background:linear-gradient(180deg, #ffffff, #E4E8EF); color:#0A0B0E; font-family:inherit;
        font-size:15px; font-weight:800; letter-spacing:-0.2px; cursor:pointer;
        box-shadow:0 16px 40px rgba(255,255,255,0.14); opacity:0;
        transition:transform .15s cubic-bezier(.22,1,.36,1); }
      .core-id.on .rc-cta { animation:rcFadeUp .5s .9s cubic-bezier(.22,1,.36,1) forwards; }
      .rc-cta:active { transform:scale(0.96); }
      .rc-cta svg { width:16px; height:16px; }
      @keyframes rcFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    </style>
'''
t = patch(t, 'trial:guide+id-markup',
    '<div class="home-indicator"></div>',
    '<div class="home-indicator"></div>\n' + GUIDE_AND_ID,
    marker='id="coreIdScreen"')

# -- mega JS block (fresh-start guard, voice, guide, CORE ID) --
MEGA_JS = '''
  // ═══════════ FRESH-START GUARD ═══════════
  // Arriving from the launch/intro pages (or ?fresh=1) means a NEW run — wipe
  // any half-finished previous run so old answers never leak into this one.
  (function freshStartGuard() {
    try {
      var fresh = /[?&]fresh=1/.test(location.search)
        || /02-corbit|01-index/.test(document.referrer || '');
      if (fresh) {
        ['coreTrialStep', 'coreOnboardTrial'].forEach(function (k) { localStorage.removeItem(k); });
      }
    } catch (e) {}
  })();

  // ═══════════ CORBIT VOICE LINK (step 24) ═══════════
  // The user reads one line aloud; the Web Speech API highlights each word as
  // Corbit recognises it. On-device, nothing recorded. Optional (skippable).
  (function corbitVoice() {
    const LINE = "Hey Corbit — this is my voice. Let's get to work.";
    const line = document.getElementById('voiceLine');
    const mic = document.getElementById('voiceMic');
    const micLabel = document.getElementById('voiceMicLabel');
    const statusEl = document.getElementById('voiceStatus');
    const orb = document.getElementById('voiceOrb');
    if (!line || !mic) return;
    const norm = function (s) { return s.toLowerCase().replace(/[^a-z']/g, ''); };
    const targets = [];
    LINE.split(' ').forEach(function (w, i, arr) {
      const sp = document.createElement('span');
      sp.className = 'vw'; sp.textContent = w;
      line.appendChild(sp);
      if (i < arr.length - 1) line.appendChild(document.createTextNode(' '));
      if (norm(w)) targets.push({ el: sp, w: norm(w), heard: false });
    });
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null, listening = false, done = false;
    function setStatus(t) { if (statusEl) statusEl.textContent = t; }
    function wordMatches(target, heard) {
      if (target === heard) return true;
      if (target === 'corbit') return /orb|corb|cob/.test(heard);
      if (target.length >= 4 && heard.length >= 4 && target.slice(0, 4) === heard.slice(0, 4)) return true;
      return false;
    }
    function matchTranscript(text) {
      const heardWords = text.toLowerCase().split(/\\s+/).map(norm).filter(Boolean);
      heardWords.forEach(function (hw) {
        for (let i = 0; i < targets.length; i++) {
          if (!targets[i].heard && wordMatches(targets[i].w, hw)) {
            targets[i].heard = true;
            targets[i].el.classList.add('heard');
            break;
          }
        }
      });
      const heard = targets.filter(function (t) { return t.heard; }).length;
      if (!done && heard >= Math.ceil(targets.length * 0.75)) success();
      else if (!done && heard > 0) setStatus('Keep going — ' + heard + '/' + targets.length + ' words locked.');
    }
    function success() {
      done = true;
      state.voiceDone = true;
      try { localStorage.setItem('coreVoiceLinked', '1'); } catch (e) {}
      targets.forEach(function (t) { t.el.classList.add('heard'); });
      stopRec();
      if (orb) { orb.classList.remove('listening'); orb.classList.add('done'); }
      mic.classList.remove('listening'); mic.classList.add('done');
      if (micLabel) micLabel.textContent = 'Voice linked';
      setStatus("Got it. Corbit would know you anywhere.");
      try { if (typeof haptic === 'function') haptic([10, 40, 20]); } catch (e) {}
      try { if (window.coreSfx) coreSfx('confirm'); } catch (e) {}
      track('voice_linked', {});
      refreshCTA();
      if (window.__corbitSay) window.__corbitSay("Voice locked. I'd know you anywhere.");
    }
    function stopRec() {
      listening = false;
      if (rec) { try { rec.onend = null; rec.stop(); } catch (e) {} rec = null; }
      if (orb) orb.classList.remove('listening');
      mic.classList.remove('listening');
      if (!done && micLabel) micLabel.textContent = 'Tap to speak';
    }
    function startRec() {
      if (done || listening) return;
      if (!SR) {
        setStatus('Voice needs Safari or Chrome — skip for now, link it later in Settings.');
        track('voice_unsupported', {});
        return;
      }
      rec = new SR();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = function (ev) {
        let text = '';
        for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript + ' ';
        matchTranscript(text);
      };
      rec.onerror = function (ev) {
        stopRec();
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          setStatus('Mic blocked — allow microphone access, or skip for now.');
        } else {
          setStatus("Didn't catch that — tap and try again.");
        }
      };
      rec.onend = function () { if (listening && !done) { try { rec.start(); } catch (e) { stopRec(); } } };
      try { rec.start(); } catch (e) { setStatus('Mic unavailable — skip for now.'); return; }
      listening = true;
      if (orb) orb.classList.add('listening');
      mic.classList.add('listening');
      if (micLabel) micLabel.textContent = 'Listening…';
      setStatus('Read the line above, naturally.');
      track('voice_listen_started', {});
    }
    mic.addEventListener('click', function () { listening ? stopRec() : startRec(); });
    window.__voiceStepEnter = function () {
      if (done) return;
      setStatus(SR ? 'Corbit is waiting to hear you.' : 'Voice needs Safari or Chrome — you can skip this.');
    };
    window.__voiceStepLeave = function () { stopRec(); };
  })();

  // ═══════════ CORBIT GUIDE — the Siri-style helper orb ═══════════
  (function corbitGuide() {
    const guide = document.getElementById('corbitGuide');
    const bubble = document.getElementById('cgBubble');
    const textEl = document.getElementById('cgText');
    const orb = document.getElementById('cgOrb');
    if (!guide || !bubble || !orb) return;
    const TIPS = {
      1:  "First name's enough. I handle the rest.",
      2:  "This only tunes how I picture you.",
      4:  "Pick the one that costs you the most right now.",
      9:  "Be honest — I only push where it matters.",
      23: "Pick who you're becoming. I'll hold you to it.",
      24: "Tap the mic, read the line. I'll lock onto your voice.",
      22: "No wrong answer — I calibrate to your level.",
      16: "Every number here came from your answers.",
      0:  "This is the moment. Slide when you mean it.",
      21: "One step through. I'm on the other side.",
    };
    const AUTO_SHOW = [0, 9, 22, 24];
    let typeTimer = null, hideTimer = null, shownFor = {};
    function speak(t) {
      try {
        if (localStorage.getItem('coreCorbitVoice') !== '1' || !window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance(t);
        u.rate = 1.05; u.pitch = 1.1; u.volume = 0.9;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      } catch (e) {}
    }
    function typeInto(t) {
      clearInterval(typeTimer);
      textEl.textContent = '';
      let i = 0;
      typeTimer = setInterval(function () {
        i++;
        textEl.textContent = t.slice(0, i);
        if (i >= t.length) clearInterval(typeTimer);
      }, 16);
    }
    function show(t) {
      clearTimeout(hideTimer);
      bubble.classList.add('on');
      typeInto(t);
      speak(t);
      hideTimer = setTimeout(hide, 6500);
    }
    function hide() { bubble.classList.remove('on'); clearInterval(typeTimer); }
    window.__corbitSay = show;
    orb.addEventListener('click', function () {
      if (bubble.classList.contains('on')) { hide(); return; }
      show(TIPS[state.step] || "I'm here. Keep going — you're close.");
      track('corbit_tapped', { step: state.step });
    });
    window.__corbitOnStep = function (n) {
      hide();
      guide.classList.toggle('hidden', n === 21);   // the portal owns its moment
      if (TIPS[n] === undefined) return;
      if (AUTO_SHOW.indexOf(n) >= 0 && !shownFor[n]) {
        shownFor[n] = true;
        setTimeout(function () { if (state.step === n) show(TIPS[n]); }, 900);
      }
    };
  })();

  // ═══════════ CORE ID — reflective member card (after "Start journey") ═══════════
  (function coreIdCard() {
    const screen = document.getElementById('coreIdScreen');
    if (!screen) return;
    const video = document.getElementById('rcVideo');
    let stream = null;
    function idFromName(name) {
      let h = 5381;
      const s = (name || 'core') + '·' + new Date().getFullYear();
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
      const d = String(h).padStart(12, '0').slice(0, 12);
      return d.slice(0, 4) + '-' + d.slice(4, 8) + '-' + d.slice(8, 12);
    }
    window.__showCoreId = function () {
      const nm = (state.name || 'CORE MEMBER').toUpperCase();
      const nameEl = document.getElementById('rcName');
      const idEl = document.getElementById('rcId');
      const dateEl = document.getElementById('rcSince');
      if (nameEl) nameEl.textContent = nm;
      if (idEl) idEl.textContent = idFromName(state.name);
      if (dateEl) dateEl.textContent = 'MEMBER SINCE ' + new Date().toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }).toUpperCase();
      screen.classList.add('on');
      track('core_id_shown', {});
      if (window.__corbitSay) setTimeout(function () { window.__corbitSay('Sealed in steel. This is you now.'); }, 1400);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && video) {
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
          .then(function (s) { stream = s; video.srcObject = s; screen.classList.remove('no-cam'); })
          .catch(function () { screen.classList.add('no-cam'); });
      } else {
        screen.classList.add('no-cam');
      }
    };
    const enterBtn = document.getElementById('rcEnter');
    if (enterBtn) enterBtn.addEventListener('click', function () {
      if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} stream = null; }
      track('core_id_continue', {});
      if (typeof window.connectAccount === 'function') window.connectAccount('card');
      else finishOnboarding(true);
    });
  })();
'''
t = patch(t, 'trial:mega-js',
    '  setTimeout(maybeShowHint, 8000);',
    '  setTimeout(maybeShowHint, 8000);\n' + MEGA_JS,
    marker='freshStartGuard')

# -- i18n title tags --
for key, old in {
    'trial.t0':  '<h1 class="title">This only<br/><span class="g">works if you mean it.</span></h1>',
    'trial.t1':  '<h1 class="title">What should we<br/><span class="g">call you?</span></h1>',
    'trial.t2':  '<h1 class="title">Which profile<br/><span class="g">fits you?</span></h1>',
    'trial.t4':  '<h1 class="title">What are you<br/><span class="g">tackling first?</span></h1>',
    'trial.t9':  '<h1 class="title">When it gets hard,<br/><span class="g">what\'s this really for?</span></h1>',
    'trial.t23': '<h1 class="title">Who do you<br/><span class="g">want to become?</span></h1>',
    'trial.t22': '<h1 class="title">How committed<br/><span class="g">are you?</span></h1>',
}.items():
    t = patch(t, 'trial:i18n-' + key, old,
              old.replace('<h1 class="title">', '<h1 class="title" data-i18n-html="%s">' % key))

open(TRIAL, 'w').write(t)

# ═══════════════════════ 01-index.html ═══════════════════════
x = open(INDEX).read()

x = patch(x, 'index:i18n-include',
    '<script src="_lib/analytics.js" defer></script>',
    '<script src="_lib/analytics.js" defer></script>\n  <script src="_lib/core-i18n.js"></script>',
    marker='core-i18n.js')

x = patch(x, 'index:globe-btn',
    '''        <button class="signin" id="signinBtn" aria-label="Sign in">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
          </svg>
        </button>''',
    '''        <div style="display:flex; align-items:center; gap:10px;">
          <button class="signin" id="langBtn" aria-label="Change language">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path d="M3 12h18M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9z"/>
            </svg>
          </button>
          <button class="signin" id="signinBtn" aria-label="Sign in">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
            </svg>
          </button>
        </div>''',
    marker='id="langBtn"')

x = patch(x, 'index:hero-i18n',
    '<h1>Become<br/><span class="g">your core.</span></h1>',
    '<h1 data-i18n-html="index.hero">Become<br/><span class="g">your core.</span></h1>')

x = patch(x, 'index:tap-i18n',
    '<span class="tap-text">Tap anywhere to continue</span>',
    '<span class="tap-text" data-i18n="index.tap">Tap anywhere to continue</span>')

x = re.sub(r'<p class="legal">By continuing',
           '<p class="legal" data-i18n-html="index.legal">By continuing', x, count=1) \
    if 'data-i18n-html="index.legal"' not in x else x
applied.append('index:legal-i18n')

x = patch(x, 'index:route-corbit',
    "setTimeout(function () { window.location.href = '07-trial.html#enter'; }, reduce ? 150 : 600);",
    "// Corbit introduces itself between the launch screen and the trial.\n    setTimeout(function () { window.location.href = '02-corbit.html'; }, reduce ? 150 : 600);",
    marker="'02-corbit.html'")

x = patch(x, 'index:click-guards',
    '''  document.addEventListener('click', function (e) {
    if (e.target.closest('#signinBtn')) return;  // avatar still goes to sign-in
    if (e.target.closest('a')) return;           // legal links open normally
    startJourney();
  });''',
    '''  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element) || !e.target.isConnected) return; // detached/re-rendered nodes
    if (e.target.closest('#signinBtn')) return;  // avatar still goes to sign-in
    if (e.target.closest('#langBtn')) return;    // globe opens the language sheet
    if (e.target.closest('#langSheet')) return;  // taps inside the sheet stay in the sheet
    if (e.target.closest('a')) return;           // legal links open normally
    startJourney();
  });''',
    marker="closest('#langSheet')")

LANG_SHEET = '''
    <!-- ── Language sheet — globe button opens; whole app follows coreLang ── -->
    <div class="lang-sheet" id="langSheet" aria-hidden="true">
      <div class="ls-back" id="lsBack"></div>
      <div class="ls-panel" role="dialog" aria-label="Choose language">
        <div class="ls-grab" aria-hidden="true"></div>
        <div class="ls-title">Language</div>
        <div class="ls-list" id="lsList"></div>
      </div>
    </div>
    <style>
      .lang-sheet { position:absolute; inset:0; z-index:50; pointer-events:none; }
      .ls-back { position:absolute; inset:0; background:rgba(0,0,0,0.55);
        -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
        opacity:0; transition:opacity .3s ease; }
      .ls-panel { position:absolute; left:10px; right:10px; bottom:10px;
        border-radius:28px; padding:14px 16px calc(env(safe-area-inset-bottom, 0px) + 18px);
        background:linear-gradient(180deg, rgba(24,26,32,0.97), rgba(10,11,14,0.98));
        border:1px solid rgba(214,219,226,0.16);
        box-shadow:0 1px 0 rgba(255,255,255,0.07) inset, 0 -18px 60px rgba(0,0,0,0.6);
        transform:translateY(calc(100% + 20px));
        transition:transform .42s cubic-bezier(.22,1,.36,1); }
      .lang-sheet.on { pointer-events:auto; }
      .lang-sheet.on .ls-back { opacity:1; }
      .lang-sheet.on .ls-panel { transform:none; }
      .ls-grab { width:36px; height:4px; border-radius:999px; background:rgba(255,255,255,0.22);
        margin:0 auto 12px; }
      .ls-title { font-size:13px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase;
        color:var(--ink-soft); text-align:center; margin-bottom:10px; }
      .ls-list { display:grid; grid-template-columns:1fr 1fr; gap:7px; max-height:330px; overflow-y:auto; }
      .ls-item { display:flex; align-items:center; justify-content:space-between; gap:8px;
        padding:12px 14px; border-radius:14px; border:1px solid rgba(255,255,255,0.07);
        background:rgba(255,255,255,0.035); color:#fff; font-family:inherit; font-size:14px;
        font-weight:600; letter-spacing:-0.1px; cursor:pointer; text-align:left;
        transition:background .2s, border-color .2s, transform .12s; }
      .ls-item:active { transform:scale(0.97); }
      .ls-item.sel { border-color:rgba(226,231,238,0.55); background:rgba(255,255,255,0.09);
        box-shadow:0 0 0 1px rgba(226,231,238,0.25) inset, 0 0 18px rgba(206,212,222,0.10); }
      .ls-item .tick { width:16px; height:16px; opacity:0; }
      .ls-item.sel .tick { opacity:1; }
      .ls-item .tick svg { width:16px; height:16px; stroke:#fff; fill:none; stroke-width:2.6;
        stroke-linecap:round; stroke-linejoin:round; }
    </style>
'''
# insert the sheet just before the frame closes — anchor on the legal <p> block's parent close
x = patch(x, 'index:lang-sheet',
    '''      </div>
    </div>
  </div>

<script>''',
    '''      </div>
    </div>
''' + LANG_SHEET + '''  </div>

<script>''',
    marker='id="langSheet"')

LANG_JS = '''
  // ── Language sheet — powered by _lib/core-i18n.js ──
  (function () {
    var sheet = document.getElementById('langSheet');
    var list = document.getElementById('lsList');
    var btn = document.getElementById('langBtn');
    if (!sheet || !list || !btn || !window.coreI18n) return;
    function render() {
      list.innerHTML = '';
      coreI18n.LANGS.forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ls-item' + (coreI18n.lang === l.code ? ' sel' : '');
        b.innerHTML = '<span>' + l.name + '</span><span class="tick"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-11"/></svg></span>';
        b.addEventListener('click', function (e) {
          // stop here — render() detaches this node, and a detached target
          // would fall through the document tap-anywhere handler
          e.stopPropagation();
          coreI18n.set(l.code);
          track('lang_changed', { lang: l.code });
          render();
          setTimeout(close, 260);
        });
        list.appendChild(b);
      });
    }
    function open() { render(); sheet.classList.add('on'); sheet.setAttribute('aria-hidden', 'false'); }
    function close() { sheet.classList.remove('on'); sheet.setAttribute('aria-hidden', 'true'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(); });
    document.getElementById('lsBack').addEventListener('click', close);
  })();
'''
x = patch(x, 'index:lang-js',
    '''  document.getElementById('signinBtn').addEventListener('click', function () {
    track('index_cta_tapped', { cta: 'sign_in' });
    window.location.href = '04-sign-in.html';
  });''',
    '''  document.getElementById('signinBtn').addEventListener('click', function () {
    track('index_cta_tapped', { cta: 'sign_in' });
    window.location.href = '04-sign-in.html';
  });
''' + LANG_JS,
    marker="coreI18n.LANGS.forEach")

open(INDEX, 'w').write(x)

print('APPLIED :', len(applied))
for a in applied: print('   +', a)
print('SKIPPED :', len(skipped))
for a in skipped: print('   =', a)
print('FAILED  :', len(failed))
for a in failed: print('   !', a)
sys.exit(1 if failed else 0)
