-- ============================================================================
-- BR BuildHub — новые поля блокнота (ник клиента, дата заказа, дедлайн, оплата, до 8 фото)
-- Запускать в Supabase: SQL Editor → New query → вставить весь файл → Run.
-- Скрипт можно запускать повторно — он ничего не сломает и не продублирует фото.
-- ⚠️ Запустите его ДО того, как задеплоите новую версию сайта.
-- ============================================================================

-- 1. Новые колонки ----------------------------------------------------------------
alter table public.orders add column if not exists client_nick text;
alter table public.orders add column if not exists deadline    date;
alter table public.orders add column if not exists payment     text   not null default 'нет';
alter table public.orders add column if not exists images      text[] not null default '{}';
alter table public.orders add column if not exists ordered_at  date;

-- 2. Переносим старые фото (image_url, image_url_2) в новый список -----------------
update public.orders
set images = array_remove(array[nullif(image_url, ''), nullif(image_url_2, '')], null)
where cardinality(images) = 0
  and (coalesce(image_url, '') <> '' or coalesce(image_url_2, '') <> '');

-- Старые колонки больше не используются сайтом, но пока остаются — на всякий случай.

-- 3. Дата заказа -------------------------------------------------------------------
-- Если в описании есть строка вида «*От: 05.11.26» — берём дату оттуда,
-- иначе — день (по Москве), когда заказ внесли в блокнот. Саму строку в описании не трогаем:
-- сайт её больше не показывает, а при следующем сохранении заказа она уберётся сама.
do $$
declare
  r record;
  m text[];
  d date;
begin
  for r in select id, description, created_at from public.orders where ordered_at is null loop
    d := null;
    m := regexp_match(coalesce(r.description, ''), '\*?\s*[оО][тТ]:?\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})', 'i');
    if m is not null then
      begin
        d := make_date(
          case when length(m[3]) = 2 then 2000 + m[3]::int else m[3]::int end,
          m[2]::int,
          m[1]::int
        );
      exception when others then
        d := null; -- например, «31.02» — просто пропускаем
      end;
    end if;
    update public.orders set ordered_at = coalesce(d, (r.created_at at time zone 'Europe/Moscow')::date) where id = r.id;
  end loop;
end $$;

alter table public.orders alter column ordered_at set default current_date;
alter table public.orders alter column ordered_at set not null;

-- 4. Защита от опечаток ------------------------------------------------------------
alter table public.orders drop constraint if exists orders_payment_check;
alter table public.orders add constraint orders_payment_check
  check (payment in ('нет', 'предоплата', 'оплачено'));

alter table public.orders drop constraint if exists orders_images_max;
alter table public.orders add constraint orders_images_max
  check (cardinality(images) <= 8);

alter table public.orders drop constraint if exists orders_client_nick_len;
alter table public.orders add constraint orders_client_nick_len
  check (client_nick is null or char_length(client_nick) <= 64);

-- Права (RLS) настраивать не нужно: правила из 001-security.sql действуют на всю строку.

-- 5. Проверка: фото столько же, сколько было раньше; дата заказа заполнена у всех ---
select title, ordered_at, cardinality(images) as photos, payment, client_nick, deadline
from public.orders
order by ordered_at desc, created_at desc;
