# 蕎麦切り 凪 サイト刷新計画（kaizen.md）

作成: visual（統合）/ 協議: motion・ux
対象: `public/index.html`（店名・メニュー・文章は一切変更しない）

---

## 1. 現状の課題

| 領域 | 課題 |
|---|---|
| 印象 | 全体が明るい和紙地で均質。セクションの抑揚がなく「整っているが印象に残らない」 |
| ヒーロー | 中央に放射状の暗幕を重ねて料理写真を潰している。文字も中央寄せで定型的。写真は右に被写体・左上に余白があるのに活かせていない |
| 写真 | 6枚とも正方形素材だが、全て同じ比率・同じ配置。ギャラリーは横スクロールで2枚のみ。店内(カウンター)と暖簾は暗く美しいのに、明るい地に置かれ浮いている |
| 余白 | セクション縦余白 64/112px で、設計書の「引き算」に対し詰まって見える |
| 動き | 16px・320ms のフェードのみ。速すぎて「凪」の静けさが出ていない。ヒーローは setTimeout 群で制御 |
| UX | SPはナビ非表示でハンバーガー無し。FAQは div で開閉しキーボード不可。#reserve 最上部の「オンラインで予約する」は `href="#"` のダミー。ヒーローの scroll-cue と入力欄の下線/placeholder はコントラスト不足。暗背景上のフォーカス(藍)は見えにくい |
| 性能 | PNG 6枚で約9.7MB(各1.4〜1.8MB)。ヒーローが CSS background で LCP が遅い。ファイル名が `.png.png`。フォントウェイトも多い |

## 2. コンセプト

**「凪 ＝ 夜の静けさ」**

- 墨黒を基調にした暗色主導へ転換。和紙色は「明かり」として使い、セクションごとに墨地と和紙地を交互に置いてリズムを作る。
- 朱は「印影」。使うのは予約CTAと小さな落款(角印)のみ。1画面に1点。
- 動きは「足さない・遅く・一度だけ・揃える」。ループは最小限。
- 写真を主役にする。暗幕で潰さず、文字側だけを暗くする。
- 非対称・余白・縦書きで「和モダンのエディトリアル」にする。

## 3. デザイントークン

### 3.1 色

```css
:root{
  --color-ink:#14110f;          /* 地(暗) */
  --color-ink-2:#1c1815;        /* 暗地の段差 */
  --color-washi:#f1ebdf;        /* 明地 / 暗地上の文字 */
  --color-washi-deep:#e6ddcb;
  --color-indigo:#284a6b;       /* 明地上の補助色・罫線 */
  --color-vermilion:#b3402e;    /* CTA・落款のみ */
  --color-line:rgba(32,29,26,.14);        /* 明地の罫線 */
  --color-line-light:rgba(241,235,223,.18);/* 暗地の罫線 */
  --text-on-dark:rgba(241,235,223,.78);   /* 本文 約11:1 */
  --text-on-dark-soft:rgba(241,235,223,.56);/* 補足のみ 約6:1 */
  --color-ink-soft:rgba(32,29,26,.64);    /* 明地の補足 約5:1 */
}
```

- 補足テキストでも alpha 下限は .56(暗地)/.64(明地)。13px 未満の文字は禁止。
- 朱地に washi 文字は約5:1で可。
- 既存の旧トークン名(`--color-ink` 等)は値の差し替えで運用し、JS 側の参照は無い。

### 3.2 タイポグラフィ

| 用途 | 指定 |
|---|---|
| 見出し | Shippori Mincho 500/700 |
| 本文・UI | Zen Kaku Gothic New 400/500 |
| 欧文装飾 | Cormorant Garamond 400(italic は 400 のみ) |
| H1(ヒーロー) | `clamp(40px,7vw,96px)` / letter-spacing .12em / line-height 1.35 / PC は縦書き |
| H2 | `clamp(28px,3.4vw,44px)` / letter-spacing .06em |
| 本文 | 16px / line-height 1.9 / `text-wrap:pretty`、見出しは `text-wrap:balance` |
| 補足 | 13px 以上 |
| セクション番号 | Cormorant 14px の数字のみ(「01」「02」…)。CSS counter＋`aria-hidden` で付与し、可視テキスト(文言)は増やさない |

