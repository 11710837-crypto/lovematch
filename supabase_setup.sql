-- ============================================
-- LoveMatch アプリ用 データベース設定SQL（修正版）
-- Supabaseの「SQL Editor」に貼り付けて実行してください
-- ============================================

-- プロフィールテーブル
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 18 AND age <= 99),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  looking_for TEXT CHECK (looking_for IN ('male', 'female', 'both')),
  bio TEXT,
  location TEXT,
  occupation TEXT,
  avatar_url TEXT,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- いいね！テーブル
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- マッチングテーブル
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- チャットメッセージテーブル
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) 設定
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーを削除してから再作成
DROP POLICY IF EXISTS "プロフィールは誰でも読める" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ更新" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ編集" ON profiles;
DROP POLICY IF EXISTS "いいねの閲覧" ON likes;
DROP POLICY IF EXISTS "いいねの送信" ON likes;
DROP POLICY IF EXISTS "いいねの削除" ON likes;
DROP POLICY IF EXISTS "マッチングの閲覧" ON matches;
DROP POLICY IF EXISTS "マッチングの作成" ON matches;
DROP POLICY IF EXISTS "メッセージの閲覧" ON messages;
DROP POLICY IF EXISTS "メッセージの送信" ON messages;
DROP POLICY IF EXISTS "メッセージの既読更新" ON messages;

-- プロフィール: 誰でも読める、自分のみ更新可
CREATE POLICY "プロフィールは誰でも読める" ON profiles FOR SELECT USING (true);
CREATE POLICY "プロフィールは本人のみ更新" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "プロフィールは本人のみ編集" ON profiles FOR UPDATE USING (auth.uid() = id);

-- いいね: 自分が送ったものと受け取ったもの
CREATE POLICY "いいねの閲覧" ON likes FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "いいねの送信" ON likes FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "いいねの削除" ON likes FOR DELETE USING (auth.uid() = from_user_id);

-- マッチング: 関係するユーザーのみ
CREATE POLICY "マッチングの閲覧" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "マッチングの作成" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- メッセージ: マッチしたユーザーのみ
CREATE POLICY "メッセージの閲覧" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE id = messages.match_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);
CREATE POLICY "メッセージの送信" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "メッセージの既読更新" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE id = messages.match_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- ============================================
-- ストレージバケット（プロフィール写真用）
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "アバター画像は誰でも閲覧可" ON storage.objects;
DROP POLICY IF EXISTS "アバター画像は本人のみアップロード可" ON storage.objects;
DROP POLICY IF EXISTS "アバター画像は本人のみ削除可" ON storage.objects;

CREATE POLICY "アバター画像は誰でも閲覧可" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "アバター画像は本人のみアップロード可" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "アバター画像は本人のみ削除可" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- いいね時に自動マッチング作成するトリガー
-- ============================================
CREATE OR REPLACE FUNCTION check_and_create_match()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM likes
    WHERE from_user_id = NEW.to_user_id
    AND to_user_id = NEW.from_user_id
  ) THEN
    INSERT INTO matches (user1_id, user2_id)
    VALUES (
      LEAST(NEW.from_user_id, NEW.to_user_id),
      GREATEST(NEW.from_user_id, NEW.to_user_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION check_and_create_match();
