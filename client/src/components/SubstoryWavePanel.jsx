import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Layers3, Plus, Save, Sparkles } from 'lucide-react';
import api from '../api';

const EMPTY_BRIEF = {
  theme: '',
  rough_outline: '',
  cast: '',
  must_include: '',
  avoid: '',
  duration_cycles: 1
};

const EMPTY_WAVE = {
  title: '',
  premise: '',
  purpose: '',
  main_connection: '',
  cast: [],
  start_date: '',
  duration_cycles: 1,
  cadence: 'standard',
  intensity: 'balanced',
  phase: 'seed',
  stage_plan: {},
  merge_condition: '',
  residue: '',
  status: 'draft'
};

const STATUS_LABELS = {
  draft: '下書き',
  active: '進行中',
  paused: '一時停止',
  completed: '完了',
  archived: '履歴'
};

const CADENCE_LABELS = {
  sparse: '控えめ',
  standard: '標準',
  frequent: '頻繁'
};

const ACTIONS = [
  ['ai', 'AIに判断させる'],
  ['foreground', '今回、前景に出す'],
  ['advance', '現在段階を進める'],
  ['echo', '兆し・余韻だけ出す']
];

const getTimingLabel = (wave, selectedDate) => {
  if (!wave?.start_date || !selectedDate) return '';
  const start = Date.parse(`${wave.start_date}T12:00:00+09:00`);
  const current = Date.parse(`${selectedDate}T12:00:00+09:00`);
  if (!Number.isFinite(start) || !Number.isFinite(current)) return '';
  const durationDays = 29.530588853 * (Number(wave.duration_cycles) === 2 ? 2 : 1);
  const elapsed = (current - start) / 86400000;
  const remaining = Math.ceil(durationDays - elapsed);
  return remaining < 0
    ? `期間目安を${Math.abs(remaining)}日越えています`
    : `終了目安まで約${remaining}日`;
};