- フォントはウェイト削減(Mincho 500/700、Gothic 400/500、Cormorant 400)。`display=swap` は維持。
- EN 表示(`body.lang-en`)では縦書きを解除し、横書き・Gothic 系に戻す。

### 3.3 余白・グリッド・その他

- 8px ベーススケール(4/8/16/24/32/48/64/96/128)は維持し、**160・200** を追加。
- セクション縦余白: `clamp(96px,14vw,200px)`(SP は最小 96px。現行の約2倍)。
- コンテナ: 最大 1280px、左右 SP 20px / PC `clamp(40px,6vw,96px)`。写真は右または左へ bleed 可。
- ギャラリー等は 12 カラムグリッド。
- 角丸 0(ボタン 2px は維持)。影は原則なし。
- 質感:
  - 和紙ノイズは事前生成した小タイル(128〜256px の WebP/PNG を data-URI、濃度は .05 相当に焼き込み)を**明地セクションの背景としてのみ**敷く(`mix-blend-mode` なし、fixed 全画面レイヤーなし。暗地では効果が薄く SP のスクロール性能も落ちるため)。SVG feTurbulence＋multiply の固定レイヤーは SP のスクロール合成が重く不採用。
  - 罫線は 1px の細線。写真には「8px 余白＋1px 罫線」の額縁(`--color-line-light` or `--color-line`)。
  - 青海波区切りは縮小し opacity を低く残す。
- 縦書き: ヒーロー H1、story 小見出し、(任意)セクション番号の脇書き。それ以外は横書き。

## 4. セクション別刷新案

各セクションの DOM 構造・id・class(`.ja`/`.en`/`.inline` 等)は維持する。追加する装飾要素は `aria-hidden` の疑似要素 or 空 div で足す。

### 4.1 ヘッダー
- 透明(スクロール 40px 未満)→墨ブラー背景(`rgba(20,17,15,.82)` ＋ solid 時のみ `backdrop-filter`)。ロゴ・nav は washi 色。
- スクロール後に 72→56px へ縮小し色反転(IO sentinel)。ナビは畳まず常時表示、**lang-toggle・ご予約・メニューボタンも常時表示**(完全 hide はしない)。
- SP: ハンバーガー(アイコンのみ、`aria-expanded`、aria-label は JS で言語追従)。フルスクリーン墨オーバーレイ、横書き明朝の項目、各行 44px 以上。

### 4.2 ヒーロー
- 100svh のスプリット。**PC**: 右 62% に `hero-bg.png` を bleed(`<img fetchpriority="high">`、`object-position:70% 55%`)。左は墨ベタ地。画像の左縁は `mask-image:linear-gradient(90deg,transparent,#000 30%)` で墨に溶かす。
- H1「手繰りたてを、静かな一杯で。」は縦書き(`vertical-rl`)2列「手繰りたてを、」「静かな一杯で。」。高さは `max-height:70svh`。直下(同じカラム下部)に hero-meta(要予約バッジ)→CTA(朱)を横書きで配置し、初回ビュー内に収める。右下に朱の角印(36px)を1つ。
- 恒常的な暗さは文字側のみ(PC: `linear-gradient(90deg,#14110f 0 38%,transparent 70%)`)。放射グラデは全廃。
- **SP(<768px)**: 縦積み。写真は **40〜45svh**(または H1 を写真下部に重ねる)、下に墨地で横書き H1(2行)、meta、CTA。ヘッダー 56〜72px を含め 667px 高でも CTA が fold 内に入ること(実装時に 375×667 で必ず確認)。下から `linear-gradient(0deg,#14110f,transparent 55%)`。
- SCROLL キュー: ヒーロー左下に縦書き「SCROLL」＋縦線 1px×56px、alpha .8(旧 .5 は不可)。
- JS/画像失敗時のフォールバックとして hero に墨の背景色を指定。現行 `<section role="img" aria-label>` は子孫(H1含む)を支援技術から隠すため **role=img を外し**、写真は `<img alt="ざるに盛られた手打ち蕎麦">` にする。
- 現行 `.hero-content > *` に JS が opacity/transform を直接付ける実装は、§5 の `.is-loaded` クラス制御へ置換する。H1 の字分割は `.ja` 内のみ(aria-label 付与)。

