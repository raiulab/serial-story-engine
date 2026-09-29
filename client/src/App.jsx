import React, { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Clock3, Coins, Settings } from 'lucide-react';
import CalendarView from './components/CalendarView';
import PostEditor from './components/PostEditor';
import ImagePreview from './components/ImagePreview';
import MediaIdeas from './components/MediaIdeas';
import SettingsPanel from './components/SettingsPanel';
import StoryMap from './components/StoryMap';
import StoryWavePanel from './components/StoryWavePanel';
import SubstoryWavePanel from './components/SubstoryWavePanel';
import api from './api';

const NOVEL_START_DATE = '2026-07-29';
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDeepSeekPricingStatus = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(values.weekday);
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  const isPeak = weekday && (
    (minutes >= 10 * 60 && minutes < 13 * 60)
    || (minutes >= 15 * 60 && minutes < 19 * 60)
  );

  return {
    period: isPeak ? 'peak' : 'off_peak',
    time: `${values.hour}:${values.minute}`
  };
};

const App = () => {
  const [posts, setPosts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPosts, setSelectedPosts] = useState([]); // 複数の生成回に対応
  const [showSettings, setShowSettings] = useState(false);
  const [dailyGenerationCount, setDailyGenerationCount] = useState(1); // 1日あたりの生成回数
  const [activeView, setActiveView] = useState('calendar');
  const [costSummary, setCostSummary] = useState({
    current: { jpy: 0 },
    month: { jpy: 0 }
  });
  const [textProvider, setTextProvider] = useState('');
  const [deepSeekPricingStatus, setDeepSeekPricingStatus] = useState(getDeepSeekPricingStatus);

  const fetchCostSummary = async (date, generationIndex) => {
    try {
      const params = {};
      if (date) params.date = date;
      if (Number.isInteger(generationIndex)) {
        params.generation_index = generationIndex;
      }
      const res = await api.get('/novel/costs/summary', { params });
      setCostSummary(res.data);
    } catch (e) {
      console.error('API料金取得エラー:', e);
    }
  };

  const findLatestGeneratedIndex = (date, sourcePosts = posts) => {
    const generated = sourcePosts
      .filter((post) => post.date === date && post.content)
      .sort((a, b) => (b.generation_index || 0) - (a.generation_index || 0));
    return generated.length > 0 ? (generated[0].generation_index || 0) : null;
  };

  const formatApproximateYen = (value) => {
    const yen = Number(value) || 0;
    if (yen > 0 && yen < 1) return '1円未満';
    return `${Math.round(yen).toLocaleString('ja-JP')}円`;
  };

  useEffect(() => {
    const initialize = async () => {
      const loadedDailyCount = await fetchSettings();
      const loadedPosts = await fetchPosts();
      handleDateSelect(
        formatLocalDate(new Date()),
        loadedPosts || [],
        loadedDailyCount || 1
      );
    };
    initialize();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/novel/chapters');
      setPosts(res.data);
      return res.data;
    } catch (e) {
      console.error('小説データ取得エラー:', e);
      const errorMsg = e.response?.data?.error || e.message || '不明なエラー';
      const status = e.response?.status || 'N/A';
      console.error('エラー詳細:', {
        message: errorMsg,
        status: status,
        url: e.config?.url,
        baseURL: e.config?.baseURL
      });
      alert(`小説データの取得に失敗しました。\n\nエラー: ${errorMsg}\nステータス: ${status}\n\nサーバーが起動しているか確認してください。`);
      return [];
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/novel/settings');
      const count = parseInt(res.data.daily_generation_count || '1', 10);
      setDailyGenerationCount(count || 1);
      setTextProvider(res.data.text_provider || '');
      return count || 1;
    } catch (e) {
      console.error(e);
      // エラーが発生してもデフォルト値（1）を使用
      return 1;
    }
  };

  const handleDateSelect = (dateStr, sourcePosts = posts, configuredLimit = dailyGenerationCount) => {
    setSelectedDate(dateStr);

    // 指定日の既存postを取得（generation_index順）
    const sameDatePosts = sourcePosts
      .filter((p) => p.date === dateStr)
      .sort((a, b) => (a.generation_index || 0) - (b.generation_index || 0));

    const postsWithPlaceholder = [...sameDatePosts];

    // 未達の場合は、次の生成枠をプレースホルダーとして追加
    const maxExistingIndex = sameDatePosts.length > 0
      ? Math.max(...sameDatePosts.map(p => p.generation_index || 0))
      : -1;
    const generatedCount = sameDatePosts.filter((post) => Boolean(post.content)).length;
    const hasDraft = sameDatePosts.some((post) => !post.content);
    const remainingSlots = Math.max(configuredLimit - generatedCount, 0);

    if (remainingSlots > 0 && !hasDraft) {
      postsWithPlaceholder.push({
        date: dateStr,
        status: 'pending',
        generation_index: maxExistingIndex + 1
      });
    } else if (postsWithPlaceholder.length === 0) {
      // 念のため、全く投稿が無い場合も1枠表示
      postsWithPlaceholder.push({
        date: dateStr,
        status: 'pending',
        generation_index: 0
      });
    }

    setSelectedPosts(postsWithPlaceholder);
    fetchCostSummary(dateStr, findLatestGeneratedIndex(dateStr, sourcePosts));
  };

  const handlePostUpdate = (updated) => {
    setPosts((prev) => {
      const existing = prev.find((p) =>
        p.date === updated.date && (p.generation_index || 0) === (updated.generation_index || 0)
      );
      const merged = { ...existing, ...updated };
      // 同じ日付かつ同じgeneration_indexの投稿を削除して、既存の内容とマージして追加
      const others = prev.filter((p) =>
        !(p.date === updated.date && (p.generation_index || 0) === (updated.generation_index || 0))
      );
      return [...others, merged];
    });

    // selectedPostsを更新
    setSelectedPosts(prev => {
      const index = updated.generation_index || 0;
      const newPosts = [...prev];
      newPosts[index] = { ...newPosts[index], ...updated };
      return newPosts;
    });
    fetchCostSummary(updated.date, Number(updated.generation_index) || 0);
  };

  useEffect(() => {
    const refreshUsage = () => {
      fetchCostSummary(
        selectedDate,
        selectedDate ? findLatestGeneratedIndex(selectedDate) : null
      );
    };
    window.addEventListener('ai-usage-updated', refreshUsage);
    return () => window.removeEventListener('ai-usage-updated', refreshUsage);
  }, [selectedDate, posts]);

  useEffect(() => {
    const refreshPricingStatus = () => setDeepSeekPricingStatus(getDeepSeekPricingStatus());
    const timerId = window.setInterval(refreshPricingStatus, 30_000);
    return () => window.clearInterval(timerId);
  }, []);

  const handleSettingsClose = async () => {
    setShowSettings(false);
    // 設定を再取得してdailyGenerationCountを更新（完了を待つ）
    const loadedDailyCount = await fetchSettings();
    // 日付が選択されている場合は、新しい生成回数に合わせて再選択
    // また、postsを再取得して、表示を更新
    const loadedPosts = await fetchPosts();
    if (selectedDate) {
      handleDateSelect(selectedDate, loadedPosts || [], loadedDailyCount || 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">Novel Writer | 小説執筆アシスタント</h1>
            <p className="text-xs text-slate-400 mt-1">
              物語の設計から日々の一頁まで、連続性を保ちながら書き継ぐ
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              className="inline-flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-950/25 px-3 py-1.5"
              title="各APIが返す実使用量と公開単価、設定した為替レートから算出した概算です。"
            >
              <Coins size={15} className="text-amber-300" />
              <div className="leading-tight">
                <p className="text-[10px] text-amber-100">
                  今回 約{formatApproximateYen(costSummary.current?.jpy)}
                </p>
                <p className="mt-0.5 text-[10px] text-amber-300/70">
                  今月合計 約{formatApproximateYen(costSummary.month?.jpy)}
                </p>
              </div>
            </div>
            {textProvider === 'deepseek' && (
              <div
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
                  deepSeekPricingStatus.period === 'peak'
                    ? 'border-rose-700/50 bg-rose-950/25'
                    : 'border-emerald-700/50 bg-emerald-950/25'
                }`}
                title="DeepSeek V4の料金区分です。平日10:00〜13:00・15:00〜19:00（日本時間）がピーク、それ以外と土日はオフピークです。"
              >
                <Clock3
                  size={15}
                  className={deepSeekPricingStatus.period === 'peak' ? 'text-rose-300' : 'text-emerald-300'}
                />
                <div className="leading-tight">
                  <p className={
                    `text-[10px] ${deepSeekPricingStatus.period === 'peak' ? 'text-rose-100' : 'text-emerald-100'}`
                  }>
                    DeepSeek：{deepSeekPricingStatus.period === 'peak' ? 'ピーク料金' : 'オフピーク料金'}
                  </p>
                  <p className={
                    `mt-0.5 text-[10px] ${deepSeekPricingStatus.period === 'peak' ? 'text-rose-300/70' : 'text-emerald-300/70'}`
                  }>
                    現在 {deepSeekPricingStatus.time}（日本時間）
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => setActiveView(activeView === 'story-map' ? 'calendar' : 'story-map')}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition ${
                activeView === 'story-map'
                  ? 'border-amber-500/70 bg-amber-900/30 text-amber-100'
                  : 'border-slate-600 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {activeView === 'story-map' ? <CalendarDays size={14} /> : <BookOpen size={14} />}
              <span>{activeView === 'story-map' ? '日々の執筆' : '物語設計'}</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700"
            >
              <Settings size={14} />
              <span>初期設定</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {activeView === 'story-map' ? (
          <StoryMap />
        ) : (
          <>
          {selectedDate === NOVEL_START_DATE && (
            <div className="mb-4 rounded-xl border border-emerald-800/60 bg-emerald-950/20 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-100">小説本文の書き初め</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-200/70">
                初期設定と「生きた物語地図」を手掛かりに、物語の最初の一頁を書き始めます。
              </p>
            </div>
          )}

          {selectedDate && selectedPosts.length > 0 && (
            <div className="mb-4">
              <StoryWavePanel
                selectedDate={selectedDate}
                post={selectedPosts[selectedPosts.length - 1]}
                onPostUpdate={handlePostUpdate}
              />
              <div className="mt-3">
                <SubstoryWavePanel
                  selectedDate={selectedDate}
                  post={selectedPosts[selectedPosts.length - 1]}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-1">
          <CalendarView posts={posts} onDateSelect={handleDateSelect} />
        </section>
        <section className="lg:col-span-2 space-y-4">
          {selectedDate ? (
            selectedPosts.map((post, index) => {
              const isLatest = index === selectedPosts.length - 1;
              const sameDateChapterCount = posts.filter((p) => p.date === selectedDate && p.content).length;
              const remainingGenerations = Math.max(dailyGenerationCount - sameDateChapterCount, 0);
              const canGenerateMore = isLatest && remainingGenerations > 0;

              return (
                <div key={`${selectedDate}-${post.generation_index || index}`} className="space-y-4">
                  <PostEditor
                    selectedDate={selectedDate}
                    post={post}
                    onPostUpdate={handlePostUpdate}
                    refreshPosts={fetchPosts}
                    isLatest={isLatest}
                    canGenerateMore={canGenerateMore}
                    remainingGenerations={canGenerateMore ? remainingGenerations : 0}
                    dailyGenerationCount={dailyGenerationCount}
                  />
                  {/* 画像プレビューは各生成回に対して表示 */}
                  {post.content && (
                    <ImagePreview
                      post={post}
                      onPostUpdate={handlePostUpdate}
                    />
                  )}
                  {post.content && <MediaIdeas post={post} />}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
              カレンダーから日付を選択してください。
            </div>
          )}
        </section>
          </div>
          </>
        )}
      </main>

      {showSettings && <SettingsPanel onClose={handleSettingsClose} />}
    </div>
  );
};

export default App;
