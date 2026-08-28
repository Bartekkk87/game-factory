# Security Policy

## Scope

Security reports may concern the Game Factory control plane, generated games, GitHub Actions workflows, model/provider routing, credential isolation, evidence handling or publication path.

## Reporting

Do **not** open a public issue for a vulnerability that could expose credentials, bypass a protected-layer boundary, enable unintended code execution or leak private data.

Report the issue privately to the repository owner through GitHub's private vulnerability reporting feature when available. Include:

- affected commit or file;
- reproducible steps;
- expected versus observed boundary;
- whether credentials, generated code, evidence or release authority are involved.

## Security invariants

The repository is designed around these fail-closed boundaries:

- unknown model pricing blocks paid work;
- billing-uncertain requests block further paid calls;
- generated product code must not gain Control Plane authority;
- automatic learning cannot validate or activate its own candidates;
- protected production layers require human-reviewed change provenance;
- release authority is deterministic; LLM quality judgments are advisory.

A report showing that one of these invariants can be bypassed should be treated as security-relevant even if no secret or user data was exposed.