### 4.3 要点バー
- 暗色の細帯のまま(`--color-ink-2`、上下に罫線)。sticky にはしない。
- SP は横スクロールを維持し、右端にフェードマスクで続きを示唆。
- 文字 13px 以上。直下の青海波区切りは低 opacity。

### 4.4 お知らせ
- 情報価値が低いので控えめに。余白は他の 6 割、文字小さめ(14px)、日付は Cormorant・藍。見出しも小さく。順序・id(`#news`)は維持。
- 「[お知らせ差し替え用]」等の仮文言はそのまま。

### 4.5 物語（明地）
- 画像 4:5(`object-position:50% 70%`、包丁と手が中心)を左に配置し、右へ -48px はみ出す。テキスト側は右カラム、冒頭に縦書き小見出し(h2 の文言「水と、蕎麦と。」を CSS のみで縦書き表示。EN 時は横書きに戻す)。
- 画像は 8px 余白＋1px 罫線の額縁。段落は `max-width:34em`。

### 4.6 お品書き（暗地 `--color-ink`）
- 2品を大小の非対称配置(幅比 7:5)。せいろ(明るい写真)は大、天せいろ(暗い写真)は小。2枚とも 4:3 にトリミング(せいろは `object-position:50% 45%`、天せいろは `50% 55%`)。
- 見出しは明朝 24px、価格は Cormorant・washi。バッジ(ベジ対応可等)は 1px 罫線の小さなラベルで画像の外(右上)に。
- 蒸気(`.steam`)は暗地では alpha を washi 系に。
- ホバー: 画像のみ scale 1.06(translateY は廃止)。

### 4.7 コース（明地）
- 罫線リストのまま。価格を大きく(Cormorant 28px・藍)、名前は明朝。行の高さに余裕、ホバーで罫線が藍に。
- カード枠は使わない(設計書通り)。

### 4.8 ギャラリー（暗地）
- 横スクロール廃止、12col の非対称グリッド: カウンター(7col, 4:5)、暖簾(5col, 3:4)を縦ずらし(暖簾に `margin-top:96px`)。額縁(8px+罫線)。
- カウンターは `object-position:50% 60%`、暖簾は `50% 40%`(暖簾と提灯を残す)。

### 4.9 アクセス（明地）
- 地図は 16:10 のワイド、文字側は dl を 2 列(PC)に。地図枠に 1px 罫線と角に落款風の小さな藍の目印は付けない(引き算)。
- 天気ウィジェットは罫線＋アイコン線画のまま、数値を Cormorant 32px に。
- iframe 地図は `filter:grayscale(.3) contrast(.95)` で世界観に馴染ませる(任意)。

### 4.10 FAQ（和紙深め地）
- 幅 720px 維持。質問は明朝 18px。開閉アイコンは細線＋/−を維持。見た目維持のまま div→button 化(uxが構造変更)。

### 4.11 ご予約（暗地）
- 見出し直下に**フォームを主役**として配置(大きい入力・44px 以上のタップ領域・16px 以上)。「オンラインで予約する」(ダミー `href="#"`)は secondary 見た目に降格し、フォームの下側へ(文言は不変)。電話・LINE はさらに控えめ。
- 入力は暗地に下線(alpha .55)、placeholder alpha .55、フォーカスは washi 2px＋offset、`color-scheme:dark`(date/time)。
- 出現後に CTA へ朱リングが**1回だけ**呼吸。

