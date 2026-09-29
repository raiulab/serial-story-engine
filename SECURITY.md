# セキュリティ / Security

## 日本語

脆弱性や秘密情報の誤掲載を見つけた場合は、公開Issueへ詳細を書かず、GitHubのSecurity Advisoryから非公開で報告してください。

`.env`、`db/`、`uploads/`、`generated/`はGit管理外です。本アプリはローカル利用を前提とし、認証・認可、レート制限、CSRF対策を備えた公開サービスではありません。外部公開する場合は、それらの対策とアップロード検査を追加してください。

## English

If you discover a vulnerability or accidentally committed secret, report it privately through a GitHub Security Advisory instead of posting details in a public issue.

`.env`, `db/`, `uploads/`, and `generated/` are excluded from Git. This application is intended for local use and is not a public service with authentication, authorization, rate limiting, or CSRF protection. Add those controls and upload scanning before any external deployment.
