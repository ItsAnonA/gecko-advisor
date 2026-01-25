/**
 * Seed Sample Comparisons Script
 *
 * Seeds curated comparison pairs for UX demonstration.
 * IMPORTANT: This is UX scaffolding, NOT SEO content.
 *
 * Rules:
 * - Max 3 samples per category (HARD LIMIT)
 * - Both domains MUST have completed scans
 * - Avoid famous/dominant brands (Google, Amazon, Netflix)
 * - Same industry, same region when possible
 *
 * Usage:
 *   npx tsx scripts/seed-sample-comparisons.ts
 *   npx tsx scripts/seed-sample-comparisons.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_SAMPLES_PER_CATEGORY = 3;

interface SamplePair {
  categorySlug: string;
  domainA: string;
  domainB: string;
  label: string;
  description?: string;
}

/**
 * CURATED sample pairs - same industry, same region, similar size
 * Ordered by preference - script will use first available pairs
 * Avoid: Famous brands, extreme outliers, controversial sites
 */
const SAMPLE_COMPARISONS: SamplePair[] = [
  // === E-Commerce & Retail ===
  {
    categorySlug: 'ecommerce',
    domainA: 'asos.com',
    domainB: 'hm.com',
    label: 'Fashion Retailers',
    description: 'Compare fashion e-commerce privacy',
  },
  {
    categorySlug: 'ecommerce',
    domainA: 'bestbuy.com',
    domainB: 'costco.com',
    label: 'Big Box Retail (US)',
    description: 'American retail chains',
  },
  {
    categorySlug: 'ecommerce',
    domainA: 'wayfair.com',
    domainB: 'etsy.com',
    label: 'Home & Handmade',
    description: 'Home goods and crafts marketplaces',
  },
  {
    categorySlug: 'ecommerce',
    domainA: 'zappos.com',
    domainB: 'nordstrom.com',
    label: 'Shoes & Fashion',
    description: 'Fashion and footwear retailers',
  },
  {
    categorySlug: 'ecommerce',
    domainA: 'nike.com',
    domainB: 'adidas.com',
    label: 'Sportswear Brands',
    description: 'Athletic apparel brands',
  },

  // === SaaS & Business Tools ===
  {
    categorySlug: 'saas',
    domainA: 'figma.com',
    domainB: 'canva.com',
    label: 'Design Tools',
    description: 'Visual design platforms',
  },
  {
    categorySlug: 'saas',
    domainA: 'airtable.com',
    domainB: 'coda.io',
    label: 'Flexible Databases',
    description: 'No-code database platforms',
  },
  {
    categorySlug: 'saas',
    domainA: 'asana.com',
    domainB: 'monday.com',
    label: 'Project Management',
    description: 'Team productivity tools',
  },
  {
    categorySlug: 'saas',
    domainA: 'slack.com',
    domainB: 'discord.com',
    label: 'Team Chat',
    description: 'Communication platforms',
  },
  {
    categorySlug: 'saas',
    domainA: 'notion.so',
    domainB: 'clickup.com',
    label: 'Workspace Tools',
    description: 'All-in-one workspace apps',
  },

  // === Streaming & Media ===
  {
    categorySlug: 'streaming',
    domainA: 'spotify.com',
    domainB: 'deezer.com',
    label: 'Music Streaming',
    description: 'Music streaming services',
  },
  {
    categorySlug: 'streaming',
    domainA: 'twitch.tv',
    domainB: 'kick.com',
    label: 'Live Streaming',
    description: 'Live streaming platforms',
  },
  {
    categorySlug: 'streaming',
    domainA: 'soundcloud.com',
    domainB: 'bandcamp.com',
    label: 'Independent Music',
    description: 'Artist-focused music platforms',
  },
  {
    categorySlug: 'streaming',
    domainA: 'vimeo.com',
    domainB: 'dailymotion.com',
    label: 'Video Platforms',
    description: 'Video hosting services',
  },
  {
    categorySlug: 'streaming',
    domainA: 'peacocktv.com',
    domainB: 'paramountplus.com',
    label: 'TV Streaming',
    description: 'TV network streaming services',
  },

  // === News & Media ===
  {
    categorySlug: 'news',
    domainA: 'theverge.com',
    domainB: 'arstechnica.com',
    label: 'Tech News',
    description: 'Technology journalism sites',
  },
  {
    categorySlug: 'news',
    domainA: 'medium.com',
    domainB: 'substack.com',
    label: 'Publishing Platforms',
    description: 'Writer-focused platforms',
  },
  {
    categorySlug: 'news',
    domainA: 'reuters.com',
    domainB: 'apnews.com',
    label: 'Wire Services',
    description: 'News wire services',
  },
  {
    categorySlug: 'news',
    domainA: 'techcrunch.com',
    domainB: 'engadget.com',
    label: 'Tech Media',
    description: 'Technology news outlets',
  },
  {
    categorySlug: 'news',
    domainA: 'forbes.com',
    domainB: 'businessinsider.com',
    label: 'Business News',
    description: 'Business and finance news',
  },
];

