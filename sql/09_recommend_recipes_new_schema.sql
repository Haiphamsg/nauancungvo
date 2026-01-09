-- ============================================================================
-- Function: recommend_recipes (UPDATED for new schema)
-- ============================================================================
-- 
-- SCHEMA CHANGES from OLD to NEW:
-- --------------------------------
-- OLD                              | NEW
-- -------------------------------- | ------------------------------------
-- recipes.id (uuid)                | recipes.recipe_id (bigint)
-- recipes.category                 | ❌ REMOVED
-- recipes.cook_time_minutes        | ❌ REMOVED
-- recipes.image_url                | recipes.hero_image
-- recipe_ingredients.ingredient_id | ❌ REMOVED - join via ingredient_aliases
-- recipe_ingredients.role          | ❌ REMOVED - no core/optional distinction
--
-- LOGIC CHANGES:
-- - Bỏ cook_time penalty (không có cook_time_minutes)
-- - Bỏ role filter (không có role) - dùng is_core_default để xác định "required" ingredients
-- - Join qua ingredient_aliases thay vì trực tiếp
-- - Return recipe_id (bigint) thay vì id (uuid)
-- - Return hero_image thay vì image_url
-- - Bỏ category, cook_time_minutes từ return
--
-- ============================================================================

CREATE OR REPLACE FUNCTION recommend_recipes(
  selected_keys text[],
  missing_core_allow int,
  prefer_tag text,  -- Changed from recipe_tag enum to text for flexibility
  limit_n int
)
RETURNS TABLE (
  recipe_id bigint,           -- OLD: id uuid
  name text,
  slug text,
  tag text,                   -- OLD: recipe_tag enum
  hero_image text,            -- OLD: image_url
  description text,           -- NEW: added for display
  core_missing int,
  missing_core_names text[],
  score numeric
  -- REMOVED: category, cook_time_minutes
) AS $$
  WITH params AS (
    SELECT
      coalesce(selected_keys, '{}'::text[]) AS keys,
      greatest(1, least(coalesce(limit_n, 30), 50)) AS limit_n,
      coalesce(missing_core_allow, 2) AS missing_core_allow
  ),
  
  -- Get recipe ingredients by joining through ingredient_aliases
  -- OLD: recipe_ingredients.ingredient_id -> ingredients
  -- NEW: recipe_ingredients.ingredient_alias_id -> ingredient_aliases.ingredient_id -> ingredients
  recipe_with_ingredients AS (
    SELECT
      r.recipe_id,
      r.name,
      r.slug,
      r.tag,
      r.hero_image,
      r.description,
      -- "Required" ingredients = ingredients that are NOT pantry defaults (is_core_default = false)
      -- OLD: used role = 'core' to filter
      -- NEW: all ingredients are considered, filter by is_core_default
      array_remove(
        array_agg(i.key) FILTER (WHERE COALESCE(i.is_core_default, FALSE) = FALSE),
        NULL
      ) AS required_keys,
      array_remove(
        array_agg(i.display_name) FILTER (WHERE COALESCE(i.is_core_default, FALSE) = FALSE),
        NULL
      ) AS required_names
    FROM recipes r
    -- Join path: recipe_ingredients -> ingredient_aliases -> ingredients
    LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.recipe_id
    LEFT JOIN ingredient_aliases ia ON ia.id = ri.ingredient_alias_id
    LEFT JOIN ingredients i ON i.id = ia.ingredient_id
    WHERE r.is_active IS DISTINCT FROM FALSE
      AND r.slug IS NOT NULL  -- Only recipes with slug can be accessed
    GROUP BY r.recipe_id, r.name, r.slug, r.tag, r.hero_image, r.description
  ),
  
  scored AS (
    SELECT
      c.*,
      -- Find which required ingredients are missing from selected_keys
      (
        SELECT array_agg(name) 
        FROM (
          SELECT unnest(c.required_names) AS name, unnest(c.required_keys) AS key
        ) AS t 
        WHERE NOT (t.key = ANY(p.keys))
      ) AS missing_names,
      -- Count how many required ingredients are missing
      (
        SELECT count(*) 
        FROM unnest(c.required_keys) rk 
        WHERE NOT (rk = ANY(p.keys))
      ) AS missing_count,
      p.keys,
      p.limit_n,
      p.missing_core_allow
    FROM recipe_with_ingredients c
    CROSS JOIN params p
  ),
  
  filtered AS (
    SELECT
      s.*,
      -- Tag bonus: +5 points if recipe tag matches preferred tag
      CASE
        WHEN s.tag IS NOT NULL AND s.tag = prefer_tag THEN 5
        ELSE 0
      END AS tag_bonus
      -- OLD: had cook_penalty based on cook_time_minutes
      -- NEW: removed (no cook_time_minutes in schema)
    FROM scored s
    WHERE s.missing_count <= s.missing_core_allow
  )
  
  SELECT
    f.recipe_id,
    f.name,
    f.slug,
    f.tag,
    f.hero_image,
    f.description,
    f.missing_count::int AS core_missing,
    COALESCE(f.missing_names, ARRAY[]::text[]) AS missing_core_names,
    -- Score calculation: 
    -- OLD: 100 - (missing * 10) + tag_bonus - cook_penalty
    -- NEW: 100 - (missing * 10) + tag_bonus (no cook_penalty)
    (100 - (f.missing_count * 10) + f.tag_bonus)::numeric AS score
  FROM filtered f
  ORDER BY 
    score DESC, 
    f.name  -- OLD: ordered by cook_time_minutes, now just by name
  LIMIT (SELECT limit_n FROM params);
  
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- GRANT permissions (if using RLS)
-- ============================================================================
-- GRANT EXECUTE ON FUNCTION recommend_recipes(text[], int, text, int) TO anon;
-- GRANT EXECUTE ON FUNCTION recommend_recipes(text[], int, text, int) TO authenticated;
