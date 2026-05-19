# Affirmation Audio Loop

## Feature summary

The Affirmation Audio Loop feature lets users generate a single merged MP3 from selected affirmations (AI voice) mixed with background music. Generation runs asynchronously on the server via FFmpeg. Playback, repeat looping, preset timers, and fade-on-stop are handled entirely on the mobile client.

### Client vs server

| Responsibility | Owner |
|----------------|-------|
| Select voice, music, affirmations | Client |
| Merge audio (concat + mix + fade) | Server (Bull job) |
| Store merged MP3 | Server (`loops/{userId}/{loopId}.mp3`) |
| Poll loop status / download URL | Client |
| Play on repeat until timer ends | Client |
| AM/PM reminder UI | Client |
| Push when loop ready / reminder nudge | Server |

---

## Schema changes

Migration: `20260518210133_affirmation_audio_loop`

### New enum: `AffirmationLoopStatus`

- `PENDING`
- `PROCESSING`
- `READY`
- `FAILED`

### New models

**`AffirmationLoop`**

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `userId` | UUID | Owner |
| `status` | enum | Default `PROCESSING` |
| `audioPath` | string? | Storage path when `READY` |
| `durationSeconds` | int? | Output length |
| `backgroundMusicKey` | string | Stable key from stater-videos catalog |
| `voicePreference` | `TtsVoicePreference?` | Optional loop-level voice |
| `errorMessage` | string? | Set on `FAILED` |

**`AffirmationLoopItem`**

| Field | Type | Notes |
|-------|------|-------|
| `loopId` + `affirmationId` | composite PK | |
| `sortOrder` | int | Playback order |

### `User` fields

| Field | Default | Notes |
|-------|---------|-------|
| `loopTokensRemaining` | `5` | Debited on create; refunded on job failure |
| `loopReminderEnabled` | `false` | |
| `loopReminderMorning` | null | `"HH:mm"` in user timezone |
| `loopReminderEvening` | null | `"HH:mm"` in user timezone |

---

## API reference

Base path: `/reflection/loops` (Firebase auth required)

### `POST /reflection/loops`

Create a loop and start merge job.

**Body**

```json
{
  "affirmationIds": ["uuid-1", "uuid-2"],
  "backgroundMusicKey": "meditation",
  "voicePreference": "Sage"
}
```

- `affirmationIds`: 1–20 UUIDs, order preserved
- `backgroundMusicKey`: must match `StaterVideosService.getSoundByName`
- `voicePreference`: optional persona name or `TtsVoicePreference` enum

**Response (202-style immediate)**

```json
{
  "message": "Affirmation loop generation started",
  "data": {
    "id": "loop-uuid",
    "status": "PROCESSING",
    "audioUrl": null,
    "affirmationIds": ["uuid-1", "uuid-2"],
    "backgroundMusicKey": "meditation"
  }
}
```

**Errors (400):** no tokens, invalid music key, affirmations not owned, empty text, duplicate IDs.

### `GET /reflection/loops/:id`

Poll status. When `READY`, includes signed `audioUrl` (1h).

### `GET /reflection/loops?page=1&limit=10`

Paginated list of user loops.

### `PATCH /reflection/loops/reminders`

```json
{
  "loopReminderEnabled": true,
  "loopReminderMorning": "07:30",
  "loopReminderEvening": "20:00"
}
```

Times are `HH:mm` (24-hour) in the user's `timezone`.

### `DELETE /reflection/loops/:id`

Deletes DB row and storage file when present.

---

## Job pipeline (`audio_merge` queue)

**Processor:** `AudioMergeProcessor`  
**Job name:** `merge_loop`  
**Concurrency:** 1  
**Attempts:** 2 (exponential backoff 10s)

### Steps

