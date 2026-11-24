# Architectural & Technical Decisions

## 1. Modular Architecture & Decoupled Pipelines
- **Decision:** Separate the engine into dedicated single-responsibility subsystems (`research`, `knowledge`, `strategy`, `ai`, `content`, `media`, `storage`, `publishing`, `platforms`, `analytics`, `scheduler`, `database`).
- **Rationale:** Ensures that failures in one subsystem (e.g., RSS down, YouTube token expired, Cloudinary rate limit) do not cascade or halt other platforms or workflows. Allows independent unit testing with zero external dependencies.

## 2. Headless Design with Zero Web UI Requirement
- **Decision:** Build a CLI and CI/CD-driven application configured purely via `.env`, JSON configuration files, Markdown knowledge bases, and database records.
- **Rationale:** The system is designed to operate autonomously 1-2 times per day without human attendance. A web dashboard introduces extra attack surface, hosting overhead, and session management complexity without adding autonomous value.

## 3. Persistent Memory: Supabase PostgreSQL with Hybrid Fallback
- **Decision:** Use PostgreSQL via Supabase with pgvector support for long-term content and topic memory. Provide an in-memory/JSON-file fallback store when Supabase credentials are not yet provisioned.
- **Rationale:** Guarantees that GitHub Actions runners and local CLI runs share identical state across ephemeral environments, while allowing local development and testing to run out-of-the-box in mock/offline mode.

## 4. AI Provider Abstraction with Gemini Flash / Pro Primary
- **Decision:** Interface-based AI provider (`AIProvider`) utilizing the `@google/genai` SDK. Support strict structured JSON output with Zod schemas and automatic repair loops.
- **Rationale:** Gemini offers high contextual windows (needed for knowledge base injection and past post history), high reasoning quality, speed, and generous free/low-cost tiers. The abstraction allows hot-swapping or fallback models.

## 5. Fallback-First Content & Research Pipeline
- **Decision:** If RSS feeds return no items or fail network requests, automatically fall back to AI evergreen ideation informed by content pillars and audience pain points. If image generation fails, fall back to text-only variants for platforms that support it. If video fails, publish text/image posts on X, LinkedIn, Facebook, and Instagram while safely skipping YouTube.
- **Rationale:** High availability and fault tolerance are paramount for an autonomous daily publisher.

## 6. Official Platform APIs & Safe Isolation
- **Decision:** Strictly integrate with official REST/Graph APIs (X API v2, Meta Graph API v20+, LinkedIn REST API, YouTube Data API v3).
- **Rationale:** Avoids stealth scrapers, cookie hacks, or headless browsers which risk account suspension and fragile breakages. Each platform adapter implements an isolated worker job with unique idempotency keys.

## 7. Security & Secret Management
- **Decision:** AES-256-GCM encryption for stored refresh tokens in `platform_credentials`. Secret masking in logger so tokens, keys, and authorization headers are scrubbed before stdout or logging to files.
- **Rationale:** Prevents credential leakage in CI logs, error traces, or GitHub Actions artifacts.
