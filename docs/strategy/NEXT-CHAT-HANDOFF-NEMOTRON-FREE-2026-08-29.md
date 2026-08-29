# Next-Chat Handoff — Nemotron Free / Token Ceilings — 2026-08-29

## Auftrag des Folgechats

Übernimm die Game Factory auf dem tatsächlichen aktuellen GitHub- und Notion-Stand und arbeite ausschließlich im Gaming-/Game-Factory-Kontext weiter.

Der nächste Chat soll zuerst den dokumentierten Stand live verifizieren und danach ergebnisoffen entscheiden, wie der Modellvergleich sinnvoll fortgesetzt wird. Nicht automatisch einen weiteren Production-Run starten.

## Repository

`Bartekkk87/game-factory`

Aktueller relevanter Main-Stand nach PR #56:

`c339979eb4cff13bb4ff7c10eee0570956693684`

PR #56 hat umgesetzt:

- rollenabhängige Output-Ceilings
- prompt-basierten fail-closed JSON-Kompatibilitätsmodus für Modelle ohne providerseitiges `response_format`
- Nemotron-Free-Modelle in der Registry
- modellabhängige Timeout-/Capability-Regeln
- explizite Free-Rollen-Pins für den Lumen-Test
- S5-Provenienz-Rebinding nach Registry-Änderung

Verifikation:

- Branch Verifier `33252188281` — SUCCESS
- Trusted PR Selftest Gate `33252189410` — SUCCESS
- exact-main Verifier `33252481657` — SUCCESS

Kanonische neue Findings:

`docs/strategy/NEMOTRON-FREE-ROLE-TOKEN-CEILINGS-FINDINGS-2026-08-29.md`

## Eingefrorener Product Case

Weiterhin `Lumen Current`:

`ideas/lumen-current-openai-reference-retry-2026-08-29.md`

Brief / Owner Contract / Must-Haves / No-Gos / deterministic Verifier / Release Authority dürfen für einen kontrollierten Vergleich nicht still verändert werden.

## Entscheidende Modell-Evidence

### OpenAI Reference

OpenAI Run A hat einen vollständigen Lumen-Build erzeugt:

- Technical PASS
- Product Fidelity PASS
- Playtester 7.1/10
- Kosten ca. `$0.246244`
- Owner Hands-on Product Acceptance weiterhin eigenständig zu bewerten

### GLM nach Probe-Contract-Repair

Production Run `20260829-115640` / Workflow #52:

- Director Attempt 1: 3,591 Output-Tokens
- Director Repair: 2,972 Output-Tokens
- Engineer Build: exakt 12,000 Output-Tokens bei damaligem 12k Ceiling
- Result: `engineer_invalid_output`
- Antwort erkennbar abgeschnitten
- Kosten `$0.012657`

Interpretation: der alte Engineer-12k-Cap war für diesen Build tatsächlich bindend. Das rechtfertigt die neue 65,536-Obergrenze, beweist aber noch keinen GLM Product PASS.

### Nemotron Free Run #53

Workflow `33252485756`, Production Run `20260829-122640`:

Rollen waren vollständig free gepinnt:

- Director: `nvidia/nemotron-3.5-lightning:free`
- Engineer: `nvidia/nemotron-3.5-lightning:free`
- Playtester: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- Auditor: `nvidia/nemotron-3.5-lightning:free`

Ceilings:

- Director 32,768
- Engineer 65,536
- Playtester 32,768
- Auditor 16,384

Result:

- Phase A Director
- nach exakt 360,000 ms `director_transport_timeout`
- keine Completion
- kein Engineer
- kein Game
- kein Playtester/Auditor
- recorded spend `$0`
- estimated Director input 22,316 Tokens
- accounting `incomplete / billing-uncertain` wegen fehlender Provider-Antwort

Runtime-State:

- Commit `2437273`
- `runs/20260829-122640/FAILURE.json`
- `runs/20260829-122640/RUN-EVIDENCE.json`
- Artifact `9714867205`

Wichtig: Das ist kein Qualitäts-Fail von Nemotron. Es ist zunächst ein Transport-/Latency-Fail der Free-Route unter dem aktuellen 360-s-Limit.

## Was der Folgechat zuerst prüfen soll

1. GitHub `main`, PR #56 und exact-main Verifier live gegenlesen.
2. `runtime-state` für `20260829-122640` live lesen.
3. Prüfen, ob der Nemotron-Free-Timeout wahrscheinlich durch Factory-Timeout, Free-Endpunkt-Capacity oder Modell-Latenz verursacht wurde. Keine Ursache erfinden, wenn Evidence fehlt.
4. Die neue Token-Ceiling-Architektur gegen die tatsächlichen Role Calls prüfen: Director 32k, Engineer 65,536, Playtester 32k, Auditor 16k.
5. Bewerten, ob ein weiterer Free-Test sinnvoll ist und welche minimale Änderung dafür notwendig wäre.

## Zu diskutierende Optionen — noch keine Entscheidung

A. Lightning Free mit einem explizit längeren modellabhängigen Transport-Timeout testen.

B. Eine andere kostenlose OpenRouter/NVIDIA-Route für den Director verwenden, während Engineer/Playtester getrennt geroutet bleiben.

C. Nemotron Free als ungeeignet für den großen Director-Prompt markieren und einen anderen günstigen Challenger wählen.

D. Vor einem weiteren Full Production Run einen eng begrenzten Modell-/Transport-Probe durchführen — nur wenn der Owner einen weiteren model-backed Versuch ausdrücklich freigibt.

Die Optionen sind Hypothesen. Der Folgechat soll sie anhand der aktuellen Registry, offiziellen Provider-Capabilities und Run-Evidence bewerten.

## Harte Governance-Grenzen

- Kein automatischer weiterer model-backed Production Run — auch kein Free-Rerun — ohne explizites Owner-Go.
- Kein Paid Run ohne explizite Freigabe.
- Keine automatische Learning-Candidate-Aktivierung oder Promotion.
- Keine Abschwächung von Owner Contract, deterministic Technical Verifier, Product Fidelity Gate, Budget Gate oder Release Authority.
- Historische Failed Runs bleiben unverändert als Evidence erhalten.
- Infrastruktur-/Transport-Erfolg ist nicht gleich Product Quality.
- Ein grüner Verifier allein ist nicht gleich gutes Spiel; Owner Hands-on bleibt relevant.

## Ziel des nächsten Abschnitts

Die nächste belastbare Entscheidung soll lauten:

**Welcher Rollen-/Modell-/Timeout-Pfad liefert den nächsten informationsreichen Vergleich mit möglichst geringen Kosten, ohne die Vergleichsbedingungen oder Governance zu verwässern?**

Erst danach Owner-Freigabe für einen konkreten nächsten Run einholen.