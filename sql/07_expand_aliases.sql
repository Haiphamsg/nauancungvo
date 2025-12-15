-- Expand practical Vietnamese aliases; idempotent

INSERT INTO ingredient_aliases (ingredient_id, alias, alias_norm)
SELECT i.id, 'hành boa', 'hanh boa'
FROM ingredients i
WHERE i.key = 'hanh_la'
ON CONFLICT DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_id, alias, alias_norm)
SELECT i.id, 'xì dầu', 'xi dau'
FROM ingredients i
WHERE i.key = 'nuoc_tuong'
ON CONFLICT DO NOTHING;

INSERT INTO ingredient_aliases (ingredient_id, alias, alias_norm)
SELECT i.id, 'cà pháo', 'ca phao'
FROM ingredients i
WHERE i.key = 'ca_phao'
ON CONFLICT DO NOTHING;
