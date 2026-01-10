BEGIN;

-- ingredients
CREATE POLICY "public read ingredients"
  ON ingredients
  FOR SELECT
  USING (true);

-- recipes
CREATE POLICY "public read recipes"
  ON recipes
  FOR SELECT
  USING (true);

-- recipe_ingredients
CREATE POLICY "public read recipe_ingredients"
  ON recipe_ingredients
  FOR SELECT
  USING (true);

-- recipe_steps
CREATE POLICY "public read recipe_steps"
  ON recipe_steps
  FOR SELECT
  USING (true);

-- ingredient_aliases
CREATE POLICY "public read ingredient_aliases"
  ON ingredient_aliases
  FOR SELECT
  USING (true);

COMMIT;