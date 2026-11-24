import { ResearchEngine } from '../../research/research-engine.js';
import { logger } from '../../core/logger/index.js';

export async function researchCommand(count = 5): Promise<void> {
  console.log('\n======================================================');
  console.log(`   AUTONOMOUS TOPIC RESEARCH (Target: ${count} candidates)   `);
  console.log('======================================================\n');

  const engine = new ResearchEngine();
  const candidates = await engine.discoverTopics(count);

  console.log(`Found ${candidates.length} ranked candidate topics:\n`);

  candidates.forEach((cand, index) => {
    console.log(`[#${index + 1}] Score: ${cand.topicScore}/100 (Fresh: ${cand.freshnessScore}%, Rel: ${cand.relevanceScore}%)`);
    console.log(`  Topic:   ${cand.topic}`);
    console.log(`  Angle:   ${cand.angle}`);
    console.log(`  Pillar:  ${cand.pillarId}`);
    if (cand.sourceUrl) console.log(`  Source:  ${cand.sourceUrl}`);
    console.log(`  Reason:  ${cand.reasoning}\n`);
  });

  console.log('======================================================\n');
}
