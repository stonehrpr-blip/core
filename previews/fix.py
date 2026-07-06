h=open('07-trial.html').read()

# FIX 1: ORDER
h=h.replace('const ORDER = [1, 2, 4, 9, 23, 22, 16, 0, 21];','const ORDER = [1, 2, 24, 4, 9, 23, 22, 16, 0, 21];')

# FIX 3: Skip button
h=h.replace('<span>Processed on-device. Corbit never records or uploads audio.</span>','<span>Processed on-device. Nothing recorded.</span>')
h=h.replace('</div>\n        </div>\n        <style>','</div>\n          <button type="button" class="voice-skip" id="voiceSkip" style="margin-top:8px;width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:rgba(255,255,255,.4);font-family:inherit;font-size:12px;cursor:pointer">Skip for now</button>\n        </div>\n        <style>')

# FIX 4: Skip handler
h=h.replace('if (!line || !mic) return;','if (!line || !mic) return;\n    var skipBtn=document.getElementById(\'voiceSkip\');if(skipBtn) skipBtn.addEventListener(\'click\',function(){if(!done){done=true;stopRec();advance()}});')

# FIX 5: Mouth
h=h.replace('if (orb) orb.classList.add(\'listening\');','if (orb) {orb.classList.add(\'listening\');orb.classList.add(\'speaking\');}')
h=h.replace('if (orb) { orb.classList.remove(\'listening\'); orb.classList.add(\'done\'); }','if (orb) { orb.classList.remove(\'listening\',\'speaking\'); orb.classList.add(\'done\'); }')

# FIX 6: Mouth CSS
h=h.replace('</style>','.corbit-bot.speaking .cb-mouth{animation:cbMouthTalk .3s ease-in-out infinite}@keyframes cbMouthTalk{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.3)}}.corbit-bot.speaking .cb-eye{box-shadow:0 0 14px #fff,0 0 28px rgba(214,230,255,.9)}.corbit-bot.done .cb-mouth{transform:scaleX(1.4) scaleY(.4);border-radius:50%;background:rgba(255,255,255,.15)}\n</style>')

# FIX 7: Line display
h=h.replace("LINE.split(' ').forEach(function (w, i, arr) {","line.textContent='';LINE.split(' ').forEach(function (w, i, arr) {")

# FIX 8: Fallback
h=h.replace('const SR = window.SpeechRecognition || window.webkitSpeechRecognition;','var SR = window.SpeechRecognition || window.webkitSpeechRecognition;if(!SR){if(micLabel) micLabel.textContent=\'Voice not supported — tap Skip\';if(skipBtn) skipBtn.style.color=\'#fff\';if(mic){mic.disabled=true;mic.style.opacity=\'.4\'}return;}')

# FIX 9: Auto-advance
h=h.replace("if (window.coreTrack) coreTrack('corbit_voice_linked', {});","if (window.coreTrack) coreTrack('corbit_voice_linked', {});setTimeout(function(){advance()},1800);")

open('07-trial.html','w').write(h)
print('All 9 Corbit fixes applied')
