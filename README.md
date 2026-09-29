# Serial Story Engine

## 日本語

日付を軸に長編物語を育てる、ローカル優先の執筆・ビジュアル制作ワークスペースです。カレンダー形式の章管理、継続性メモ、物語の大きな波と小さな波、画像案、関連メディア向けブリーフを一つの画面で扱います。

### 主な機能

- 日付と生成回ごとの章管理
- 物語地図、ストーリー波形、人物・舞台設定の継続管理
- OpenAI、Google、Anthropic、DeepSeekから選べる文章生成
- 画像プロンプト、参照画像、生成履歴の管理
- 月相と季節の近似情報を創作コンテキストとして利用
- SQLiteによるローカル保存とAPI利用量の概算

### 起動

Node.js 20以降を推奨します。

```bash
npm install
cp .env.example .env
npm run dev:server
```

別のターミナルで次を実行します。

```bash
npm run dev
```

ブラウザで`http://127.0.0.1:5173`を開きます。使うプロバイダーのAPIキーだけを`.env`へ設定してください。

### 検証

```bash
npm test
npm run build
```

### 公開版のデータ方針

この公開版には、既存作品の設定、人物名、参考画像、アップロード資料、生成画像、SQLiteデータベース、APIキー、旧Git履歴を含めていません。初期アートディレクションは汎用例へ差し替えています。

サーバーは既定で`127.0.0.1`へバインドします。認証機能を備えた公開サービスではないため、そのまま外部ネットワークへ公開しないでください。

## English

Serial Story Engine is a local-first writing and visual-production workspace for growing a long-form story around dates. It combines calendar-based chapter management, continuity notes, major and minor story arcs, image concepts, and cross-media briefs in one interface.

### Key features

- Chapter management by date and generation index
- Ongoing story-map, story-wave, character, and setting management
- Text generation through selectable OpenAI, Google, Anthropic, or DeepSeek providers
- Image-prompt, reference-image, and generation-history management
- Approximate lunar-phase and seasonal context for creative prompts
- Local SQLite persistence and estimated API usage costs

### Run locally

Node.js 20 or later is recommended.

```bash
npm install
cp .env.example .env
npm run dev:server
```

In another terminal, run:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`. Add only the API key for the provider you intend to use to `.env`.

### Verification

```bash
npm test
npm run build
```

### Public-repository data policy

This public edition contains no existing story canon, character names, reference images, uploaded source material, generated images, SQLite database, API keys, or previous Git history. Its initial art direction is a generic example.

The server binds to `127.0.0.1` by default. It is not an authenticated public service, so do not expose it directly to an external network.

## License

MIT. See [LICENSE](LICENSE).
