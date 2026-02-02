-- Check what TtsVoicePreference enum values currently exist
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%TtsVoicePreference%'
ORDER BY t.typname, e.enumsortorder;

-- Check the User table column type
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name = 'ttsVoicePreference';

-- Check migration history
SELECT 
    migration_name,
    started_at,
    finished_at,
    applied_steps_count,
    rolled_back_at
FROM _prisma_migrations
WHERE migration_name LIKE '%voice%'
ORDER BY started_at DESC;