const SubstoryWavePanel = ({ selectedDate, post }) => {
  const generationIndex = Number.isInteger(Number(post?.generation_index))
    ? Number(post.generation_index)
    : 0;
  const [isOpen, setIsOpen] = useState(false);
  const [waves, setWaves] = useState([]);
  const [phases, setPhases] = useState([]);
  const [usages, setUsages] = useState([]);
  const [brief, setBrief] = useState(EMPTY_BRIEF);
  const [candidates, setCandidates] = useState([]);
  const [editor, setEditor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isSuggestingUsage, setIsSuggestingUsage] = useState(false);
  const [notice, setNotice] = useState('');

  const activeWaves = useMemo(() => waves.filter((wave) => wave.status === 'active'), [waves]);
  const selectedById = useMemo(
    () => new Map(usages.map((usage) => [Number(usage.substory_wave_id), usage])),
    [usages]
  );

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const load = async () => {
    if (!selectedDate) return;
    setIsLoading(true);
    try {
      const res = await api.get('/novel/substory-waves', {
        params: { date: selectedDate, generation_index: generationIndex }
      });
      setWaves(Array.isArray(res.data.waves) ? res.data.waves : []);
      setPhases(Array.isArray(res.data.phases) ? res.data.phases : []);
      setUsages(Array.isArray(res.data.usages) ? res.data.usages : []);
    } catch (error) {
      console.error('物語の小さな波の読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedDate, generationIndex]);

  const suggestWaves = async (mode) => {
    setIsSuggesting(true);
    setIsOpen(true);
    try {
      const res = await api.post('/novel/substory-waves/suggest', {
        date: selectedDate,
        mode,
        brief
      });
      setCandidates(Array.isArray(res.data.candidates) ? res.data.candidates : []);
      showNotice(mode === 'expand' ? 'ラフ案を具体化しました' : '小さな波を3案提案しました');
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`小さな波を提案できませんでした。\n\n${message}`);
    } finally {
      setIsSuggesting(false);
    }
  };

  const adoptCandidate = async (candidate) => {
    setIsSaving(true);
    try {
      const res = await api.post('/novel/substory-waves', {
        ...candidate,
        start_date: selectedDate,
        status: 'draft'
      });
      setWaves(Array.isArray(res.data.waves) ? res.data.waves : waves);
      setEditor(res.data.wave || null);
      showNotice('候補を下書きとして保存しました');
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`候補を保存できませんでした。\n\n${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const startManualWave = () => {
    setEditor({ ...EMPTY_WAVE, start_date: selectedDate, cast: [], stage_plan: {} });
    setIsOpen(true);
  };

  const saveEditor = async ({ quiet = false } = {}) => {
    if (!editor) return null;
    setIsSaving(true);
    try {
      const endpoint = editor.id ? `/novel/substory-waves/${editor.id}` : '/novel/substory-waves';
      const method = editor.id ? 'put' : 'post';
      const res = await api[method](endpoint, editor);
      setWaves(Array.isArray(res.data.waves) ? res.data.waves : waves);
      setPhases(Array.isArray(res.data.phases) ? res.data.phases : phases);
      setEditor(res.data.wave || editor);
      if (res.data.wave?.status !== 'active') {
        setUsages((current) => current.filter((usage) => Number(usage.substory_wave_id) !== Number(res.data.wave.id)));
      }
      if (!quiet) showNotice('小さな波を保存しました');
      return res.data.wave;
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`小さな波を保存できませんでした。\n\n${message}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const generatePlan = async () => {
    let saved = editor;
    if (!saved?.id) saved = await saveEditor({ quiet: true });
    else saved = await saveEditor({ quiet: true });
    if (!saved?.id) return;
    setIsPlanning(true);
    try {
      const res = await api.post(`/novel/substory-waves/${saved.id}/generate-plan`);
      setEditor(res.data.wave || saved);
      setWaves(Array.isArray(res.data.waves) ? res.data.waves : waves);
      setPhases(Array.isArray(res.data.phases) ? res.data.phases : phases);
      showNotice('7段階を設計しました');
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`7段階を設計できませんでした。\n\n${message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  const saveSelections = async (nextSelections) => {
    try {
      const res = await api.put('/novel/substory-waves/usage', {
        date: selectedDate,
        generation_index: generationIndex,
        selections: nextSelections
      });
      setUsages(Array.isArray(res.data.usages) ? res.data.usages : []);
      showNotice(nextSelections.length ? '今回挿入する小さな波を保存しました' : '今回は小さな波を使いません');
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`今回の挿入設定を保存できませんでした。\n\n${message}`);
    }
  };

  const toggleSelection = (wave) => {
    const current = usages.map((usage) => ({
      id: Number(usage.substory_wave_id),
      action: usage.action || 'ai'
    }));
    if (selectedById.has(wave.id)) {
      saveSelections(current.filter((selection) => selection.id !== wave.id));
      return;
    }
    if (current.length >= 2) {
      alert('一度の生成に指定できる小さな波は最大2本です。通常は1本をおすすめします。');
      return;
    }
    saveSelections([...current, { id: wave.id, action: 'ai' }]);
  };

  const changeSelectionAction = (waveId, action) => {
    saveSelections(usages.map((usage) => ({
      id: Number(usage.substory_wave_id),
      action: Number(usage.substory_wave_id) === waveId ? action : usage.action
    })));
  };

  const suggestUsage = async () => {
    setIsSuggestingUsage(true);
    try {
      const res = await api.post('/novel/substory-waves/usage/suggest', {
        date: selectedDate,
        generation_index: generationIndex
      });
      setUsages(Array.isArray(res.data.usages) ? res.data.usages : []);
      showNotice(res.data.reason || (res.data.usages?.length ? '今回の挿入を提案しました' : '今回は挿入を見送りました'));
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`今回の挿入を提案できませんでした。\n\n${message}`);
    } finally {
      setIsSuggestingUsage(false);
    }
  };

  return (
    <section className="story-wave-panel substory-wave-panel">
      <div className="story-wave-header">
        <button type="button" onClick={() => setIsOpen((current) => !current)} className="story-wave-title" aria-expanded={isOpen}>
          <span className="story-wave-icon"><Layers3 size={17} /></span>
          <span>
            <strong>物語の小さな波</strong>
            <small>
              {isLoading
                ? '読み込み中…'
                : `進行中 ${activeWaves.length}件・今回挿入 ${usages.length}件（通常1本、最大2本）`}
            </small>
          </span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="story-wave-actions">
          <button type="button" onClick={startManualWave} className="story-wave-save">
            <Plus size={13} />新規作成
          </button>
        </div>
      </div>

      {notice && <div className="story-wave-notice">{notice}</div>}

      {isOpen && (
        <div className="story-wave-body space-y-4">
          <div className="rounded-lg border border-cyan-950/70 bg-cyan-950/10 p-3 text-[11px] leading-relaxed text-slate-400">
            小さな波は複数保存・進行できますが、AIへ渡すのは「今回挿入」で選んだものだけです。
            AI提案は1本、手動指定でも最大2本に制限し、二つの場合も前景化するのは原則一つです。
          </div>

          <section className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-cyan-100">今回挿入する小さな波</p>
                <p className="mt-1 text-[10px] text-slate-500">{selectedDate}・{generationIndex + 1}回目の生成枠だけに反映します。</p>
              </div>
              <button type="button" onClick={suggestUsage} disabled={isSuggestingUsage || activeWaves.length === 0} className="story-wave-generate">
                <Sparkles size={13} />{isSuggestingUsage ? '判断中…' : 'AIに今回の挿入を提案'}
              </button>
            </div>
            {activeWaves.length === 0 ? (
              <p className="mt-3 text-[11px] text-slate-500">「進行中」にした小さな波がありません。</p>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {activeWaves.map((wave) => {
                  const usage = selectedById.get(wave.id);
                  const phase = phases.find((item) => item.key === wave.phase);
                  return (
                    <div key={wave.id} className={`rounded-lg border p-2.5 ${usage ? 'border-cyan-700/70 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/30'}`}>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input type="checkbox" checked={Boolean(usage)} onChange={() => toggleSelection(wave)} className="mt-0.5 accent-cyan-400" />
                        <span className="min-w-0">
                          <strong className="block truncate text-[11px] text-slate-100">{wave.title || '名称未設定'}</strong>
                          <small className="text-[10px] text-slate-500">{phase?.label || '挿入の種'}・{CADENCE_LABELS[wave.cadence] || wave.cadence}・挿入{wave.insert_count || 0}回</small>
                          {getTimingLabel(wave, selectedDate) && <small className="mt-0.5 block text-[9px] text-amber-300/70">{getTimingLabel(wave, selectedDate)}</small>}
                        </span>
                      </label>
                      {usage && (
                        <select value={usage.action || 'ai'} onChange={(event) => changeSelectionAction(wave.id, event.target.value)} className="story-wave-input mt-2 text-[10px]">
                          {ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
            <div>
              <p className="text-xs font-semibold text-fuchsia-100">AIと小さな波を考える</p>
              <p className="mt-1 text-[10px] text-slate-500">空欄なら現在の物語から提案し、入力があればラフ案を土台にします。</p>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <label><span className="story-wave-label">テーマ・問い</span><input className="story-wave-input" value={brief.theme} onChange={(event) => setBrief((current) => ({ ...current, theme: event.target.value }))} placeholder="例：忘れた約束は誰のものか" /></label>
              <label><span className="story-wave-label">登場させたい人物</span><input className="story-wave-input" value={brief.cast} onChange={(event) => setBrief((current) => ({ ...current, cast: event.target.value }))} placeholder="既存人物名を指定" /></label>
            </div>
            <label className="mt-2 block"><span className="story-wave-label">ラフなあらすじ</span><textarea className="story-wave-textarea h-20" value={brief.rough_outline} onChange={(event) => setBrief((current) => ({ ...current, rough_outline: event.target.value }))} placeholder="断片的な案でも構いません" /></label>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <label><span className="story-wave-label">必ず入れたいこと</span><input className="story-wave-input" value={brief.must_include} onChange={(event) => setBrief((current) => ({ ...current, must_include: event.target.value }))} /></label>
              <label><span className="story-wave-label">避けたいこと</span><input className="story-wave-input" value={brief.avoid} onChange={(event) => setBrief((current) => ({ ...current, avoid: event.target.value }))} /></label>
              <label><span className="story-wave-label">希望期間</span><select className="story-wave-input" value={brief.duration_cycles} onChange={(event) => setBrief((current) => ({ ...current, duration_cycles: Number(event.target.value) }))}><option value={1}>1周期（約29.5日）</option><option value={2}>2周期（約59日）</option></select></label>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => suggestWaves('variants')} disabled={isSuggesting} className="story-wave-generate"><Sparkles size={13} />{isSuggesting ? '提案中…' : '異なる3案を提案'}</button>
              <button type="button" onClick={() => suggestWaves('expand')} disabled={isSuggesting || (!brief.theme.trim() && !brief.rough_outline.trim())} className="story-wave-save"><Sparkles size={13} />このラフ案を具体化</button>
            </div>
            {candidates.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {candidates.map((candidate, index) => (
                  <article key={`${candidate.title}-${index}`} className="rounded-lg border border-fuchsia-950/70 bg-slate-950/50 p-3">
                    <strong className="text-xs text-fuchsia-100">{candidate.title || `候補${index + 1}`}</strong>
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{candidate.premise}</p>
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-500">主筋との接点：{candidate.main_connection || '未設定'}</p>
                    <button type="button" onClick={() => adoptCandidate(candidate)} disabled={isSaving} className="story-wave-save mt-3 w-full justify-center">下書きに採用</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-100">保存した小さな波</p>
                <p className="mt-1 text-[10px] text-slate-500">下書き、進行中、一時停止、完了、履歴をすべて残します。</p>
              </div>
              <button type="button" onClick={startManualWave} className="story-wave-save"><Plus size={13} />手動で作る</button>
            </div>
            {waves.length === 0 ? (
              <p className="mt-3 text-[11px] text-slate-500">小さな波はまだありません。</p>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {waves.map((wave) => {
                  const phase = phases.find((item) => item.key === wave.phase);
                  return (
                    <button key={wave.id} type="button" onClick={() => setEditor({ ...EMPTY_WAVE, ...wave })} className="rounded-lg border border-slate-800 bg-slate-950/30 p-3 text-left transition hover:border-cyan-900 hover:bg-slate-900/70">
                      <span className="flex items-center justify-between gap-2"><strong className="truncate text-[11px] text-slate-100">{wave.title || '名称未設定'}</strong><small className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] text-slate-400">{STATUS_LABELS[wave.status] || wave.status}</small></span>
                      <span className="mt-1 block text-[10px] text-slate-500">{phase?.label || '挿入の種'}・{wave.duration_cycles}周期・挿入{wave.insert_count || 0}回</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {editor && (
            <section className="rounded-lg border border-cyan-900/60 bg-slate-950/55 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-cyan-100">{editor.id ? '小さな波を編集' : '新しい小さな波'}</p>
                <button type="button" onClick={() => setEditor(null)} className="text-[10px] text-slate-500 hover:text-slate-200">閉じる</button>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <label><span className="story-wave-label">名前</span><input className="story-wave-input" value={editor.title || ''} onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))} /></label>
                <label><span className="story-wave-label">関係する人物</span><input className="story-wave-input" value={(editor.cast || []).join('、')} onChange={(event) => setEditor((current) => ({ ...current, cast: event.target.value.split(/[、,]/).map((item) => item.trim()).filter(Boolean) }))} /></label>
              </div>
              <label className="mt-2 block"><span className="story-wave-label">具体的なあらすじ・中心</span><textarea className="story-wave-textarea" value={editor.premise || ''} onChange={(event) => setEditor((current) => ({ ...current, premise: event.target.value }))} /></label>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label><span className="story-wave-label">挿入する目的</span><textarea className="story-wave-textarea h-20" value={editor.purpose || ''} onChange={(event) => setEditor((current) => ({ ...current, purpose: event.target.value }))} /></label>
                <label><span className="story-wave-label">主筋との接点</span><textarea className="story-wave-textarea h-20" value={editor.main_connection || ''} onChange={(event) => setEditor((current) => ({ ...current, main_connection: event.target.value }))} /></label>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-5">
                <label><span className="story-wave-label">開始日</span><input type="date" className="story-wave-input" value={editor.start_date || ''} onChange={(event) => setEditor((current) => ({ ...current, start_date: event.target.value }))} /></label>
                <label><span className="story-wave-label">期間</span><select className="story-wave-input" value={editor.duration_cycles || 1} onChange={(event) => setEditor((current) => ({ ...current, duration_cycles: Number(event.target.value) }))}><option value={1}>1周期</option><option value={2}>2周期</option></select></label>
                <label><span className="story-wave-label">挿入ペース</span><select className="story-wave-input" value={editor.cadence || 'standard'} onChange={(event) => setEditor((current) => ({ ...current, cadence: event.target.value }))}><option value="sparse">控えめ</option><option value="standard">標準</option><option value="frequent">頻繁</option></select></label>
                <label><span className="story-wave-label">見せ方</span><select className="story-wave-input" value={editor.intensity || 'balanced'} onChange={(event) => setEditor((current) => ({ ...current, intensity: event.target.value }))}><option value="background">背景</option><option value="balanced">均等</option><option value="foreground">前景</option></select></label>
                <label><span className="story-wave-label">状態</span><select className="story-wave-input" value={editor.status || 'draft'} onChange={(event) => setEditor((current) => ({ ...current, status: event.target.value }))}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                挿入ペースは、同じ小さな波を再登場させる間隔の目安です。自動で本文へ入れる強制スケジュールではありません。
              </p>
              <div className="mt-3 story-wave-phase-track">
                {phases.map((phase, index) => (
                  <React.Fragment key={phase.key}>
                    <button type="button" title={phase.hint} onClick={() => setEditor((current) => ({ ...current, phase: phase.key }))} className={`story-wave-phase ${editor.phase === phase.key ? 'is-current' : ''}`}><span>{index + 1}</span>{phase.label}</button>
                    {index < phases.length - 1 && <span className="story-wave-arrow">→</span>}
                  </React.Fragment>
                ))}
              </div>
              {phases.map((phase) => editor.phase === phase.key && (
                <label key={phase.key} className="mt-3 block"><span className="story-wave-label">現在段階「{phase.label}」の設計</span><textarea className="story-wave-textarea h-20" value={editor.stage_plan?.[phase.key] || ''} onChange={(event) => setEditor((current) => ({ ...current, stage_plan: { ...(current.stage_plan || {}), [phase.key]: event.target.value } }))} placeholder={phase.hint} /></label>
              ))}
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label><span className="story-wave-label">主筋へ戻す条件・合流点</span><textarea className="story-wave-textarea h-20" value={editor.merge_condition || ''} onChange={(event) => setEditor((current) => ({ ...current, merge_condition: event.target.value }))} /></label>
                <label><span className="story-wave-label">終了後に残す余韻・未回収の糸</span><textarea className="story-wave-textarea h-20" value={editor.residue || ''} onChange={(event) => setEditor((current) => ({ ...current, residue: event.target.value }))} /></label>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-3">
                <button type="button" onClick={generatePlan} disabled={isPlanning || isSaving} className="story-wave-generate"><Sparkles size={13} />{isPlanning ? '設計中…' : 'AIで7段階を設計'}</button>
                <button type="button" onClick={() => saveEditor()} disabled={isSaving} className="story-wave-save"><Save size={13} />{isSaving ? '保存中…' : '保存'}</button>
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
};

export default SubstoryWavePanel;
