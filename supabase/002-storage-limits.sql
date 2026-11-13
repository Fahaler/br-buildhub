-- ============================================================================
-- BR BuildHub — ограничения хранилища фото (этап 1, уборка)
-- Запускать в Supabase: SQL Editor → New query → вставить весь файл → Run.
-- Скрипт можно запускать повторно.
-- ============================================================================

-- Не больше 10 МБ на файл и только картинки.
-- Сайт сам сжимает фото в WebP до 1600 px, так что обычный файл весит 100–400 КБ;
-- лимит защищает от случайной загрузки огромных GIF и «не картинок».
update storage.buckets
set file_size_limit    = 10 * 1024 * 1024,
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif']
where id = 'order-images';

-- Проверка: должна вернуться одна строка с лимитом 10485760 и списком типов
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'order-images';