### 4.12 フッター・追従バー
- フッターは墨地・罫線・Cormorant でロゴ。
- SP 追従バー(モバイルのみ): 墨地＋朱ボタン(上に 1px の罫線)。**ヒーロー CTA が画面外に出たら表示**(300ms)、フッター手前で非表示。

## 5. アニメーション仕様（motion 案・確定値）

**原則**: 動きは足さず、遅く・一度だけ・揃える。対象は `transform` / `opacity` / `clip-path` のみ。1回再生(unobserve)。入場は文字・CTAとも **1.2s 以内に操作可**(pointer-events を遮断しない)。LCP を遅らせる演出(墨幕 overlay・ヒーロー画像の clip・遅延表示)は行わない。

```css
--ease-out:cubic-bezier(.22,1,.36,1);
--ease-in-out:cubic-bezier(.65,0,.35,1);
--ease-curtain:cubic-bezier(.77,0,.18,1); /* 画像カーテン専用 */
--ease-gentle:cubic-bezier(.25,.1,.25,1); /* アンビエント */
--duration-fast:200ms; --duration-base:600ms; --duration-slow:1200ms; --duration-ambient:2400ms;
```
- stagger は兄弟 90ms 刻み・最大 6 個(H1 字単位 30ms は例外)。移動は 16px 以内。duration は base 600ms を基準とし、FAQ・SP メニュー・追従バー等の UI 開閉は 400ms 以内の例外。

**入場(`.is-loaded` クラス 1 つで制御。現行 setTimeout 群は廃止)**
- ヒーロー: 別 div(wrapper)に `scale(1.06→1)` 2400ms(1回)。内側 img は視差用に分離(二重 transform を避ける)。暗幕 overlay は**取り下げ**(左の墨地＋mask 構成で不要)。
- H1(PC 縦書き): JS で `.ja` 内のみ字分割(h1 に `aria-label`、各 span は `aria-hidden`)。各字 `opacity 0→1 ＋ translateY(-8px→0)`、500ms ease-out、字 stagger 30ms、**右列→左列は 150ms ずらし**。`.en`(EN 時)は分割せずブロック fade。blur は使わない(再描画負荷)。
- SP(横書き)・EN 表示時は通常の行マスク(下→上、900ms)。
- タイムライン(全体 1.2s 以内に文字・CTA が操作可): 0ms eyebrow(400ms)＋H1 開始(字 stagger で約 0.9s) / tagline・meta は約 0.5s / **CTA 0.9s**(500ms) / SCROLL キュー 1.2s。**ヘッダーは入場アニメの対象外(即表示)**。ご予約を常時見せる原則を優先する。
- SCROLL キュー: 縦線 1px×56px が上→下へ 3.2s ループ(reduced 時は静止)。
- 初回のみ。2 回目以降は sessionStorage で短縮。スプラッシュ/ローダーは作らない。

**スクロール連動**
- パララックスは **PC のみ**、hero 内側 img の transform(係数 0.1、最大 -48px、ヒーロー外で停止)。SP は無効。story/gallery の内側 img は ±24px(係数 0.1)。#reserve 内はスクロール連動を完全停止。
- 画像カーテン(story/menu/gallery のみ。ヒーロー・フォーム・FAQ には適用しない): 額縁の罫線が先(600ms)→ 画像 `clip-path:inset(0 0 100% 0)→inset(0)` 1200ms(`--ease-curtain`)＋img scale 1.15→1.0(1600ms)、上→下。menu は 120ms ずつずらす。
- h2: 直前の 1px 罫線 scaleX 0→1、行マスク上昇 900ms。threshold .3、`rootMargin:0 0 -10% 0`。本文 p は opacity＋translateY(16px)、段落間 90ms。news/course の行罫線は左から scaleX(700ms)。
- 青海波: 縮小＋低 opacity で呼吸(8→14%)を維持。`water-ripple`(ヒーロー水面)は削除。湯気(steam)は menu のみ残し、IO で画面外は `animation-play-state:paused`。
- 予約 CTA: 出現後に朱リング(`::after` scale 1→1.25・opacity .4→0)を**1回のみ**(ループ不可)。

