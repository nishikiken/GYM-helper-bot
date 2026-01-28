-- Таблица для публичных тренировочных программ
CREATE TABLE IF NOT EXISTS public.shared_workout_programs (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL,
    author_name TEXT NOT NULL,
    program_name TEXT NOT NULL,
    program_description TEXT,
    days JSONB NOT NULL,
    likes INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_shared_programs_author ON public.shared_workout_programs(author_id);
CREATE INDEX IF NOT EXISTS idx_shared_programs_likes ON public.shared_workout_programs(likes DESC);
CREATE INDEX IF NOT EXISTS idx_shared_programs_downloads ON public.shared_workout_programs(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_shared_programs_created ON public.shared_workout_programs(created_at DESC);

-- Таблица для отслеживания скачиваний (1 скачивание на пользователя)
CREATE TABLE IF NOT EXISTS public.program_downloads (
    user_id BIGINT NOT NULL,
    program_id BIGINT NOT NULL REFERENCES public.shared_workout_programs(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_program_downloads_user ON public.program_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_program_downloads_program ON public.program_downloads(program_id);

-- Таблица для отслеживания лайков (1 лайк на пользователя)
CREATE TABLE IF NOT EXISTS public.program_likes (
    user_id BIGINT NOT NULL,
    program_id BIGINT NOT NULL REFERENCES public.shared_workout_programs(id) ON DELETE CASCADE,
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_program_likes_user ON public.program_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_program_likes_program ON public.program_likes(program_id);

-- RLS политики - УПРОЩЕННЫЕ
ALTER TABLE public.shared_workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_likes ENABLE ROW LEVEL SECURITY;

-- Все могут читать программы
DROP POLICY IF EXISTS "Anyone can view shared programs" ON public.shared_workout_programs;
CREATE POLICY "Anyone can view shared programs" ON public.shared_workout_programs
    FOR SELECT USING (true);

-- Все могут создавать программы (упрощенная версия)
DROP POLICY IF EXISTS "Users can create programs" ON public.shared_workout_programs;
CREATE POLICY "Users can create programs" ON public.shared_workout_programs
    FOR INSERT WITH CHECK (true);

-- Все могут обновлять программы (упрощенная версия для теста)
DROP POLICY IF EXISTS "Users can update programs" ON public.shared_workout_programs;
CREATE POLICY "Users can update programs" ON public.shared_workout_programs
    FOR UPDATE USING (true);

-- Все могут удалять программы (упрощенная версия для теста)
DROP POLICY IF EXISTS "Users can delete programs" ON public.shared_workout_programs;
CREATE POLICY "Users can delete programs" ON public.shared_workout_programs
    FOR DELETE USING (true);

-- Политики для скачиваний
DROP POLICY IF EXISTS "Anyone can view downloads" ON public.program_downloads;
CREATE POLICY "Anyone can view downloads" ON public.program_downloads
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add downloads" ON public.program_downloads;
CREATE POLICY "Users can add downloads" ON public.program_downloads
    FOR INSERT WITH CHECK (true);

-- Политики для лайков
DROP POLICY IF EXISTS "Anyone can view likes" ON public.program_likes;
CREATE POLICY "Anyone can view likes" ON public.program_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add likes" ON public.program_likes;
CREATE POLICY "Users can add likes" ON public.program_likes
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can remove likes" ON public.program_likes;
CREATE POLICY "Users can remove likes" ON public.program_likes
    FOR DELETE USING (true);

-- Функция для увеличения счетчика скачиваний (только если пользователь еще не скачивал)
-- Дает автору +750 рейтинга за каждое уникальное скачивание (15 токенов через обменник)
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
        
        -- Даем автору +750 рейтинга (15 токенов через обменник)
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
-- Дает автору +450 рейтинга за первый лайк от каждого пользователя (9 токенов через обменник)
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
