---
"pkg-claim": major
---

Add safety-first publish checks so real publishes confirm the active npm account first and require an explicit final package-name confirmation. Non-interactive publishes now require `--confirm-name` alongside `--yes`, which is a breaking change for existing automation.
