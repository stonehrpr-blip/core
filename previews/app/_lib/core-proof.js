/* core-proof.js
 * Photo upload + AI vision verification for task completion.
 * Triggered from task list via coreProof.captureFor(task, cb).
 *
 * Uses native file input with capture="environment" on iOS so the
 * camera opens instead of the photo library. Falls back gracefully
 * to library picker on desktop.
 *
 * If coreAI has a key, the image is sent to OpenAI Vision with the task
 * title for verification — verdict pass / fail / review. Without a key,
 * the user just confirms manually.
 *
 * Saves the data-URL to localStorage as coreProofs.{taskId} (capped at
 * 500KB) so the user has a proof history.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.coreProof) return;

  function ensureStyles() {
    if (document.getElementById('core-proof-styles')) return;
    const s = document.createElement('style');
    s.id = 'core-proof-styles';
    s.textContent = `
      .cp-back { position: fixed; inset: 0; background: rgba(0,0,0,0.66); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 9990; opacity: 0; transition: opacity 0.25s; }
      .cp-back.on { opacity: 1; }
      .cp-sheet { position: fixed; left: 0; right: 0; bottom: 0; background: #0a0a14; border-top-left-radius: 24px; border-top-right-radius: 24px; padding: 22px 22px calc(34px + env(safe-area-inset-bottom,0px)); z-index: 9991; transform: translateY(110%); transition: transform 0.36s cubic-bezier(.32,.72,0,1); max-height: 86vh; overflow-y: auto; font-family: 'Chakra Petch', -apple-system, sans-serif; }
      .cp-sheet.on { transform: translateY(0); }
      .cp-handle { width: 36px; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.20); margin: 0 auto 18px; }
      .cp-h { font-size: 19px; font-weight: 700; color: #fff; letter-spacing: -0.3px; margin-bottom: 6px; }
      .cp-sub { font-size: 13px; color: rgba(235,235,245,0.65); margin-bottom: 16px; line-height: 1.4; }
      .cp-task { padding: 14px 16px; background: rgba(255,255,255,0.04); border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
      .cp-task-icon { width: 36px; height: 36px; border-radius: 9px; background: rgba(10,132,255,0.16); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cp-task-icon svg { width: 18px; height: 18px; stroke: #6BA9FF; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .cp-task-title { flex: 1; font-size: 15px; color: #fff; font-weight: 500; letter-spacing: -0.2px; }
      .cp-preview { width: 100%; aspect-ratio: 1; border-radius: 14px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 14px; position: relative; }
      .cp-preview img { width: 100%; height: 100%; object-fit: cover; }
      .cp-placeholder { color: rgba(235,235,245,0.40); font-size: 14px; text-align: center; padding: 28px; }
      .cp-actions { display: flex; flex-direction: column; gap: 8px; }
      .cp-btn { padding: 14px; border-radius: 14px; border: none; font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; letter-spacing: -0.2px; }
      .cp-btn.primary { background: #0A84FF; color: #fff; }
      .cp-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .cp-btn.secondary { background: rgba(255,255,255,0.06); color: #fff; }
      .cp-btn.ghost { background: transparent; color: rgba(235,235,245,0.65); }
      .cp-verdict { padding: 12px 14px; border-radius: 12px; margin-bottom: 14px; display: flex; align-items: flex-start; gap: 10px; }
      .cp-verdict.pass    { background: rgba(48,209,88,0.10); border: 0.5px solid rgba(48,209,88,0.40); color: #30D158; }
      .cp-verdict.fail    { background: rgba(255,69,58,0.10); border: 0.5px solid rgba(255,69,58,0.40); color: #FF453A; }
      .cp-verdict.review  { background: rgba(255,159,10,0.10); border: 0.5px solid rgba(255,159,10,0.40); color: #FF9F0A; }
      .cp-verdict .v-ic { width: 24px; height: 24px; border-radius: 50%; background: currentColor; display:flex; align-items:center; justify-content:center; flex-shrink: 0; }
      .cp-verdict .v-ic svg { width: 14px; height: 14px; stroke: #02020A; fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
      .cp-verdict .v-body { flex: 1; font-size: 13px; line-height: 1.4; }
      .cp-verdict .v-body strong { display: block; margin-bottom: 4px; font-size: 14px; }
      .cp-verdict .v-body p { color: rgba(235,235,245,0.80); }
      .cp-spin { width: 24px; height: 24px; border: 2.5px solid rgba(255,255,255,0.20); border-top-color: #0A84FF; border-radius: 50%; animation: cp-spin 0.8s linear infinite; margin: 0 auto; }
      @keyframes cp-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(s);
  }

  function readDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // Downscale image to fit within maxW x maxH and target ~JPEG quality
  async function compressDataUrl(dataUrl, maxDim = 1024, quality = 0.78) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio; height *= ratio;
        }
        const c = document.createElement('canvas');
        c.width = width | 0; c.height = height | 0;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function captureFor(task, callback) {
    ensureStyles();
    const back = document.createElement('div'); back.className = 'cp-back';
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('on'));

    const sheet = document.createElement('div'); sheet.className = 'cp-sheet';
    sheet.innerHTML = `
      <div class="cp-handle"></div>
      <div class="cp-h">Prove it</div>
      <div class="cp-sub">Snap a photo that shows you did this. AI will check it for you.</div>
      <div class="cp-task">
        <div class="cp-task-icon"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
        <div class="cp-task-title">${escapeHtml(task.title)}</div>
      </div>
      <div class="cp-preview" id="cpPreview"><div class="cp-placeholder">Tap below to add a photo</div></div>
      <input type="file" accept="image/*" capture="environment" id="cpFile" style="display:none;" />
      <div class="cp-actions">
        <button class="cp-btn primary" id="cpPick">Take photo</button>
        <button class="cp-btn secondary" id="cpLib">Choose from library</button>
        <button class="cp-btn ghost" id="cpCancel">Cancel</button>
      </div>
    `;
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('on'));

    let chosenUrl = null;
    let verifying = false;

    function close(result) {
      sheet.classList.remove('on'); back.classList.remove('on');
      setTimeout(() => { sheet.remove(); back.remove(); }, 380);
      if (typeof callback === 'function') callback(result);
    }

    const $file = sheet.querySelector('#cpFile');
    const $preview = sheet.querySelector('#cpPreview');
    sheet.querySelector('#cpPick').addEventListener('click', () => { $file.setAttribute('capture', 'environment'); $file.click(); });
    sheet.querySelector('#cpLib').addEventListener('click',  () => { $file.removeAttribute('capture'); $file.click(); });
    sheet.querySelector('#cpCancel').addEventListener('click', () => close(null));
    back.addEventListener('click', () => { if (!verifying) close(null); });

    $file.addEventListener('change', async () => {
      const f = $file.files?.[0];
      if (!f) return;
      const raw = await readDataUrl(f);
      const small = await compressDataUrl(raw, 1024, 0.78);
      chosenUrl = small;
      $preview.innerHTML = `<img src="${small}" alt="proof" />`;
      // Replace actions with verify button
      sheet.querySelector('.cp-actions').innerHTML = `
        <button class="cp-btn primary" id="cpVerify">${window.coreAI && coreAI.hasKey() ? 'Verify with AI' : 'Submit proof'}</button>
        <button class="cp-btn ghost" id="cpRetake">Retake</button>
      `;
      sheet.querySelector('#cpRetake').addEventListener('click', () => { $file.value = ''; $preview.innerHTML = '<div class="cp-placeholder">Tap below to add a photo</div>'; rebuildActions(); });
      sheet.querySelector('#cpVerify').addEventListener('click', verify);
    });

    function rebuildActions() {
      sheet.querySelector('.cp-actions').innerHTML = `
        <button class="cp-btn primary" id="cpPick">Take photo</button>
        <button class="cp-btn secondary" id="cpLib">Choose from library</button>
        <button class="cp-btn ghost" id="cpCancel">Cancel</button>
      `;
      sheet.querySelector('#cpPick').addEventListener('click', () => { $file.setAttribute('capture', 'environment'); $file.click(); });
      sheet.querySelector('#cpLib').addEventListener('click',  () => { $file.removeAttribute('capture'); $file.click(); });
      sheet.querySelector('#cpCancel').addEventListener('click', () => close(null));
    }

    async function verify() {
      if (!chosenUrl) return;
      verifying = true;
      // Save proof locally regardless
      try {
        const all = JSON.parse(localStorage.getItem('coreProofs.v1') || '{}');
        all[task.id] = { url: chosenUrl, ts: Date.now() };
        // Cap size: drop oldest if > 6 entries
        const keys = Object.keys(all);
        if (keys.length > 6) {
          const sorted = keys.sort((a, b) => all[a].ts - all[b].ts);
          delete all[sorted[0]];
        }
        localStorage.setItem('coreProofs.v1', JSON.stringify(all));
      } catch (e) {}

      const $actions = sheet.querySelector('.cp-actions');
      $actions.innerHTML = '<div class="cp-spin"></div><div style="text-align:center;color:rgba(235,235,245,0.70);font-size:13px;margin-top:12px;">' + (window.coreAI?.hasKey() ? 'AI checking your photo…' : 'Submitting proof…') + '</div>';

      let verdict = 'pass', confidence = 1, reason = 'Manually submitted';
      if (window.coreAI && coreAI.hasKey()) {
        const r = await coreAI.visionCheck(task.title, { dataUrl: chosenUrl });
        verdict = r.verdict || 'review';
        confidence = r.confidence || 0;
        reason = r.reason || '';
      }

      verifying = false;
      const verdictHtml = renderVerdict(verdict, reason, confidence);
      sheet.querySelector('.cp-actions').innerHTML = verdictHtml + `
        <button class="cp-btn primary" id="cpDone">${verdict === 'fail' ? 'Try a different photo' : 'Confirm and complete'}</button>
        <button class="cp-btn ghost"   id="cpDismiss">Dismiss</button>
      `;
      sheet.querySelector('#cpDone').addEventListener('click', () => {
        if (verdict === 'fail') { rebuildActions(); $preview.innerHTML = '<div class="cp-placeholder">Tap below to add a photo</div>'; chosenUrl = null; return; }
        close({ url: chosenUrl, verdict, confidence, reason });
      });
      sheet.querySelector('#cpDismiss').addEventListener('click', () => close(null));
    }

    function renderVerdict(v, reason, conf) {
      const map = {
        pass:   { cls: 'pass',   icon: 'M5 13l4 4L19 7', title: 'Proof accepted', sub: reason || 'Looks like you did it. Task confirmed.' },
        fail:   { cls: 'fail',   icon: 'M6 6l12 12M18 6L6 18', title: "Doesn't match", sub: reason || 'AI couldn\'t see proof of the task. Try a clearer photo.' },
        review: { cls: 'review', icon: 'M12 9v4M12 17h.01', title: 'Needs review', sub: reason || 'AI isn\'t sure. We\'ll log it anyway — you can self-confirm.' },
      };
      const m = map[v] || map.review;
      return `<div class="cp-verdict ${m.cls}">
        <div class="v-ic"><svg viewBox="0 0 24 24"><path d="${m.icon}"/></svg></div>
        <div class="v-body"><strong>${m.title}${conf ? ' · ' + Math.round(conf * 100) + '%' : ''}</strong><p>${escapeHtml(m.sub)}</p></div>
      </div>`;
    }
  }

  function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  window.coreProof = { captureFor };
})();
