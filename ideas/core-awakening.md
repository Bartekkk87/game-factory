# IDEA: Core Awakening (working title)

## Owner pitch
A destroyed Titan AI awakens without memories inside a compact modular salvage mech,
delves into the bodies of fallen machine Titans, tactically dismantles enemies for intact
components, and rebuilds its power and identity until it discovers that it once destroyed
itself to prevent a catastrophe.

## Player fantasy
I am the surviving identity core of a fallen Titan, rebuilding one personal mech and myself
from the machines I defeat. The mech is the character, not a piloted vehicle: the cyan
identity core and base frame persist while external components are replaced.

## Combat promise
READ -> EVADE -> MANIPULATE -> DISMANTLE -> SALVAGE -> DECIDE

Real-time tactical arena combat. Few meaningful enemies expose clear attack intents
(red-orange telegraphs). The player dodges directly, interrupts or redirects attacks,
uses positioning, and targets enemy SUBSYSTEMS.

Defining hook: HOW an enemy is defeated determines what can be salvaged. Destroying a
dangerous weapon first makes the fight safer but destroys that reward; preserving it
requires a harder tactical solution through other subsystems.

## Loot decision (core moment)
Every recovered component creates an immediate three-way decision:
- INSTALL provisionally (visible capability/silhouette/survival consequence now), or
- SECURE as extraction loot, or
- DISMANTLE for emergency repair value.

## Feel & difficulty
Readable real-time tactical action, fair mastery-driven challenge. After failure:
the loss matters, the cause is understandable, one more attempt feels immediately
worthwhile. Fast restart, no debt spiral.

## Visual direction (adapted to factory engine)
Stylized isometric look rendered with the factory micro-engine on the 960x540 canvas
(diamond-grid projection, clean vector shapes - no 3D assets).
Cold teal/steel fallen-Titan interior contrasts with warm amber salvage highlights.
Protagonist cyan identity core stays visually constant. Red-orange attack telegraphs,
visible damage states, large background machinery silhouettes. Readability before detail.

## SCOPE OF THIS BUILD - BOUNDED FIRST PROOF (hard requirement)
Build ONLY the smallest player-facing vertical slice:
1. ONE compact Titan-interior arena room.
2. ONE directly controllable modular mech (WASD/arrows movement, mouse aiming).
3. ONE enemy archetype with clearly telegraphed attacks and targetable subsystems
   (e.g. weapon / locomotion / power core - each with visible damage state and consequences).
4. The core manipulation loop: read intent -> evade or interrupt -> target subsystems ->
   enemy defeated. Weapon subsystem destroyed early = safer fight + no weapon salvage;
   weapon preserved until defeat = harder fight + weapon drops as the component.
5. ONE preserved component drop triggering the three-way decision overlay:
   INSTALL (immediate visible effect, e.g. repaired armor plate appears / new action unlocked),
   SECURE (marked for extraction), DISMANTLE (restores some HP instantly).
6. ONE extraction-versus-deeper prompt after the room (both ends the proof run with a
   distinct outcome screen: EXTRACTED with loot secured vs LOST deeper).
7. Concise HUD (core integrity, subsystem targeting reticle, decision prompts),
   telegraph/salvage/damage VFX and SFX feedback sufficient for the 60-second gate.

First-60-seconds gate: player sees the chamber, controls the cyan-core mech, reads a
telegraphed attack, evades/interrupts it, targets a subsystem, defeats the enemy while
preserving the weapon, makes the three-way decision, sees an immediate visible consequence,
and gets the extract-or-deeper prompt.

EXPLICITLY OUT OF SCOPE: procedural dungeons, economy/shop, multiple enemy types, bosses,
inventory management, crafting, upgrades between runs, narrative scenes (one line of flavor
text maximum), save systems beyond engine defaults.
