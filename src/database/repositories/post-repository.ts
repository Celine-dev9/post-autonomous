import { getDatabaseClient } from '../client.js';
import { MasterContent, Platform, PlatformContent, PostStatus } from '../../core/types/index.js';

export interface CreateContentItemDTO {
  id: string;
  topicId?: string;
  masterContent: MasterContent;
  contentType: string;
  mediaPrompt?: string;
  qualityScore: number;
  contentStatus: string;
}

export interface CreatePlatformPostDTO {
  id: string;
  contentItemId: string;
  platform: Platform;
  platformContent: PlatformContent;
  status: PostStatus;
  idempotencyKey: string;
  scheduledAt?: Date;
}

export class PostRepository {
  private db = getDatabaseClient();

  async createContentItem(item: CreateContentItemDTO): Promise<any> {
    const { data, error } = await this.db.from('content_items').insert({
      id: item.id,
      topic_id: item.topicId || null,
      master_content: item.masterContent,
      content_type: item.contentType,
      media_prompt: item.mediaPrompt || null,
      quality_score: item.qualityScore,
      content_status: item.contentStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to create content item: ${JSON.stringify(error)}`);
    return data;
  }

  async createPlatformPost(post: CreatePlatformPostDTO): Promise<any> {
    const { data, error } = await this.db.from('platform_posts').insert({
      id: post.id,
      content_item_id: post.contentItemId,
      platform: post.platform,
      platform_content: post.platformContent,
      status: post.status,
      idempotency_key: post.idempotencyKey,
      scheduled_at: post.scheduledAt ? post.scheduledAt.toISOString() : null,
      retry_count: 0,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to create platform post: ${JSON.stringify(error)}`);
    return data;
  }

  async findPostByIdempotencyKey(key: string): Promise<any | null> {
    const { data } = await this.db.from('platform_posts').select('*').eq('idempotency_key', key).single();
    return data || null;
  }

  async updatePostStatus(
    id: string,
    status: PostStatus,
    details?: {
      platformPostId?: string;
      postUrl?: string;
      errorMessage?: string;
      publishedAt?: Date;
      retryCount?: number;
    }
  ): Promise<void> {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (details?.platformPostId) updates.platform_post_id = details.platformPostId;
    if (details?.postUrl) updates.post_url = details.postUrl;
    if (details?.errorMessage) updates.error_message = details.errorMessage;
    if (details?.publishedAt) updates.published_at = details.publishedAt.toISOString();
    if (details?.retryCount !== undefined) updates.retry_count = details.retryCount;

    await this.db.from('platform_posts').update(updates).match({ id });
  }

  async getRecentPublishedPosts(limit = 20): Promise<any[]> {
    const { data } = await this.db
      .from('platform_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
}
