-- ============================================================================
-- BR BuildHub — тип записи: «заказ» (для клиента) или «продажа» (строим сами на продажу)
-- Запускать в Supabase: SQL Editor → New query → вставить весь файл → Run.
-- Скрипт можно запускать повторно.
-- ⚠️ Запустите его ДО того, как задеплоите новую версию сайта.
-- ============================================================================

-- Все существующие записи становятся обычными заказами
alter table public.orders add column if not exists kind text not null default 'заказ';

alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders add constraint orders_kind_check
  check (kind in ('заказ', 'продажа'));

-- Права (RLS) настраивать не нужно: правила из 001-security.sql действуют на всю строку.

-- Проверка
select kind, count(*) from public.orders group by kind;
