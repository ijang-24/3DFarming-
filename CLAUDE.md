# Project boundaries

Bitget setup/read-only work: read `.claude/skills/bitget-connect/SKILL.md` and its references. SDK is Node-only under `scripts/`; never import it or secrets into `src/`. No automatic trading, order mutations, transfers, leverage changes or withdrawals authorized. Preserve strategy/risk parameters; user blueprint pending.

`.mcp.json` activation and live Bitget execution were permission-blocked on 2026-11-01. Do not route blocked operations through tests, shells or agents. Mock tests are not connection proof. Commands/status: README Bitget section.
