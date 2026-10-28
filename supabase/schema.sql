-- =====================================================================
-- 蕎麦切り 凪 — Supabase スキーマ
-- 予約フォーム（お名前・人数・日にち・時間）を保存するためのテーブル。
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください。
-- =====================================================================

create table if not exists public.nagi_reservations (
  id            uuid primary key default gen_random_uuid(),
  name          text     not null,                     -- お名前
  guests        smallint not null check (guests between 1 and 6),  -- 人数
  reserved_date date     not null,                     -- 日にち
  reserved_time time     not null,                     -- 時間
  created_at    timestamptz not null default now()     -- 受付日時
);

-- RLS（行レベルセキュリティ）を有効にし、ポリシーは作らない。
-- ＝ ブラウザの匿名キーからは他人の予約を読むことも書くこともできない。
--    書き込みはサーバー（server.js）から service_role キーで行う。
--    ※ service_role キーは .env にのみ置き、public/ 側には絶対に置かないこと。
alter table public.nagi_reservations enable row level security;
