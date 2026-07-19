# CiteGate two-minute demo

From the repository root:

```bash
npm install
npm run demo
```

The deterministic path needs no credentials or network. It passes a seeded function-call response through the real `grounded_rewrite` implementation so judges can verify that a model proposal cannot bypass any mechanical gate. Expected money-shot:

```text
BLOCKED: 999 F.3d 123 (1st Cir. 2025)
BLOCKED: Citation not found: 999 F.3d 123 (1st Cir. 2025)
APPROVED: Courts require a concrete injury for standing. See 504 U.S. 555 (1992).
ALL GATES PASS: binding, no-new-citations, existence, fact-preservation
```

To exercise the actual GPT-5.6 Responses API call instead, set `OPENAI_API_KEY` and run:

```bash
npm run demo -- --live
```

The live path may vary or be blocked if the model does not return an exact registered span. That is intentional: the model proposes, the gate disposes.
