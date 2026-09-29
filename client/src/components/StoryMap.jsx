import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Save, Sparkles } from 'lucide-react';
import api from '../api';

const EMPTY_META = {
  living_vision: '',
  signal_notes: ''
};

const StoryMap = () => {
  const [sections, setSections] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [directions, setDirections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  const completedCount = useMemo(
    () => sections.filter((section) => section.content?.trim()).length,
    [sections]
  );

  const loadStoryMap = async () => {
    setLoading(true);
    try {
      const res = await api.get('/novel/story-map');
      setSections(res.data.sections || []);
      setMeta({ ...EMPTY_META, ...(res.data.meta || {}) });
    } catch (error) {
      console.error('物語地図の読み込みエラー:', error);
      alert(`物語地図の読み込みに失敗しました。\n\n${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoryMap();
  }, []);

  const updateSection = (id, content) => {
    setSections((current) => current.map((section) => (
      section.id === id ? { ...section, content } : section
    )));
    setSavedMessage('');
  };

  const saveStoryMap = async (showNotice = true) => {
    setSaving(true);
    try {
      const res = await api.put('/novel/story-map', { meta, sections });
      setSections(res.data.sections || sections);
      setMeta({ ...EMPTY_META, ...(res.data.meta || meta) });
      if (showNotice) {
        setSavedMessage('物語地図を保存しました');
        window.setTimeout(() => setSavedMessage(''), 2500);
      }
      return true;
    } catch (error) {
      console.error('物語地図の保存エラー:', error);
      alert(`物語地図の保存に失敗しました。\n\n${error.response?.data?.error || error.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const generateSection = async (section) => {
    if (section.content?.trim()) {
      const confirmed = window.confirm(
        `「${section.title}」には文章があります。現在の内容を手掛かりに書き直しますか？`
      );
      if (!confirmed) return;
    }

    const saved = await saveStoryMap(false);
    if (!saved) return;

    setGeneratingId(section.id);
    try {
      const res = await api.post('/novel/story-map/generate', {
        section_id: section.id,
        direction: directions[section.id] || ''
      });
      setSections(res.data.sections || []);
      setMeta({ ...EMPTY_META, ...(res.data.meta || meta) });
      setSavedMessage(`「${section.title}」を生成し、保存しました`);
      window.setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      console.error('物語地図の生成エラー:', error);
      alert(`物語地図の生成に失敗しました。\n\n${error.response?.data?.details || error.response?.data?.error || error.message}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const exportMarkdown = () => {
    const lines = [
      '# 生きた物語地図',
      '',
      '## 終わりのない物語のビジョン',
      '',
      meta.living_vision || '（未記入）',
      '',
      ...sections.flatMap((section) => [
        `## ${section.id}. ${section.title}`,
        '',
        section.content || '（未記入）',
        ''
      ]),
      '## 関連メディア制作ノート',
      '',
      meta.signal_notes || '（未記入）',
      ''
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `living-story-map-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
        物語地図を開いています…
      </div>
    );
  }

  return (
    <section className="story-map-shell">
      <div className="story-map-hero">
        <div>
          <p className="story-map-kicker">LIVING STORY MAP</p>
          <h2 className="text-2xl font-semibold tracking-wide text-slate-50">生きた物語地図</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            結末を固定するあらすじではなく、物語が何度も巡りながら変化するための地図です。
            10の領域はいつでも書き換えられ、日々の本文生成で長期的な方向として参照されます。
          </p>
        </div>
        <div className="story-map-actions">
          <span className="story-map-progress">{completedCount} / 10 領域</span>
          <button type="button" onClick={exportMarkdown} className="soft-button">
            <Download size={14} />
            書き出す
          </button>
          <button type="button" onClick={() => saveStoryMap(true)} disabled={saving} className="primary-button">
            <Save size={14} />
            {saving ? '保存中…' : 'すべて保存'}
          </button>
        </div>
      </div>

      {savedMessage && <div className="story-map-notice">{savedMessage}</div>}

      <div className="story-map-intro-grid">
        <label className="story-map-field">
          <span>終わりのない物語のビジョン</span>
          <textarea
            value={meta.living_vision}
            onChange={(event) => setMeta((current) => ({ ...current, living_vision: event.target.value }))}
            placeholder="この物語が繰り返し戻ってくる問い、変化し続けてほしいもの、決して閉じたくない可能性を書きます。"
          />
        </label>
        <label className="story-map-field">
          <span>関連メディア制作ノート</span>
          <textarea
            value={meta.signal_notes}
            onChange={(event) => setMeta((current) => ({ ...current, signal_notes: event.target.value }))}
            placeholder="音、映像、声、ショート動画へ育てたい感触や断片を記録します。自動連携は行いません。"
          />
        </label>
      </div>

      <div className="story-map-grid">
        {sections.map((section) => (
          <article key={section.id} className="story-map-card">
            <div className="story-map-card-heading">
              <span className="story-map-number">{String(section.id).padStart(2, '0')}</span>
              <div>
                <h3>{section.title}</h3>
                <p>{section.guidance}</p>
              </div>
            </div>

            <textarea
              className="story-map-content story-content"
              value={section.content || ''}
              onChange={(event) => updateSection(section.id, event.target.value)}
              placeholder="ここに現在の地図を書きます。AIで下書きを作り、その後自由に編集できます。"
            />

            <div className="story-map-generate">
              <input
                value={directions[section.id] || ''}
                onChange={(event) => setDirections((current) => ({
                  ...current,
                  [section.id]: event.target.value
                }))}
                placeholder="この領域だけの生成指示（任意）"
              />
              <button
                type="button"
                onClick={() => generateSection(section)}
                disabled={generatingId !== null || saving}
                title={`${section.title}を生成`}
              >
                {generatingId === section.id ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                {generatingId === section.id ? '生成中…' : section.content?.trim() ? 'AIで練り直す' : 'AIで下書き'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
        AI生成は現在の初期設定と他の領域を参照します。重要な設定は生成後に読み直し、人の判断で保存してください。
      </p>
    </section>
  );
};

export default StoryMap;
