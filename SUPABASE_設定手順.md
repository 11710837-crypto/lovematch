# Supabase 設定手順書
## LoveMatch アプリ用（初心者向け）

---

## ステップ1：Supabase アカウント作成

1. ブラウザで https://supabase.com を開く
2. 右上の「**Start your project**」をクリック
3. **GitHub アカウント**でログイン（GitHubがなければメールで登録）

---

## ステップ2：新しいプロジェクト作成

1. ログイン後、「**New project**」をクリック
2. 以下を入力：
   - **Project name**：`lovematch`（何でもOK）
   - **Database Password**：好きなパスワードを設定（メモしておく）
   - **Region**：`Northeast Asia (Tokyo)` を選択
3. 「**Create new project**」をクリック
4. **2〜3分待つ**（作成完了まで少し時間がかかります）

---

## ステップ3：データベースのテーブルを作成

1. 左メニューの「**SQL Editor**」をクリック
2. 「**New query**」をクリック
3. デスクトップの `matching-app` フォルダ内の
   **`supabase_setup.sql`** ファイルをメモ帳で開く
4. 全文をコピーして SQL Editorに貼り付ける
5. 右上の「**Run**」ボタンをクリック
6. 画面下に `Success. No rows returned` と表示されればOK ✅

---

## ステップ4：APIキーを取得する

1. 左メニューの「**Project Settings**」（歯車アイコン）をクリック
2. 「**API**」をクリック
3. 以下の2つをメモする：

```
Project URL:
https://xxxxxxxxxxxxxxxx.supabase.co

Project API Keys > anon / public:
eyJhbGci...（長い文字列）
```

---

## ステップ5：アプリにキーを設定する

1. デスクトップの `matching-app` フォルダを開く
2. **`.env.local`** ファイルをメモ帳で開く
   （隠しファイルなので見えない場合は「表示」→「隠しファイル」をON）
3. 以下のように書き換えて保存：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## ステップ6：アプリを起動する

1. コマンドプロンプト（または PowerShell）を開く
2. 以下を1行ずつ入力：

```
cd Desktop\matching-app
npm run dev
```

3. `http://localhost:3000` と表示されたら成功！
4. ブラウザで **http://localhost:3000** を開く

---

## ステップ7：動作確認

1. 「新規登録」から2つのアカウントを作成
2. 片方でログインして相手を「いいね」
3. 別のブラウザ（またはシークレットモード）でもう片方でログインしていいね
4. **マッチング通知**が表示されればOK！
5. チャットでメッセージを送ってみる

---

## ✅ 完了！あとはVercelで公開

公開手順は別途ご説明します。