async function seedSampleComparisons(dryRun: boolean = false) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          SEEDING SAMPLE COMPARISONS                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No database changes will be made\n');
  }

  // Get all categories
  const categories = await prisma.category.findMany();
  console.log(`Found ${categories.length} categories\n`);

  if (categories.length === 0) {
    console.log('❌ No categories found. Run classify-domains.ts first.');
    return;
  }

  // Clear existing samples (if not dry run)
  if (!dryRun) {
    await prisma.sampleComparison.deleteMany();
    console.log('Cleared existing samples\n');
  }

  const results: { category: string; created: number; skipped: string[] }[] = [];

  for (const category of categories) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Processing: ${category.name} (${category.slug})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Filter samples for this category
    const categorySamples = SAMPLE_COMPARISONS.filter((s) => s.categorySlug === category.slug);

    let created = 0;
    const skipped: string[] = [];

    for (const sample of categorySamples) {
      // Stop if we've reached the max
      if (created >= MAX_SAMPLES_PER_CATEGORY) {
        console.log(`  ⚠️  Reached max ${MAX_SAMPLES_PER_CATEGORY} samples for this category`);
        break;
      }

      // Check if both domains exist and have scans
      const domainA = await prisma.domain.findFirst({
        where: { domain: sample.domainA },
        include: { latestScan: { select: { status: true, score: true } } },
      });

      const domainB = await prisma.domain.findFirst({
        where: { domain: sample.domainB },
        include: { latestScan: { select: { status: true, score: true } } },
      });

      // Verify both domains have completed scans
      const aHasScan = domainA?.latestScan?.status === 'done' && domainA?.latestScan?.score !== null;
      const bHasScan = domainB?.latestScan?.status === 'done' && domainB?.latestScan?.score !== null;

      if (!aHasScan || !bHasScan) {
        const missing: string[] = [];
        if (!aHasScan) missing.push(sample.domainA);
        if (!bHasScan) missing.push(sample.domainB);
        skipped.push(`${sample.label}: missing scan for ${missing.join(', ')}`);
        continue;
      }

      // Create sample comparison
      if (!dryRun) {
        await prisma.sampleComparison.create({
          data: {
            categoryId: category.id,
            domainA: sample.domainA,
            domainB: sample.domainB,
            label: sample.label,
            description: sample.description,
            sortOrder: created,
            active: true,
          },
        });
      }

      console.log(`  ✅ ${sample.label}: ${sample.domainA} vs ${sample.domainB}`);
      created++;
    }

    if (skipped.length > 0) {
      console.log(`  Skipped:`);
      skipped.forEach((s) => console.log(`    ⚠️  ${s}`));
    }

    console.log(`  Created: ${created}/${MAX_SAMPLES_PER_CATEGORY}\n`);

    results.push({ category: category.name, created, skipped });
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                       SUMMARY                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Category                | Created | Status');
  console.log('────────────────────────────────────────────────');
  for (const r of results) {
    const status =
      r.created >= MAX_SAMPLES_PER_CATEGORY
        ? '✅ Full'
        : r.created > 0
          ? '⚠️  Partial'
          : '❌ Empty';
    console.log(`${r.category.padEnd(22)} | ${String(r.created).padStart(7)} | ${status}`);
  }

  const total = results.reduce((sum, r) => sum + r.created, 0);
  console.log(`────────────────────────────────────────────────`);
  console.log(`Total samples: ${total}\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - No changes made. Run without --dry-run to apply.\n');
  } else {
    console.log('✅ Sample comparisons seeded successfully!\n');
  }
}

// Parse args
const dryRun = process.argv.includes('--dry-run');

seedSampleComparisons(dryRun)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
