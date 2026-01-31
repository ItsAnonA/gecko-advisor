/**
 * Domain Classification Script (Phase 2B)
 *
 * Classifies domains into categories using deterministic rules.
 * NO AI/LLM - brand matching and pattern matching only.
 *
 * Usage:
 *   npx tsx scripts/classify-domains.ts
 *   npx tsx scripts/classify-domains.ts --dry-run
 *   npx tsx scripts/classify-domains.ts --tier A
 */

import { PrismaClient } from '@prisma/client';
import { matchKnownBrand, matchPatterns, getKnownBrandCount, getBrandCountByCategory } from './classification';

const prisma = new PrismaClient();

const BATCH_SIZE = 500;
const MIN_CONFIDENCE = 0.85;

// Category metadata
const CATEGORY_META: Record<string, { name: string; description: string }> = {
  streaming: {
    name: 'Streaming & Media',
    description: 'Video streaming, music streaming, podcasts, and media platforms',
  },
  ecommerce: {
    name: 'E-Commerce & Retail',
    description: 'Online stores, marketplaces, and retail websites',
  },
  saas: {
    name: 'SaaS & Business Tools',
    description: 'Software as a service, productivity tools, and business applications',
  },
  news: {
    name: 'News & Media',
    description: 'News outlets, journalism, blogs, and media publications',
  },
  social: {
    name: 'Social Media',
    description: 'Social networking platforms, community sites, and content sharing networks',
  },
  finance: {
    name: 'Finance & Banking',
    description: 'Banks, fintech, investment platforms, and financial services',
  },
  healthcare: {
    name: 'Healthcare',
    description: 'Hospitals, telehealth, medical resources, and health information sites',
  },
  education: {
    name: 'Education',
    description: 'Online learning, universities, K-12, and educational resources',
  },
  travel: {
    name: 'Travel & Booking',
    description: 'Travel booking, airlines, hotels, and vacation planning',
  },
  gaming: {
    name: 'Gaming',
    description: 'Video games, gaming platforms, esports, and game-related services',
  },
};

interface ClassificationResult {
  domainId: string;
  domain: string;
  category: string;
  confidence: number;
  method: 'brand_match' | 'pattern_match';
}

