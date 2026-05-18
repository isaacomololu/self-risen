# OMNI-CBT V6.4 Migration (Affirmations)

## Summary
We replaced the previous “transform limiting belief → affirmation” prompt with **OMNI-CBT Mindset Protocol (V6.4)** as the **single source of truth** for how the model should classify inputs, generate reflections/affirmations, and handle safety scenarios.

In addition, we introduced a **server-side safety intercept** that prevents any safety-flagged model payload from being persisted or surfaced to the frontend.

## Why this change
Our requirements for AI behavior were refined:

- **Consistency**: one canonical protocol should define tone, structure, and behavior (including edge cases) across the product.
- **Safety**: safety gating must be reliable and enforced server-side; the frontend should never need to “trust” or interpret raw model output to remain safe.
- **Maintainability**: versioned prompt/spec allows controlled iteration (V6.4 today, later versions can be swapped intentionally).

## What changed (high level)
### Prompt / response contract
- **Before**: model returned a JSON object with exactly:
  - `limitingBelief`
  - `generatedAffirmation`

- **After**: model is instructed by OMNI-CBT V6.4 to return the full schema (including):
  - `isSafetyIssue`, `riskType`, `riskLevel`
  - `reflectiveSummary`
  - `generatedAffirmation` (nullable for safety)
  - plus additional classification fields defined by the protocol

### Safety enforcement
When the model returns `isSafetyIssue === true`, we **override** the response that would normally be persisted/returned:

- We do **not** create an `Affirmation` database record.
- We do **not** generate TTS audio.
- We do **not** store or pass through the model’s generated payload.
- We instead return a **hardcoded session-shaped payload** containing safety guidance.

This ensures the system does not accidentally present unsafe or policy-violating content if the model output is malformed, overly verbose, or otherwise unexpected during safety cases.

## Implementation details
### Files
- `src/reflection/prompts/omni-cbt-v6_4.prompt.ts`
  - Centralized OMNI-CBT V6.4 prompt text.
  - Kept as a string literal to avoid runtime file-path issues in compiled Nest builds.

- `src/reflection/services/nlp-transformation.service.ts`
  - Uses `OMNI_CBT_V6_4_PROMPT` as the system prompt.
  - Parses the model’s JSON into an OMNI-shaped object.
  - Adapts back into legacy fields used by existing flows:
    - `limitingBelief`: derived locally from the raw belief text (sanitized).
    - `generatedAffirmation`: from OMNI `generatedAffirmation` (sanitized).
  - Also exposes the parsed OMNI object as `omni` for downstream decisions (like the safety intercept).

- `src/reflection/reflection.service.ts`
  - Adds the safety intercept in `generateAffirmation()`:
    - `if (transformation.omni?.isSafetyIssue === true) { ... override ... }`

## Behavior notes
### Hardcoded safety payload
The safety override uses a hardcoded message aligned with OMNI’s “location unknown” canonical fallback (Phase 0.2).

### Backwards compatibility
The API response shape remains the same (session-shaped `Results(updatedSession)`), so the frontend does not need to change immediately.

## Risks / rollout considerations
- **Prompt versioning**: changing the OMNI prompt version changes model behavior. Treat prompt updates as versioned releases.
- **Schema drift**: if OMNI’s schema changes, update the OMNI parsing/validation logic accordingly.
- **Safety cases**: safety behavior is intentionally conservative; if you want to incorporate OMNI’s `reflectiveSummary` into the hardcoded payload, do so carefully and keep the “override” principle intact.

