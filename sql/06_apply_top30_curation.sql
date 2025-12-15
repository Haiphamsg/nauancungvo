-- Apply curated top 30 recipes: ingredients and steps
-- Idempotent: skips missing recipes/ingredients, re-runnable safely.

DO $$
DECLARE
  r RECORD;
  rec_id recipes.id%TYPE;
BEGIN
  FOR r IN
    SELECT *
    FROM (
      VALUES
        -- slug, core_ingredients, optional_ingredients, steps, cook_time_minutes, difficulty
        ('trung-xao-ca-chua', ARRAY['trung_ga','ca_chua','hanh_la','dau_an','nuoc_mam'], ARRAY['tieu','duong','hanh_tay'], ARRAY['Đánh tan trứng với chút nước mắm và tiêu.','Phi thơm hành với dầu, cho cà chua vào xào mềm nêm nếm.','Đổ trứng vào chảo, đảo nhẹ cho chín bông.','Thêm hành lá cắt nhỏ, tắt bếp và dọn nóng.'], 15, 'easy'),
        ('thit-kho-tieu', ARRAY['thit_heo_ba_chi','toi','tieu','nuoc_mam','duong'], ARRAY['hanh_tay','ot'], ARRAY['Thịt cắt khúc, ướp nước mắm, tiêu, đường, tỏi.','Thắng đường tạo màu, cho thịt vào đảo săn.','Đổ nước sâm sấp, kho lửa nhỏ đến khi mềm.','Nêm lại vừa ăn, thêm tiêu xay trước khi tắt bếp.'], 45, 'medium'),
        ('canh-cai-nau-thit', ARRAY['thit_bam','cai_ngot','hanh_la','nuoc_mam'], ARRAY['tieu'], ARRAY['Ướp thịt băm với nước mắm, tiêu.','Phi thơm hành, xào sơ thịt cho tơi.','Đổ nước, đun sôi rồi cho rau cải vào.','Nêm nếm vừa ăn, thêm hành lá, tắt bếp.'], 20, 'easy'),
        ('rau-muong-xao-toi', ARRAY['rau_muong','toi','dau_an','muoi'], ARRAY['ot'], ARRAY['Nhặt rau muống, rửa sạch để ráo.','Phi thơm tỏi với dầu, cho rau vào xào lửa lớn.','Nêm muối hoặc nước mắm, đảo nhanh tay.','Tắt bếp khi rau vừa chín giòn.'], 10, 'easy'),
        ('ga-kho-gung', ARRAY['thit_ga','gung','toi','nuoc_mam','duong'], ARRAY['ot','hanh_tay'], ARRAY['Ướp gà với nước mắm, đường, gừng, tỏi.','Thắng đường tạo màu, cho gà vào đảo săn.','Thêm nước sôi, kho lửa nhỏ cho gà mềm.','Nêm lại, cho thêm gừng sợi, kho sệt nước.'], 35, 'medium'),
        ('dau-hu-sot-ca', ARRAY['dau_hu','ca_chua','hanh_la','toi','nuoc_mam'], ARRAY['ot','duong'], ARRAY['Chiên vàng đậu hũ, để ráo dầu.','Phi tỏi, xào cà chua với chút nước mắm và đường.','Cho đậu vào chảo sốt, rim 5-7 phút cho thấm.','Rắc hành lá, tắt bếp và dọn ăn nóng.'], 20, 'easy'),
        ('canh-chua-ca', ARRAY['ca','thom','ca_chua','dua_gia','can_tau','nuoc_mam'], ARRAY['ot','rau_ram'], ARRAY['Ướp cá nhẹ với muối, tiêu.','Nấu nước sôi với thơm và cà chua.','Thêm cá, nấu chín rồi cho giá, cần, nêm mắm chua ngọt.','Tắt bếp, thêm rau thơm và ớt nếu thích.'], 25, 'medium'),
        ('bo-kho', ARRAY['thit_bo','sa','gung','toi','hanh_tay','bo_kho_bot','nuoc_mam'], ARRAY['ca_rot','khoai_tay'], ARRAY['Ướp bò với gia vị bò kho, sả, gừng, tỏi, nước mắm.','Xào săn thịt bò, thêm nước hoặc nước dừa.','Hầm nhỏ lửa đến khi bò mềm, cho cà rốt/khoai tây nếu dùng.','Nêm lại, ăn kèm bánh mì hoặc bún.'], 70, 'medium'),
        ('pho-bo', ARRAY['banh_pho','thit_bo','hanh_tay','hanh_la','gung','que','nuoc_mam'], ARRAY['ot'], ARRAY['Hầm xương/thịt bò với gừng, hành nướng, quế để lấy nước dùng.','Chần bánh phở qua nước sôi, để ráo.','Trụng thịt bò thái mỏng trong nước dùng.','Xếp bánh phở, thịt, chan nước dùng, thêm hành lá và gia vị.'], 90, 'hard'),
        ('bun-thit-nuong', ARRAY['bun','thit_heo','sa','toi','nuoc_mam','duong'], ARRAY['rau_song','dua_chua','ot'], ARRAY['Ướp thịt heo với sả, tỏi, nước mắm, đường.','Nướng hoặc áp chảo thịt đến khi chín thơm.','Pha nước mắm chua ngọt.','Xếp bún, rau, thịt nướng, chan nước mắm, thêm đồ chua.'], 35, 'medium'),
        ('banh-mi-op-la', ARRAY['trung_ga','banh_mi','dau_an','nuoc_tuong'], ARRAY['pate','xuc_xich','hanh_tay'], ARRAY['Làm nóng chảo, cho ít dầu.','Đập trứng vào chảo, chiên lòng đào hoặc chín tùy thích.','Nêm chút nước tương, tiêu.','Dùng kèm bánh mì, thêm pate/xúc xích nếu thích.'], 10, 'easy'),
        ('com-chien-duong-chau', ARRAY['com_nguoi','trung_ga','lap_xuong','ca_rot','hanh_la','dau_an','nuoc_tuong'], ARRAY['ngu_vi_huong'], ARRAY['Đánh trứng, chiên sơ và thái vụn.','Xào lạp xưởng, cà rốt với chút dầu.','Cho cơm vào đảo tơi, nêm nước tương.','Thêm trứng, hành lá, đảo đều và tắt bếp.'], 20, 'easy'),
        ('mi-xao-bo', ARRAY['mi_trung','thit_bo','toi','ca_rot','bong_cai','nuoc_tuong'], ARRAY['ot','tieu'], ARRAY['Luộc mì vừa chín, để ráo.','Xào bò với tỏi, nêm nước tương.','Thêm rau củ, đảo nhanh lửa lớn.','Cho mì vào trộn đều, nêm lại và dọn nóng.'], 20, 'easy'),
        ('bun-rieu', ARRAY['bun','cua_dong','trung_ga','ca_chua','hanh_la','nuoc_mam'], ARRAY['dau_phu_ran','rau_song'], ARRAY['Lọc cua, nấu riêu cua, vớt gạch.','Xào cà chua, cho vào nồi nước cua.','Đánh trứng với riêu, đổ vào nồi, nêm mắm.','Chần bún, chan nước dùng, thêm hành, đậu phụ rán.'], 40, 'medium'),
        ('banh-xeo', ARRAY['bot_banh_xeo','thit_heo','tom','gia','hanh_la','nghe_bot'], ARRAY['rau_song'], ARRAY['Pha bột bánh xèo với nước và bột nghệ.','Xào nhân thịt heo và tôm sơ.','Đổ bột vào chảo nóng, thêm nhân và giá, gập bánh.','Ăn kèm rau sống và nước mắm chua ngọt.'], 40, 'medium'),
        ('chao-ga', ARRAY['ga','gao','hanh_la','gung','nuoc_mam'], ARRAY['tieu'], ARRAY['Luộc gà với gừng, lọc lấy nước dùng.','Nấu gạo với nước dùng đến khi nhừ.','Xé thịt gà, nêm cháo với nước mắm.','Cho thịt gà, hành lá vào cháo, thêm tiêu.'], 50, 'easy'),
        ('ga-rang-muoi', ARRAY['ga','bot_muoi_rang','toi','sa'], ARRAY['ot'], ARRAY['Ướp gà với muối rang, tỏi, sả.','Chiên gà vàng giòn.','Áo lại gà với muối rang cho thấm.','Dọn ăn nóng.'], 30, 'medium'),
        ('thit-bo-xao-toi', ARRAY['thit_bo','toi','rau_muong','nuoc_tuong'], ARRAY['ot'], ARRAY['Ướp bò với tỏi, nước tương.','Xào bò lửa lớn cho tái, trút ra.','Xào rau muống nhanh tay, nêm nhẹ.','Cho bò vào đảo lại, tắt bếp.'], 15, 'easy'),
        ('suon-kho-tau', ARRAY['suon_heo','nuoc_mam','duong','toi'], ARRAY['trung_cut'], ARRAY['Chần sườn, ướp nước mắm, đường, tỏi.','Thắng đường tạo màu, cho sườn vào đảo.','Thêm nước kho nhỏ lửa đến khi mềm.','Nêm lại, thêm trứng cút nếu dùng.'], 45, 'medium'),
        ('canh-bi-do-thit-bam', ARRAY['bi_do','thit_bam','hanh_la','nuoc_mam'], ARRAY['tieu'], ARRAY['Ướp thịt băm với nước mắm, tiêu.','Phi hành, xào thịt cho tơi.','Cho bí đỏ và nước, nấu mềm.','Nêm lại, thêm hành lá, tắt bếp.'], 25, 'easy'),
        ('canh-rau-ngot-thit-bam', ARRAY['rau_ngot','thit_bam','nuoc_mam'], ARRAY['tieu'], ARRAY['Ướp thịt băm, xào sơ.','Đổ nước, nấu sôi rồi cho rau ngót.','Nấu chín rau, nêm lại và tắt bếp.','Rắc tiêu nếu thích.'], 15, 'easy'),
        ('suon-rim-mam', ARRAY['suon_heo','nuoc_mam','duong','toi','ot'], ARRAY[]::TEXT[], ARRAY['Chần sườn, ướp nước mắm, đường, tỏi, ớt.','Rim sườn lửa nhỏ đến khi nước sánh.','Lật đều cho thấm, nêm lại vừa ăn.','Tắt bếp, rắc tiêu nếu thích.'], 35, 'medium'),
        ('thit-ba-chi-rang-chay-canh', ARRAY['thit_heo_ba_chi','nuoc_mam','toi','ot'], ARRAY[]::TEXT[], ARRAY['Cắt ba chỉ lát mỏng, ướp mắm, tỏi, ớt.','Rang lửa vừa đến khi mỡ tiết ra và vàng cạnh.','Nêm lại, tắt bếp.','Dùng kèm cơm và canh.'], 25, 'easy'),
        ('trung-chien-nuoc-mam', ARRAY['trung_ga','nuoc_mam','hanh_la','dau_an'], ARRAY['tieu'], ARRAY['Đánh trứng với nước mắm, tiêu, hành lá.','Làm nóng chảo dầu, đổ trứng vào chiên vàng.','Lật mặt cho chín đều.','Cắt miếng, dùng với cơm.'], 10, 'easy'),
        ('dau-que-xao-toi', ARRAY['dau_que','toi','dau_an','muoi'], ARRAY['ot'], ARRAY['Rửa đậu que, chần sơ.','Phi tỏi, cho đậu vào xào lửa lớn.','Nêm muối hoặc nước mắm.','Xào chín giòn rồi tắt bếp.'], 12, 'easy'),
        ('ga-nuong-mat-ong', ARRAY['ga','mat_ong','toi','nuoc_mam'], ARRAY['sa','ot'], ARRAY['Ướp gà với mật ong, tỏi, nước mắm, sả.','Nướng trong lò hoặc nồi chiên đến chín vàng.','Quét thêm mật ong giữa chừng cho bóng đẹp.','Nghỉ vài phút rồi chặt miếng.'], 40, 'medium'),
        ('nem-nuong', ARRAY['thit_heo_bam','toi','nuoc_mam','duong'], ARRAY['sa'], ARRAY['Trộn thịt băm với gia vị, quết dẻo.','Vo que hoặc viên, nướng than/lò đến chín.','Pha nước chấm chua ngọt.','Ăn kèm rau và bún/ram.'], 35, 'medium'),
        ('bun-cha', ARRAY['bun','thit_heo_bam','thit_heo_ba_chi','nuoc_mam','duong','toi'], ARRAY['ot','rau_song'], ARRAY['Ướp thịt băm làm chả, viên tròn; ướp ba chỉ thái mỏng.','Nướng chả và ba chỉ đến cháy xém nhẹ.','Pha nước mắm chua ngọt, thêm đu đủ/đồ chua nếu có.','Dùng kèm bún và rau thơm.'], 45, 'medium'),
        ('mi-quang', ARRAY['mi_quang','thit_heo','tom','hanh_la','dau_phong','rau_song','nuoc_mam'], ARRAY['trung_cut'], ARRAY['Ướp thịt, tôm với mắm, màu điều nếu có.','Xào săn, thêm nước vừa đủ xăm xắp làm nước lèo đậm.','Trụng mì Quảng, xếp tô với rau, thịt tôm, chan ít nước.','Rắc đậu phộng, hành lá, dùng kèm bánh tráng.'], 40, 'medium'),
        ('ca-kho-to', ARRAY['ca','nuoc_mam','duong','toi','ot'], ARRAY['tieu'], ARRAY['Ướp cá với nước mắm, đường, tỏi, ớt.','Thắng đường tạo màu, cho cá vào kho lửa nhỏ.','Thêm nước sôi, kho đến khi sánh.','Nêm lại, rắc tiêu trước khi tắt bếp.'], 35, 'medium')
    ) AS t(slug, core_ingredients, optional_ingredients, steps, cook_time_minutes, difficulty)
  LOOP
    SELECT id INTO rec_id FROM recipes WHERE slug = r.slug LIMIT 1;
    IF rec_id IS NULL THEN
      RAISE NOTICE 'Skipping %, recipe not found', r.slug;
      CONTINUE;
    END IF;

    -- Ingredients
    DELETE FROM recipe_ingredients WHERE recipe_id = rec_id;

    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, role, amount, unit, note)
    SELECT DISTINCT rec_id, i.id, 'core', NULL, NULL, NULL
    FROM unnest(r.core_ingredients) AS key(key_txt)
    JOIN ingredients i ON i.key = key.key_txt
    ON CONFLICT DO NOTHING;

    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, role, amount, unit, note)
    SELECT DISTINCT rec_id, i.id, 'optional', NULL, NULL, NULL
    FROM unnest(r.optional_ingredients) AS key(key_txt)
    JOIN ingredients i ON i.key = key.key_txt
    ON CONFLICT DO NOTHING;

    -- Steps
    DELETE FROM recipe_steps WHERE recipe_id = rec_id;
    INSERT INTO recipe_steps (recipe_id, step_no, content, tip)
    SELECT rec_id, ROW_NUMBER() OVER (), step_txt, NULL
    FROM unnest(r.steps) AS step(step_txt);

    -- Optional overrides
    UPDATE recipes
    SET cook_time_minutes = COALESCE(r.cook_time_minutes, cook_time_minutes),
        difficulty = COALESCE(r.difficulty, difficulty)
    WHERE id = rec_id;
  END LOOP;
END$$;
