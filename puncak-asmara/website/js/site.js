/* Puncak Asmara — site interactions (lightweight, no dependencies) */
(function(){
  var nav = document.querySelector('.nav');
  var transparentHero = document.body.classList.contains('has-hero');
  function onScroll(){
    if(!nav) return;
    if(!transparentHero){ nav.classList.add('solid'); return; }
    nav.classList.toggle('solid', window.scrollY > window.innerHeight*0.7);
  }
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

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
})();
