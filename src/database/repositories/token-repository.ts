import { getDatabaseClient } from '../client.js';
import { encrypt, decrypt } from '../../core/utils/crypto.js';
import { Platform } from '../../core/types/index.js';

export interface PlatformTokenRecord {
  platform: Platform;
  accountId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export class TokenRepository {
  private db = getDatabaseClient();

  async saveTokens(tokenData: PlatformTokenRecord): Promise<void> {
    const encryptedAccess = encrypt(tokenData.accessToken);
    const encryptedRefresh = tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null;

    const row = {
      id: `token_${tokenData.platform}`,
      platform: tokenData.platform,
      account_id: tokenData.accountId || null,
      encrypted_access_token: encryptedAccess,
      encrypted_refresh_token: encryptedRefresh,
      token_expires_at: tokenData.tokenExpiresAt ? tokenData.tokenExpiresAt.toISOString() : null,
      scopes: tokenData.scopes || [],
      metadata: tokenData.metadata || {},
      updated_at: new Date().toISOString(),
    };

    // Delete existing token if present, then insert
    await this.db.from('platform_credentials').delete().eq('platform', tokenData.platform);
    await this.db.from('platform_credentials').insert(row);
  }

  async getTokens(platform: Platform): Promise<PlatformTokenRecord | null> {
    const { data } = await this.db
      .from('platform_credentials')
      .select('*')
      .eq('platform', platform)
      .single();

    if (!data) return null;

    try {
      const accessToken = decrypt(data.encrypted_access_token);
      const refreshToken = data.encrypted_refresh_token ? decrypt(data.encrypted_refresh_token) : undefined;

      return {
        platform,
        accountId: data.account_id || undefined,
        accessToken,
        refreshToken,
        tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
        scopes: data.scopes || [],
        metadata: data.metadata || {},
      };
    } catch {
      return null;
    }
  }

  async isTokenExpired(platform: Platform): Promise<boolean> {
    const record = await this.getTokens(platform);
    if (!record || !record.tokenExpiresAt) return false;
    // Check if expires within next 5 minutes
    return record.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  }
}
