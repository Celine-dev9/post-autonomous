import { ContentGenerator } from '../../content/content-generator.js';
import { ContentAdapter } from '../../content/content-adapter.js';
import { getEnabledPlatforms } from '../../platforms/platform-registry.js';
import { getContentPillars } from '../../config/settings.js';
import { logger } from '../../core/logger/index.js';

export async function generateCommand(topicOverride?: string): Promise<void> {
  console.log('\n======================================================');
  console.log('       AUTONOMOUS CONTENT GENERATION INSPECTION       ');
  console.log('======================================================\n');

  const topic = topicOverride || 'Deterministic State Machine Workflows in Distributed AI Swarms';
  const angle = 'Comparing idempotent state transitions and transaction logs in production agents';
  const pillar = getContentPillars()[0]?.id || 'educational-tips';

  console.log(`Topic:    ${topic}`);
  console.log(`Angle:    ${angle}`);
  console.log(`Pillar:   ${pillar}\n`);

  const generator = new ContentGenerator();
  const adapter = new ContentAdapter();

  console.log('1. Generating Master Content & Running QA...');
  const { content, quality } = await generator.generateAndQualityCheck(topic, angle, pillar);

  console.log(`\nQA Assessment Score: ${quality.score}/100 (Passed: ${quality.passed})`);
  console.log(`Hook:        ${content.hook}`);
  console.log(`Main Point:  ${content.mainTakeaway}`);
  console.log(`CTA:         ${content.cta || 'None'}`);
  console.log(`Media Prompt:${content.imagePrompt}`);

  console.log('\n2. Adapting for Platforms...');
  const platforms = getEnabledPlatforms();
  const adaptedMap = await adapter.adaptAll(content, platforms);

  for (const [p, pc] of adaptedMap) {
    console.log(`\n---------------- [${p.toUpperCase()}] ----------------`);
    if (pc.title) console.log(`Title: ${pc.title}`);
    console.log(`Characters: ${pc.characterCount}`);
    console.log(`Hashtags:   ${pc.hashtags.join(' ')}`);
    console.log(`Text:\n${pc.text}`);
    if (pc.videoScript) {
      console.log(`Scenes (${pc.videoScript.scenes.length}): Hook: "${pc.videoScript.hook}"`);
    }
  }

  console.log('\n======================================================\n');
}
