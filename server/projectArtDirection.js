export const FULL_PROJECT_ART_DIRECTION = `【基本方針】
登録された物語設定、人物、場所、時刻、出来事を正典として優先する。

【構図】
場面の中心を一つに絞り、人物と環境の関係が読める構図にする。参照画像がある場合は、人物の同一性と舞台の配置を保持する。

【光・色・素材】
本文の時間帯と感情に合う光を選び、支配色を限定する。素材は具体的に記述し、過剰な演出を避ける。

【オリジナリティ】
実在作家や既存作品の固有表現を模倣せず、構図、色、素材、感情を一般語で指定する。

【避ける表現】
本文にない人物・小道具・ロゴ・字幕・透かしを追加しない。`;

export const DEFAULT_PROJECT_ART_DIRECTION = FULL_PROJECT_ART_DIRECTION;

const PURPOSE_RULES = {
  novel: '視覚用語を列挙せず、空間、光、人物の知覚へ自然に翻訳する。',
  media: '媒体ごとの制約へ合わせ、視覚用語を音声や投稿文へ無理に混ぜない。',
  image_generation: '本文と参照画像の事実を守り、構図、光、色、素材へ適用する。',
  image_prompt: '完成プロンプトへ構図、光、色、素材を具体的に織り込む。'
};

export const buildProjectArtDirectionContext = (value, purpose = 'image_prompt') => {
  const direction = String(value ?? '').trim();
  if (!direction) return '';
  const purposeRule = PURPOSE_RULES[purpose] || PURPOSE_RULES.image_prompt;
  return [
    '【プロジェクト共通アートディレクション】',
    direction,
    '',
    '【この用途での適用ルール】',
    `- ${purposeRule}`,
    '- 正典と参照画像を最優先し、アートディレクションを理由に設定を変更しない。'
  ].join('\n');
};
