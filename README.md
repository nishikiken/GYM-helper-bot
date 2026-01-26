# Gym Helper Bot

Telegram бот-помощник для тренажерного зала с системой рейтинга, магазином кастомизации и калькулятором БЖУ.

## Особенности

- 💪 **Упражнения** - библиотека упражнений и тренировочные пресеты (в разработке)
- 🍎 **Расчет БЖУ** - калькулятор калорий и макронутриентов для набора массы, сушки и поддержания веса
- ❓ **FAQ** - частые вопросы о тренировках и питании
- 🏆 **Таблица лидеров** - топ 50 пользователей по рейтингу
- 🎨 **Магазин кастомизации** - покупка неоновых цветов для никнейма и цветных бейджей для профиля
- 💱 **Обменник** - обмен рейтинга на токены (100 рейтинга = 1 токен)

## Настройка Supabase

### 1. Создание таблицы `gym_users`

Выполните следующий SQL запрос в Supabase SQL Editor:

```sql
CREATE TABLE gym_users (
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

-- Индексы для быстрого поиска
CREATE INDEX idx_gym_users_telegram_id ON gym_users(telegram_id);
CREATE INDEX idx_gym_users_rating ON gym_users(rating DESC);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_gym_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gym_users_updated_at
    BEFORE UPDATE ON gym_users
    FOR EACH ROW
    EXECUTE FUNCTION update_gym_users_updated_at();
```

### 2. Создание PostgreSQL функций для работы с массивами

```sql
-- Функция для добавления цвета в массив owned_colors
CREATE OR REPLACE FUNCTION add_owned_color_gym(user_id BIGINT, color_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE gym_users
    SET owned_colors = array_append(owned_colors, color_id)
    WHERE telegram_id = user_id
    AND NOT (color_id = ANY(owned_colors));
END;
$$ LANGUAGE plpgsql;

-- Функция для добавления бейджа в массив owned_badges
CREATE OR REPLACE FUNCTION add_owned_badge_gym(user_id BIGINT, badge_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE gym_users
    SET owned_badges = array_append(owned_badges, badge_id)
    WHERE telegram_id = user_id
    AND NOT (badge_id = ANY(owned_badges));
END;
$$ LANGUAGE plpgsql;
```

### 3. Отключение RLS (Row Level Security)

Для упрощения разработки отключите RLS для таблицы:

```sql
ALTER TABLE gym_users DISABLE ROW LEVEL SECURITY;
```

**Важно:** В продакшене рекомендуется настроить правильные политики RLS для безопасности данных.

### 4. Настройка Supabase в коде

Убедитесь что в `app.js` указаны правильные credentials:

```javascript
const SUPABASE_URL = 'https://hyxyablgkjtoxcxnurkk.supabase.co';
const SUPABASE_KEY = 'ваш_anon_key';
```

## Структура проекта

```
gym-helper/
├── index.html          # Главная страница приложения
├── app.js              # Основная логика приложения
├── style.css           # Базовые стили (скопированы из campus bot)
├── gym-styles.css      # Дополнительные стили для gym-специфичных элементов
└── README.md           # Этот файл
```

## Калькулятор БЖУ

Калькулятор использует формулу Миффлина-Сан Жеора для расчета базового метаболизма (BMR):

- **Мужчины:** BMR = 10 × вес(кг) + 6.25 × рост(см) - 5 × возраст + 5
- **Женщины:** BMR = 10 × вес(кг) + 6.25 × рост(см) - 5 × возраст - 161

Затем BMR умножается на коэффициент активности и корректируется в зависимости от цели:

- **Набор массы:** +300 калорий, 2г белка/кг, 1г жиров/кг
- **Сушка:** -500 калорий, 2.2г белка/кг, 0.8г жиров/кг
- **Удержание веса:** без изменений, 1.8г белка/кг, 1г жиров/кг

## Отличия от Campus Bot

### Удалено:
- Интерактивная карта
- Система навигации по корпусам
- Раздел "Где поесть"

### Изменено:
- FAQ вопросы адаптированы под тематику фитнеса
- Splash screen и иконки изменены на спортивную тематику

### Добавлено:
- Калькулятор БЖУ с тремя режимами (набор массы, сушка, удержание)
- Раздел "Упражнения" (заглушка для будущего функционала)

## Следующие шаги

1. ✅ Создать базовую структуру приложения
2. ✅ Адаптировать систему рейтинга и магазина
3. ✅ Добавить калькулятор БЖУ
4. ⏳ Создать таблицу `gym_users` в Supabase
5. ⏳ Реализовать раздел "Упражнения":
   - Библиотека упражнений с описаниями
   - Готовые тренировочные пресеты
   - Таймеры и счетчики подходов
   - Возможность создавать свои программы
6. ⏳ Добавить трекинг прогресса тренировок
7. ⏳ Интеграция с Telegram ботом

## Версия

v1 - Базовая версия с калькулятором БЖУ и системой рейтинга
