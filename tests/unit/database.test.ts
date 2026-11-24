import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from '../../src/core/utils/crypto.js';
import { PostRepository } from '../../src/database/repositories/post-repository.js';
import { TopicRepository } from '../../src/database/repositories/topic-repository.js';
import { HistoryRepository } from '../../src/database/repositories/history-repository.js';
import { TokenRepository } from '../../src/database/repositories/token-repository.js';
import { SourceRepository } from '../../src/database/repositories/source-repository.js';
import { JobLock } from '../../src/scheduler/job-lock.js';
import { LockAcquisitionError } from '../../src/core/errors/index.js';

describe('Phase 2: Database & Persistence', () => {
  it('should encrypt and decrypt tokens accurately with AES-256-GCM', () => {
    const secretToken = 'ghp_secure_oauth_access_token_987654321';
    const encrypted = encrypt(secretToken);
    expect(encrypted).not.toBe(secretToken);
    expect(encrypted.split(':').length).toBe(3); // iv:tag:data

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secretToken);
  });

  it('should handle post creation and status updates in PostRepository', async () => {
    const postRepo = new PostRepository();
    const contentItemId = 'ci_test_1';

    await postRepo.createContentItem({
      id: contentItemId,
      contentType: 'educational',
      qualityScore: 92,
      contentStatus: 'quality_approved',
      masterContent: {
        topic: 'Autonomous Agent Loops',
        topicRationale: 'High interest in reliability',
        sourceReferences: ['https://example.com/agents'],
        contentPillar: 'educational-tips',
        contentAngle: 'Architectural reliability',
        audience: 'Engineers',
        mainTakeaway: 'Always use idempotent run keys',
        hook: 'Why most agent loops fail in production',
        body: 'Without idempotency, network blips trigger duplicate writes.',
        cta: 'Save this post.',
        supportingFacts: ['Idempotency keys prevent duplicate runs.'],
        mediaConcept: 'System diagram of idempotency store',
        imagePrompt: 'Clean schematic diagram of a queue with idempotency lock',
        suggestedHashtags: ['#SystemDesign', '#LLMOps'],
        keywords: ['agent', 'idempotency'],
        seoKeywords: ['autonomous agents production'],
      },
    });

    const postId = 'post_x_1';
    await postRepo.createPlatformPost({
      id: postId,
      contentItemId,
      platform: 'x',
      status: 'pending',
      idempotencyKey: 'idemp_x_run_1',
      platformContent: {
        platform: 'x',
        text: 'Autonomous agents fail without idempotency. Here is why:',
        hashtags: ['#SystemDesign'],
        mediaUrls: [],
        characterCount: 60,
      },
    });

    const existing = await postRepo.findPostByIdempotencyKey('idemp_x_run_1');
    expect(existing).toBeDefined();
    expect(existing.platform).toBe('x');

    await postRepo.updatePostStatus(postId, 'published', {
      platformPostId: 'tw_123456789',
      postUrl: 'https://x.com/post/123456789',
    });

    const published = await postRepo.getRecentPublishedPosts();
    expect(published.length).toBeGreaterThan(0);
    expect(published[0].post_url).toBe('https://x.com/post/123456789');
  });

  it('should store and retrieve topic candidates and check duplicate topics', async () => {
    const topicRepo = new TopicRepository();
    const topicId = 'top_1';

    await topicRepo.saveTopicCandidate({
      id: topicId,
      topic: 'Vector DB Indexing Trade-offs',
      angle: 'HNSW vs IVF in production',
      pillarId: 'educational-tips',
      freshnessScore: 90,
      relevanceScore: 95,
      topicScore: 92,
      reasoning: 'Crucial for search latency',
      status: 'candidate',
    });

    await topicRepo.markTopicAsUsed(topicId);

    const isUsed = await topicRepo.isExactTopicUsed('Vector DB Indexing Trade-offs');
    expect(isUsed).toBe(true);

    const isNotUsed = await topicRepo.isExactTopicUsed('Completely New Topic');
    expect(isNotUsed).toBe(false);
  });

  it('should store encrypted platform tokens and verify expiration checking', async () => {
    const tokenRepo = new TokenRepository();
    await tokenRepo.saveTokens({
      platform: 'linkedin',
      accessToken: 'aq_linkedin_token_secret_value',
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour ahead
      scopes: ['w_member_social'],
    });

    const retrieved = await tokenRepo.getTokens('linkedin');
    expect(retrieved).toBeDefined();
    expect(retrieved?.accessToken).toBe('aq_linkedin_token_secret_value');

    const isExpired = await tokenRepo.isTokenExpired('linkedin');
    expect(isExpired).toBe(false);
  });

  it('should acquire, prevent overlapping acquisition, and release scheduler lock', async () => {
    const lock1 = new JobLock('test_schedule_lock', 'exec_1', 10);
    const acquired = await lock1.acquire();
    expect(acquired).toBe(true);

    // Second lock attempting to acquire should throw LockAcquisitionError
    const lock2 = new JobLock('test_schedule_lock', 'exec_2', 10);
    await expect(lock2.acquire()).rejects.toThrow(LockAcquisitionError);

    // After release, lock can be acquired again
    await lock1.release();
    const lock3 = new JobLock('test_schedule_lock', 'exec_3', 10);
    const acquired3 = await lock3.acquire();
    expect(acquired3).toBe(true);
    await lock3.release();
  });
});
