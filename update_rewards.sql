-- Обновление функций для новых наград
-- Запустить этот скрипт в Supabase SQL Editor

-- Функция для увеличения счетчика скачиваний
-- Дает автору +750 рейтинга за каждое уникальное скачивание (15 токенов через обменник 50=1)
CREATE OR REPLACE FUNCTION increment_program_downloads_once(program_id_param BIGINT, user_id_param BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    already_downloaded BOOLEAN;
    author_id_var BIGINT;
BEGIN
    -- Проверяем, скачивал ли пользователь уже эту программу
    SELECT EXISTS(
        SELECT 1 FROM public.program_downloads 
        WHERE program_id = program_id_param AND user_id = user_id_param
    ) INTO already_downloaded;
    
    -- Если еще не скачивал - добавляем запись и увеличиваем счетчик
    IF NOT already_downloaded THEN
        INSERT INTO public.program_downloads (user_id, program_id)
        VALUES (user_id_param, program_id_param);
        
        UPDATE public.shared_workout_programs
        SET downloads = downloads + 1
        WHERE id = program_id_param;
        
        -- Даем автору +750 рейтинга (15 токенов через обменник 50=1)
        SELECT author_id INTO author_id_var
        FROM public.shared_workout_programs
        WHERE id = program_id_param;
        
        IF author_id_var IS NOT NULL AND author_id_var != user_id_param THEN
            UPDATE public.gym_users
            SET rating = rating + 750
            WHERE telegram_id = author_id_var;
        END IF;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для переключения лайка (лайк/анлайк)
-- Дает автору +450 рейтинга за первый лайк от каждого пользователя (9 токенов через обменник 50=1)
-- При снятии лайка рейтинг НЕ отбирается
CREATE OR REPLACE FUNCTION toggle_program_like(program_id_param BIGINT, user_id_param BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    already_liked BOOLEAN;
    author_id_var BIGINT;
BEGIN
    -- Проверяем, лайкнул ли пользователь уже эту программу
    SELECT EXISTS(
        SELECT 1 FROM public.program_likes 
        WHERE program_id = program_id_param AND user_id = user_id_param
    ) INTO already_liked;
    
    -- Получаем автора программы
    SELECT author_id INTO author_id_var
    FROM public.shared_workout_programs
    WHERE id = program_id_param;
    
    IF already_liked THEN
        -- Убираем лайк (рейтинг НЕ отбираем)
        DELETE FROM public.program_likes
        WHERE program_id = program_id_param AND user_id = user_id_param;
        
        UPDATE public.shared_workout_programs
        SET likes = GREATEST(likes - 1, 0)
        WHERE id = program_id_param;
        
        RETURN FALSE;
    ELSE
        -- Добавляем лайк
        INSERT INTO public.program_likes (user_id, program_id)
        VALUES (user_id_param, program_id_param);
        
        UPDATE public.shared_workout_programs
        SET likes = likes + 1
        WHERE id = program_id_param;
        
        -- Даем рейтинг автору (только если это не он сам)
        IF author_id_var IS NOT NULL AND author_id_var != user_id_param THEN
            UPDATE public.gym_users
            SET rating = rating + 450
            WHERE telegram_id = author_id_var;
        END IF;
        
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
