/* core-ai.js
 * ──────────────────────────────────────────────────────────────────────
 * Shared OpenAI bridge for CORE. Every AI feature in the app
 * (coach chat, plan generation, proof-of-work vision, habit adjustment)
 * routes through this single module so we have:
 *   • One place for the API key (user-supplied, stored locally)
 *   • One place for system-prompt assembly (profile + recent activity)
 *   • One place for streaming / cost / rate handling
 *
 * SECURITY: This is a preview-only architecture. In production this code
 * would call a CORE-owned proxy server that holds the key. For the preview
 * we let users paste their own OpenAI key — it never leaves their browser
 * (stored under coreAIKey in localStorage) and only goes to api.openai.com.
 *
 * Fallback: if no key is set, every helper returns a scripted stub response
 * so the app still feels alive in demo mode.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.coreAI) return;

  const KEY_LS         = 'coreAIKey';
  const MODEL_TEXT     = 'gpt-4o-mini';     // fast + cheap for most chat
  const MODEL_VISION   = 'gpt-4o-mini';     // also handles images
  const MODEL_PLAN     = 'gpt-4o';          // higher quality for plan generation
  const API_BASE       = 'https://api.openai.com/v1';
  const TIMEOUT_MS     = 60000;

  // Provider is chosen from the key prefix so users can paste a paid OpenAI key
  // (sk-…) OR a free Groq key (gsk_…) — both speak the same chat-completions API.
  function providerFor(key) {
    if (/^gsk_/.test(key || '')) return {
      name: 'Groq', base: 'https://api.groq.com/openai/v1',
      text: 'llama-3.3-70b-versatile', vision: 'llama-3.3-70b-versatile', plan: 'llama-3.3-70b-versatile'
    };
    return { name: 'OpenAI', base: API_BASE, text: MODEL_TEXT, vision: MODEL_VISION, plan: MODEL_PLAN };
  }

  function getKey() {
    try { return localStorage.getItem(KEY_LS) || ''; } catch (e) { return ''; }
  }
  function setKey(k) {
    try {
      const v = (k || '').trim();
      if (v) localStorage.setItem(KEY_LS, v);
      else   localStorage.removeItem(KEY_LS);
    } catch (e) {}
  }
  function hasKey() { return !!getKey(); }

  // ── Profile snapshot for system prompts ──────────────────────────────
  function profile() {
    try {
      const t = JSON.parse(localStorage.getItem('coreOnboardTrial') || '{}');
      const s = JSON.parse(localStorage.getItem('coreState.v1') || '{}');
      const deep = JSON.parse(localStorage.getItem('coreDeepProfile') || '{}');
      return {
        name: t.name || 'User',
        profile: t.profile,
        goal: t.goal,
        blocker: t.blocker,
        tone: t.tone || 'balanced',
        checkin: t.checkin,
        routine: t.routine,
        stats: s.stats,
        streak: s.streak,
        xp: s.xp || 0,
        deep
      };
    } catch (e) { return {}; }
  }

  function recentActivity(limit = 8) {
    try {
      const log = JSON.parse(localStorage.getItem('coreActivityLog.v1') || '[]');
      return Array.isArray(log) ? log.slice(-limit) : [];
    } catch (e) { return []; }
  }

  // ── System prompt assembly ───────────────────────────────────────────
  function systemPrompt(role) {
    const p = profile();
    const tone = (p.tone || 'balanced').toLowerCase();
    const TONE_DIRECTIVE = {
      gentle:   'Warm, patient, kind. Validate first, then suggest.',
      balanced: 'Honest, fair, no fluff. Straight but supportive.',
      direct:   'Sharp, to the point. No softeners. Get to action.',
      drill:    'Tough love. Push hard when they slip. No excuses.'
    }[tone] || 'Honest, fair.';
    const baseRole = (role === 'plan')
      ? 'You are an elite life coach generating a structured personal plan.'
      : 'You are CORE — an honest AI life coach. You know the user\'s data and goals.';
    return [
      baseRole,
      `Tone: ${TONE_DIRECTIVE}`,
      `User: ${p.name}. Goal: ${p.goal || '—'}. Blocker: ${p.blocker || '—'}.`,
      p.deep && Object.keys(p.deep).length ? `Deep profile: ${JSON.stringify(p.deep).slice(0, 800)}` : '',
      p.streak ? `Streak: ${p.streak.days || 0} days. XP: ${p.xp || 0}.` : '',
      'Be concise. Use specific numbers when you have them. Never invent stats. If asked for plans, return clear bulleted action items.',
    ].filter(Boolean).join('\n');
  }

  // ── Hosted proxy (your OpenAI key lives on the server, invisible to users) ──
  // Prefers a Cloudflare Worker URL (CORE_CONFIG.AI_PROXY_URL); falls back to a Supabase function.
  function proxyEndpoint() {
    try {
      var c = window.CORE_CONFIG; if (!c) return null;
      if (c.AI_PROXY_URL) return { url: c.AI_PROXY_URL, headers: { 'Content-Type': 'application/json' } };
      if (c.SUPABASE_URL && c.SUPABASE_ANON_KEY) return { url: c.SUPABASE_URL + '/functions/v1/ai',
        headers: { 'Content-Type': 'application/json', 'apikey': c.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + c.SUPABASE_ANON_KEY } };
      return null;
    } catch (e) { return null; }
  }
  function proxyBase() { return proxyEndpoint(); }
  async function proxyCall(payload) {
    const ep = proxyEndpoint(); if (!ep) return null;
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(ep.url, { method: 'POST', headers: ep.headers, body: JSON.stringify(payload), signal: ctl.signal });
      clearTimeout(timer);
      if (!r.ok) return null;
      const j = await r.json();
      return (j && j.reply) ? j.reply : null;
    } catch (e) { clearTimeout(timer); return null; }
  }

  // ── Core chat call ───────────────────────────────────────────────────
  async function chat(messages, opts = {}) {
    // No personal key? Route through the hosted proxy (server holds the key). Else canned fallback.
    if (!hasKey()) {
      const reply = await proxyCall({ type: 'chat', messages: messages, context: opts.context, role: opts.role });
      if (reply) return { ok: true, text: reply, proxied: true };
      return scriptedResponse(messages);
    }
    const pv = providerFor(getKey());
    let model = pv.text;
    if (opts.role === 'plan') model = pv.plan;
    else if (opts.role === 'vision') model = pv.vision;
    else if (opts.model && pv.name === 'OpenAI') model = opts.model;
    const sys = systemPrompt(opts.role);
    const body = {
      model,
      messages: [{ role: 'system', content: sys }, ...messages],
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 600,
    };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(`${pv.base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getKey()
        },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });
      clearTimeout(timer);
      if (!r.ok) {
        const err = await r.text();
        console.warn('[coreAI] HTTP ' + r.status, err);
        return scriptedResponse(messages, `API error ${r.status}`);
      }
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content || '';
      return { ok: true, text, raw: j };
    } catch (e) {
      clearTimeout(timer);
      console.warn('[coreAI] fetch failed', e);
      return scriptedResponse(messages, e.message || 'network');
    }
  }

  // ── Vision (image input for proof-of-work) ───────────────────────────
  // image: { dataUrl } or { url }
  async function visionCheck(taskTitle, image, opts = {}) {
    if (!hasKey()) {
      const reply = await proxyCall({ type: 'vision', image: image.dataUrl || image.url,
        prompt: 'Task: "' + taskTitle + '". ' + (opts.prompt || 'Give one short, specific, encouraging tip on this photo.') });
      if (reply) return { ok: true, verdict: 'review', confidence: 0.6, text: reply, proxied: true };
      return { ok: false, fallback: true, verdict: 'review', confidence: 0, text: 'AI vision unavailable — manual review.' };
    }
    const userContent = [
      { type: 'text', text: `Task: "${taskTitle}". User uploaded this photo as proof of completion. ` +
          `Reply with strict JSON only: {"verdict":"pass|fail|review","confidence":0.0-1.0,"reason":"..."}. ` +
          `Be conservative — if unsure say "review".` },
      { type: 'image_url', image_url: { url: image.dataUrl || image.url, detail: 'low' } }
    ];
    const r = await chat([{ role: 'user', content: userContent }],
      { model: MODEL_VISION, temperature: 0.2, maxTokens: 200, role: 'vision' });
    if (!r.ok) return { ok: false, verdict: 'review', confidence: 0, text: r.text || 'AI unreachable' };
    try {
      const txt = r.text.replace(/^```json\s*|\s*```$/g, '').trim();
      const j = JSON.parse(txt);
      return { ok: true, verdict: j.verdict || 'review', confidence: +j.confidence || 0, reason: j.reason || '' };
    } catch (e) {
      return { ok: true, verdict: 'review', confidence: 0.5, reason: r.text.slice(0, 200) };
    }
  }

  // ── Plan generator (12mo / 90d / 30d / today) ────────────────────────
  async function generatePlan(deepAnswers) {
    const messages = [{
      role: 'user',
      content:
        'Based on this deep onboarding intake, generate a personal plan. ' +
        'Output strict JSON only: {"analysis":{"strengths":[],"weaknesses":[],"opportunities":[],"risks":[]},' +
        '"year":[{"title":"","when":"month-X","why":""}],' +
        '"quarter":[{"title":"","when":"week-X","why":""}],' +
        '"month":[{"title":"","when":"day-X","why":""}],' +
        '"today":[{"title":"","category":"fitness|mind|money|relationships|learning|health|business|lifestyle","xp":10,"difficulty":1-3}]}.\n\n' +
        'Intake:\n' + JSON.stringify(deepAnswers, null, 2)
    }];
    const r = await chat(messages, { model: MODEL_PLAN, temperature: 0.4, maxTokens: 1800, role: 'plan' });
    if (!r.ok) return { ok: false, error: r.text };
    try {
      const txt = r.text.replace(/^```json\s*|\s*```$/g, '').trim();
      return { ok: true, plan: JSON.parse(txt) };
    } catch (e) {
      return { ok: false, error: 'parse failed', raw: r.text };
    }
  }

  // ── Prompt-enhancement helper ────────────────────────────────────────
  async function enhancePrompt(text) {
    if (!hasKey() || !text) return { ok: false, text };
    const r = await chat([{ role: 'user', content:
      'Rewrite this user message so it\'s clearer, more specific, and easier for an AI to act on. ' +
      'Keep the user\'s intent. Reply with the rewritten message only.\n\n' + text }],
      { temperature: 0.4, maxTokens: 250 });
    return { ok: r.ok, text: r.text || text };
  }

  // ── Scripted fallback when no key is set ─────────────────────────────
  function scriptedResponse(messages, reason) {
    const last = messages.slice().reverse().find(m => m.role === 'user');
    const txt = typeof last?.content === 'string' ? last.content : '(image)';
    const stub = [
      "I can hear you. Let's keep it simple: one small win today. What's the smallest possible step you could take in the next 10 minutes?",
      "That tracks. The number that matters here is the one you keep tomorrow. What can you commit to before bed?",
      "You don't need a new plan — you need to do today's. What's the next item on your list?",
      "Honest answer: the slip pattern usually traces back to one trigger. Which one was it this time?"
    ];
    const pick = stub[Math.abs((txt.length || 1)) % stub.length];
    return { ok: false, fallback: true, text: pick + (reason ? `\n\n_AI is in demo mode${reason ? ' ('+reason+')':''}. Add an OpenAI key in Settings - AI Setup for real responses._` : ''), reason };
  }

  // ── Activity logger (so AI has recent context) ───────────────────────
  function logActivity(kind, data) {
    try {
      const log = JSON.parse(localStorage.getItem('coreActivityLog.v1') || '[]');
      log.push({ kind, data, ts: Date.now() });
      // Trim to last 100 entries
      const trimmed = log.length > 100 ? log.slice(-100) : log;
      localStorage.setItem('coreActivityLog.v1', JSON.stringify(trimmed));
    } catch (e) {}
  }

  // true when AI is available either via the hosted proxy (server key) or a personal key
  function ready() { return hasKey() || !!proxyBase(); }
  function usingProxy() { return !hasKey() && !!proxyBase(); }
  window.coreAI = {
    chat, visionCheck, generatePlan, enhancePrompt,
    profile, recentActivity, systemPrompt, logActivity,
    hasKey, getKey, setKey, ready, usingProxy,
    KEY_LS, MODEL_TEXT, MODEL_VISION, MODEL_PLAN
  };
})();
