-- Rebalance recommend_recipes with mild cook-time penalty (capped at 8)
-- Signature preserved

CREATE OR REPLACE FUNCTION recommend_recipes(
  selected_keys text[],
  missing_core_allow int,
  prefer_tag recipe_tag,
  limit_n int
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  tag recipe_tag,
  category text,
  image_url text,
  cook_time_minutes int,
  core_missing int,
  missing_core_names text[],
  score numeric
) AS $$
  WITH params AS (
    SELECT
      coalesce(selected_keys, '{}'::text[]) AS keys,
      greatest(1, least(coalesce(limit_n, 30), 50)) AS limit_n,
      coalesce(missing_core_allow, 2) AS missing_core_allow
  ),
  core AS (
    SELECT
      r.id,
      r.name,
      r.slug,
      r.tag,
      r.category,
      r.image_url,
      r.cook_time_minutes,
      -- "Core" for recommendation = required ingredients for the recipe,
      -- excluding pantry defaults (e.g. salt/fish sauce) that the product auto-selects.
      array_remove(
        array_agg(i.key) FILTER (WHERE ri.role = 'core' AND COALESCE(i.is_core_default, FALSE) = FALSE),
        NULL
      ) AS core_keys,
      array_remove(
        array_agg(i.display_name) FILTER (WHERE ri.role = 'core' AND COALESCE(i.is_core_default, FALSE) = FALSE),
        NULL
      ) AS core_names
    FROM recipes r
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE r.is_active IS DISTINCT FROM FALSE
    GROUP BY r.id, r.name, r.slug, r.tag, r.category, r.image_url, r.cook_time_minutes
  ),
  scored AS (
    SELECT
      c.*,
      (SELECT array_agg(name) FROM (SELECT unnest(c.core_names) AS name, unnest(c.core_keys) AS key) AS t WHERE NOT (t.key = ANY(p.keys))) AS missing_names,
      (SELECT count(*) FROM unnest(c.core_keys) ck WHERE NOT (ck = ANY(p.keys))) AS missing_count,
      p.keys,
      p.limit_n,
      p.missing_core_allow
    FROM core c
    CROSS JOIN params p
  ),
  filtered AS (
    SELECT
      s.*,
      CASE
        WHEN s.tag IS NOT NULL AND s.tag = prefer_tag THEN 5
        ELSE 0
      END AS tag_bonus,
      LEAST(8, COALESCE(s.cook_time_minutes, 0) / 10.0) AS cook_penalty
    FROM scored s
    WHERE s.missing_count <= s.missing_core_allow
  )
  SELECT
    id,
    name,
    slug,
    tag,
    category,
    image_url,
    cook_time_minutes,
    missing_count AS core_missing,
    COALESCE(missing_names, ARRAY[]::text[]) AS missing_core_names,
    (100 - (missing_count * 10) + tag_bonus - cook_penalty) AS score
  FROM filtered
  ORDER BY score DESC, cook_time_minutes NULLS LAST, name
  LIMIT (SELECT limit_n FROM params);
$$ LANGUAGE sql STABLE;
