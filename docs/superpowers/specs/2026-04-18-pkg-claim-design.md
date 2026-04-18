---
title: pkg-claim Design Spec
date: 2026-04-18
agent: claude-sonnet-4-6
status: approved
---

# pkg-claim

npmjs.com に空パッケージを publish して名前を確保する CLI ツール。

## 背景・目的

npm は Web UI から空状態でのパッケージ作成ができない。一般単語のパッケージ名は先に取られるリスクがあるため、`0.0.1` の最小パッケージを publish して名前を確保する。

## パッケージ名

`pkg-claim`（`bunx pkg-claim` で実行）

## アーキテクチャ

```
src/
├── cli.ts          # エントリポイント・引数解析・対話フロー
├── registry.ts     # npm registry 名前空き確認
├── scaffold.ts     # 一時ディレクトリ生成（package.json + index.js）
└── publish.ts      # npm publish サブプロセス実行
```

### 実行フロー

1. `cli.ts` — 対話プロンプト（name, description, license, author）
2. `registry.ts` — `GET https://registry.npmjs.org/<name>` → 404 なら空き
3. `scaffold.ts` — `os.tmpdir()` 配下に一時ディレクトリ生成
4. `publish.ts` — `Bun.$\`npm publish\`` 実行（dry-run 時は `--dry-run` フラグ付き）
5. 一時ディレクトリ削除（成功・失敗問わず）

### publish 対象ファイル（最小）

```
<tmp>/
├── package.json   # name, version: "0.0.1", type: "module", exports: "./index.js"
└── index.js       # export {};
```

## CLI インターフェース

```bash
bunx pkg-claim           # 通常実行
bunx pkg-claim --dry-run # dry-run（publish をスキップ）
```

### 対話フロー

```
? Package name: @scope/my-package
✓ Checking availability... available
? Description: My awesome package
? License: (MIT)
? Author: (git config user.name <user.email> から自動取得)

── Preview ──────────────────────────────
  name:        @scope/my-package
  version:     0.0.1
  description: My awesome package
  license:     MIT
  author:      Takumi Hasebe

? Publish? (Y/n)
✓ Published @scope/my-package@0.0.1
```

dry-run 時は「Dry-run: skip publish」を表示して publish をスキップ。

### name 入力バリデーション

- npm 命名規則（小文字・URL-safe）
- scoped パッケージ `@scope/name` 形式サポート
- 空き確認は入力確定後に即時実行

## 認証

`~/.npmrc` のトークンを `npm publish` が自動利用。このツールは認証処理を行わない。

## エラーハンドリング

| 状況 | 挙動 |
|------|------|
| 名前が使用済み | エラー表示して終了 |
| `~/.npmrc` にトークンなし | npm stderr をそのまま表示して終了 |
| ネットワークエラー（registry 確認時） | エラー表示して終了 |
| `npm` コマンドが見つからない | 起動時に事前チェックして終了 |
| publish 失敗 | npm stderr をそのまま表示して終了 |

リトライ・ロールバックなし。一時ディレクトリは常に終了時削除。

## テスト方針

`bun test` で実行。

- `registry.ts` — fetch モックで「空き / 使用済み / ネットワークエラー」3ケース
- `scaffold.ts` — 生成ファイルの内容・構造を検証
- `publish.ts` — `Bun.$` モックで dry-run フラグの有無を確認

`cli.ts`（対話フロー）は手動確認。

## 技術スタック

- Runtime: Bun
- Language: TypeScript（ESM のみ）
- 対話プロンプト: `@clack/prompts`
- 依存ライブラリ最小化方針
