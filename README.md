# Career-180 — Certificate Verification & Trust Layer

A browser-only prototype of the Career-180 certificate verification experience and its trust layer. It covers the four certificate states (**Completed**, **Verified**, **Legacy**, **Revoked**), assessment evidence, private-result access requests and learner self-service.

Lookup is **certificate ID only** (6 digits). The trust layer is shown only for **Verified** certificates; Completed and Legacy certificates are recognised but explained without evidence.

There is **no backend**. All data comes from a seed JSON file and is persisted to `localStorage`.

## Quick start

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173/`).

Other scripts:

```bash
npm run build     # type-check and produce dist/
npm run preview   # serve the production build locally
```

## Routes

The app uses hash routing, so every page is reachable from the header or by URL:

| Route | Page |
| --- | --- |
| `#/verify` | Verifier landing page with ID lookup and sample data |
| `#/evidence/{certificateId}` | Assessment evidence page |
| `#/learner` | Demo learner area with certificate view, download and LinkedIn actions |

## Seed data

All seed data lives in:

```text
src/data/seed.json
```

It contains 24 certificates (with exact 6-digit IDs, assessment results, project feedback, states and history), 24 learners, 8 courses with 8 published versions, 2 policies, 2 access requests and 2 disputes.

`src/lib/domain.ts` hydrates the seed on first load, adding any missing certificate history entries. `src/lib/store.tsx` owns all state changes, persistence and event logging.

### Useful sample cases

| Case | Certificate ID | What it demonstrates |
| --- | --- | --- |
| Verified | `245890` | Green success panel, certificate preview + QR, trust layer, evidence page |
| Completed (assessed) | `704455` | Recognised result with missing required items and no trust layer |
| Completed (no assessment) | `483201` | "This course has no assessment" completion note |
| Legacy | `940285` | Old-policy explanation, no stored results, free upgrade path |
| Legacy with newer course version | `549077` | Free upgrade preserves ID and old history; new issue date |
| Revoked | `135792` | Revoked result, hidden evidence, dispute link |
| Private Verified | `394871` | Results gate and access request flow |
| Locked attempts | `852147` | Locked exam after 5 failed attempts; Retake course |
| Not found | `000000` | Red not-found result; the fifth miss in 60s shows a warning popup without pausing lookups |

The verifier page has a boxed **Demo / sample data** section grouped by Verified, Completed, Legacy and Revoked. Every sample card shows the learner, course, visibility or source, and why that state applies. Clicking a card loads the certificate and its result. Use **Hide sample data** / **Show sample data** to collapse or expand the whole box.

Verification is never blocked. After five unsuccessful lookups within 60 seconds, a warning popup explains the repeated misses, then the demo continues normally. A successful lookup clears the counter.

## Learner certificate

The learner area opens the selected learner's certificate in a modal. From there the learner can preview the certificate, **Download certificate** and **Add to LinkedIn profile**. Both actions are mocked with toast messages. These actions are intentionally not shown on the verifier page.

A **You are demoing as a learner** banner explains the learner view. When the selected learner has a pending access request, a highlighted notification shows who requested access, their email, the course, the request date and how long ago it was sent, with **Approve** and **Decline** actions. The sidebar lists all requests with the same detail.

The learner area deliberately omits the assessment-items table and the demo actions for simulating passes, retakes or Legacy upgrades; it focuses on the learner's certificate and privacy controls.

## Demo controls

The floating **Demo tools** button is available on every page:

- **Prototype date** — the clock starts at **15 Mar 2027**.
- **Fast-forward 14 days** — advances the clock and expires pending/approved access requests.
- **Export data** — downloads JSON (all datasets) or CSV (certificates, results, access requests, disputes, events).
- **Reset demo data** — restores the seed and resets the prototype clock.

## Persistence

- App state key: `career180.trust-layer.v1`
- Last verifier lookup: `career180.last-lookup` (session storage, so returning to the verifier after a certificate changes shows its current state)

Clearing site data or using **Reset demo data** returns the prototype to the seed.

## Notes / mocks

- Certificate download and "Add to LinkedIn profile" are mocked with toast messages in the learner certificate modal.
- No authentication is used; the learner dropdown is a demo surface.
- The AI summary on the evidence page is deterministic and always labelled **"AI-generated summary. It is not evidence."**
- Revocation is final; revoking a certificate hides its evidence and updates the verifier immediately.
- Policies are informational only and never block access or change a certificate state.
