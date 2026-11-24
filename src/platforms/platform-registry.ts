import { Platform } from '../core/types/index.js';
import { IPlatformAdapter } from './platform-interface.js';
import { XAdapter } from './x/x-adapter.js';
import { FacebookAdapter } from './facebook/facebook-adapter.js';
import { InstagramAdapter } from './instagram/instagram-adapter.js';
import { LinkedInAdapter } from './linkedin/linkedin-adapter.js';
import { YouTubeAdapter } from './youtube/youtube-adapter.js';
import { getPlatformsConfig } from '../config/platform-config.js';

const adapterCache = new Map<Platform, IPlatformAdapter>();

export function getPlatformAdapter(platform: Platform): IPlatformAdapter {
  if (adapterCache.has(platform)) return adapterCache.get(platform)!;

  let adapter: IPlatformAdapter;
  switch (platform) {
    case 'x':         adapter = new XAdapter(); break;
    case 'facebook':  adapter = new FacebookAdapter(); break;
    case 'instagram': adapter = new InstagramAdapter(); break;
    case 'linkedin':  adapter = new LinkedInAdapter(); break;
    case 'youtube':   adapter = new YouTubeAdapter(); break;
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }

  adapterCache.set(platform, adapter);
  return adapter;
}

export function getEnabledAdapters(): IPlatformAdapter[] {
  const config = getPlatformsConfig();
  const platforms: Platform[] = ['x', 'facebook', 'instagram', 'linkedin', 'youtube'];
  return platforms
    .filter((p) => config[p].enabled)
    .map((p) => getPlatformAdapter(p));
}

export function getEnabledPlatforms(): Platform[] {
  const config = getPlatformsConfig();
  const platforms: Platform[] = ['x', 'facebook', 'instagram', 'linkedin', 'youtube'];
  return platforms.filter((p) => config[p].enabled);
}
