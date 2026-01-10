-- ============================================================================
-- RLS POLICIES for public read access
-- ============================================================================
-- Cần chạy trên Supabase SQL Editor để cho phép client (anon) đọc data
-- ============================================================================

-- Enable RLS on tables (if not already)
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_aliases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policy: Allow public read (SELECT) for all tables
-- ============================================================================

-- ingredients: anyone can read
CREATE POLICY "Allow public read on ingredients" 
ON ingredients FOR SELECT 
USING (true);

-- recipes: anyone can read active recipes
CREATE POLICY "Allow public read on recipes" 
ON recipes FOR SELECT 
USING (is_active = true OR is_active IS NULL);

-- recipe_ingredients: anyone can read
CREATE POLICY "Allow public read on recipe_ingredients" 
ON recipe_ingredients FOR SELECT 
USING (true);

-- recipe_steps: anyone can read  
CREATE POLICY "Allow public read on recipe_steps" 
ON recipe_steps FOR SELECT 
USING (true);

-- ingredient_aliases: anyone can read
CREATE POLICY "Allow public read on ingredient_aliases" 
ON ingredient_aliases FOR SELECT 
USING (true);

-- ============================================================================
-- Verify policies
-- ============================================================================
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('ingredients', 'recipes', 'recipe_ingredients', 'recipe_steps', 'ingredient_aliases');

