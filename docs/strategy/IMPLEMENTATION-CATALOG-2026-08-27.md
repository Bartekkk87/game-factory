# Game Factory — Umsetzungskatalog (27.08.2026)

## Verifizierter Fortschritt

**L1 Control Kernel — DONE**  
**L2 Model / Provider Layer — DONE**  
**L3 Verification & Evidence — DONE**  
**L4 Production Agents — NEXT / P0**

Verifizierter Runtime-Stand auf `main`:

`52e843bba72bd3fe83ea2b34475a32e2076dcdee`

Vollständiger Verifier-Selftest auf diesem Stand:

GitHub Actions Run `33046180562` — **SUCCESS**

**Kein bezahlter Titan Canary #3 wurde gestartet.**

Der Bottom-up-Katalog bleibt unverändert verbindlich: zuerst die unteren Schichten belastbar machen, danach Top-down gegenprüfen. L1–L3 sind jetzt abgeschlossen; deshalb ist L4 der aktive Arbeitsblock.

---

### L1 — Control Kernel / Fundament — DONE

**Behalten:** GitHub Actions als Execution Runtime, Git als Source of Truth, Fail-Closed, Candidate-SHA, serialisierte Produktionsläufe, Fresh-Rebuild bei Stagnation und Rollback nach schlechtem Polish.

Umgesetzt und verifiziert:

- echtes Kosten-Tracking;
- Kosten pro Modell, Rolle, Operation und Attempt;
- Budgetprüfung und Reservierung vor bezahlten LLM-Aufrufen;
- klare maximale Repair-/Polish-/Rebuild-Budgets;
- Release-PASS als deterministische Maschinenlogik;
- einheitliches Evidence-Schema pro Run.

Verbindliche Release-Regel:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

**Priorität: P0 — abgeschlossen.**

---

### L2 — Model & Provider Layer — DONE

Umgesetzt und verifiziert:

- Role Router;
- Modellregister;
- Preisregister;
- Capability-Register;
- Context-/Output-Limits als Modellmetadaten;
- Provideradapter;
- keine stillen Providerwechsel;
- Modell und Version in der Usage-/Evidence-Kette;
- Provider-/Capability-Prüfung vor Transport.

Vorbereitete OpenAI-Referenzmatrix:

```text
Director
   → gpt-5.6-terra

Engineer Build / Repair / Rebuild / Polish
   → gpt-5.6-terra

Playtester
   → gpt-5.6-terra

Audit Summary
   → gpt-5.6-luna

Release Verdict
   → kein LLM
```

DeepSeek bleibt **priorisierter Benchmark-Kandidat**, aber noch kein Produktionsstandard. Kein unbenchmarked DeepSeek für den nächsten Referenz-Titan.

**Priorität: P0-Basis abgeschlossen; Benchmark P2.**

---

### L3 — Verification & Evidence — DONE

Die Factory kann jetzt nicht nur beweisen:

> „Das Spiel läuft.“

sondern deterministisch prüfen:

> „Gibt es belastbare Evidence dafür, dass die bestellten Must-Haves umgesetzt und No-Gos nicht verletzt wurden?“

Die drei Gates sind getrennt:

**Technical**  
→ Runtime, Errors, Assets, Start, Interaktion, FPS, Visual Smoke.

**Product Fidelity**  
→ maschinenlesbare Owner-IDs + Acceptance/Probe-Traceability + Runtime-Evidence.

**Experience**  
→ visuelle/spielerische Bewertung durch den Playtester; bleibt getrennt von der deterministischen Fidelity-Authority.

Umgesetzt und verifiziert:

- immutable Owner Contract;
- stabile `MH-xx` Must-Have-IDs und `NG-xx` No-Go-IDs;
- deterministischer Contract-Hash;
- Director-Traceability von Owner-ID zu Acceptance-/Probe-ID;
- fester Verifier-Seed;
- gespeicherte deterministische Input-Sequenz;
- `start -> early -> mid -> end` Telemetrie;
- Interaktivitätsnachweis über die Early-Timeline statt nur Mid -> End;
- bounded Gameplay-/Mechanic-Events;
- Engine-Events für Score-/State-Änderungen;
- deterministisches Product Fidelity PASS/FAIL;
- Integration von Technical + Fidelity in Build/Repair/Polish;
- Green- und Broken-Fixtures für neue Hard Checks;
- echter assemblierten Runtime-Selftest: echter Gameplay-Wertwechsel PASS, dekoratives Fake-Upgrade FAIL.

L3-Verifikation:

