
-- Garante que as empresas existam
insert into public.companies (name, code)
values ('WBR NET','WBR'), ('MZNET','MZNET')
on conflict (name) do nothing;

-- Mapeia as 3 contas demo (usando e-mails válidos)
with users_by_email as (
  select id, email
  from auth.users
  where email in (
    'premium.demo@example.com',
    'reanalista.demo@example.com',
    'comercial.mznet.demo@example.com'
  )
),
wbr as (select id as company_id from public.companies where name = 'WBR NET'),
mz as (select id as company_id from public.companies where name = 'MZNET'),

-- Insere profile se não existir (com papel/empresa corretos)
inserted as (
  insert into public.profiles (id, full_name, role, company_id)
  select
    u.id,
    split_part(u.email, '@', 1) as full_name,
    case u.email
      when 'premium.demo@example.com' then 'analista_premium'::public.user_role
      when 'reanalista.demo@example.com' then 'reanalista'::public.user_role
      when 'comercial.mznet.demo@example.com' then 'comercial'::public.user_role
    end as role,
    case u.email
      when 'premium.demo@example.com' then (select company_id from wbr)
      when 'reanalista.demo@example.com' then (select company_id from wbr)
      when 'comercial.mznet.demo@example.com' then (select company_id from mz)
    end as company_id
  from users_by_email u
  left join public.profiles p on p.id = u.id
  where p.id is null
  returning id
)
-- Atualiza role/company se o profile já existir
update public.profiles p
set
  role = case u.email
    when 'premium.demo@example.com' then 'analista_premium'::public.user_role
    when 'reanalista.demo@example.com' then 'reanalista'::public.user_role
    when 'comercial.mznet.demo@example.com' then 'comercial'::public.user_role
  end,
  company_id = case u.email
    when 'premium.demo@example.com' then (select company_id from wbr)
    when 'reanalista.demo@example.com' then (select company_id from wbr)
    when 'comercial.mznet.demo@example.com' then (select company_id from mz)
  end
from users_by_email u
where p.id = u.id;