async function classifyDomains(options: { dryRun?: boolean; tier?: string }) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       DETERMINISTIC DOMAIN CLASSIFICATION (Phase 2B)       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No database changes will be made\n');
  }

  console.log(`Minimum confidence threshold: ${MIN_CONFIDENCE}`);
  console.log(`Known brands loaded: ${getKnownBrandCount()}`);
  console.log(`Brand distribution: ${JSON.stringify(getBrandCountByCategory())}\n`);

  // === STEP 1: Ensure categories exist ===
  console.log('Step 1: Ensuring categories exist...');
  for (const [slug, meta] of Object.entries(CATEGORY_META)) {
    if (!options.dryRun) {
      await prisma.category.upsert({
        where: { slug },
        create: { slug, name: meta.name, description: meta.description },
        update: { name: meta.name, description: meta.description },
      });
    }
    console.log(`  ✓ ${slug}: ${meta.name}`);
  }
  console.log();

  // === STEP 2: Get domains to classify ===
  console.log('Step 2: Finding unclassified domains...');

  const whereClause: Record<string, unknown> = {
    categoryId: null, // Not yet classified
  };

  // Filter by tier if specified
  if (options.tier) {
    whereClause.indexTier = options.tier.toUpperCase();
    console.log(`  Filtering to Tier ${options.tier.toUpperCase()} only`);
  } else {
    whereClause.indexTier = { in: ['A', 'B'] }; // Only classify Tier A and B
    console.log(`  Processing Tier A and B domains`);
  }

  const domains = await prisma.domain.findMany({
    where: whereClause,
    select: { id: true, domain: true },
  });

  console.log(`  Found ${domains.length} unclassified domains\n`);

  if (domains.length === 0) {
    console.log('✅ All eligible domains are already classified!');
    return;
  }

  // === STEP 3: Classify domains ===
  console.log('Step 3: Classifying domains...');

  const results: ClassificationResult[] = [];
  let brandMatches = 0;
  let patternMatches = 0;
  let unclassified = 0;

  for (const d of domains) {
    // Try known brand first (higher confidence)
    const brandMatch = matchKnownBrand(d.domain);
    if (brandMatch && brandMatch.confidence >= MIN_CONFIDENCE) {
      results.push({
        domainId: d.id,
        domain: d.domain,
        category: brandMatch.category,
        confidence: brandMatch.confidence,
        method: 'brand_match',
      });
      brandMatches++;
      continue;
    }

    // Try pattern matching
    const patternMatch = matchPatterns(d.domain, MIN_CONFIDENCE);
    if (patternMatch) {
      results.push({
        domainId: d.id,
        domain: d.domain,
        category: patternMatch.category,
        confidence: patternMatch.confidence,
        method: 'pattern_match',
      });
      patternMatches++;
      continue;
    }

    // Leave unclassified (this is correct behavior)
    unclassified++;
  }

  console.log(`\nClassification results:`);
  console.log(`  Brand matches:   ${brandMatches.toLocaleString()}`);
  console.log(`  Pattern matches: ${patternMatches.toLocaleString()}`);
  console.log(`  Unclassified:    ${unclassified.toLocaleString()} (correct - low confidence)\n`);

  // Show sample matches
  if (results.length > 0) {
    console.log('Sample brand matches:');
    results
      .filter((r) => r.method === 'brand_match')
      .slice(0, 5)
      .forEach((r) => {
        console.log(`  ${r.domain} → ${r.category} (${(r.confidence * 100).toFixed(0)}%)`);
      });

    console.log('\nSample pattern matches:');
    results
      .filter((r) => r.method === 'pattern_match')
      .slice(0, 5)
      .forEach((r) => {
        console.log(`  ${r.domain} → ${r.category} (${(r.confidence * 100).toFixed(0)}%)`);
      });
    console.log();
  }

  // === STEP 4: Update database ===
  if (options.dryRun) {
    console.log('Step 4: SKIPPED (dry run)\n');
  } else {
    console.log('Step 4: Updating database...');

    // Get category IDs
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map((c) => [c.slug, c.id]));

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(
        batch.map((r) =>
          prisma.domain.update({
            where: { id: r.domainId },
            data: {
              categoryId: categoryMap.get(r.category),
              categoryConfidence: r.confidence,
              classifiedAt: new Date(),
              classifiedBy: r.method,
            },
          })
        )
      );

      const progress = Math.min(i + BATCH_SIZE, results.length);
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${progress}/${results.length} domains`);
    }
    console.log();
  }

  // === STEP 5: Print distribution ===
  console.log('Step 5: Category distribution:');

  if (!options.dryRun) {
    const distribution = await prisma.domain.groupBy({
      by: ['categoryId'],
      where: { categoryId: { not: null } },
      _count: true,
    });

    for (const d of distribution) {
      const cat = await prisma.category.findUnique({ where: { id: d.categoryId! } });
      console.log(`  ${cat?.name}: ${d._count.toLocaleString()}`);
    }

    const nullCount = await prisma.domain.count({
      where: { categoryId: null, indexTier: { in: ['A', 'B'] } },
    });
    console.log(`  Uncategorized: ${nullCount.toLocaleString()}`);
  } else {
    // Show projected distribution from results
    const projected: Record<string, number> = {};
    for (const r of results) {
      projected[r.category] = (projected[r.category] || 0) + 1;
    }
    for (const [cat, count] of Object.entries(projected)) {
      const meta = CATEGORY_META[cat];
      console.log(`  ${meta?.name || cat}: ${count.toLocaleString()}`);
    }
    console.log(`  Would remain unclassified: ${unclassified.toLocaleString()}`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║               CLASSIFICATION COMPLETE                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  tier: args.find((a) => a.startsWith('--tier'))?.split('=')[1] || args[args.indexOf('--tier') + 1],
};

classifyDomains(options)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