- Run `33045193747` — SUCCESS
- Run `33045457760` — SUCCESS
- Run `33045637678` — SUCCESS
- Run `33045912220` — SUCCESS
- Run `33046078946` — SUCCESS
- final `main` Run `33046180562` — SUCCESS

**Priorität: P0 — abgeschlossen.**

---

### L4 — Production Agents — NEXT / P0

Jetzt werden Director, Engineer, Playtester und Auditor vollständig an die bereits verifizierten Contracts angebunden.

#### Director

Der Director ist bereits teilweise im L3-Traceability-Pfad verankert:

```text
Owner Idea
↓
Owner Contract
↓
Director GDD
↓
Acceptance / Probe IDs
```

Offen in L4 ist vor allem die saubere Weitergabe dieses Contracts an die nachfolgenden Agenten.

#### Engineer

P0 jetzt:

- stale Prompt-Text entfernen: kein `random input / ~15 seconds` mehr;
- deterministischen Verifier-Ablauf korrekt beschreiben;
- immutable Owner Contract explizit in Build / Repair / Rebuild / Polish geben;
- relevante Acceptance-/Probe-Mappings explizit mitgeben;
- bei produktspezifischen Anforderungen die bounded Runtime-Event-Schnittstelle nutzen;
- bereits bewährte Repair-/Fresh-Rebuild-/Polish-Rollback-Logik erhalten.

P1 später:

```text
Engine API Contract
+ relevante Codebereiche
+ Fehler
→ bounded patch
```

Full Rebuild bleibt ausdrücklich erhalten, wenn die Architektur selbst defekt ist.

#### Playtester

Große P0-Änderung:

Er bekommt künftig:

- Screenshots;
- objektive Metriken;
- Telemetrie;
- Gameplay-/Mechanic-Events;
- Owner Contract;
- kompaktes GDD;
- Acceptance-/Probe-Mapping.

Er liefert getrennt:

```text
Independent Product Fidelity Review: PASS / FAIL
Experience: 0–10
```

Die deterministische Product-Fidelity-Logik bleibt die Maschinen-Authority. Der Playtester darf sie nicht überschreiben; er liefert eine unabhängige Produktperspektive.

#### Auditor

Der Auditor darf erklären:

> „Warum ist dieses Game freigabereif oder warum nicht?“

Er entscheidet aber **nicht**, ob ein Kandidat freigabereif ist.

Sein Digest soll Technical Gate, deterministische Fidelity, Playtester-Fidelity, Experience, Budget und Release Verdict konsistent zusammenfassen.

**Priorität: P0.**

---

### L5 — Owner / Product Layer

Ganz oben bleibt die Owner-Rolle klein:

```text
Idee eingeben
↓
Factory arbeitet
↓
Preview
↓
Approve / Reject
```

Später für eine echte Plattform kommen:

- Briefing UI;
- Login;
- Projekte;
- Versionshistorie;
- Quoten;
- Credits/Billing;
- sichere Sandboxes;
- Source Export.

**Das ist derzeit ausdrücklich nicht P0.**

Kein SaaS-Frontend vor einem belastbaren Produktionskern und mehreren erfolgreichen Genres.

---

## Top-down-Gegencheck

Nach L4 muss dieselbe Kette vollständig erhalten bleiben:

```text
Owner sagt:
„Titan + Salvage + Upgrades + Risk/Reward“

↓ Immutable Owner Contract

Director:
„So wird daraus ein Game.“

↓ Acceptance / Probe IDs

Engineer:
„Ich implementiere genau diese Anforderungen.“

↓ Code + bounded Runtime Events

Verifier:
„Ich habe deterministische Evidence für diese Anforderungen.“

↓ Technical PASS + Product Fidelity PASS

Playtester:
„Das verlangte Produkt ist erkennbar vorhanden
und Experience >= 6.5.“

↓ Budget PASS

Deterministic Release Gate:
PASS / FAIL

↓
Owner erhält Preview
```

**Kein Teil darf unterwegs die ursprüngliche Owner-Anforderung verlieren.**

### Aktuelle Reihenfolge

**1. L1 Control Kernel — DONE**  
**2. L2 Model / Provider Layer — DONE**  
**3. L3 Verification & Evidence — DONE**  
**4. L4 Production Agents — JETZT**  
**5. Full Selftest nach L4 vollständig grün**  
**6. Top-down-Integritätscheck**  
**7. Genau ein Titan Core: Reforged Canary #3**

Wenn Canary #3 scheitert:

`Fehler klassifizieren -> Plattform reparieren -> vollständiger Selftest -> erst dann über einen weiteren bezahlten Lauf entscheiden.`
