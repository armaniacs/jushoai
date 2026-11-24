# セキュリティポリシー

JushoAI の脆弱性を見つけた場合は、公開の Issue や PR、SNS には書かず、下の方法で非公開に報告してください。

## 対象バージョン

修正の対象は最新の公開版だけです。ストア配布版と、GitHub Release の最新版が対象です。

## 報告方法

GitHub の非公開脆弱性報告から送ってください。

https://github.com/armaniacs/jushoai/security/advisories/new

公開 Issue・PR・SNS には書かないでください。

## 書いてほしいこと

- 影響する版
- 再現手順
- 想定される影響

実在の個人情報は含めないでください。

## 応答の目安

- 受付の確認: 7 日以内
- 深刻度の判断と修正方針の連絡: 30 日以内

どちらも目安であり、保証ではありません。

## 公開までの流れ

修正版をストアに出したあとに、GitHub Security Advisory で公開します。報告者のクレジットは希望に従います。

## 対象外の例

次は設計上の既知の限界として、脆弱性としては扱いません。

- 悪意あるページが出す label などが、AI への送信内容に含まれること。送信前パネルで内容を確認できます。
- 端末のマルウェアや、同じ OS アカウントの他人による保存データの読み出し。
- ユーザー自身が設定した接続先（Ollama など）側の脆弱性。
- ブラウザ本体の脆弱性。

## English

Please report vulnerabilities privately through GitHub private vulnerability reporting (https://github.com/armaniacs/jushoai/security/advisories/new). Do not open public issues or pull requests for security problems.

Only the latest published version (store release and the latest GitHub Release) receives fixes. We aim to acknowledge a report within 7 days and to share an assessment and fix plan within 30 days; these are targets, not guarantees. Fixes are disclosed through a GitHub Security Advisory after the fixed version is published to the stores, and reporters are credited as they wish.

Out of scope (known design limits): malicious pages whose labels end up in AI requests (visible in the pre-send panel), local malware or other people on the same OS account reading stored data, vulnerabilities in endpoints the user configured (such as Ollama), and browser vulnerabilities.
