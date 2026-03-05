# Production Gaps

1. Declaration is not enforcement.
- `agents.txt` states capability contracts, but servers still need independent authz/rate-limit enforcement.

2. Agent identity is weak by default.
- Policy application commonly relies on `User-Agent`, which is spoofable without stronger identity mechanisms.

3. Ecosystem conformance is still maturing.
- Broad interoperability depends on consistent parser/validator behavior across clients and providers.
