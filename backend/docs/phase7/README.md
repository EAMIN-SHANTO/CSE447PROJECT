# Phase 7 Verification and Grading Evidence

This folder contains the faculty-ready artifacts for final verification.

## Files

- architecture-diagram.md
- key-lifecycle-diagram.md
- encrypted-db-evidence.md
- evidence/encrypted-db-evidence.json (generated)

## Test Commands

```bash
cd backend
npm test
npm run test:phase7
```

## End-to-End Scenario Coverage

The integration scenario validates:

- register
- login + 2FA
- post create
- bid create
- seller accept (lock)
- locked-state enforcement (bid/comment blocked)
- offline exchange confirmation
- completed path and dispute path

## Evidence Command

```bash
cd backend
npm run evidence:db
```
