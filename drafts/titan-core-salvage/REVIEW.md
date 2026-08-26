## Review needed: Titan Core: Salvage

**Preview:** `drafts/titan-core-salvage/index.html` (live on Pages after push)

> Dismantle hostile machine Titans, salvage modular components, and rebuild your core.

| Metric | Value |
| Playtest overall | **7.5 / 10** |
| Visuals / UI / Fun / Perf | 7.5 / 6 / 7.5 / 10 |
| Attempts (build+debug) | 6 |
| Polish rounds | 2 |
| Candidate SHA | `e75d9e95d98e809c` |

**Audit summary:** Titan Core: Salvage successfully passed all technical verification checks, demonstrating robust stability, correct interactivity, and frame rates above target. The playtest score of 7.5 safely exceeds the score gate threshold of 7.0. The project is approved for release.

**Top critique:**
- Severe HUD overlap in the top-right corner where 'SECTOR 1 TITAN' and 'BEST 2010' clip directly over each other.
- Vibrant neon vector visual style with glowing cyan rings, particle trails, and laser effects gives strong arcade feedback.
- Grid background and scattered glowing stardust effectively establish depth without cluttering the combat plane.
- The post-boss extraction modal clearly presents a compelling risk-reward choice ('Extract' vs 'Venture Deeper').

---
Approve with comment `/approve` or reject with `/reject <reason>` on this issue.

[slug:titan-core-salvage]