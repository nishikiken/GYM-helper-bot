-- ============================================
-- Gym Helper Bot - Supabase Database Setup
-- ============================================

-- 1. Создание таблицы gym_users
CREATE TABLE IF NOT EXISTS gym_users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    tokens INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 0,
    owned_colors TEXT[] DEFAULT '{}',
    owned_badges TEXT[] DEFAULT '{}',
    name_color TEXT,
    badge_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_gym_users_telegram_id ON gym_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_gym_users_rating ON gym_users(rating DESC);

-- 3. Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_gym_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gym_users_updated_at ON gym_users;
CREATE TRIGGER gym_users_updated_at
    BEFORE UPDATE ON gym_users
    FOR EACH ROW
    EXECUTE FUNCTION update_gym_users_updated_at();

-- 4. Функция для добавления цвета в массив owned_colors
CREATE OR REPLACE FUNCTION add_owned_color_gym(user_id BIGINT, color_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE gym_users
    SET owned_colors = array_append(owned_colors, color_id)
    WHERE telegram_id = user_id
    AND NOT (color_id = ANY(owned_colors));
END;
$$ LANGUAGE plpgsql;

-- 5. Функция для добавления бейджа в массив owned_badges
CREATE OR REPLACE FUNCTION add_owned_badge_gym(user_id BIGINT, badge_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE gym_users
    SET owned_badges = array_append(owned_badges, badge_id)
    WHERE telegram_id = user_id
    AND NOT (badge_id = ANY(owned_badges));
END;
$$ LANGUAGE plpgsql;

-- 6. Отключение RLS (Row Level Security) для упрощения разработки
-- ВАЖНО: В продакшене настройте правильные политики RLS!
ALTER TABLE gym_users DISABLE ROW LEVEL SECURITY;

-- 7. Тестовые данные (опционально)
-- Раскомментируйте если нужны тестовые пользователи
/*
INSERT INTO gym_users (telegram_id, name, tokens, rating, owned_colors, owned_badges, name_color, badge_color)
VALUES 
    (123456789, 'Тестовый Пользователь 1', 100, 500, ARRAY['blue'], ARRAY['blue'], 'blue', 'blue'),
    (987654321, 'Тестовый Пользователь 2', 50, 300, ARRAY['red'], ARRAY[], 'red', NULL),
    (555555555, 'Тестовый Пользователь 3', 200, 1000, ARRAY['blue', 'red', 'purple'], ARRAY['blue', 'red'], 'purple', 'red')
ON CONFLICT (telegram_id) DO NOTHING;
*/

-- Проверка созданной структуры
SELECT 
    'Таблица gym_users создана успешно' as status,
    COUNT(*) as user_count
FROM gym_users;
