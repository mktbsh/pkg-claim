
# pkg-claim

npm パッケージ名を予約する CLI ツール。スタブパッケージを生成して `npm publish` する。

## プロジェクト概要

- **エントリ**: `src/cli.ts` → ビルド後 `bin/pkg-claim.js`
- **ビルド**: `tsdown`（ESM、Node.js 24 ターゲット）
- **ランタイム**: 出力は Node.js ≥ 24 で動作。Bun は開発・テスト専用
- **インタラクティブ UI**: `@clack/prompts`

## コマンド

```sh
bun install          # 依存インストール
bun run build        # tsdown でビルド → bin/pkg-claim.js
bun test             # テスト実行
bun run typecheck    # 型チェック（bunx tsc --noEmit）
bun run check        # test + typecheck + build
bun run changeset    # 変更内容の release note を追加
```

## アーキテクチャ

| ファイル | 役割 |
|---|---|
| `src/cli.ts` | CLI エントリ。`@clack/prompts` でインタラクティブ入力 |
| `src/command.ts` | 外部プロセス実行の抽象化。`CommandExecutor` 注入でテスト可能 |
| `src/registry.ts` | npmjs.org への fetch でパッケージ名の空き確認 |
| `src/scaffold.ts` | 一時ディレクトリにスタブ `package.json` + `index.js` を生成 |
| `src/publish.ts` | `npm publish` 実行。`Commander` 注入でテスト可能 |

## 実装ルール

- Node.js 組み込み API を使う: `node:fs/promises`、`node:child_process`、`node:path`、`node:os`
- `Bun.file`、`Bun.$` などの Bun 固有 API は使わない（出力が Node.js で動く必要あり）
- 外部プロセス呼び出しは `command.ts` の `runCommand` / `readCommandText` を経由する
- テスタビリティのため executor / commander は依存注入パターンで受け取る

## Testing

```ts
import { test, expect } from "bun:test";
```

モック executor を渡してコマンド実行をスタブ化する。実際に `npm publish` は呼ばない。

## Changesets / release 運用

- npm に公開される変更を含む PR では `bun run changeset` を実行し、生成された `.changeset/*.md` をコミットする
- docs のみ、内部実装のみ、テストのみなど公開物に影響しない変更では通常 changeset は不要
- `package.json` の `version` は手動で上げず、Changesets の release PR に更新させる
- `main` へ changeset が入ると GitHub Actions が release PR を作成または更新し、その PR を merge すると npm publish が走る

## セッション成果物

- `docs/superpowers/` はエージェントの spec / plan 置き場として扱い、コミットしない
