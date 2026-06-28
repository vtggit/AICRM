Closes #133

## CodeAgent PR Contract
<!-- codeagent-pr-contract: machine-checked at merge; replace each tests:["TODO"] with the pytest nodeids that prove that AC -->
<details>
<summary>codeagent-pr-contract v1</summary>

```json
{
  "contract_updated_round": 2,
  "decision_id": "D-2",
  "governance_seen": {
    "may_proceed": true
  },
  "implements_issue": 133,
  "proof_map": [
    {
      "ac": "AC-1",
      "ac_text_hash": "sha256:3fb48c750225ee24aedd2a5ba06c980e7d8c75d212b257aa672590cac3cb58f9",
      "kind": "proven",
      "tests": [
        {
          "nodeid": "tests/test_health_api.py::test_health_version_returns_only_version"
        }
      ]
    }
  ],
  "schema": "codeagent-pr-contract",
  "version": 1
}
```
</details>