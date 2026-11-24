export type Platform = 'x' | 'facebook' | 'instagram' | 'linkedin' | 'youtube';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'partial_failure' | 'failed';

export type ContentStatus =
  | 'draft'
  | 'validated'
  | 'quality_approved'
  | 'rejected'
  | 'publishing'
  | 'published'
  | 'failed';

export type PostStatus =
  | 'pending'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'skipped';

export interface ContentPillar {
  id: string;
  name: string;
  description: string;
  targetPercentage: number;
  targetAudience: string;
  allowedFormats: string[];
  preferredPlatforms: Platform[];
  ctaType: string;
}

export interface ResearchItem {
  id: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: 'rss' | 'ai_generated' | 'web_search';
  articleTitle: string;
  articleSummary: string;
  content?: string;
  publishedAt: Date;
  retrievedAt: Date;
  category: string;
  keywords: string[];
  topicHash: string;
}

export interface TopicCandidate {
  id: string;
  topic: string;
  angle: string;
  pillarId: string;
  sourceUrl?: string;
  freshnessScore: number; // 0 - 100
  relevanceScore: number; // 0 - 100
  topicScore: number;     // 0 - 100
  reasoning: string;
  status: 'candidate' | 'selected' | 'rejected' | 'used';
}

export interface MasterContent {
  topic: string;
  topicRationale: string;
  sourceReferences: string[];
  contentPillar: string;
  contentAngle: string;
  audience: string;
  mainTakeaway: string;
  hook: string;
  body: string;
  cta: string;
  supportingFacts: string[];
  mediaConcept: string;
  imagePrompt: string;
  videoConcept?: {
    title: string;
    hook: string;
    scenes: Array<{
      sceneNumber: number;
      narration: string;
      visualPrompt: string;
    }>;
    tags: string[];
    description: string;
  };
  suggestedHashtags: string[];
  keywords: string[];
  seoKeywords: string[];
}

export interface PlatformContent {
  platform: Platform;
  title?: string;
  text: string;
  hashtags: string[];
  mediaUrls: string[];
  characterCount: number;
  videoScript?: {
    hook: string;
    scenes: Array<{
      sceneNumber: number;
      narration: string;
      visualPrompt: string;
    }>;
    description: string;
    tags: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface QualityResult {
  score: number; // 0 - 100
  passed: boolean;
  issues: string[];
  factualConcerns: string[];
  brandConcerns: string[];
  duplicateConcerns: string[];
  platformConcerns: string[];
  recommendedCorrections: string[];
}

export interface GeneratedMedia {
  id: string;
  provider: string;
  mediaType: 'image' | 'video';
  originalPath?: string;
  publicUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  platform: Platform;
  success: boolean;
  platformPostId?: string;
  postUrl?: string;
  error?: string;
  retryable?: boolean;
  idempotencyKey?: string;
  publishedAt?: Date;
}

export interface PostAnalytics {
  platformPostId: string;
  platform: Platform;
  metrics: {
    impressions?: number;
    reach?: number;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
    engagementRate?: number;
    watchTimeSeconds?: number;
  };
  collectedAt: Date;
}

export interface PublishingRunRecord {
  id: string;
  runDate: string;
  executionStatus: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  postsRequested: number;
  postsGenerated: number;
  postsPublished: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}
