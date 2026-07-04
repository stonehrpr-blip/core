h=open('07-trial.html').read()
import re

# 1. Remove old typewriter overlay (co-* elements) — keep only new corb-* system
# Find <div class="corbit-overlay" id="corbitOverlay"> ... </div> (the old typewriter overlay)
# and ALL its contents up to the closing </div> before the new <!-- ═══ CORBIT SYSTEM ═══ -->
old_overlay_start = h.find('<!-- === CORBIT INTRO OVERLAY === -->')
if old_overlay_start > 0:
    # Find the matching closing </div> for corbit-overlay
    # Then find the old typewriter <script> block that follows
    old_script_start = h.find('\n<script>\n(function(){\n  if(location.hash!==\'#enter\')', old_overlay_start)
    if old_script_start < 0:
        old_script_start = h.find('<script>\n(function(){\n  if(location.hash', old_overlay_start)
    if old_script_start > 0 and old_script_start < 10000:
        old_script_end = h.find('</script>', old_script_start) + 9
        h = h[:old_overlay_start] + h[old_script_end:]
        print('Stripped old typewriter overlay + script')
    else:
        print('Typewriter script not found at expected location, keeping all')

# 2. Also remove any duplicate corbOrbWrap ID (the old co-quantum id)
h = h.replace('id="corbOrbWrap" class="co-quantum"', 'class="co-quantum old-orb"')

# 3. Remove old duplicate corbit CSS (co- prefix classes from first injection)
# These are the old typewriter overlay CSS at the end of the style block
old_css_start = h.find('/* === Corbit Intro Overlay === */')
if old_css_start > 0:
    old_css_end = h.find('/* ═══════════════════════════════════════════════════', old_css_start)
    if old_css_end < 0:
        old_css_end = h.find('<!-- === Corbit persistent', old_css_start)
    if old_css_end < 0:
        old_css_end = h.find('<!-- ═══════════ CORBIT SYSTEM', old_css_start)
    if old_css_end > 0 and old_css_end < 20000:
        h = h[:old_css_start] + h[old_css_end:]
        print('Stripped old Corbit CSS')
    else:
        print('Old CSS boundary not clean — check manually')
        print('Found old_css_end at:', old_css_end)

# 4. Remove old docked Corbit HTML (qc-* elements)
old_dock_start = h.find('<!-- === Corbit persistent + terminal === -->')
if old_dock_start > 0:
    old_dock_end = h.find('<!-- ═══════════ CORBIT SYSTEM', old_dock_start)
    if old_dock_end > 0:
        h = h[:old_dock_start] + h[old_dock_end:]
        print('Stripped old docked Corbit HTML')

open('07-trial.html','w').write(h)
print('Cleanup complete')
