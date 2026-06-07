/**
 * core-sfx.js — tiny synth sound engine for CORE.
 *
 * Pages already call window.coreSfx('chest_burst') etc.; this implements it with
 * the WebAudio API (no audio files). Sounds are short synthesized blips/booms so
 * they cost nothing to ship and never block.
 *
 *   window.coreSfx('coin')          // play a named sound
 *   window.coreSfx.mute(true|false) // toggle (persisted in coreSfxMuted)
 *   window.coreSfx.isMuted()        // boolean
 *
 * Browsers block audio until a user gesture, so the AudioContext is created lazily
 * and resumed on the first pointer/key interaction.
 */
(function () {
  if (window.coreSfx) return; // don't double-install

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;

  function muted() {
    try { return localStorage.getItem("coreSfxMuted") === "1"; } catch (e) { return false; }
  }
  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.22; // keep it gentle
        master.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  // one short oscillator note with an attack/decay envelope
  function tone(opts) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.from || opts.freq || 440, t0);
    if (opts.to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + (opts.dur || 0.15));
    }
    var peak = opts.gain == null ? 0.9 : opts.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.15));
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + (opts.dur || 0.15) + 0.02);
  }

  // filtered white-noise burst (for chest booms / rumble)
  function noise(opts) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var dur = opts.dur || 0.3;
    var buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = opts.filter || "lowpass";
    f.frequency.setValueAtTime(opts.cut || 800, t0);
    if (opts.cutTo) f.frequency.exponentialRampToValueAtTime(opts.cutTo, t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(opts.gain == null ? 0.5 : opts.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur);
  }

  // ascending arpeggio (sparkle / reveal)
  function arp(freqs, step, type, gain) {
    freqs.forEach(function (fr, i) {
      tone({ freq: fr, type: type || "triangle", dur: 0.16, gain: gain == null ? 0.6 : gain, delay: i * (step || 0.07) });
    });
  }

  var SOUNDS = {
    click: function () { tone({ freq: 320, type: "square", dur: 0.05, gain: 0.4 }); },
    tick: function () { tone({ freq: 660, type: "square", dur: 0.04, gain: 0.35 }); },
    confirm: function () { arp([523, 784], 0.08, "triangle", 0.6); },
    coin: function () { tone({ freq: 880, to: 1320, type: "square", dur: 0.12, gain: 0.5 }); tone({ freq: 1320, type: "square", dur: 0.09, gain: 0.4, delay: 0.06 }); },
    reward: function () { arp([523, 659, 784, 1046], 0.07, "triangle", 0.6); },
    equip: function () { tone({ freq: 440, to: 880, type: "sine", dur: 0.18, gain: 0.5 }); },
    buy: function () { tone({ freq: 700, to: 1050, type: "square", dur: 0.1, gain: 0.45 }); },
    error: function () { tone({ freq: 200, to: 120, type: "sawtooth", dur: 0.22, gain: 0.4 }); },
    warn: function () { tone({ freq: 300, to: 200, type: "triangle", dur: 0.18, gain: 0.4 }); },
    chime: function () { arp([784, 1046, 1318], 0.09, "sine", 0.5); },

    // chest cinematic
    chest_shake: function () { noise({ dur: 0.22, filter: "bandpass", cut: 400, gain: 0.25 }); },
    chest_leak: function () { tone({ from: 300, to: 760, type: "sine", dur: 0.7, gain: 0.35 }); },
    chest_burst: function () { noise({ dur: 0.45, filter: "lowpass", cut: 1600, cutTo: 200, gain: 0.6 }); tone({ from: 400, to: 90, type: "sawtooth", dur: 0.4, gain: 0.4 }); },
    chest_burst_rare: function () { noise({ dur: 0.6, filter: "lowpass", cut: 2400, cutTo: 200, gain: 0.7 }); tone({ from: 520, to: 80, type: "sawtooth", dur: 0.55, gain: 0.5 }); arp([784, 1046, 1318, 1568], 0.06, "triangle", 0.5); },
    chest_reveal: function () { arp([659, 880, 1175, 1568], 0.08, "triangle", 0.55); },
    chest_open: function () { arp([659, 880, 1175, 1568], 0.08, "triangle", 0.55); },
    chest_collect: function () { SOUNDS.coin(); arp([880, 1175], 0.06, "square", 0.4); },
    // per-reward reveal pops used by the dedicated opener (28-chest.html)
    reward_pop: function () { tone({ freq: 740, to: 1040, type: "triangle", dur: 0.12, gain: 0.45 }); },
    reward_pop_hero: function () { arp([784, 1175, 1568], 0.06, "triangle", 0.6); },
    rare_drop: function () { arp([523, 784, 1046, 1568, 2093], 0.07, "triangle", 0.6); },

    // progression
    rankup: function () { arp([523, 659, 784, 1046, 1318], 0.08, "triangle", 0.6); },
    levelup: function () { arp([659, 988, 1318], 0.07, "sine", 0.55); },
    // quest claims — distinct from generic reward/confirm
    quest_complete: function () { arp([659, 988, 1318, 1760], 0.07, "triangle", 0.6); },
    boss_win: function () { noise({ dur: 0.5, filter: "lowpass", cut: 1400, cutTo: 200, gain: 0.5 }); tone({ from: 220, to: 110, type: "sawtooth", dur: 0.5, gain: 0.4 }); arp([392, 523, 784, 1046, 1568], 0.09, "triangle", 0.55); },

    // streak (26-streak.html)
    streak_grow: function () { arp([659, 988], 0.09, "triangle", 0.55); },
    streak_lost: function () { tone({ from: 440, to: 277, type: "sine", dur: 0.45, gain: 0.4 }); tone({ freq: 277, type: "sine", dur: 0.3, gain: 0.32, delay: 0.16 }); },
    streak_restore: function () { arp([523, 784, 1046], 0.08, "sine", 0.5); },
    streak_reward: function () { arp([659, 880, 1175], 0.07, "triangle", 0.5); },
    streak_milestone_big: function () { arp([523, 659, 784, 1046, 1318], 0.08, "triangle", 0.6); tone({ from: 196, to: 175, type: "sine", dur: 0.6, gain: 0.3 }); },
    reward_collect: function () { arp([880, 1318], 0.07, "sine", 0.5); }
  };

  function play(name) {
    if (muted() || !ensure()) return;
    var fn = SOUNDS[name];
    try { if (fn) fn(); else SOUNDS.click(); } catch (e) {}
  }
  play.mute = function (on) {
    try { localStorage.setItem("coreSfxMuted", on ? "1" : "0"); } catch (e) {}
  };
  play.isMuted = muted;
  play.muted = muted; // alias — Settings' Sounds row reads coreSfx.muted()
  play.list = function () { return Object.keys(SOUNDS); };

  window.coreSfx = play;

  // Auto-wire any <button data-sfx-toggle> into a mute toggle (icon + click).
  var SPK_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
  function wireToggles() {
    var els = document.querySelectorAll("[data-sfx-toggle]");
    Array.prototype.forEach.call(els, function (el) {
      if (el._sfxWired) return; el._sfxWired = true;
      function paint() {
        var m = muted();
        el.innerHTML = m ? SPK_OFF : SPK_ON;
        el.setAttribute("aria-pressed", m ? "true" : "false");
        el.setAttribute("aria-label", m ? "Unmute sound" : "Mute sound");
        el.style.opacity = m ? "0.55" : "1";
      }
      paint();
      el.addEventListener("click", function () {
        var willMute = !muted();
        play.mute(willMute);
        if (!willMute) play("tick"); // confirm tone when turning sound back on
        paint();
        sfxToast(willMute ? "Sound off" : "Sound on");
      });
    });
  }
  if (document.readyState !== "loading") wireToggles();
  else document.addEventListener("DOMContentLoaded", wireToggles);

  // Unlock the audio context on the first interaction (autoplay policy).
  function unlock() {
    ensure();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  }
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
})();
