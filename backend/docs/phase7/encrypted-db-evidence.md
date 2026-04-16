# Phase 7 Encrypted DB Evidence

## Generated Evidence File

Run:

```bash
cd backend
npm run evidence:db
```

Output:

- docs/phase7/evidence/encrypted-db-evidence.json

## What This Evidence Demonstrates

- Post, bid, and comment private fields are stored in protectedData instead of plaintext columns.
- Each protected record includes recordMac and per-field MAC tags for tamper detection.
- Key metadata tracks algorithm, key versions, status, and encrypted backups.
- No direct plaintext leakage is observed in sampled protectedData payloads.

## Faculty Demo Checklist

- Show sampled encrypted post payloads under posts[].sampleProtectedData.
- Show sampled encrypted bid payloads under bids[].sampleProtectedData.
- Show sampled encrypted meetup package under bids[].sampleMeetupProtectedData.
- Show MAC presence via hasRecordMac and key encryption metadata.
- Show key lifecycle traces via keys[] entries (versioning, status, encrypted backups).
