# Troubleshooting & Operations Guide

This guide documents common operational scenarios, diagnostic steps, error codes, and resolution procedures for the autonomous social publisher.

---

## 1. Diagnostics & Health Check

Run the built-in diagnostic commands:

```bash
# Check connectivity across database, AI, RSS feeds, and platform adapters
npm run test:connections

# Check current engine status, last run, and schedule status
npm run status

# Perform a safe dry-run without publishing any live posts
npm run dry-run

# Run research extraction across configured RSS feeds
npm run research:now

# Inspect content generation for any specific topic
npm run generate:now
```

---

## 2. Common Scenarios & Resolutions

### Scenario A: Supabase Connection Failure
- **Symptom:** `DatabaseConnectionError: Unable to connect to Supabase database`
- **Causes:** Invalid `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`, or network egress blocked.
- **Resolution:**
  1. Check `.env` values for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
  2. If running locally without credentials, ensure `DATABASE_FALLBACK_MEMORY=true` is set to enable the in-memory/local SQLite fallback engine.
  3. Verify migrations have been run with `npm run migrate`.

### Scenario B: AI Provider Rate Limiting or Invalid Output
- **Symptom:** `AIValidationError: Failed to parse structured JSON response` or HTTP 429.
- **Causes:** Gemini quota exhaustion or complex prompt hallucinating invalid JSON.
- **Resolution:**
  1. The system features an automatic repair loop that retries with the error explanation.
  2. If rate limited, exponential backoff will automatically pause and retry up to `AI_MAX_RETRIES`.
  3. Verify `GEMINI_API_KEY` is active and valid.

### Scenario C: RSS Sources Unreachable
- **Symptom:** Warnings in logs: `Failed to fetch RSS feed https://...`
- **Behavior:** The engine automatically marks the source as degraded, deduplicates whatever was fetched, and falls back to autonomous AI evergreen topic generation.
- **Resolution:** Update `config/rss-sources.json` to replace broken feeds.

### Scenario D: Platform Token Expiration (OAuth2)
- **Symptom:** `PlatformAuthError: Refresh token expired or revoked for [Platform]`
- **Behavior:** The engine marks the affected platform as degraded, skips posting to it, records an error log, and proceeds to publish successfully on all other healthy platforms.
- **Resolution:**
  1. Run `npm run test:connections` to inspect which platform credentials need renewal.
  2. Update the token in `.env` or run the token update utility.

### Scenario E: Instagram Media URL Rejection
- **Symptom:** Instagram API error: `Media URL is inaccessible or invalid format`
- **Causes:** Instagram requires media files to be publicly accessible over HTTPS with proper byte-range headers and aspect ratios (1:1 to 4:5 for feed posts).
- **Resolution:**
  1. Verify Cloudinary credentials in `.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) or Supabase Storage credentials.
  2. The media validator validates dimensions and aspect ratios before uploading.

### Scenario F: Scheduler Overlap or Stuck Lock
- **Symptom:** `SchedulerLockError: Previous run [run-id] is still active`
- **Behavior:** Prevents concurrent workflows from generating duplicate posts.
- **Resolution:**
  Locks have an automatic TTL (default: 30 minutes). If a process terminated ungracefully, the lock will auto-expire, or you can force-release it via:
  ```bash
  npm run scheduler:unlock
  ```

### Scenario G: Windows PowerShell Script Execution Policy
- **Symptom:** `npm : File ... npm.ps1 cannot be loaded because running scripts is disabled on this system.`
- **Causes:** Windows default PowerShell execution policy blocks unsigned `.ps1` wrapper scripts.
- **Resolution:**
  1. Run `npm.cmd` directly instead of `npm`, or
  2. Remove `npm.ps1` from the Node installation directory (`$env:LOCALAPPDATA\Programs\nodejs\npm.ps1`), allowing PowerShell to invoke the standard `npm.cmd` binary natively without execution policy hurdles.
