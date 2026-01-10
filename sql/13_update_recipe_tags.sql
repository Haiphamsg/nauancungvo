-- ============================================================================
-- Script: Update recipe tags based on complexity
-- ============================================================================
-- Logic:
-- - Weekday: <= 3 steps AND <= 3 ingredients (simple, quick recipes)
-- - Weekend: > 3 steps OR > 3 ingredients (more complex recipes)
-- ============================================================================

UPDATE recipes r
SET tag = CASE
  WHEN step_count <= 3 AND ingredient_count <= 3 THEN 'weekday'
  ELSE 'weekend'
END
FROM (
  SELECT 
    r2.recipe_id,
    COALESCE(s.step_count, 0) AS step_count,
    COALESCE(i.ingredient_count, 0) AS ingredient_count
  FROM recipes r2
  LEFT JOIN (
    SELECT recipe_id, COUNT(*) AS step_count
    FROM recipe_steps
    GROUP BY recipe_id
  ) s ON s.recipe_id = r2.recipe_id
  LEFT JOIN (
    SELECT recipe_id, COUNT(*) AS ingredient_count
    FROM recipe_ingredients
    GROUP BY recipe_id
  ) i ON i.recipe_id = r2.recipe_id
) counts
WHERE r.recipe_id = counts.recipe_id;

-- ============================================================================
-- Verify the update
-- ============================================================================
SELECT 
  tag,
  COUNT(*) AS recipe_count
FROM recipes
GROUP BY tag
ORDER BY tag;
