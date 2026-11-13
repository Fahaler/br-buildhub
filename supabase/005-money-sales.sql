-- ============================================================================
-- BR BuildHub — деньги, продажи, лимит бриков
--   prepaid_amount — сколько внесли предоплатой (₽)
--   sold_at        — когда продали вещь «на продажу» (пусто — ещё в продаже)
--   sold_price     — за сколько продали (пусто — по цене из карточки)
--   brick_limit    — лимит бриков постройки
-- Запускать в Supabase: SQL Editor → New query → вставить весь файл → Run.
-- Скрипт можно запускать повторно.
-- ⚠️ Запустите его ДО того, как задеплоите новую версию сайта.
-- ============================================================================

alter table public.orders add column if not exists prepaid_amount numeric(12, 2);
alter table public.orders add column if not exists sold_at date;
alter table public.orders add column if not exists sold_price numeric(12, 2);
alter table public.orders add column if not exists brick_limit integer;

alter table public.orders drop constraint if exists orders_prepaid_amount_check;
alter table public.orders add constraint orders_prepaid_amount_check
  check (prepaid_amount is null or prepaid_amount >= 0);

alter table public.orders drop constraint if exists orders_sold_price_check;
alter table public.orders add constraint orders_sold_price_check
  check (sold_price is null or sold_price >= 0);

alter table public.orders drop constraint if exists orders_brick_limit_check;
alter table public.orders add constraint orders_brick_limit_check
  check (brick_limit is null or (brick_limit > 0 and brick_limit <= 10000000));

-- Права (RLS) настраивать не нужно: правила из 001-security.sql действуют на всю строку.

-- Проверка: должны появиться 4 новые колонки
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'orders'
  and column_name in ('prepaid_amount', 'sold_at', 'sold_price', 'brick_limit');
