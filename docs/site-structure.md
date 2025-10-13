# Site Structure (spec draft)

## Global Requirements
- Responsive
- Light/Dark mode switch
- i18n (language selector; default: ja, future: en)
- SEO-ready (title/desc, ogp, canonical, sitemap, robots)
- Future EC-ready (catalog structure only / no checkout yet)
- Instagram integration (optional: top teaser embed)

## Navigation (Header)
- Home (/)
- Gallery (/works/)
- News (/news/)  ← トップ下2コマの元データ
- About (/about/)
  - Studio (/about/studio/)
  - Process (/about/process/)
- Catalog (/catalog/)  ← 定番カテゴリ（マグ/鉢/皿…）
- FAQ (/faq/)
- Contact (/contact/)

## Top Page
- Hero video (muted, loop, mp4/webm)
- Teasers (2 cards) → latest from /news/ or /works/

## Collections (Hugo content sections)
- works/        → 作品アーカイブ（photos[], series, glaze, firing, size）
- news/         → 新作/ニュース（list→トップ2件ティーザー）
- about/studio/ → 工房紹介（理念・プロフィール・制作風景）
- about/process/→ 制作工程（ろくろ・化粧・焼成）
- catalog/      → 定番カテゴリ（mag, bowl, plate…）
- faq/          → 購入前の注意（Q&A）
- contact/      → フォーム用ページ
- pages/        → その他固定ページ

## Static Assets
- /static/uploads/   （作品・バナー画像）
- /static/video/     （トップ動画）

## i18n Keys (example)
- ja / en （将来追加）

## Next Steps (implementation order)
1. content/ の最小ディレクトリを用意（works/news/about/...）
2. 最小ダミーMarkdownを各セクションに1本ずつ配置
3. ナビを config.toml の [menu] に定義
4. /admin の collections に「works」「news」「catalog」を追加
5. Hero動画の仮ファイル（/static/video/hero.mp4）を置く
