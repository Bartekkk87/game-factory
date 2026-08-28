# Contributing

Game Factory is evidence-first. A change is not complete because code was written; it is complete when the relevant deterministic checks and provenance are present.

## Change flow

1. Work on a branch, not directly on `main`.
2. Keep the change bounded to one proven failure mode or explicitly approved feature scope.
3. Run the Full Verifier.
4. For protected layers, use a pull request and human review.
5. Do not weaken gates to make a failing test pass.
6. Do not add paid provider calls to zero-paid verification suites.

## Protected paths

The following paths require owner review:

- `.github/**`
- `factory/prompts/**`
- `skills/**`
- `factory/src/control/**`
- `factory/src/verify/**`

`CODEOWNERS` is the repository declaration of these review boundaries. GitHub branch protection/rulesets must enforce the review requirement on `main`.

## Evidence and tests

- Prefer deterministic assertions over qualitative claims.
- Negative controls are required where a false PASS would be safety-relevant.
- Historical regressions must be immutable fixtures; tests must not silently skip them when runtime evidence is absent.
- Model/provider request contracts must be zero-paid tested before use.
- LLM output is never sufficient evidence for release authority by itself.

## Generated evidence

Production and review workflows may commit only allow-listed evidence/product paths. Do not reintroduce an unrestricted `git add -A` workflow commit.

## License

No contribution should assume a license that has not been explicitly selected by the repository owner. The repository license remains an owner decision.
