# OWNER BRIEF — HARBOR COURIER

## Product Direction

Create a small, complete arcade game called **Harbor Courier**.

The player works as a courier in a coastal harbor town and completes a short delivery run under time pressure.

The game should feel like a coherent small game rather than a technical demo or collection of disconnected mechanics.

## Must-Haves — Hard

- The game must be a top-down delivery arcade game in which the player controls a small courier scooter or delivery vehicle.
- A complete run must require collecting parcels and delivering them to at least three clearly distinct destinations.
- The player must navigate solid street or environment obstacles; route choice must matter rather than allowing the player to drive directly through scenery.
- A visible countdown timer must limit the run, and reaching zero before all required deliveries are complete must produce a clear failure state.
- The current delivery target and delivery progress must be visible during active gameplay.
- Completing all required deliveries before time expires must produce a clear success state.
- After success or failure, the player must be able to start a fresh run without reloading the page.
- HUD information must remain readable and its main information regions must not overlap each other or leave the visible game canvas during normal active gameplay.

## No-Gos — Hard

- No combat, weapons, attacks, damage dealing or enemies that the player is expected to fight.
- No mechs, Titans, combat robots, boss arena or boss-fight structure.
- No crafting, salvage, forge or equipment-upgrade loop.
- No cyberpunk, military or heavy-industrial visual identity.

## Perspective / Presentation

Top-down perspective is an intentional product requirement and is included in the Hard Must-Haves.

Whether the camera is completely fixed, follows the player, or uses another sensible top-down implementation is deliberately open.

## Gameplay Identity

The intended core interaction is:

collect a parcel → identify the destination → navigate through the town → deliver the parcel → continue to the next delivery → complete the required deliveries before time expires.

The central player skill should be movement, navigation and handling time pressure, not combat.

## Visual / Environment Direction

The intended direction is a bright, welcoming coastal harbor town.

Useful visual ideas include colorful buildings, streets, water, docks, boats, greenery or other recognizable harbor/coastal cues.

This section describes product and mood direction. It is not permission to turn every example into a mandatory feature.

## HUD / Readability

The hard HUD obligations are already listed in the Must-Haves: visible time, current delivery information/progress and non-overlapping readable HUD regions.

Exact HUD styling, fonts, colors, panel shapes and screen positions are open design decisions as long as those obligations are satisfied.

## Quality / Experience Target

Target a small but coherent and finished-feeling arcade experience.

The basic objective should become understandable quickly while playing. Movement should feel responsive, state changes should be understandable, and success, failure and restart should feel like parts of one complete game loop.

This is a qualitative product target, not a claim that visual or gameplay quality can be reduced to a single automatic score.

## Deliberately Open Design Space

The Director may decide:

- the exact street and harbor layout,
- the exact destination locations and delivery order,
- whether there are more than three deliveries,
- detailed vehicle handling and speed,
- exact timer duration,
- scoring and optional bonus mechanics,
- decorative props and non-essential NPCs,
- fixed versus following top-down camera behavior,
- exact art style, palette and typography within the stated product direction,
- sound effects and music,
- additional small mechanics that support the delivery loop without contradicting the Hard Must-Haves or Hard No-Gos.

## Unknown / Unspecified

The Owner does not currently specify:

- an exact run duration,
- an exact scoring formula,
- mobile or touch controls,
- localization,
- meta progression between runs,
- mandatory audio content,
- a specific resolution,
- a specific number of decorative NPCs or vehicles.

These details must not be retrospectively treated as Owner requirements.
