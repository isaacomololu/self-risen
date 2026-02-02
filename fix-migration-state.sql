-- Fix Migration State Script
-- Run this on your production database

BEGIN;

-- Step 1: Check if TtsVoicePreference_new or TtsVoicePreference_old types exist (cleanup from failed migration)
DROP TYPE IF EXISTS "TtsVoicePreference_new" CASCADE;
DROP TYPE IF EXISTS "TtsVoicePreference_old" CASCADE;

-- Step 2: Check current enum type and recreate if needed
-- First, let's see what we have (this will error if type doesn't exist, that's ok)
DO $$ 
DECLARE
    current_values text[];
BEGIN
    -- Get current enum values
    SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
    INTO current_values
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'TtsVoicePreference';

    RAISE NOTICE 'Current TtsVoicePreference values: %', current_values;
END $$;

COMMIT;

-- Now decide what to do based on the output above
-- If you see the old values (MALE, FEMALE, ANDROGYNOUS), the migration never applied
-- If you see the new values (MALE_CONFIDENT, etc.), the migration partially applied
-- If you see something else, we need to manually fix it
