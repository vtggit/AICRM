# `ca_gate` — CodeAgent contract merge-gate

This directory holds the self-contained tooling for the CodeAgent **contract
merge-gate**: a PR that implements a deliberated issue must map every active
acceptance criterion (`AC-N`) to a passing test, and CI fails the gate check
until it does. Pure stdlib + `pytest` — no dependency on the CodeAgent
service.

## Files

| file | purpose |
|---|---|
| `contract_lib.py` | **vendored** from `vtggit/CodeAgent` `src/orchestration/contract_lib.py`. The AC-text hash + the `raw_decode` contract extractor. Do not edit by hand — keep it byte-identical to the source so hashes reproduce. |
| `new_pr_contract.py` | offline generator: turn an issue's `codeagent-contract` into a `codeagent-pr-contract` skeleton (one `proof_map` entry per active AC, `ac_text_hash` filled, `tests:["TODO"]`). |
| `list_proof_nodeids.py` | prints the proving-test nodeids from a PR's `codeagent-pr-contract` proof-map (deduped, `TODO` dropped, `[param]` suffix stripped) so the gate runs only those tests. |
| `check_pr_contract.py` | the gate checker: resolves the PR contract against the linked issue's `codeagent-contract`, a junitxml test report and the PR's changed files, renders a per-AC verdict, and exits non-zero when the verdict fails (`--report-only` forces exit 0). |
| `revalidate.py` | re-checks the issue-side invariants (governance `may_proceed`, decision pin, active-AC text hashes) for every open PR carrying a `codeagent-pr-contract` and posts a `codeagent-contract-revalidate` check-run on its head SHA. Does not re-run tests. |

The tooling's own tests live in `tests/ca_gate/` at the repository root.

## Author workflow

```bash
# from an issue body on disk…
python scripts/ca_gate/new_pr_contract.py --issue-body-file issue.md
# …or straight from GitHub
gh issue view 128 --json body -q .body | python scripts/ca_gate/new_pr_contract.py
```

Paste the printed `## CodeAgent PR Contract` section into your PR description and
replace each `tests: ["TODO"]` with the pytest nodeid(s) that prove that AC.

## Status

Phase **4a.4** — the gate runs in CI and is enforcing:

- `.github/workflows/codeagent-merge-gate.yml` runs on every pull request
  (opened, synchronize, reopened, edited). Its `CodeAgent contract gate` job
  fetches the PR body and changed files, runs the contract's proving tests
  (the backend pytest nodeids from `list_proof_nodeids.py` against a PostgreSQL
  service, or the Playwright suite under `app/tests/` when the PR changes a spec
  there), then runs `check_pr_contract.py` without `--report-only`, so a failing
  verdict fails the job. A PR with no PR contract and no link to a contracted
  issue is not gated.
- `.github/workflows/codeagent-gate-revalidate.yml` runs `revalidate.py` daily
  (and on manual dispatch).

A failing check blocks merge only if it is marked required in the repository's
branch protection, which is a GitHub setting and not recorded in this repo; see
`docs/branch-protection.md`. See the schema spec in CodeAgent
`docs/contract-schema.md`.
