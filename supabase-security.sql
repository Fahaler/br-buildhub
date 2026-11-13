-- ============================================================================
-- BR BuildHub — настройка доступа (этап 1)
-- Запускать в Supabase: SQL Editor → New query → вставить ВЕСЬ файл → Run.
-- Скрипт можно запускать повторно — он ничего не сломает.
--
-- ⚠️ ПЕРЕД ЗАПУСКОМ замените две почты в разделе 2 на ваши реальные почты,
--    с которыми вы с другом входите на сайт.
-- ============================================================================

-- 1. Список админов -----------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Вошедший пользователь может узнать только, есть ли в списке он сам
drop policy if exists "admins: read own row" on public.admins;
create policy "admins: read own row" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Функция «текущий пользователь — админ?» для правил ниже
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Добавляем вас двоих в админы ----------------------------------------------
--    ⚠️ ЗАМЕНИТЕ почты на свои!
insert into public.admins (user_id)
select id from auth.users
where lower(email) in (lower('ПОЧТА_1@example.com'), lower('ПОЧТА_2@example.com'))
on conflict do nothing;

-- 3. Заказы: смотреть — все, менять — только админы --------------------------
alter table public.orders enable row level security;

-- Удаляем ВСЕ старые правила для orders (какими бы они ни были)
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'orders' loop
    execute format('drop policy %I on public.orders', p.policyname);
  end loop;
end $$;

create policy "orders: anyone can read" on public.orders
  for select to anon, authenticated
  using (true);

create policy "orders: admins insert" on public.orders
  for insert to authenticated
  with check (public.is_admin());

create policy "orders: admins update" on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders: admins delete" on public.orders
  for delete to authenticated
  using (public.is_admin());

-- 4. Порядок в данных -----------------------------------------------------------
-- Пустые ссылки на фото → «нет фото» (null)
update public.orders set image_url   = null where image_url   = '';
update public.orders set image_url_2 = null where image_url_2 = '';

-- Цена: раньше пустое поле сохранялось как 0 и показывалось «Цена не указана».
-- Теперь «не указана» = пусто (null), а 0 — это 0 ₽. Переносим старые нули.
alter table public.orders alter column cost drop not null;
update public.orders set cost = null where cost = 0;

-- Значения по умолчанию
alter table public.orders alter column status   set default 'в очереди';
alter table public.orders alter column priority set default 'обычный';

-- Защита от опечаток в статусе и приоритете
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('в очереди', 'в процессе', 'готов', 'отмена'));

alter table public.orders drop constraint if exists orders_priority_check;
alter table public.orders add constraint orders_priority_check
  check (priority is null or priority in ('низкий', 'обычный', 'высокий'));

-- 5. Хранилище фото (бакет order-images) ---------------------------------------
-- Бакет публичный: фото по прямой ссылке открываются у всех и без правил.
-- Правила ниже: загружать/менять/удалять — только админы; список файлов гостям недоступен.
update storage.buckets set public = true where id = 'order-images';

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%order-images%' or coalesce(with_check, '') ilike '%order-images%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "order-images: admins read" on storage.objects
  for select to authenticated
  using (bucket_id = 'order-images' and public.is_admin());

create policy "order-images: admins upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'order-images' and public.is_admin());

create policy "order-images: admins update" on storage.objects
  for update to authenticated
  using (bucket_id = 'order-images' and public.is_admin())
  with check (bucket_id = 'order-images' and public.is_admin());

create policy "order-images: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'order-images' and public.is_admin());

-- 6. Проверка -------------------------------------------------------------------
-- Результат этого запроса и пришлите скриншотом. В колонке admins должно быть 2,
-- в списке правил — только те, что созданы выше (плюс, возможно, чужие правила storage
-- без упоминания order-images — их тоже покажите).
select
  (select count(*) from public.admins) as admins,
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where (schemaname = 'public' and tablename in ('orders', 'admins'))
   or (schemaname = 'storage' and tablename = 'objects')
order by tablename, policyname;