**ヘッダー**: 完全 hide・方向判定は行わない。IO sentinel(ヒーロー末尾)でスクロール後 72→56px＋色反転(背景色・opacity のみ)(透明→墨ブラー)。PC ナビは常時表示のまま縮小し、「畳む」動きは増やさない。ご予約・lang-toggle・メニューボタンは常時。`backdrop-filter` は solid 時のみ。

**SP メニュー**: ハンバーガーで全画面オーバーレイ(clip-path)開閉 400ms、項目 stagger 40ms、項目は 6 つ＋末尾ご予約(朱)。focus trap / Esc / body overflow hidden / 閉じたらハンバーガーへフォーカス復帰。reduced 時は opacity のみ。

**追従バー**: SP のみ。ヒーロー CTA が画面外に出たら 300ms で出現、フッター手前で隠す。

**FAQ**: `grid-template-rows 0fr→1fr` 400ms、閉状態は `inert`。reduced 時は即時。

**ホバー**(`(hover:hover) and (pointer:fine)` のみ、focus-visible は即時)
- カスタムカーソルは入れない。menu 画像 scale 1.06(900ms)、カード自体の移動は廃止。
- nav 下線は transform scaleX(400ms、離脱時 origin 反転)。
- `btn-primary`: `::before` の濃朱が下から `clip-path` で満ちる 500ms。矢印 translateX 4px。`.ja/.en` span 構造は変えない。

**その他**
- `scroll-margin-top:72px` を各 section に。thanks.html へは任意で `@view-transition{navigation:auto}`(300ms)。
- **reduced-motion**: CSS メディアクエリ 1 本に統一(JS の `body.reduce-motion` は rAF 系の分岐用に互換維持)。transform/clip-path 演出は無効で opacity のみ 200ms。ループ・パララックス・smooth scroll を停止。H1 は字分割せず即表示。
- 実装: ライブラリ無し。IntersectionObserver 1 個を共有し `data-reveal="line|fade|clip|rule"`、`data-delay`、`--i`(stagger)。scroll は 1 本の rAF に集約。`will-change` は表示前のみ。`<html class="js">` 付与後のみ初期 `opacity:0`(`html:not(.js)` と `<noscript>` で全内容を可視化)。

## 6. UX・アクセシビリティ・モバイル（ux 案）

- **性能**: 画像を WebP/AVIF 化し幅別 `srcset`(例 640/1024/1600)。`.png.png` は正しい名前へリネームし参照も同時修正。ヒーローは `<img fetchpriority="high">`(CSS background 廃止)＋ `<link rel="preload">`。それ以外は `loading="lazy" decoding="async"`。フォントはウェイト削減。
- **予約導線**: ヒーロー CTA・ヘッダー・追従バーは `#reserve` へ。#reserve 内はフォームが主役。ダミーボタン降格。電話/LINE は控えめ。
- **SP ナビ**: 横書き明朝のフルスクリーンメニュー、各行 44px 以上、`aria-modal`、Esc・フォーカストラップ、開時は body スクロール固定、項目選択で閉じる。縦書きメニューは不可。ヘッダーに lang-toggle とご予約は常時。ハンバーガーはアイコンのみ・`aria-expanded`・aria-label(JS で言語追従)。**.ja/.en 文言の追加はしない**。
- **ヒーロー縦書き**: SP は横書き、EN 時は常に横書き。縦書き高は max 70svh。CTA は H1 と同カラム下部で初回ビュー内(SP 667px 高でも)。meta/バッジは CTA の直上。
- **コントラスト**: §3.1 の値。補足最小 .56(暗地)、13px 未満禁止、透明ヘッダーのロゴ/ボタンが写真上で読めるか実機確認。
- **フォーカス**: 暗地では washi 2px＋offset。入力は 44px 以上・16px 以上(iOS ズーム防止)・`color-scheme:dark`。
- **FAQ**: `button` ＋ `aria-expanded` 化(見た目維持)。motion の `grid-template-rows` 方式と両立。
- **追従バー**: ヒーロー表示中は非表示、フッター手前で非表示。
- **フォールバック**: no-JS 時に `.reveal` を可視化、hero に背景色フォールバック。`scroll-margin-top`。
- **要点バー**: 非 sticky、SP は右端フェードで続きを示唆。