1. Load loop + ordered items + affirmations.
2. **Voice policy C:** Re-TTS if `audioUrl` is missing OR `loop.voicePreference` differs from `affirmation.ttsVoicePreference`.
3. Resolve background URL via `getSoundByName(backgroundMusicKey)` at job time (never store signed URLs).
4. Download sources to temp dir `audio-merge-{loopId}/`.
5. **Pass A — concat:** concat demuxer → `affirmations.mp3` (`libmp3lame`, 192k, 44.1kHz, stereo). No `-acodec copy` (mixed source formats).
6. **Pass B — mix:** loop background (`-stream_loop -1`), `volume=0.25` (~−12 dB), `amix=duration=first`, cap `-t 300`, `afade` 3s at end. No `loudnorm` / mono.
7. Upload to `loops/{userId}/{loopId}.mp3`.
8. Update loop: `READY`, `audioPath`, `durationSeconds`.
9. Push: `AFFIRMATION_LOOP_READY` — “Your affirmation loop is ready.”

### On failure (final attempt only)

- `status = FAILED`, `errorMessage` set
- `loopTokensRemaining` incremented by 1 (refund)

---

## Token economics

- Default **5** tokens per user (`loopTokensRemaining`).
- **Debit:** 1 token when `POST /reflection/loops` succeeds (inside transaction before enqueue).
- **Refund:** 1 token when merge job fails after all retries.

---

## Reminders

**Service:** `LoopReminderService`  
**Cron:** `0 * * * *` (every hour at :00)

Users with `loopReminderEnabled`, non-empty `pushTokens`, and local time (in `user.timezone`) matching `loopReminderMorning` or `loopReminderEvening` receive push + in-app notification (`AFFIRMATION_LOOP_REMINDER`). Metadata includes `screen: 'AffirmationLoop'`.

---

## Storage

| Artifact | Path |
|----------|------|
| Merged loop | `loops/{userId}/{loopId}.mp3` |
| API `audioUrl` | Fresh signed URL from `audioPath` on read |

**New storage helpers**

- `StorageService.downloadToFile(source, destPath)` — HTTP or path → local file
- `StorageService.uploadBufferAtPath(buffer, path, contentType)` — explicit path upload

---

## Notifications

| Type | When |
|------|------|
| `AFFIRMATION_LOOP_READY` | Merge succeeded |
| `AFFIRMATION_LOOP_REMINDER` | Morning/evening cron match |

---

## Files added or modified

### New

- `src/affirmation-loop/affirmation-loop.module.ts`
- `src/affirmation-loop/affirmation-loop.controller.ts`
- `src/affirmation-loop/affirmation-loop.service.ts`
- `src/affirmation-loop/audio-merge.service.ts`
- `src/affirmation-loop/audio-merge.processor.ts`
- `src/affirmation-loop/loop-reminder.service.ts`
- `src/affirmation-loop/dto/*`
- `src/affirmation-loop/tests/*`
- `prisma/migrations/20260518210133_affirmation_audio_loop/migration.sql`
- `docs/affirmation-audio-loop.md`

### Modified

- `prisma/schema.prisma` — models, enum, User fields
- `src/app.module.ts` — `AffirmationLoopModule`
- `src/reflection/reflection.module.ts` — export `TextToSpeechService`
- `src/notifications/enums/notification.enum.ts` — new types
- `src/common/storage/storage.service.ts` — download + uploadBufferAtPath
- `src/common/storage/supabase-storage.service.ts` — uploadBufferAtPath

---

## Deployment notes

1. **PostgreSQL:** Run `npx prisma migrate deploy` (or `migrate dev` locally).
2. **Redis:** Required for Bull (`REDIS_HOST`, `REDIS_PORT`, optional `REDIS_PASSWORD`). Same instance as `notification_dispatch`.
3. **FFmpeg:** Must be on server `PATH`, or set `FFMPEG_PATH` in env (see `src/common/config.ts`).
4. **Worker process:** Nest app must run with `AffirmationLoopModule` loaded so `AudioMergeProcessor` consumes `audio_merge` jobs.
5. **Background music:** Keys come from `GET /stater-videos/music` (`getMusicUrls`); signed URLs are resolved at job time only.

---

## Out of scope (v1)

- Mobile playback UI and timer
- Billing / token grants beyond default 5
- Auto-regenerate loop when affirmation text changes after `READY`
