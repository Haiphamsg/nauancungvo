-- ============================================================================
-- FIX: Drop existing constraint and regenerate slugs
-- ============================================================================
-- Run this if you got "duplicate key value violates unique constraint" error
-- ============================================================================

-- Step 1: Drop the existing unique constraint (if exists)
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_slug_unique;

-- Step 2: Reset all slugs to NULL to start fresh
UPDATE recipes SET slug = NULL;

-- Step 3: Generate base slug from name
UPDATE recipes 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE name IS NOT NULL;

-- Step 4: Find duplicates and append recipe_id to make unique
-- This handles cases like multiple "Sú Su Xào Trứng Muối" recipes
WITH duplicates AS (
  SELECT slug, array_agg(recipe_id ORDER BY recipe_id) as ids
  FROM recipes
  WHERE slug IS NOT NULL
  GROUP BY slug
  HAVING count(*) > 1
),
to_update AS (
  SELECT 
    unnest(ids[2:]) as recipe_id,  -- Skip first one (keep original slug)
    slug as base_slug
  FROM duplicates
)
UPDATE recipes r
SET slug = tu.base_slug || '-' || r.recipe_id::text
FROM to_update tu
WHERE r.recipe_id = tu.recipe_id;

-- Step 5: Verify no duplicates remain
DO $$
DECLARE
  dup_count int;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT slug FROM recipes WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1
  ) dups;
  
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Still have % duplicate slugs!', dup_count;
  ELSE
    RAISE NOTICE '✓ No duplicate slugs found';
  END IF;
END $$;

-- Step 6: Now add unique constraint
ALTER TABLE recipes ADD CONSTRAINT recipes_slug_unique UNIQUE (slug);

RAISE NOTICE '✓ Unique constraint added successfully';

-- Show sample slugs
SELECT recipe_id, name, slug FROM recipes WHERE slug IS NOT NULL LIMIT 10;
