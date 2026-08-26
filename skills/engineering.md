# Engineering — learned directives for the Lead Game Engineer role.
# Post-mortems append rules here. Owner may edit freely.

- Never create an AudioContext before the first user gesture; rely on GF.Sfx lazy initialization (engine handles it).
- Cull every entity outside canvas bounds; unbounded arrays are the #1 cause of late-run FPS collapse.
- Guard all divisions and normalize vectors against zero-length; clamp dt spikes.
- Score must increase from random key mash + clicks within 15 seconds (hard contract requirement). If the natural mechanic needs aim/precision, add a generous fallback: e.g. any pointerdown also nudges score or triggers a productive action early on.
- Use the GDD palette everywhere: background gradient, entities, particles, HUD accents. Inconsistent color use is the most common visual rejection reason.
- Test-think headless: no hover-only affordances, nothing requiring audio cues to understand the game state.
