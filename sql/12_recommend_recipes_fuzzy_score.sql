-- ============================================================================
-- Function: recommend_recipes (UPDATED with Fuzzy Matching Penalty)
-- ============================================================================
-- 
-- LOGIC CHANGES:
-- - Added logic to count 'fuzzy_matched' aliases used in the recipe
-- - Subtract 10 points for EACH fuzzy matched ingredient used
--
-- ============================================================================

-- Fix: Drop old function first because return type has changed
DROP FUNCTION IF EXISTS recommend_recipes(text[], int, text, int);

CREATE OR REPLACE FUNCTION recommend_recipes(
  selected_keys text[],
  missing_core_allow int,
  prefer_tag text,
  limit_n int
)
RETURNS TABLE (
  recipe_id bigint,
  name text,
  slug text,
  tag text,
  hero_image text,
  description text,
  core_missing int,
  missing_core_names text[],
  score numeric,
  fuzzy_count int  -- Debug info: return how many fuzzy matches were found
) AS $$
  WITH params AS (
    SELECT
      coalesce(selected_keys, '{}'::text[]) AS keys,
      greatest(1, least(coalesce(limit_n, 30), 50)) AS limit_n,
      coalesce(missing_core_allow, 2) AS missing_core_allow
  ),
  
  recipe_with_ingredients AS (
    SELECT
      r.recipe_id,
      r.name,
      r.slug,
      r.tag,
      r.hero_image,
      r.description,
      
      -- Required ingredients logic (unchanged)
      array_remove(
        array_agg(i.key) FILTER (WHERE COALESCE(i.is_core_default, FALSE) = FALSE),
        NULL
      ) AS required_keys,
      array_remove(
        array_agg(i.display_name) FILTER (WHERE COALESCE(i.is_core_default, FALSE) = FALSE),
        NULL
      ) AS required_names,
      
      -- Count fuzzy matches
      -- We assume 'match_status' column exists on 'ingredient_aliases' table
      -- and value is 'fuzzy_matched'
      count(*) FILTER (WHERE ia.match_status = 'fuzzy_matched') as fuzzy_match_count
      
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.recipe_id
    LEFT JOIN ingredient_aliases ia ON ia.id = ri.ingredient_alias_id
    LEFT JOIN ingredients i ON i.id = ia.ingredient_id
    WHERE r.is_active IS DISTINCT FROM FALSE
      AND r.slug IS NOT NULL
    GROUP BY r.recipe_id, r.name, r.slug, r.tag, r.hero_image, r.description
  ),
  
  scored AS (
    SELECT
      c.*,
      -- Missing count logic (unchanged)
      (
        SELECT count(*) 
        FROM unnest(c.required_keys) rk 
        WHERE NOT (rk = ANY(p.keys))
      ) AS missing_count,
      
      -- Find names of missing (unchanged)
      (
        SELECT array_agg(name) 
        FROM (
          SELECT unnest(c.required_names) AS name, unnest(c.required_keys) AS key
        ) AS t 
        WHERE NOT (t.key = ANY(p.keys))
      ) AS missing_names,
      
      p.keys,
      p.limit_n,
      p.missing_core_allow
    FROM recipe_with_ingredients c
    CROSS JOIN params p
  ),
  
  filtered AS (
    SELECT
      s.*,
      -- Tag Bonus (unchanged): +5
      CASE
        WHEN s.tag IS NOT NULL AND s.tag = prefer_tag THEN 5
        ELSE 0
      END AS tag_bonus,
      
      -- Fuzzy Penalty: -10 per fuzzy match
      (s.fuzzy_match_count * 10) AS fuzzy_penalty
      
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
    
    -- Score Calculation:
    -- Base: 100
    -- Missing Penalty: -10 per missing core (Unchanged)
    -- Tag Bonus: +5 (Unchanged)
    -- Fuzzy Penalty: -10 per fuzzy match (NEW)
    (100 - (f.missing_count * 10) + f.tag_bonus - f.fuzzy_penalty)::numeric AS score,
    
    f.fuzzy_match_count::int AS fuzzy_count
    
  FROM filtered f
  ORDER BY 
    score DESC, 
    f.name
  LIMIT (SELECT limit_n FROM params);
  
$$ LANGUAGE sql STABLE;
