import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Save, Sparkles, Waves } from 'lucide-react';
import api from '../api';
import { getLunarQuarterContext, getMoonContext } from '../utils/celestial';

const EMPTY_WAVE = {
  title: '',
  core: '',
  length_mode: 'lunar_cycle',
  intensity: 'large',
  start_date: '',
  phase: 'seed',
  stage_plan: {},
  next_milestone: '',
  moon_link: true
};

const WAVE_ACTIONS = [
  ['ai', 'AIに判断させる'],
  ['deepen', '現在段階を深める'],
  ['advance', '次の段階へ進める'],
  ['detour', '脇道へ逸れる'],
  ['echo', '余韻だけ残す']
];

const StoryWavePanel = ({ selectedDate, post, onPostUpdate }) => {
  const [wave, setWave] = useState(EMPTY_WAVE);
  const [phases, setPhases] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState('');
  const [waveAction, setWaveAction] = useState(post?.wave_action || 'ai');
  const moon = getMoonContext(selectedDate);
  const lunarQuarter = getLunarQuarterContext(selectedDate);

  const currentPhase = useMemo(
    () => phases.find((phase) => phase.key === wave.phase) || phases[0],
    [phases, wave.phase]
  );
  const cycleSync = useMemo(() => {
    if (!wave.moon_link || !['lunar_quarter', 'lunar_cycle'].includes(wave.length_mode)) return null;
    const startDate = wave.start_date || selectedDate;
    const startMoon = getMoonContext(startDate);
    if (wave.length_mode === 'lunar_quarter') {
      const startQuarter = getLunarQuarterContext(startDate);
      return {
        label: lunarQuarter.label,
        theme: lunarQuarter.theme,
        progress: lunarQuarter.progress,
        daysRemaining: lunarQuarter.daysRemaining,
        boundaryReached: startQuarter.cycleId !== lunarQuarter.cycleId
      };
    }
    return {
      label: '新月〜次の新月',
      theme: moon.theme,
      progress: Math.min(Math.round((moon.age / 29.530588853) * 100), 100),
      daysRemaining: Number((29.530588853 - moon.age).toFixed(1)),
      boundaryReached: startMoon.lunationNumber !== moon.lunationNumber
    };
  }, [lunarQuarter, moon, selectedDate, wave.length_mode, wave.moon_link, wave.start_date]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/novel/story-wave');
        if (!active) return;
        setWave(res.data.wave ? { ...EMPTY_WAVE, ...res.data.wave } : { ...EMPTY_WAVE, start_date: selectedDate });
        setPhases(Array.isArray(res.data.phases) ? res.data.phases : []);
        if (!res.data.wave) setIsOpen(true);
      } catch (error) {
        console.error('物語の大きな波の読み込みエラー:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setWaveAction(post?.wave_action || 'ai');
  }, [post?.date, post?.generation_index, post?.wave_action]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const saveWave = async () => {
    setIsSaving(true);
    try {
      const res = await api.put('/novel/story-wave', wave);
      setWave({ ...EMPTY_WAVE, ...(res.data.wave || {}) });
      setPhases(Array.isArray(res.data.phases) ? res.data.phases : phases);
      showNotice('物語の大きな波を保存しました');
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`物語の大きな波を保存できませんでした。\n\n${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const generateWave = async () => {
    if ((wave.core || wave.title) && !window.confirm('現在の案をもとに、7段階の「物語の大きな波」をAIで設計し直しますか？')) return;
    setIsGenerating(true);
    setIsOpen(true);
    try {
      const res = await api.post('/novel/story-wave/generate', {
        date: selectedDate,
        wave
      });
      setWave({ ...EMPTY_WAVE, ...(res.data.wave || {}) });
      setPhases(Array.isArray(res.data.phases) ? res.data.phases : phases);
      showNotice('7段階の波を生成し、保存しました');
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`物語の大きな波を生成できませんでした。\n\n${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const beginNewWave = async () => {
    if (!window.confirm('現在の波を履歴へ移し、空の「次の波」を始めますか？ 現在の波は削除されません。')) return;
    try {
      const res = await api.post('/novel/story-wave/new', { start_date: selectedDate });
      setWave({ ...EMPTY_WAVE, ...(res.data.wave || {}), start_date: selectedDate });
      setPhases(Array.isArray(res.data.phases) ? res.data.phases : phases);
      setIsOpen(true);
      showNotice('次の波を始めました');
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`次の波を始められませんでした。\n\n${message}`);
    }
  };

  const saveWaveAction = async (nextAction) => {
    setWaveAction(nextAction);
    if (!selectedDate || post?.generation_index === undefined) return;
    try {
      const res = await api.put('/novel/story-wave/action', {
        date: selectedDate,
        generation_index: post.generation_index,
        wave_action: nextAction
      });
      onPostUpdate?.(res.data);
      showNotice('今回の進め方を保存しました');
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`今回の進め方を保存できませんでした。\n\n${message}`);
    }
  };

  return (
    <section className="story-wave-panel">
      <div className="story-wave-header">
        <button type="button" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen} className="story-wave-title">
          <span className="story-wave-icon"><Waves size={17} /></span>
          <span>
            <strong>物語の大きな波</strong>
            <small>
              {isLoading
                ? '読み込み中…'
                : wave.core || wave.title
                  ? `${currentPhase?.label || '種'}・${wave.title || '名称未設定'}・${wave.length_mode === 'lunar_quarter' ? lunarQuarter.label : moon.name}`
                  : '複数日にまたがる展開を、7段階で育てます'}
            </small>
          </span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="story-wave-actions">
          <button type="button" onClick={generateWave} disabled={isGenerating || isLoading} className="story-wave-generate">
            <Sparkles size={13} />{isGenerating ? '設計中…' : 'AIで波を設計'}
          </button>
          <button type="button" onClick={saveWave} disabled={isSaving || isLoading} className="story-wave-save">
            <Save size={13} />{isSaving ? '保存中…' : '波を保存'}
          </button>
        </div>
      </div>

      {notice && <div className="story-wave-notice">{notice}</div>}

      {isOpen && (
        <div className="story-wave-body">
          <div className="story-wave-phase-track" aria-label="物語の波の現在位置">
            {phases.map((phase, index) => (
              <React.Fragment key={phase.key}>
                <button
                  type="button"
                  onClick={() => setWave((current) => ({ ...current, phase: phase.key }))}
                  className={`story-wave-phase ${wave.phase === phase.key ? 'is-current' : ''}`}
                  title={phase.moonHint}
                >
                  <span>{index + 1}</span>{phase.label}
                </button>
                {index < phases.length - 1 && <span className="story-wave-arrow">→</span>}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label>
              <span className="story-wave-label">波の名前</span>
              <input value={wave.title || ''} onChange={(event) => setWave((current) => ({ ...current, title: event.target.value }))} className="story-wave-input" placeholder="例：借り物の記憶がほどける周期" />
            </label>
            <label>
              <span className="story-wave-label">次の節目</span>
              <input value={wave.next_milestone || ''} onChange={(event) => setWave((current) => ({ ...current, next_milestone: event.target.value }))} className="story-wave-input" placeholder="次に近づく具体的な変化" />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="story-wave-label">波の中心</span>
            <textarea value={wave.core || ''} onChange={(event) => setWave((current) => ({ ...current, core: event.target.value }))} className="story-wave-textarea" placeholder="複数回を貫く変化、問い、関係の緊張を書きます。空欄のままAIに提案させることもできます。" />
          </label>

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label>
              <span className="story-wave-label">長さ</span>
              <select
                value={wave.length_mode || 'lunar_cycle'}
                onChange={(event) => setWave((current) => ({
                  ...current,
                  length_mode: event.target.value,
                  moon_link: ['lunar_quarter', 'lunar_cycle'].includes(event.target.value) ? true : current.moon_link
                }))}
                className="story-wave-input"
              >
                <option value="short">3回程度</option>
                <option value="seven">7回程度</option>
                <option value="month">ひと月程度</option>
                <option value="lunar_quarter">月の1/4周期（四つの区間）</option>
                <option value="lunar_cycle">新月から次の新月</option>
                <option value="custom">自由指定</option>
              </select>
            </label>
            <label>
              <span className="story-wave-label">強さ</span>
              <select value={wave.intensity || 'large'} onChange={(event) => setWave((current) => ({ ...current, intensity: event.target.value }))} className="story-wave-input">
                <option value="quiet">静かな変化</option>
                <option value="medium">中程度の転換</option>
                <option value="large">大きなうねり</option>
              </select>
            </label>
            <label>
              <span className="story-wave-label">開始日</span>
              <input type="date" value={wave.start_date || ''} onChange={(event) => setWave((current) => ({ ...current, start_date: event.target.value }))} className="story-wave-input" />
            </label>
            <label>
              <span className="story-wave-label">今回の進め方</span>
              <select value={waveAction} onChange={(event) => saveWaveAction(event.target.value)} className="story-wave-input">
                {WAVE_ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-slate-400">
            <input
              type="checkbox"
              checked={wave.moon_link !== false}
              onChange={(event) => setWave((current) => ({ ...current, moon_link: event.target.checked }))}
              disabled={['lunar_quarter', 'lunar_cycle'].includes(wave.length_mode)}
              className="mt-0.5 accent-fuchsia-400 disabled:opacity-60"
            />
            月相を段階の強制ではなく、物語へ働く圧力として参照する（選択日は {moon.name}・{lunarQuarter.label}）
            {['lunar_quarter', 'lunar_cycle'].includes(wave.length_mode) && '／月同期の長さでは常に有効'}
          </label>

          {cycleSync && (
            <div className={`mt-3 rounded-lg border px-3 py-2.5 ${cycleSync.boundaryReached ? 'border-amber-700/60 bg-amber-950/20' : 'border-fuchsia-950/70 bg-slate-950/45'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <div>
                  <strong className={cycleSync.boundaryReached ? 'text-amber-200' : 'text-fuchsia-200'}>
                    月の波：{cycleSync.label}
                  </strong>
                  <p className="mt-0.5 text-slate-500">
                    区間内 約{cycleSync.progress}%・次の境界まで概算 {cycleSync.daysRemaining}日
                  </p>
                </div>
                {cycleSync.boundaryReached && (
                  <span className="rounded-full border border-amber-700/60 px-2 py-0.5 text-amber-200">
                    開始時の月区間を越えています
                  </span>
                )}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-700 to-amber-300" style={{ width: `${cycleSync.progress}%` }} />
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{cycleSync.theme}</p>
              {cycleSync.boundaryReached && (
                <p className="mt-1 text-[10px] leading-relaxed text-amber-200/75">
                  自動では切り替えません。現在の波を余波または次の種へ渡してから、「次の波を始める」を選べます。
                </p>
              )}
            </div>
          )}

          {currentPhase && (
            <label className="mt-3 block rounded-lg border border-fuchsia-950/70 bg-slate-950/45 p-3">
              <span className="story-wave-label">現在段階「{currentPhase.label}」の設計</span>
              <textarea
                value={wave.stage_plan?.[currentPhase.key] || ''}
                onChange={(event) => setWave((current) => ({
                  ...current,
                  stage_plan: { ...(current.stage_plan || {}), [currentPhase.key]: event.target.value }
                }))}
                className="story-wave-textarea h-20"
                placeholder={currentPhase.moonHint}
              />
            </label>
          )}

          <div className="mt-3 flex justify-end border-t border-slate-800 pt-3">
            <button type="button" onClick={beginNewWave} className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              <RotateCcw size={12} />現在の波を残して、次の波を始める
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default StoryWavePanel;