## 7. 実装の優先順位と手順

1. **土台(P0)**: 画像の WebP/AVIF 化・リネーム・`srcset`、ヒーローを `<img>` 化、フォントウェイト削減、トークン差し替え(色・余白・イージング)。
2. **配色・タイポ・余白(P0)**: 暗色主導化、セクション色の交互配置、見出しスケール、ノイズ質感。
3. **ヒーロー刷新(P0)**: スプリット＋縦書き H1、CTA 配置、入場アニメ(`.is-loaded`)、SP 縦積み、EN 横書き。
4. **UX 必須(P0)**: SP ハンバーガー、FAQ button 化、フォーカス/コントラスト修正、#reserve の順序整理、追従バーの出し分け。
5. **セクション別レイアウト(P1)**: story→menu→gallery→course→access→reserve の順。
6. **スクロール演出(P1)**: 共有 IO＋`data-reveal`、画像クリップ、パララックス、ヘッダー挙動。
7. **ホバー・仕上げ(P2)**: nav/btn 演出、view-transition、地図フィルタ、ノイズ微調整。
8. **検証**: 下記チェックリスト。各段階でブラウザ確認(PC 1440 / タブレット 768 / SP 375・667 高)。

## 8. 注意点（必ず守る）

- **文言不変**: 店名・メニュー・価格・説明・FAQ・仮文言(「[お知らせ差し替え用]」「〇〇駅」等)を一切変えない。装飾の縦書き・数字ラベルは CSS/aria-hidden で足し、文言は増やさない。
- **言語切替**: `body.lang-en` で `.ja` 非表示・`.en` 表示の CSS 方式を維持。span 構造と class(`ja`/`en`/`inline`)は維持。新規テキストが必要な場合は必ず ja/en ペア。EN 時は縦書き解除。
- **予約フォーム**: `#reserve-form`、`rsv-name/guests/date/time`、`rsv-*-note` の id、input の `name`、`POST /api/reserve`(`{name,guests,date,time}`)→`thanks.html?name=&guests=&date=&time=` の挙動を壊さない。水曜・過去日・2 年超・営業時間外の検証 JS もそのまま動くこと。
- **その他 JS が参照する id/class**: `site-header`(`.solid`)、`lang-toggle`、`sticky-reserve`、`weather-*`、`.reveal`、`.faq-item`/`.faq-q`、`.hero-content > *`。置換する場合は同時に JS を更新し動作確認する。
- **天気 API・地図 iframe** は現状のまま。
- 画像リネーム時は `index.html` と OGP 参照を同時に修正。`thanks.html` が同じトークン/フォントに依存していないか確認。
- 動きは transform/opacity/clip-path のみ。`prefers-reduced-motion` で即時表示。JS 無効でも全内容が読めること。
- 朱は CTA と落款のみ(乱用しない)。カスタムカーソルは入れない。

**検証チェックリスト**: SP 375×667 でヒーロー CTA が fold 内に入る／ヒーロー role=img 撤去後も H1 が読み上げられる／JP/EN 切替で崩れない／予約フォーム送信・各エラー表示が動く／SP のハンバーガーとフォーカストラップ／reduced-motion／コントラスト(本文 4.5:1 以上)／LCP(ヒーロー画像)／JS 無効時の可読性。
