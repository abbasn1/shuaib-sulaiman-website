begin;

-- The preserved quote snapshot has unique, non-null IDs. Add its primary key
-- so the backup remains efficient to inspect without changing its data.
alter table public.quotes_backup_20260908
  add constraint quotes_backup_20260908_pkey primary key (id);

-- Cover the app_settings.updated_by foreign key for efficient referential checks.
create index if not exists ix_app_settings_updated_by
  on public.app_settings(updated_by);

commit;
