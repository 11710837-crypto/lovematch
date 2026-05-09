-- ============================================
-- LoveMatch アップデート用SQL（機能追加版）
-- Supabaseの「SQL Editor」で実行してください
-- ============================================

-- profilesテーブルに新しい列を追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS income TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoking TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drinking TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hobbies TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- 足あとテーブル（誰が自分のプロフィールを見たか）
CREATE TABLE IF NOT EXISTS footprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  visited_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ブロックテーブル
CREATE TABLE IF NOT EXISTS blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- 通報テーブル
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE footprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 足あとポリシー
DROP POLICY IF EXISTS "足あとの閲覧" ON footprints;
DROP POLICY IF EXISTS "足あとの作成" ON footprints;
CREATE POLICY "足あとの閲覧" ON footprints FOR SELECT USING (auth.uid() = visited_id OR auth.uid() = visitor_id);
CREATE POLICY "足あとの作成" ON footprints FOR INSERT WITH CHECK (auth.uid() = visitor_id);

-- ブロックポリシー
DROP POLICY IF EXISTS "ブロックの閲覧" ON blocks;
DROP POLICY IF EXISTS "ブロックの作成" ON blocks;
DROP POLICY IF EXISTS "ブロックの削除" ON blocks;
CREATE POLICY "ブロックの閲覧" ON blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "ブロックの作成" ON blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "ブロックの削除" ON blocks FOR DELETE USING (auth.uid() = blocker_id);

-- 通報ポリシー
DROP POLICY IF EXISTS "通報の作成" ON reports;
CREATE POLICY "通報の作成" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
