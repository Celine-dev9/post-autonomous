-- Autonomous Social Publisher PostgreSQL Schema Migration
-- Migration: 001_initial_schema.sql

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pgvector for semantic topic/content embeddings if available
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Publishing Runs
CREATE TABLE IF NOT EXISTS publishing_runs (
    id VARCHAR(64) PRIMARY KEY,
    run_date DATE NOT NULL,
    execution_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    posts_requested INTEGER DEFAULT 2,
    posts_generated INTEGER DEFAULT 0,
    posts_published INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_publishing_runs_date ON publishing_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_publishing_runs_status ON publishing_runs(execution_status);

-- 2. Research Sources
CREATE TABLE IF NOT EXISTS research_sources (
    id VARCHAR(64) PRIMARY KEY,
    source_name VARCHAR(128) NOT NULL,
    source_url TEXT NOT NULL,
    source_type VARCHAR(32) NOT NULL DEFAULT 'rss',
    article_title TEXT NOT NULL,
    article_summary TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    topic_hash VARCHAR(64) UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_sources_retrieved ON research_sources(retrieved_at);
CREATE INDEX IF NOT EXISTS idx_research_sources_hash ON research_sources(topic_hash);

-- 3. Content Topics
CREATE TABLE IF NOT EXISTS content_topics (
    id VARCHAR(64) PRIMARY KEY,
    topic TEXT NOT NULL,
    angle TEXT NOT NULL,
    pillar VARCHAR(64) NOT NULL,
    source TEXT,
    source_url TEXT,
    freshness NUMERIC(5, 2) DEFAULT 100.0,
    topic_score NUMERIC(5, 2) DEFAULT 0.0,
    used_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) DEFAULT 'candidate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_topics_status ON content_topics(status);
CREATE INDEX IF NOT EXISTS idx_content_topics_pillar ON content_topics(pillar);
CREATE INDEX IF NOT EXISTS idx_content_topics_used_at ON content_topics(used_at);

-- 4. Content Items (Master Content)
CREATE TABLE IF NOT EXISTS content_items (
    id VARCHAR(64) PRIMARY KEY,
    topic_id VARCHAR(64) REFERENCES content_topics(id) ON DELETE SET NULL,
    master_content JSONB NOT NULL,
    content_type VARCHAR(32) DEFAULT 'multi_platform',
    media_prompt TEXT,
    quality_score NUMERIC(5, 2) DEFAULT 0.0,
    content_status VARCHAR(32) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(content_status);

-- 5. Platform Posts (Platform-specific posts)
CREATE TABLE IF NOT EXISTS platform_posts (
    id VARCHAR(64) PRIMARY KEY,
    content_item_id VARCHAR(64) REFERENCES content_items(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL,
    platform_content JSONB NOT NULL,
    platform_post_id VARCHAR(128),
    post_url TEXT,
    status VARCHAR(32) DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_posts_status ON platform_posts(status);
CREATE INDEX IF NOT EXISTS idx_platform_posts_platform ON platform_posts(platform);
CREATE INDEX IF NOT EXISTS idx_platform_posts_idempotency ON platform_posts(idempotency_key);

-- 6. Content Memory (Long-term deduplication & memory)
CREATE TABLE IF NOT EXISTS content_memory (
    id VARCHAR(64) PRIMARY KEY,
    content_item_id VARCHAR(64) REFERENCES content_items(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    angle TEXT NOT NULL,
    pillar VARCHAR(64) NOT NULL,
    summary TEXT NOT NULL,
    normalized_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_memory_topic ON content_memory(topic);
CREATE INDEX IF NOT EXISTS idx_content_memory_pillar ON content_memory(pillar);

-- 7. Media Assets
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(64) PRIMARY KEY,
    content_item_id VARCHAR(64) REFERENCES content_items(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,
    media_type VARCHAR(32) NOT NULL,
    original_path TEXT,
    public_url TEXT NOT NULL,
    mime_type VARCHAR(64),
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Platform Credentials
CREATE TABLE IF NOT EXISTS platform_credentials (
    id VARCHAR(64) PRIMARY KEY,
    platform VARCHAR(32) UNIQUE NOT NULL,
    account_id VARCHAR(128),
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Analytics
CREATE TABLE IF NOT EXISTS analytics (
    id VARCHAR(64) PRIMARY KEY,
    platform_post_id VARCHAR(64) REFERENCES platform_posts(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL,
    metric_name VARCHAR(64) NOT NULL,
    metric_value NUMERIC(12, 2) NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_platform ON analytics(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics(metric_name);

-- 10. Scheduler Locks (Distributed lock)
CREATE TABLE IF NOT EXISTS scheduler_locks (
    id VARCHAR(64) PRIMARY KEY,
    lock_name VARCHAR(64) UNIQUE NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    execution_id VARCHAR(64) NOT NULL,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
