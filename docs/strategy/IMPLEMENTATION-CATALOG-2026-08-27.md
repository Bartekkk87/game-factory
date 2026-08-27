# Game Factory — Umsetzungskatalog (27.08.2026)

## Verifizierter Fortschritt

**L1 Control Kernel — DONE**  
**L2 Model / Provider Layer — DONE**  
**L3 Verification & Evidence — DONE**  
**L4 Production Agents — DONE / P0 VERIFIED**

Finaler L4-Code-Head vor Dokumentationscommits:

`ce0d061cbad98e8f2f5948e0910fd300dbd0b573`

Vollständiger Verifier-Selftest mit explizit ausgeführtem L4-Integritätstest:

GitHub Actions Run `33050867522` — **SUCCESS**

Top-down-Integritätscheck:

`Owner Idea -> Owner Contract -> Director IDs -> Engineer -> Verifier Evidence -> Product Fidelity PASS -> Playtester Fidelity Review -> Experience >= 6.5 -> Budget PASS -> deterministic Release Gate -> Owner Preview`

Ergebnis: **PASS**.

**Kein bezahlter Titan Canary #3 wurde gestartet.**

Detaillierter L4-Nachweis: `docs/strategy/HARDENING-STATUS-2026-08-27-L4.md`.

---

## L1 — Control Kernel / Fundament — DONE

Verifiziert:

- echtes modellbezogenes Kosten-Tracking;
- Kosten pro Rolle / Modell / Operation / Attempt;
- Budgetreservierung vor bezahlten Calls;
- Repair-/Polish-/Fresh-Rebuild-Budgets;
- deterministisches Release Gate unabhängig vom Auditor;
- einheitliches Run-Evidence-Schema.

Verbindliche Release-Regel:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

---

## L2 — Model & Provider Layer — DONE

Verifiziert:

- fail-closed Role Router;
- Provider Registry;
- Modell-, Capability- und Preisregister;
- kein stiller Cross-Provider-Fallback;
- Provider-/Capability-Prüfung vor Transport;
- Modell und Version in Usage/Evidence.

Referenzmatrix:

```text
Director                         -> gpt-5.6-terra
Engineer Build/Repair/Rebuild   -> gpt-5.6-terra
Engineer Polish                  -> gpt-5.6-terra
Playtester                       -> gpt-5.6-terra
Auditor                          -> gpt-5.6-luna
Release Verdict                  -> kein LLM
```

DeepSeek bleibt Benchmark-Lane für später und ist nicht ungeprüft Teil des Referenz-Titan.

---

## L3 — Verification & Evidence — DONE

Verifiziert:

- immutable Owner Contract;
- stabile `MH-xx` Must-Have- und `NG-xx` No-Go-IDs;
- deterministischer Contract-Hash;
- Owner-ID -> Director Acceptance-/Probe-ID Traceability;
- deterministischer Verifier-Seed und gespeicherte Input-Sequenz;
- Telemetrie `start -> early -> mid -> end`;
- Early-Interaktivitätsnachweis;
- bounded Runtime-/Mechanic-Events;
- deterministisches Product Fidelity PASS/FAIL;
- Technical + Fidelity in Build/Repair/Polish verbindlich;
- Green-/Broken-Fixtures und echter Runtime-End-to-End-Test.

Finaler L3-`main`-Run: `33046180562` — **SUCCESS**.

---

## L4 — Production Agents — DONE / P0 VERIFIED

### Engineer

- stale `random input / ~15 seconds` Verifier-Text entfernt;
- Prompt auf festen deterministischen Seed/Input-Ablauf und `start -> early -> mid -> end` ausgerichtet;
- bounded `game.event(type, data)` Evidence für produktspezifische Mechaniken verlangt;
- immutable Owner Contract explizit in Build / Repair / Rebuild / Polish;
- Acceptance-/Probe-Mapping explizit im Engineer-Kontext;
- fail-closed bei fehlendem Owner Contract oder instabiler Traceability;
- Repair / Fresh Rebuild / Verified Polish Rollback erhalten.

### Playtester

Er erhält:

- Owner Contract;
- kompaktes GDD;
- Acceptance-/Probe Mapping;
- Telemetrie;
- bounded Runtime Events;
- Screenshots;
- objektive Metriken;
- deterministisches Product-Fidelity-Ergebnis.

Er liefert getrennt:

```text
Independent Product Fidelity Review
Experience Score + Kritik
```

Die unabhängige Playtester-Fidelity bleibt advisory. Die deterministische Product Fidelity bleibt Maschinen-Authority.

### Auditor

- strikt advisory only;
- kein eigener Release-`PASS/FAIL`;
- Assessment `CONSISTENT` / `CONCERNS` plus Findings/Summary;
- ein eventuell geliefertes `verdict`-Feld wird entfernt;
- Digest enthält Technical, deterministische Fidelity, Playtester Fidelity, Experience, Budget und deterministic Release Gate;
- Release-Entscheidung bleibt ausschließlich bei `releaseFor(...)`.

### CI / Referenzroute

- Änderungen unter `factory/prompts/**` triggern den vollständigen Verifier-Selftest;
- `node factory/src/roles/test-production-agents.mjs` ist expliziter Workflow-Schritt;
- Routertests pinnen Terra für Director/Engineer/Playtester und Luna für Auditor;
- Release Verdict nutzt kein LLM.

Finaler L4-Komplettlauf: `33050867522` — **SUCCESS**.

---

## Top-down-Gegencheck — PASS

```text
Owner Idea
-> Immutable Owner Contract
-> Director Acceptance / Probe IDs
-> Engineer
-> Deterministic Verifier Evidence
-> Technical PASS + Product Fidelity PASS
-> Playtester Independent Fidelity Review
-> Experience >= 6.5
-> Budget PASS
-> Deterministic Release Gate
-> Owner Preview
```

**Keine Owner-Anforderung verschwindet unterwegs.**

Der Draft/Owner-Preview-Pfad wird erst nach bestandenem deterministischem Release Gate geöffnet. Der Production-Workflow committed Draft und Evidence, erstellt das Review-Issue und Pages veröffentlicht die Preview auf `main`.

---

## L5 — Owner / Product Layer

Owner-Rolle bleibt bewusst klein:

```text
Idee eingeben
-> Factory arbeitet
-> Preview
-> Approve / Reject
```

SaaS-/Frontend-Themen bleiben außerhalb P0, bis der Produktionskern mehrere belastbare Genres bewiesen hat.

---

## Nächste Reihenfolge

1. L1 Control Kernel — **DONE**
2. L2 Model / Provider Layer — **DONE**
3. L3 Verification & Evidence — **DONE**
4. L4 Production Agents / P0 — **DONE**
5. Branch sauber nach `main` übernehmen und `main`-Selftest grün bestätigen
6. Danach ist genau ein `Titan Core: Reforged` Canary #3 technisch zulässig — **in dieser Closure-Arbeit nicht starten**
7. Nach Referenz-PASS: zweites Genre und P1/P2 Optimierungen

Wenn Canary #3 später scheitert:

`Fehler klassifizieren -> Plattform reparieren -> vollständiger Selftest -> erst dann über einen weiteren bezahlten Lauf entscheiden.`
