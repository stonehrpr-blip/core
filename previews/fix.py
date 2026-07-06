h=open('07-trial.html').read()

# Add trial page entrance animation — smooth fade-in from black
entrance_css='''
  /* Trial entrance — smooth reveal */
  body.entering-trial .phone{animation:trialReveal .5s .1s cubic-bezier(.22,1,.36,1) both}
  @keyframes trialReveal{0%{opacity:0;transform:scale(.97);filter:brightness(1.3)}100%{opacity:1;transform:scale(1);filter:brightness(1)}}
  body.entering-trial .topbar{animation:fadeIn .35s .25s ease both}
  body.entering-trial .step.on .title{animation:fadeIn .4s .3s ease both}
  body.entering-trial .step.on .copy{animation:fadeIn .4s .4s ease both}
  @keyframes fadeIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}
'''
h=h.replace('</style>', entrance_css + '\n</style>')

# Add entrance trigger JS when ?fresh=1
entrance_js='''
  /* Trial entrance animation on fresh start */
  if(/[?&]fresh=1/.test(location.search)){
    document.body.classList.add('entering-trial');
    setTimeout(function(){document.body.classList.remove('entering-trial')},800);
  }
'''
h=h.replace('// Onboarding gate', entrance_js + '\n  // Onboarding gate')

# Also remove the #enter from the redirect URL since Corbit is gone
h_idx=open('01-index.html').read()
h_idx=h_idx.replace('07-trial.html?fresh=1#enter','07-trial.html?fresh=1')
open('01-index.html','w').write(h_idx)

open('07-trial.html','w').write(h)
print('Trial entrance animation + clean redirect (no #enter)')
