import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Film,
  MessageCircle,
  Mic2,
  Music2,
  Radio,
  RotateCcw,
  Save,
  Sparkles
} from 'lucide-react';
import api from '../api';

const EMPTY_IDEAS = {
  short_tiktok: '',
  short_instagram: '',
  micro_post: '',
  podcast: '',
  soundtrack: ''
};

const IDEA_CARDS = [
  {
    key: 'short_tiktok',
    group: 'ショート動画',
    title: 'TikTok：シュール・ユーモア',
    description: '15〜30秒。冒頭の違和感、小さな笑い、最後に冒頭へ戻るループ。',
    icon: Film,
    accent: 'rose'
  },
  {
    key: 'short_instagram',
    group: 'ショート動画',
    title: 'Instagram：サイレント・Liminal',
    description: '15〜30秒。台詞なし。空間、間、微細な動き、環境音で余韻を作る。',
    icon: Film,
    accent: 'cyan'
  },
  {
    key: 'micro_post',
    group: '言葉',
    title: '短文投稿',
    description: '物語内の人物または語り手の声として、短い独白や観察を3案。',
    icon: MessageCircle,
    accent: 'amber'
  },
  {
    key: 'podcast',
    group: '音声',
    title: 'ポッドキャスト',
    description: '中心的な問い、構成、語り、対話、環境音を含む制作ブリーフ。',
    icon: Mic2,
    accent: 'violet'
  },
  {
    key: 'soundtrack',
    group: '音楽',
    title: 'サウンドトラック',
    description: '物語の感情を支える音色、テンポ、構成、音楽生成プロンプト。',
    icon: Music2,
    accent: 'emerald'
  }
];

const formatVersionTime = (value) => {
  if (!value) return '保存日時なし';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  }).format(date);
};

