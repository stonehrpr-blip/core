// dash-ambient.js — living canvas scene system for CORE dashboard
(function () {
  if (typeof window === 'undefined') return;
  if (window.dashAmbient) return;

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
  var W = 390, H = 844;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ── Palettes ────────────────────────────────────────────────────────────────
  var GRADIENTS = {
    sunrise:   'linear-gradient(180deg,#120304 0%,#2e0c04 22%,#6b2808 46%,#02020A 100%)',
    day:       'linear-gradient(180deg,#020c1e 0%,#04183a 30%,#031226 60%,#02020A 100%)',
    afternoon: 'linear-gradient(180deg,#080305 0%,#1b0904 24%,#2c1006 48%,#02020A 100%)',
    sunset:    'linear-gradient(180deg,#080114 0%,#1c041e 24%,#380814 48%,#02020A 100%)',
    night:     'linear-gradient(180deg,#000006 0%,#01010c 38%,#02020A 100%)',
  };
  var AURORA = {
    sunrise:   { a:'#FF8C42', b:'#FFB067' },
    day:       { a:'#0A84FF', b:'#2F8FFF' },
    afternoon: { a:'#FF7A45', b:'#FFC857' },
    sunset:    { a:'#FF6B7E', b:'#9F8FFF' },
    night:     { a:'#7BC4FF', b:'#0A84FF' },
  };
  var DEMO_HOUR = { sunrise:6.5, day:12, afternoon:17, sunset:19, night:23 };
  var WMO = { 0:'clear',1:'clear',2:'cloudy',3:'cloudy',45:'fog',48:'fog',51:'rain',53:'rain',55:'rain',61:'rain',63:'rain',65:'rain',71:'snow',73:'snow',75:'snow',77:'snow',80:'rain',81:'rain',82:'rain',85:'snow',86:'snow',95:'rain',96:'rain',99:'rain' };

  // ── State ───────────────────────────────────────────────────────────────────
  function getP(n){ try{ var m=location.search.match(new RegExp('[?&]'+n+'=([^&]+')); return m?m[1]:null; }catch(e){ return null; } }
  function hourNow(){ var n=new Date(); return n.getHours()+n.getMinutes()/60; }
  function timeFromHour(h){ if(h>=5&&h<8)return'sunrise'; if(h>=8&&h<16)return'day'; if(h>=16&&h<18)return'afternoon'; if(h>=18&&h<20)return'sunset'; return'night'; }

  var forcedT = getP('time');
  var currentTime    = (forcedT && GRADIENTS[forcedT]) ? forcedT : timeFromHour(hourNow());
  var currentWeather = getP('weather') || 'clear';

  var bgEl, auroraEl, canvas, ctx, rafId, t = 0;
  // particles
  var clouds=[], birds=[], stars=[], shots=[], rain=[], snow=[], ripples=[];

  function celestialHour(){ return forcedT ? (DEMO_HOUR[currentTime]||12) : hourNow(); }

  // ── Particle init ───────────────────────────────────────────────────────────
  function initParticles(){
    clouds=[]; birds=[]; stars=[]; shots=[]; rain=[]; snow=[]; ripples=[];

    // Birds (not at night)
    if(currentTime!=='night'){
      var dir = currentTime==='sunset' ? -1 : 1;
      for(var i=0;i<4;i++) birds.push({
        x: dir>0 ? -50-i*160 : W+50+i*160,
        y: 52+i*17+Math.random()*22,
        spd: dir*(0.32+Math.random()*0.26),
        ph: Math.random()*Math.PI*2,
        sz: 3.8+Math.random()*2.2
      });
    }

    // Clouds
    var cc = currentTime==='night' ? 0 : (currentWeather==='cloudy'||currentWeather==='rain') ? 8 : 4;
    for(var i=0;i<cc;i++) clouds.push({
      x: Math.random()*(W+100)-50,
      y: 30+Math.random()*140,
      w: 60+Math.random()*90,
      h: 16+Math.random()*20,
      spd: 0.045+Math.random()*0.085,
      op: (currentWeather==='cloudy'||currentWeather==='rain') ? 0.3+Math.random()*0.28 : 0.09+Math.random()*0.13
    });

    // Stars (night + sunset)
    if(currentTime==='night'||currentTime==='sunset'){
      var cnt = currentTime==='night' ? 90 : 45;
      for(var i=0;i<cnt;i++) stars.push({
        x:Math.random()*W, y:Math.random()*(H*0.62),
        r:0.4+Math.random()*1.4,
        ph:Math.random()*Math.PI*2, spd:0.4+Math.random()*1.2,
        blue:Math.random()<0.25
      });
    }

    // Rain
    if(currentWeather==='rain'){
      for(var i=0;i<130;i++) rain.push({
        x:Math.random()*(W+30), y:Math.random()*H,
        len:10+Math.random()*22, spd:6+Math.random()*9,
        op:0.15+Math.random()*0.32
      });
    }

    // Snow
    if(currentWeather==='snow'){
      for(var i=0;i<75;i++) snow.push({
        x:Math.random()*W, y:Math.random()*H,
        r:0.9+Math.random()*2.1, spd:0.35+Math.random()*1.05,
        ph:Math.random()*Math.PI*2, amp:0.22+Math.random()*0.52
      });
    }
  }

  // ── Draw helpers ─────────────────────────────────────────────────────────────

  function drawCelestial(h){
    if(currentTime==='night'){
      var hn = h<5 ? h+24 : h;
      var p = Math.max(0,Math.min(1,(hn-20)/9));
      var mx=55+p*280, my=115-Math.sin(p*Math.PI)*72;
      // glow
      var g=ctx.createRadialGradient(mx,my,0,mx,my,46);
      g.addColorStop(0,'rgba(175,215,255,0.17)'); g.addColorStop(1,'rgba(175,215,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(mx,my,46,0,Math.PI*2); ctx.fill();
      // body
      ctx.fillStyle='#EEF4FF'; ctx.beginPath(); ctx.arc(mx,my,14.5,0,Math.PI*2); ctx.fill();
      // shadow crescent
      ctx.fillStyle='#01010c'; ctx.beginPath(); ctx.arc(mx+4,my-2,11.5,0,Math.PI*2); ctx.fill();

    } else if(currentTime==='sunrise'){
      var p=Math.max(0,Math.min(1,(h-5)/3));
      var sx=W/2, sy=H*0.60-p*H*0.30;
      // horizon glow band
      var hg=ctx.createLinearGradient(0,sy-20,0,sy+80);
      hg.addColorStop(0,'rgba(255,120,40,0.28)'); hg.addColorStop(1,'rgba(255,60,10,0)');
      ctx.fillStyle=hg; ctx.fillRect(0,sy-20,W,100);
      // outer glow
      var g=ctx.createRadialGradient(sx,sy,0,sx,sy,95);
      g.addColorStop(0,'rgba(255,190,80,0.38)'); g.addColorStop(0.45,'rgba(255,90,40,0.16)'); g.addColorStop(1,'rgba(255,40,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,95,0,Math.PI*2); ctx.fill();
      // disc
      ctx.globalAlpha=Math.min(1,p*2.2+0.15);
      ctx.fillStyle='#FFD070'; ctx.beginPath(); ctx.arc(sx,sy,17-p*3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;

    } else if(currentTime==='day'){
      var p=Math.max(0,Math.min(1,(h-8)/8));
      var sx=70+p*250, sy=138-Math.sin(p*Math.PI)*78;
      var g=ctx.createRadialGradient(sx,sy,0,sx,sy,58);
      g.addColorStop(0,'rgba(255,255,200,0.26)'); g.addColorStop(1,'rgba(255,255,150,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,58,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFFDE7'; ctx.beginPath(); ctx.arc(sx,sy,12,0,Math.PI*2); ctx.fill();

    } else if(currentTime==='afternoon'){
      var p=Math.max(0,Math.min(1,(h-16)/2));
      var sx=310-p*72, sy=185+p*95;
      var g=ctx.createRadialGradient(sx,sy,0,sx,sy,74);
      g.addColorStop(0,'rgba(255,188,60,0.40)'); g.addColorStop(1,'rgba(255,128,28,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,74,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFCB5A'; ctx.beginPath(); ctx.arc(sx,sy,15,0,Math.PI*2); ctx.fill();

    } else if(currentTime==='sunset'){
      var p=Math.max(0,Math.min(1,(h-18)/2));
      var sx=235-p*95, sy=268+p*135;
      // horizon blaze
      var hg=ctx.createLinearGradient(0,sy-30,0,sy+90);
      hg.addColorStop(0,'rgba(255,90,30,0.30)'); hg.addColorStop(1,'rgba(180,20,50,0)');
      ctx.fillStyle=hg; ctx.fillRect(0,sy-30,W,120);
      // outer corona
      var g=ctx.createRadialGradient(sx,sy,0,sx,sy,115);
      g.addColorStop(0,'rgba(255,115,38,0.44)'); g.addColorStop(0.44,'rgba(255,55,38,0.18)'); g.addColorStop(1,'rgba(160,18,55,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,115,0,Math.PI*2); ctx.fill();
      // disc
      var rr=255, gg=Math.round(138-p*80), bb=Math.round(28-p*22);
      ctx.fillStyle='rgb('+rr+','+gg+','+bb+')';
      ctx.beginPath(); ctx.arc(sx,sy,18+p*7,0,Math.PI*2); ctx.fill();
    }
  }

  function drawMist(){
    // Sunrise: warm horizontal haze bands
    for(var i=0;i<4;i++){
      var my=H*0.50+i*38+Math.sin(t*0.008+i)*4;
      var g=ctx.createLinearGradient(0,my-10,0,my+10);
      var op=0.07-i*0.014;
      g.addColorStop(0,'rgba(255,215,170,0)');
      g.addColorStop(0.5,'rgba(255,215,170,'+op+')');
      g.addColorStop(1,'rgba(255,215,170,0)');
      ctx.fillStyle=g; ctx.fillRect(0,my-10,W,20);
    }
  }

  function drawCloud(c){
    var cx=c.x, cy=c.y, cw=c.w, ch=c.h;
    // Cloud tint by time
    var cr=238,cg=244,cb=255;
    if(currentTime==='sunset'||currentTime==='afternoon'){cr=255;cg=198;cb=168;}
    else if(currentTime==='sunrise'){cr=255;cg=218;cb=185;}
    if(currentWeather==='cloudy'||currentWeather==='rain'){cr=175;cg=180;cb=196;}

    ctx.save(); ctx.globalAlpha=c.op;
    var puffs=[[cx,cy,cw*0.56,ch*0.64],[cx-cw*0.26,cy+ch*0.1,cw*0.38,ch*0.48],[cx+cw*0.27,cy+ch*0.12,cw*0.42,ch*0.5]];
    puffs.forEach(function(p){
      var g=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],Math.max(p[2],p[3]));
      g.addColorStop(0,'rgba('+cr+','+cg+','+cb+',0.9)');
      g.addColorStop(1,'rgba('+cr+','+cg+','+cb+',0)');
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.ellipse(p[0],p[1],p[2],p[3],0,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  function drawBird(b){
    var wing=Math.sin(t*0.054+b.ph)*0.68+0.35;
    var w=wing*b.sz;
    ctx.strokeStyle=(currentTime==='sunset')?'rgba(12,4,22,0.80)':'rgba(28,28,48,0.56)';
    ctx.lineWidth=1.1; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(b.x,b.y);
    ctx.bezierCurveTo(b.x-b.sz*0.72,b.y-w*0.88, b.x-b.sz*1.95,b.y-w, b.x-b.sz*2.8,b.y+w*0.08);
    ctx.moveTo(b.x,b.y);
    ctx.bezierCurveTo(b.x+b.sz*0.72,b.y-w*0.88, b.x+b.sz*1.95,b.y-w, b.x+b.sz*2.8,b.y+w*0.08);
    ctx.stroke();
  }

  function drawStars(alpha){
    stars.forEach(function(s){
      var op=(Math.sin(t*s.spd*0.02+s.ph)*0.32+0.52)*alpha;
      op=Math.max(0,Math.min(1,op));
      ctx.globalAlpha=op;
      ctx.fillStyle=s.blue?'#C4DEFF':'#FFFFFF';
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      if(s.r>1.1&&op>0.55){
        ctx.globalAlpha=op*0.3;
        ctx.strokeStyle=s.blue?'#C4DEFF':'#FFFFFF'; ctx.lineWidth=0.5;
        var fl=s.r*3.5;
        ctx.beginPath(); ctx.moveTo(s.x-fl,s.y); ctx.lineTo(s.x+fl,s.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.x,s.y-fl); ctx.lineTo(s.x,s.y+fl); ctx.stroke();
      }
    });
    ctx.globalAlpha=1;
  }

  function updateShots(){
    if(!REDUCED && currentTime==='night' && Math.random()<0.0028 && shots.length<2){
      shots.push({ x:Math.random()*240+10, y:12+Math.random()*115, vx:3.8+Math.random()*4.4, vy:1.2+Math.random()*2.1, len:35+Math.random()*28, life:0, max:36+Math.random()*26 });
    }
    shots=shots.filter(function(s){
      s.x+=s.vx; s.y+=s.vy; s.life++;
      var p=s.life/s.max;
      var alpha=(p<0.25?p/0.25:1-(p-0.25)/0.75)*0.90;
      alpha=Math.max(0,alpha);
      var g=ctx.createLinearGradient(s.x-s.len,s.y-s.len*0.38,s.x,s.y);
      g.addColorStop(0,'rgba(255,255,255,0)');
      g.addColorStop(0.65,'rgba(255,255,255,'+alpha*0.45+')');
      g.addColorStop(1,'rgba(255,255,255,'+alpha+')');
      ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(s.x-s.len,s.y-s.len*0.38); ctx.lineTo(s.x,s.y); ctx.stroke();
      return s.life<s.max;
    });
  }

  function drawRain(){
    var dx=0.135, dy=0.991; // angle: ~8° from vertical
    rain.forEach(function(d){
      ctx.strokeStyle='rgba(168,213,255,'+d.op+')'; ctx.lineWidth=0.72;
      ctx.beginPath();
      ctx.moveTo(d.x,d.y); ctx.lineTo(d.x+dx*d.len, d.y+dy*d.len);
      ctx.stroke();
      d.x+=dx*d.spd*0.36; d.y+=dy*d.spd;
      if(d.y>H){
        if(d.y>H-55) ripples.push({ x:d.x, y:H-28+Math.random()*14, r:0, maxR:3.5+Math.random()*3.5, life:0, max:20 });
        d.y=-d.len-4; d.x=Math.random()*(W+30);
      }
      if(d.x>W+20) d.x=-20;
    });
    // ripples
    ripples=ripples.filter(function(r){
      r.r=r.maxR*(r.life/r.max); r.life++;
      ctx.strokeStyle='rgba(168,213,255,'+(1-r.life/r.max)*0.26+')'; ctx.lineWidth=0.55;
      ctx.beginPath(); ctx.ellipse(r.x,r.y,r.r,r.r*0.25,0,0,Math.PI*2); ctx.stroke();
      return r.life<r.max;
    });
    // overcast tint
    var g=ctx.createLinearGradient(0,0,0,H*0.52);
    g.addColorStop(0,'rgba(12,12,26,0.42)'); g.addColorStop(1,'rgba(12,12,26,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H*0.52);
  }

  function drawSnow(){
    snow.forEach(function(f){
      f.y+=f.spd; f.x+=Math.sin(t*0.012+f.ph)*f.amp;
      if(f.y>H+4){ f.y=-4; f.x=Math.random()*W; }
      if(f.x<-4) f.x=W+4; if(f.x>W+4) f.x=-4;
      ctx.globalAlpha=0.62+Math.sin(t*0.017+f.ph)*0.14;
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
  }

  function drawOvercast(){
    var g=ctx.createLinearGradient(0,0,0,H*0.56);
    g.addColorStop(0,'rgba(16,14,28,0.44)'); g.addColorStop(1,'rgba(16,14,28,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H*0.56);
  }

  // ── RAF loop ─────────────────────────────────────────────────────────────────
  function loop(){
    t++;
    ctx.clearRect(0,0,W,H);
    ctx.save(); ctx.scale(DPR,DPR);

    var h=celestialHour();

    // 1. Celestial body
    drawCelestial(h);

    // 2. Overcast tint
    if(currentWeather==='rain'||currentWeather==='cloudy') drawOvercast();

    // 3. Mist
    if(currentTime==='sunrise') drawMist();

    // 4. Clouds
    clouds.forEach(function(c){ c.x+=c.spd; if(c.x>W+c.w+20) c.x=-(c.w+20); drawCloud(c); });

    // 5. Stars
    if(currentTime==='night'){ drawStars(1); updateShots(); }
    else if(currentTime==='sunset') drawStars(0.5);

    // 6. Birds
    birds.forEach(function(b){
      b.x+=b.spd;
      if(b.spd>0&&b.x>W+55) b.x=-55;
      if(b.spd<0&&b.x<-55) b.x=W+55;
      drawBird(b);
    });

    // 7. Weather
    if(currentWeather==='rain') drawRain();
    else if(currentWeather==='snow') drawSnow();

    ctx.restore();
    rafId=requestAnimationFrame(loop);
  }

  function staticFrame(){
    ctx.save(); ctx.scale(DPR,DPR);
    drawCelestial(celestialHour());
    clouds.forEach(function(c){ drawCloud(c); });
    if(currentTime==='night') drawStars(1);
    ctx.restore();
  }

  // ── CSS / glyph ──────────────────────────────────────────────────────────────
  function applyCSS(){
    if(bgEl) bgEl.style.background=GRADIENTS[currentTime]||GRADIENTS.night;
    if(auroraEl){
      var ac=AURORA[currentTime]||AURORA.night;
      auroraEl.style.setProperty('--aurora-a',ac.a);
      auroraEl.style.setProperty('--aurora-b',ac.b);
    }
    var glyphEl=document.getElementById('dashWeatherGlyph');
    if(glyphEl){
      var wg={clear:'',cloudy:'☁️',rain:'🌧️',snow:'❄️',fog:'🌫️'}[currentWeather];
      if(!wg) wg={sunrise:'🌅',day:'☀️',afternoon:'🌤️',sunset:'🌇',night:'🌙'}[currentTime]||'☀️';
      glyphEl.textContent=wg;
    }
    try{ window.dispatchEvent(new CustomEvent('dashAmbientChange',{detail:{time:currentTime,weather:currentWeather}})); }catch(e){}
  }

  // ── Weather fetch ─────────────────────────────────────────────────────────────
  function fetchWeather(){
    if(getP('weather')) return;
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function(pos){
      var lat=pos.coords.latitude.toFixed(4), lon=pos.coords.longitude.toFixed(4);
      fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=weather_code')
        .then(function(r){ return r.json(); })
        .then(function(d){ currentWeather=WMO[(d.current&&d.current.weather_code)||0]||'clear'; initParticles(); applyCSS(); })
        .catch(function(){});
    },function(){},{timeout:6000});
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  function init(){
    bgEl    = document.getElementById('ambBg');
    auroraEl= document.getElementById('ambAurora');

    // Clear old DOM stars/overlays
    ['ambStars','ambOverlay'].forEach(function(id){ var el=document.getElementById(id); if(el) el.innerHTML=''; });

    // Scene canvas inside #ambCelestial
    var host=document.getElementById('ambCelestial');
    if(!host) return;
    host.innerHTML='';
    canvas=document.createElement('canvas');
    canvas.width=W*DPR; canvas.height=H*DPR;
    canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    host.appendChild(canvas);
    ctx=canvas.getContext('2d');

    // Re-read URL params (page might have been loaded with them)
    var fp=getP('time'), fw=getP('weather');
    if(fp&&GRADIENTS[fp]) currentTime=fp;
    if(fw) currentWeather=fw;

    initParticles();
    applyCSS();

    if(!REDUCED){ rafId=requestAnimationFrame(loop); }
    else{ staticFrame(); }

    fetchWeather();

    setInterval(function(){
      if(!getP('time')){
        var nt=timeFromHour(hourNow());
        if(nt!==currentTime){ currentTime=nt; initParticles(); applyCSS(); }
      }
    },60000);
  }

  window.dashAmbient={
    init:init,
    getTime:function(){ return currentTime; },
    getWeather:function(){ return currentWeather; }
  };
})();
