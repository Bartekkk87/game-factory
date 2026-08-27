# Game Factory — Umsetzungskatalog (27.08.2026)

## Verifizierter Fortschritt

**L1 Control Kernel — DONE**  
**L2 Model / Provider Layer — DONE**  
**L3 Verification & Evidence — DONE**  
**L4 Production Agents — IMPLEMENTED / FINAL CLOSURE PENDING**

Aktueller L4-Code-Head vor den Dokumentationscommits:

`b19ac17243326235eebdd8c62079c0df667ca46d`

Letzter vollständiger bestehender Verifier-Selftest:

GitHub Actions Run `33049921260` — **SUCCESS**

**Kein bezahlter Titan Canary #3 wurde gestartet.**

Detaillierter L4-Nachweis: `docs/strategy/HARDENING-STATUS-2026-08-27-L4.md`.

---

### L1 — Control Kernel / Fundament — DONE

Umgesetzt und verifiziert:

- echtes modellbezogenes Kosten-Tracking;
- Kosten pro Rolle / Modell / Operation / Attempt;
- Budgetreservierung vor bezahlten Calls;
- Repair-/Polish-/Fresh-Rebuild-Budgets;
- deterministisches Release Gate unabhängig vom Auditor;
- einheitliches Run-Evidence-Schema.

Verbindliche Release-Regel:

`Technical PASS + Product Fidelity PASS + Experience >= 6.5 + Budget PASS`

---

### L2 — Model & Provider Layer — DONE

Umgesetzt und verifiziert:

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

### L3 — Verification & Evidence — DONE

Umgesetzt und verifiziert:

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

### L4 — Production Agents — IMPLEMENTED / FINAL CLOSURE PENDING

Die Produktionsrollen sind jetzt an die L1–L3-Contracts angebunden.

#### Engineer — umgesetzt

- stale `random input / ~15 seconds` Verifier-Text entfernt;
- Prompt auf festen deterministischen Seed/Input-Ablauf und `start -> early -> mid -> end` ausgerichtet;
- bounded `game.event(type, data)` Evidence für produktspezifische Mechaniken verlangt;
- immutable Owner Contract explizit in Build / Repair / Rebuild / Polish;
- Acceptance-/Probe-Mapping explizit im Engineer-Kontext;
- fail-closed bei fehlendem Owner Contract oder instabiler Traceability;
- Repair / Fresh Rebuild / Verified Polish Rollback erhalten.

#### Playtester — umgesetzt

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

#### Auditor — umgesetzt

- strikt advisory only;
- kein eigener Release-`PASS/FAIL` mehr;
- Assessment `CONSISTENT` / `CONCERNS` plus Findings/Summary;
- Digest enthält Technical, deterministische Fidelity, Playtester Fidelity, Experience, Budget und deterministic Release Gate;
- Release-Entscheidung bleibt ausschließlich bei `releaseFor(...)`.

#### CI / Referenzroute — umgesetzt

- Änderungen unter `factory/prompts/**` triggern jetzt ebenfalls den vollständigen Verifier-Selftest;
- Routertests pinnen Terra für Director/Engineer/Playtester und Luna für Auditor;
- Release Verdict nutzt kein LLM.

L4-Verifikationsruns nach relevanten Änderungen:

`33048507658`, `33048635648`, `33048970244`, `33049092906`, `33049183969`, `33049293313`, `33049385943`, `33049485667`, `33049672597`, `33049770257`, `33049921260` — alle **SUCCESS**.

#### Noch offen zur formalen L4-Abnahme

`factory/src/roles/test-production-agents.mjs` wurde als dedizierter L4-Integritätstest angelegt. Er prüft die Rollenverträge, Advisory-Grenzen, Referenzroute und die Owner-Contract-zu-Release-Gate-Kette.

**Dieser Test ist noch nicht als expliziter Ausführungsschritt in `.github/workflows/verify.yml` verdrahtet.** Der bestehende Komplett-Selftest ist grün, aber der neue L4-Test wurde dabei bisher nur syntaktisch geprüft, nicht ausgeführt.

Deshalb nächste Reihenfolge:

1. dedizierten L4-Test als Workflow-Step verdrahten;
2. vollständigen Verifier-Selftest erneut grün bestätigen;
3. Top-down-Integritätscheck durchführen;
4. L4/P0 erst dann auf DONE setzen.

---

### L5 — Owner / Product Layer

Owner-Rolle bleibt bewusst klein:

```text
Idee eingeben
-> Factory arbeitet
-> Preview
-> Approve / Reject
```

SaaS-/Frontend-Themen bleiben außerhalb P0, bis der Produktionskern mehrere belastbare Genres bewiesen hat.

---

## Top-down-Gegencheck — NEXT

Nach finaler L4-Abnahme muss die komplette Kette geprüft werden:

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

**Keine Owner-Anforderung darf unterwegs verschwinden.**

## Verbindliche Reihenfolge ab jetzt

1. L1 Control Kernel — **DONE**
2. L2 Model / Provider Layer — **DONE**
3. L3 Verification & Evidence — **DONE**
4. L4 Production Agents — **IMPLEMENTED; REGRESSION-INTEGRATION PENDING**
5. L4 Integrity Test in Workflow + vollständiger Selftest — **NEXT**
6. Top-down-Integritätscheck
7. Erst danach genau ein `Titan Core: Reforged` Canary #3

Wenn Canary #3 später scheitert:

`Fehler klassifizieren -> Plattform reparieren -> vollständiger Selftest -> erst dann über einen weiteren bezahlten Lauf entscheiden.`