const MediaIdeas = ({ post }) => {
  const [ideas, setIdeas] = useState(EMPTY_IDEAS);
  const [activeSource, setActiveSource] = useState(null);
  const [history, setHistory] = useState([]);
  const [defaultSourceHash, setDefaultSourceHash] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingKeys, setGeneratingKeys] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIdeaKeys, setSelectedIdeaKeys] = useState([]);
  const [copiedKey, setCopiedKey] = useState('');
  const [notice, setNotice] = useState('');

  const hasIdeas = useMemo(
    () => Object.values(ideas).some((value) => value?.trim()),
    [ideas]
  );
  const isPreviousTextVersion = hasIdeas
    && activeSource?.is_saved
    && !activeSource?.is_current_version;
  const isViewingHistory = Boolean(
    defaultSourceHash
    && activeSource?.content_hash
    && activeSource.content_hash !== defaultSourceHash
  );
  const generatingCount = generatingKeys.length;
  const isGenerating = generatingCount > 0;

  const applyIdeasResponse = (data, { setDefault = false } = {}) => {
    const loadedIdeas = { ...EMPTY_IDEAS, ...(data.ideas || {}) };
    setIdeas(loadedIdeas);
    setActiveSource(data.source || null);
    setHistory(data.history || []);
    if (setDefault) {
      setDefaultSourceHash(data.source?.content_hash || null);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!post?.date || post?.generation_index === undefined || !post?.content) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setSelectedIdeaKeys([]);
      try {
        const res = await api.get(
          `/novel/media-ideas/${post.date}/${post.generation_index}`
        );
        if (!active) return;
        applyIdeasResponse(res.data, { setDefault: true });
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('別メディア提案の読み込みエラー:', error);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [post?.date, post?.generation_index, post?.content_hash, post?.content]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const generateIdeas = async () => {
    if (hasIdeas && !window.confirm('現在の本文に合わせて5つの提案を作り直しますか？ 過去の本文版に紐づく提案は残ります。')) {
      return;
    }
    setGeneratingKeys(IDEA_CARDS.map((card) => card.key));
    setIsOpen(true);
    try {
      const res = await api.post('/novel/generate_media_ideas', {
        date: post.date,
        generation_index: post.generation_index
      });
      applyIdeasResponse(res.data, { setDefault: true });
      showNotice('5つの制作提案を生成し、保存しました');
    } catch (error) {
      console.error('別メディア提案の生成エラー:', error);
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`別メディア向けの提案生成に失敗しました。\n\n${message}`);
    } finally {
      setGeneratingKeys([]);
    }
  };

  const toggleIdeaSelection = (key) => {
    setSelectedIdeaKeys((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    ));
  };

  const generateSelectedIdeas = async () => {
    if (selectedIdeaKeys.length === 0) return;
    const selectedTitles = IDEA_CARDS
      .filter((card) => selectedIdeaKeys.includes(card.key))
      .map((card) => card.title)
      .join('、');
    const confirmed = window.confirm(
      `「${selectedTitles}」だけを現在の本文に合わせて作り直しますか？\n\n選ばなかった提案と、現在編集している内容はそのまま保存されます。過去の本文版に紐づく提案も残ります。`
    );
    if (!confirmed) return;

    setGeneratingKeys(selectedIdeaKeys);
    setIsOpen(true);
    try {
      const res = await api.post('/novel/generate_media_ideas', {
        date: post.date,
        generation_index: post.generation_index,
        keys: selectedIdeaKeys,
        base_ideas: ideas
      });
      applyIdeasResponse(res.data, { setDefault: true });
      setSelectedIdeaKeys([]);
      showNotice(`選んだ${selectedIdeaKeys.length}件の制作提案を作り直し、保存しました`);
    } catch (error) {
      console.error('選択した別メディア提案の生成エラー:', error);
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`選んだ制作提案の再生成に失敗しました。\n\n${message}`);
    } finally {
      setGeneratingKeys([]);
    }
  };

  const generateSingleIdea = async (card) => {
    if (ideas[card.key]?.trim()) {
      const confirmed = window.confirm(
        `「${card.title}」だけを現在の本文に合わせて作り直しますか？\n\nこの項目の現在内容は置き換わりますが、ほかの4件と過去の本文版に紐づく提案は残ります。`
      );
      if (!confirmed) return;
    }

    setGeneratingKeys([card.key]);
    setIsOpen(true);
    try {
      const res = await api.post('/novel/generate_media_ideas', {
        date: post.date,
        generation_index: post.generation_index,
        keys: [card.key],
        base_ideas: ideas
      });
      applyIdeasResponse(res.data, { setDefault: true });
      setSelectedIdeaKeys((current) => current.filter((key) => key !== card.key));
      showNotice(`「${card.title}」を提案し、保存しました`);
    } catch (error) {
      console.error('個別の別メディア提案生成エラー:', error);
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`「${card.title}」の提案生成に失敗しました。\n\n${message}`);
    } finally {
      setGeneratingKeys([]);
    }
  };

  const saveIdeas = async () => {
    setIsSaving(true);
    try {
      const res = await api.put('/novel/media-ideas', {
        date: post.date,
        generation_index: post.generation_index,
        ideas,
        content_hash: activeSource?.is_saved ? activeSource.content_hash : undefined
      });
      applyIdeasResponse(res.data);
      showNotice('編集した制作提案を保存しました');
    } catch (error) {
      console.error('別メディア提案の保存エラー:', error);
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`制作提案の保存に失敗しました。\n\n${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyIdea = async (key) => {
    if (!ideas[key]?.trim()) return;
    try {
      await navigator.clipboard.writeText(ideas[key]);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 1600);
    } catch (error) {
      console.error('コピーエラー:', error);
      alert('コピーできませんでした。文章を選択してコピーしてください。');
    }
  };

  const selectVersion = (version) => {
    if (!version?.content_hash || version.content_hash === activeSource?.content_hash) return;
    const previousVersion = activeSource?.is_saved
      ? {
        content_hash: activeSource.content_hash,
        ideas,
        created_at: activeSource.created_at,
        updated_at: activeSource.updated_at,
        is_current_version: activeSource.is_current_version
      }
      : null;

    setHistory((current) => {
      const next = current.filter((item) => item.content_hash !== version.content_hash);
      if (previousVersion) next.push(previousVersion);
      return next.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    });
    setIdeas({ ...EMPTY_IDEAS, ...(version.ideas || {}) });
    setActiveSource({
      content_hash: version.content_hash,
      created_at: version.created_at,
      updated_at: version.updated_at,
      is_current_version: version.is_current_version,
      is_saved: true
    });
    setIsOpen(true);
  };

  const returnToDefaultVersion = () => {
    const defaultVersion = history.find((version) => version.content_hash === defaultSourceHash);
    if (defaultVersion) selectVersion(defaultVersion);
  };

  return (
    <section className="media-ideas-shell">
      <div className="media-ideas-header">
        <button
          type="button"
          className="media-ideas-title"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
        >
          <span className="media-ideas-mark"><Radio size={17} /></span>
          <span>
            <strong>関連メディアへ展開</strong>
            <small>本文から、別メディア制作に使える5つの種を作ります</small>
          </span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <div className="media-ideas-header-actions">
          {hasIdeas && (
            <button
              type="button"
              onClick={saveIdeas}
              disabled={isSaving || isGenerating}
              className="media-ideas-save"
            >
              <Save size={13} />
              {isSaving ? '保存中…' : '提案を保存'}
            </button>
          )}
          <button
            type="button"
            onClick={generateIdeas}
            disabled={isGenerating || isLoading}
              className="media-ideas-generate"
            >
              <Sparkles size={14} />
              {isGenerating ? `${generatingCount}件を考えています…` : hasIdeas ? '本文に合わせて再提案' : '5つをまとめて提案'}
            </button>
        </div>
      </div>

      {notice && <div className="media-ideas-notice">{notice}</div>}

      {isOpen && (
        <div className="media-ideas-body">
          <p className="media-ideas-intro">
            小説の正典は変更しません。各提案は編集・コピーして、Short Yumakerや音声・音楽制作ツールへ渡せます。
            外部サービスへの自動投稿は行いません。
          </p>

          {hasIdeas && (
            <div className="media-ideas-selective-regeneration">
              <div>
                <strong>選んで再提案</strong>
                <p>必要な媒体だけ、現在の本文に合わせて作り直せます。選ばなかった提案は残ります。</p>
              </div>
              <div className="media-ideas-selection-list">
                {IDEA_CARDS.map((card) => (
                  <label key={card.key}>
                    <input
                      type="checkbox"
                      checked={selectedIdeaKeys.includes(card.key)}
                      onChange={() => toggleIdeaSelection(card.key)}
                      disabled={isGenerating || isSaving || isLoading}
                    />
                    <span>{card.title}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="media-ideas-selective-generate"
                onClick={generateSelectedIdeas}
                disabled={selectedIdeaKeys.length === 0 || isGenerating || isSaving || isLoading}
              >
                <Sparkles size={13} />
                {isGenerating ? '再提案中…' : `選んだ${selectedIdeaKeys.length}件を再提案`}
              </button>
            </div>
          )}

          {isPreviousTextVersion && (
            <div className="media-ideas-version-note">
              <Clock3 size={14} />
              <span>
                この提案は、本文を編集する前の版をもとにしています。語尾などの微調整ならそのまま使えます。
                現在の本文へ合わせ直すときだけ「本文に合わせて再提案」または「選んで再提案」を押してください。
              </span>
            </div>
          )}

          {isViewingHistory && (
            <button
              type="button"
              className="media-ideas-return"
              onClick={returnToDefaultVersion}
            >
              <RotateCcw size={13} />
              表示の基準になっている提案へ戻る
            </button>
          )}

          {generatingKeys.length === IDEA_CARDS.length && !hasIdeas ? (
            <div className="media-ideas-loading">
              <span />
              本文の声と余白を、5つの媒体へ翻訳しています…
            </div>
          ) : (
            <div className="media-ideas-grid">
              {IDEA_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.key} className={`media-idea-card media-idea-card--${card.accent}`}>
                    <div className="media-idea-heading">
                      <span className="media-idea-icon"><Icon size={15} /></span>
                      <div>
                        <small>{card.group}</small>
                        <h3>{card.title}</h3>
                        <p>{card.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyIdea(card.key)}
                        disabled={!ideas[card.key]?.trim()}
                        title={`${card.title}をコピー`}
                        aria-label={`${card.title}をコピー`}
                      >
                        {copiedKey === card.key ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <textarea
                      value={ideas[card.key] || ''}
                      onChange={(event) => setIdeas((current) => ({
                        ...current,
                        [card.key]: event.target.value
                      }))}
                      placeholder={isLoading ? '読み込み中…' : '「この1件を提案」または「5つをまとめて提案」を押すと、制作ブリーフと生成プロンプトが入ります。'}
                      disabled={isLoading || isGenerating}
                    />
                    <button
                      type="button"
                      className="media-idea-generate-one"
                      onClick={() => generateSingleIdea(card)}
                      disabled={isLoading || isSaving || isGenerating}
                    >
                      <Sparkles size={13} />
                      {generatingKeys.includes(card.key)
                        ? 'この提案を考えています…'
                        : ideas[card.key]?.trim()
                          ? 'この1件だけ再提案'
                          : 'この1件を提案'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {history.length > 0 && (
            <details className="media-ideas-history">
              <summary>
                <Clock3 size={14} />
                過去の本文版に紐づく保存済み提案（{history.length}件）
              </summary>
              <p>
                本文を再生成・保存する前に作られた提案です。開いて内容を確認・コピーでき、編集後は同じ本文版として保存できます。
              </p>
              <div className="media-ideas-history-list">
                {history.map((version) => (
                  <button
                    key={version.content_hash}
                    type="button"
                    onClick={() => selectVersion(version)}
                  >
                    <span>{version.is_current_version ? '現在の本文版' : '過去の本文版'}</span>
                    <small>{formatVersionTime(version.updated_at || version.created_at)}</small>
                    <strong>表示する</strong>
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
};

export default MediaIdeas;
