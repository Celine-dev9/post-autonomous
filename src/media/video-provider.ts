import { GeneratedMediaResult, IVideoProvider, VideoOptions, MockVideoProvider } from './image-provider.js';

export { GeneratedMediaResult, IVideoProvider, VideoOptions, MockVideoProvider };

export class VideoGenerationFactory {
  static getProvider(providerName?: string): IVideoProvider {
    switch (providerName) {
      case 'mock':
      default:
        return new MockVideoProvider();
    }
  }
}
