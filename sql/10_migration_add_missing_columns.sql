-- ============================================================================
-- MIGRATION: Schema changes for new Supabase project
-- ============================================================================
-- Run this BEFORE the recommend_recipes function (09_recommend_recipes_new_schema.sql)
-- 
-- This adds missing columns required by the backend code
-- ============================================================================

-- ============================================================================
-- 1. TABLE: recipes - Add missing columns
-- ============================================================================

-- Add slug column (required for recipe lookup by slug)
-- NOTE: Unique constraint sẽ được add SAU khi handle duplicates (xem bên dưới)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS slug text;

-- Add tag column for weekday/weekend filtering
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tag text DEFAULT 'weekday';

-- Add is_active column for soft delete
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Generate slug from name for existing recipes (one-time migration)
-- Step 1: Generate base slug from name
UPDATE recipes 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL AND name IS NOT NULL;

-- Step 2: Find duplicates and append recipe_id to make unique
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

-- Step 3: Now add unique constraint (after duplicates are fixed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipes_slug_unique'
  ) THEN
    ALTER TABLE recipes ADD CONSTRAINT recipes_slug_unique UNIQUE (slug);
  END IF;
EXCEPTION
  WHEN others THEN 
    RAISE NOTICE 'Unique constraint already exists or could not be added: %', SQLERRM;
END $$;

-- ============================================================================
-- 2. TABLE: ingredients - Add missing columns
-- ============================================================================

-- Add is_core_default column (identifies pantry staples like salt, fish sauce)
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS is_core_default boolean DEFAULT false;

-- ============================================================================
-- 3. INDEXES for performance
-- ============================================================================

-- Index on recipes.slug for fast lookup
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);

-- Index on recipes.is_active for filtering
CREATE INDEX IF NOT EXISTS idx_recipes_is_active ON recipes(is_active);

-- Index on recipes.tag for filtering
CREATE INDEX IF NOT EXISTS idx_recipes_tag ON recipes(tag);

-- Index on ingredients.is_core_default for filtering
CREATE INDEX IF NOT EXISTS idx_ingredients_is_core_default ON ingredients(is_core_default);

-- ============================================================================
-- 4. VERIFY CHANGES
-- ============================================================================

-- Check recipes columns
DO $$
BEGIN
  RAISE NOTICE 'Checking recipes table columns...';
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'slug') THEN
    RAISE NOTICE '✓ recipes.slug exists';
  ELSE
    RAISE WARNING '✗ recipes.slug missing!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'tag') THEN
    RAISE NOTICE '✓ recipes.tag exists';
  ELSE
    RAISE WARNING '✗ recipes.tag missing!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'is_active') THEN
    RAISE NOTICE '✓ recipes.is_active exists';
  ELSE
    RAISE WARNING '✗ recipes.is_active missing!';
  END IF;
  
  -- Check ingredients
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ingredients' AND column_name = 'is_core_default') THEN
    RAISE NOTICE '✓ ingredients.is_core_default exists';
  ELSE
    RAISE WARNING '✗ ingredients.is_core_default missing!';
  END IF;
END $$;

-- ============================================================================
-- DONE! Now run: sql/09_recommend_recipes_new_schema.sql
-- ============================================================================
