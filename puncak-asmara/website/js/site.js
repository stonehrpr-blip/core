/* Puncak Asmara — site interactions (lightweight, no dependencies) */
(function(){
  var nav = document.querySelector('.nav');
  var hero = document.querySelector('.hero');
  var transparentHero = document.body.classList.contains('has-hero') && hero;
  function onScroll(){
    if(!nav) return;
    if(!transparentHero){ nav.classList.add('solid'); return; }
    var threshold = Math.max(hero.offsetHeight - 110, 120);
    nav.classList.toggle('solid', window.scrollY > threshold);
  }
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});

  // mobile menu
  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.mobile-menu');
  if(burger && menu){
    burger.addEventListener('click', function(){ menu.classList.toggle('open'); document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : ''; });
    menu.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ menu.classList.remove('open'); document.body.style.overflow=''; }); });
  }

  // reveal
  var els = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && els.length){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, {threshold:.12});
    els.forEach(function(el){ io.observe(el); });
  } else { els.forEach(function(el){ el.classList.add('in'); }); }

  // count-up on real numbers ([data-count])
  var nums = document.querySelectorAll('[data-count]');
  if('IntersectionObserver' in window && nums.length){
    var nio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        var el=e.target, target=parseFloat(el.getAttribute('data-count')),
            suffix=el.getAttribute('data-suffix')||'', t0=null, dur=1300;
        function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1);
          el.textContent=Math.round(target*(1-Math.pow(1-p,3)))+suffix;
          if(p<1) requestAnimationFrame(step); }
        requestAnimationFrame(step); nio.unobserve(el);
      });
    },{threshold:.5});
    nums.forEach(function(n){ nio.observe(n); });
  }

  // stagger reveals within the same parent (cheap, transform/opacity only)
  els.forEach(function(el){
    var sibs = [].slice.call(el.parentNode.children).filter(function(c){ return c.classList.contains('reveal'); });
    var idx = sibs.indexOf(el);
    if(idx > 0) el.style.transitionDelay = Math.min(idx,7)*0.08 + 's';
  });

  // standalone stateful buttons with data-href (not inside a form)
  document.querySelectorAll('.btn-stateful').forEach(function(btn){
    if(btn.closest('form')) return;
    btn.addEventListener('click', function(e){
      e.preventDefault();
      if(btn.dataset.state) return;
      btn.dataset.state = 'loading';
      setTimeout(function(){
        btn.dataset.state = 'done';
        var href = btn.getAttribute('data-href');
        setTimeout(function(){ if(href){ window.open(href, btn.getAttribute('data-target')||'_self'); } }, 650);
        setTimeout(function(){ btn.removeAttribute('data-state'); }, 2200);
      }, 1000);
    });
  });

  // ---- Modal (enquiry) ----
  function closeOverlays(){ document.querySelectorAll('.modal.open,.lightbox.open').forEach(function(x){ x.classList.remove('open'); }); document.body.style.overflow=''; }
  document.querySelectorAll('[data-modal]').forEach(function(t){
    t.addEventListener('click', function(e){ e.preventDefault(); var m=document.getElementById(t.getAttribute('data-modal')); if(m){ m.classList.add('open'); document.body.style.overflow='hidden'; } });
  });
  document.querySelectorAll('.modal').forEach(function(m){
    m.addEventListener('click', function(e){ if(e.target===m || e.target.classList.contains('modal-close')) closeOverlays(); });
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeOverlays(); });

  // ---- Enquiry forms -> stateful -> WhatsApp pre-filled (any .enquire-form) ----
  document.querySelectorAll('.enquire-form').forEach(function(ef){
    ef.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = ef.querySelector('.btn-stateful'); if(!btn || btn.dataset.state) return;
      var d = new FormData(ef);
      var msg = (d.get('msg')||'').trim();
      var text = "Hi, I'd like to enquire about Puncak Asmara." +
                 "\nName: " + (d.get('name')||'') +
                 "\nContact: " + (d.get('contact')||'') +
                 (msg ? ("\nMessage: " + msg) : '');
      var url = 'https://wa.me/6281585136414?text=' + encodeURIComponent(text);
      btn.dataset.state = 'loading';
      setTimeout(function(){
        btn.dataset.state = 'done';
        setTimeout(function(){ window.open(url, '_blank'); }, 650);
        setTimeout(function(){ btn.removeAttribute('data-state'); ef.reset(); closeOverlays(); }, 2400);
      }, 1000);
    });
  });

  // ---- Lightbox ----
  var lb = document.getElementById('lightbox');
  if(lb){
    var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.lb-cap');
    document.querySelectorAll('.lb-trigger').forEach(function(t){
      t.addEventListener('click', function(){ lbImg.src = t.getAttribute('data-src'); lbCap.textContent = t.getAttribute('data-cap')||''; lb.classList.add('open'); document.body.style.overflow='hidden'; });
    });
    lb.addEventListener('click', function(e){ if(e.target !== lbImg) closeOverlays(); });
  }
})();
