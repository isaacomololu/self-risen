import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingAffirmations() {
  console.log('Starting data migration for existing affirmations...');

  try {
    // Find all reflection sessions that have a generated affirmation
    const sessionsWithAffirmations = await prisma.reflectionSession.findMany({
      where: {
        generatedAffirmation: {
          not: null,
        },
      },
      select: {
        id: true,
        generatedAffirmation: true,
        aiAffirmationAudioUrl: true,
      },
    });

    console.log(`Found ${sessionsWithAffirmations.length} sessions with affirmations to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const session of sessionsWithAffirmations) {
      // Check if affirmation already exists for this session
      const existingAffirmation = await prisma.affirmation.findFirst({
        where: {
          sessionId: session.id,
        },
      });

      if (existingAffirmation) {
        console.log(`Skipping session ${session.id} - affirmation already exists`);
        skippedCount++;
        continue;
      }

      // Create affirmation record
      await prisma.affirmation.create({
        data: {
          sessionId: session.id,
          affirmationText: session.generatedAffirmation!,
          audioUrl: session.aiAffirmationAudioUrl,
          isSelected: true,
          order: 0,
        },
      });

      migratedCount++;
      console.log(`Migrated affirmation for session ${session.id}`);
    }

    console.log(`\nMigration complete:`);
    console.log(`- Migrated: ${migratedCount} affirmations`);
    console.log(`- Skipped: ${skippedCount} affirmations (already migrated)`);
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateExistingAffirmations()
    .then(() => {
      console.log('Data migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Data migration failed:', error);
      process.exit(1);
    });
}

export { migrateExistingAffirmations };
