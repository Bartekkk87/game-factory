# Technical Verifier — Independent HUD / Layout Geometry Repair

Stand: 27.08.2026

## Ausgangslage

Step 4 hatte korrekt offengelegt, dass die historische HUD-Fidelity in Titan über generierte Game-Events wie `hud_layout_clear` und `hud_overlap_detected` belegt wurde. Damit konnte das zu prüfende Spiel seine Layout-Qualität selbst behaupten. Diese Evidence war transparent als `generated-game-event-dependent` markiert, aber noch nicht unabhängig gemessen.

Zusätzlich zeigte der Code-Abgleich, dass der Factory-Engine zwar die logische Canvas-Größe (`W/H`) und die CSS-Darstellungsgröße führte, der Assembly-Pfad den intrinsischen Canvas-Zeichenbuffer aber nicht explizit auf diese logische Größe setzte. Für belastbare Geometriemessung müssen logischer Koordinatenraum und intrinsischer Zeichenbuffer konsistent sein.

## Reparatur

Die bestehende Technical-Verifier-/Playwright-Lane wurde erweitert; es wurde **keine neue Control Plane und kein neues Gate** eingeführt.

### 1. Verifier-owned Canvas Geometry Observation

`factory/src/verify/layout-probe.mjs` wird vom Playwright-Harness als Init-Script **vor Generated Game Code** installiert. Der Probe beobachtet reale `CanvasRenderingContext2D`-Zeichenoperationen, insbesondere Text und Rechteck-Geometrie, inklusive aktuellem Transform und Browser-Textmetriken.

Aus den aktuell gerenderten Zeichenoperationen werden begrenzte HUD-Kandidaten abgeleitet. Der Verifier prüft anschließend unabhängig:

- tatsächliche Bounds der beobachteten HUD-Regionen,
- paarweise Überlappung,
- Verlassen des Canvas,
- Mindestanzahl beobachtbarer HUD-Regionen,
- optionalen aktiven Gameplay-/Score-Fortschritt.

Evidence Source: `harness-observed-canvas-geometry` / `playwright-canvas-draw-observation-v1`.

### 2. Neuer Evidence Kind `layout_no_overlap`

Owner-Requirement-Traceability und Product Fidelity unterstützen `layout_no_overlap` als harness-observed Evidence.

Historische/Legacy-Probes werden fail-safe normalisiert:

- `event + hud_layout_clear` -> `layout_no_overlap`
- `event_absent + hud_overlap_detected` -> `layout_no_overlap`

Das ursprüngliche Event bleibt nur als `legacyEventType` für Provenance sichtbar. Es besitzt **keine PASS-Autorität** mehr.

### 3. Canvas-Koordinaten korrigiert

Der vertrauenswürdige Assembly-Pfad setzt nach Engine-Konstruktion `canvas.width = W` und `canvas.height = H`, bevor Generated Game Scenes zeichnen. Dadurch stimmen logischer und intrinsischer Koordinatenraum für die Messung überein.

### 4. Director Contract

Der Director darf für HUD-/Layout-Anforderungen künftig `layout_no_overlap` verwenden. Er wird ausdrücklich angewiesen, `hud_layout_clear` und `hud_overlap_detected` nicht als Layout-Evidence zu erzeugen.

## Adversarial Proof

Der neue deterministische Browser-Test `factory/src/verify/test-layout-geometry.mjs` beweist drei Fälle:

1. **Spoof:** Ein Game emittiert `hud_layout_clear`, liefert aber keine unabhängige Layout-Evidence -> **Fidelity FAIL**.
2. **Green:** Drei tatsächlich gerenderte HUD-Panels liegen getrennt innerhalb des Canvas -> **Fidelity PASS**.
3. **Broken:** Zwei tatsächlich gerenderte HUD-Panels überlappen -> **Fidelity FAIL**.

Zusätzlich wird verifiziert, dass der assembled Canvas logische und intrinsische Abmessungen konsistent führt.

## Regression

Getesteter Code-SHA: `df322fcdeee800314c5195e21fce42af1c274c9f`

Full Verifier Selftest: GitHub Actions `33109985486` — **SUCCESS**.

Bestanden haben einschließlich der neuen Prüfung:

- Owner Contract / Titan Step 3,
- Controlled Learning / Trigger / Orchestration,
- Production Agents / Art Direction,
- Product Fidelity Hardening,
- Independent HUD Geometry Verifier,
- Causality / Visual Activity,
- Good-/Bad-Product Fixtures,
- Publishing Gates.

## Bewusste Grenze

Dies ist **echte geometrische Canvas-Evidence**, aber kein Computer-Vision-System und kein allgemeines Urteil über ästhetische Qualität. HUD-Kandidaten werden konservativ aus gerendertem Text in Screen-Edge-Zonen und zugehörigen gerenderten Rechtecken erkannt. Rein grafische, semantisch nicht identifizierbare HUD-Elemente ohne beobachtbare Text-/Rechteck-Geometrie werden dadurch nicht als vollständig verstanden behauptet.

Der geschlossene Failure Mode ist präzise: **Ein generiertes Spiel kann HUD-Overlap-Fidelity nicht mehr durch selbst erzeugte `hud_layout_clear`-/`hud_overlap_detected`-Events bestehen.**

Keine Learning-Candidate-Promotion. Keine Candidate-Aktivierung. Kein neuer bezahlter Game-/Titan-Run.

Claim Boundary bleibt: **EVIDENCE-DRIVEN CONTROLLED IMPROVEMENT**.
