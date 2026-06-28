# Making the CodeAgent contract gate a required check

The merge-gate (`.github/workflows/codeagent-merge-gate.yml`) runs **enforcing**:
a failing verdict fails the job, so the check turns red. But a red check does not
*block* merge until it is marked **required** in branch protection. Do that only
after a soak.

## Roll-out order

1. **Merge the gate workflows to `main`** (PRs #130 → #131 → this one). The gate
   runs on every subsequent PR.
2. **Soak (enforcing, not required).** Watch a few real PRs:
   - Confirm ordinary PRs (no contracted issue) show ✅ *fail-open / skipped*.
   - Confirm a compliant contract PR is green and a deliberately-broken one
     (missing proof / stale decision / changed AC text / unmapped test) is red.
   - Tune the AST trivial-test guard / DB step against false positives.
3. **Mark the checks required** (below) once the soak is clean.

## Make the checks required

GitHub → repo **Settings → Branches → Branch protection rules → `main`** →
*Require status checks to pass before merging*, then add:

- **`CodeAgent contract gate`** — the per-push gate job.
- **`codeagent-contract-revalidate`** — the daily re-validation check (so a
  governance veto raised *after* the PR's last push still blocks merge once the
  cron re-runs).

Or via the API (maintainer token):

```bash
gh api -X PATCH repos/vtggit/AICRM/branches/main/protection/required_status_checks \
  -f 'checks[][context]=CodeAgent contract gate' \
  -f 'checks[][context]=codeagent-contract-revalidate'
```

## Author workflow

For a PR that implements a CodeAgent-deliberated issue:

```bash
# generate the PR-contract skeleton from the issue contract…
gh issue view <N> --json body -q .body | python scripts/ca_gate/new_pr_contract.py
```

Paste the printed `## CodeAgent PR Contract` section into the PR description, then
replace each `tests: ["TODO"]` with the pytest nodeid(s) that prove that AC. The
gate requires, for every **active** `AC-N`:

- a `kind: "proven"` proof-map entry whose `ac_text_hash` matches the live AC text,
- every mapped nodeid **collected + passing** (all parametrizations; not skipped),
  **non-trivial** (a real assertion), and **added/modified in this PR's diff**,
- the issue's `governance.may_proceed == true` and the pinned `decision_id`
  matching the issue's current decision.

## Known limitation (tighten as needed)

The AST "non-trivial" guard proves a mapped test exists and asserts *something*;
combined with the changed-files binding (the test must be in the PR diff) it is
hard to satisfy with an unrelated pre-existing test, but it still does not prove
the test exercises *that* criterion. A refactor PR that re-proves an AC with an
unchanged test will fail the changed-files binding — re-touch the test or split
the refactor. Stronger binding (per-AC coverage / mutation) is future work.
