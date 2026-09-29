import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api';
import { getMoonContext, getSolarContext } from '../utils/celestial';

const CREATIVE_LENS_CATEGORIES = [
  ['free', '自由'],
  ['science', '科学'],
  ['psychology', '心理'],
  ['history', '歴史'],
  ['nature', '自然'],
  ['society', '社会・現在'],
  ['culture', '文化・思想']
];

const countCharacters = (text) => Array.from(String(text || '').replace(/\r?\n/g, '')).length;

const PostEditor = ({
  selectedDate,
  post,
  onPostUpdate,
  refreshPosts,
  isLatest = false,
  canGenerateMore = false,
  remainingGenerations = 0,
  dailyGenerationCount = 1
}) => {
  const [storyChange, setStoryChange] = useState(post?.story_change || '');
  const [dreamMotif, setDreamMotif] = useState(post?.dream_motif || '');
  const [dreamAssociation, setDreamAssociation] = useState(post?.dream_association || '');
  const [useMoonCycle, setUseMoonCycle] = useState(post?.use_moon_cycle == null ? true : Boolean(post.use_moon_cycle));
  const [useAstrology, setUseAstrology] = useState(Boolean(post?.use_astrology));
  const [creativeLensCategory, setCreativeLensCategory] = useState(post?.creative_lens_category || 'free');
  const [creativeLens, setCreativeLens] = useState(post?.creative_lens || '');
  const [creativeLensWebSearch, setCreativeLensWebSearch] = useState(Boolean(post?.creative_lens_web_search));
  const [creativeLensCandidates, setCreativeLensCandidates] = useState(() => {
    try {
      const parsed = JSON.parse(post?.creative_lens_candidates || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [creativeLensSources, setCreativeLensSources] = useState(() => {
    try {
      const parsed = JSON.parse(post?.creative_lens_sources || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [creativeLensResearch, setCreativeLensResearch] = useState(post?.creative_lens_research || '');
  const [localContent, setLocalContent] = useState(post?.content || '');
  const [localStorySummary, setLocalStorySummary] = useState(post?.story_summary || '');
  const [isContentDirty, setIsContentDirty] = useState(false);
  const originalContentRef = useRef(post?.content || '');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isLoadingDeleteAndRegenerate, setIsLoadingDeleteAndRegenerate] = useState(false);
  const [isLoadingImagePrompt, setIsLoadingImagePrompt] = useState(false);
  const [imagePromptCount, setImagePromptCount] = useState('3');
  const [isGeneratingStoryChange, setIsGeneratingStoryChange] = useState(false);
  const [isGeneratingCreativeLenses, setIsGeneratingCreativeLenses] = useState(false);
  const [topicSources, setTopicSources] = useState([]);
  const [topicWasResearched, setTopicWasResearched] = useState(false);
  const [isGeneratingDreamAssociation, setIsGeneratingDreamAssociation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isCreativeLensOpen, setIsCreativeLensOpen] = useState(false);
  const [isStoryChangeOpen, setIsStoryChangeOpen] = useState(false);
  const [isDreamOpen, setIsDreamOpen] = useState(false);
  const [isInfluenceOpen, setIsInfluenceOpen] = useState(false);
  const [generationCount, setGenerationCount] = useState(1); // 文章生成回数
  const [regenerateCount, setRegenerateCount] = useState(1); // 削除・再生成の回数
  const [useDeepThinkingForThisRun, setUseDeepThinkingForThisRun] = useState(false);
  const showGenerateControls = isLatest && canGenerateMore;
  const moon = getMoonContext(selectedDate);
  const sun = getSolarContext(selectedDate);
  const contentCharacterCount = countCharacters(localContent);
  const scenePromptCount = (() => {
    try {
      const options = JSON.parse(post?.image_prompts || '[]');
      if (Array.isArray(options) && options.length > 0) return options.length;
    } catch (error) {
      console.warn('場面プロンプト件数の読み込みエラー:', error);
    }
    return post?.image_prompt?.trim() ? 1 : 0;
  })();

  useEffect(() => {
    // 設定から文章生成回数を取得
    const fetchSettings = async () => {
      try {
        const res = await api.get('/novel/settings');
        const count = parseInt(res.data.generation_count || '1', 10);
        setGenerationCount(count || 1);
      } catch (e) {
        console.error(e);
        // エラーが発生してもデフォルト値（1）を使用
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    setLocalContent(post?.content || '');
    setLocalStorySummary(post?.story_summary || '');
    setIsContentDirty(false);
    setStoryChange(post?.story_change || '');
    setDreamMotif(post?.dream_motif || '');
    setDreamAssociation(post?.dream_association || '');
    setUseMoonCycle(post?.use_moon_cycle == null ? true : Boolean(post.use_moon_cycle));
    setUseAstrology(Boolean(post?.use_astrology));
    setCreativeLensCategory(post?.creative_lens_category || 'free');
    setCreativeLens(post?.creative_lens || '');
    setCreativeLensWebSearch(Boolean(post?.creative_lens_web_search));
    try {
      const parsedCandidates = JSON.parse(post?.creative_lens_candidates || '[]');
      setCreativeLensCandidates(Array.isArray(parsedCandidates) ? parsedCandidates : []);
    } catch {
      setCreativeLensCandidates([]);
    }
    try {
      const parsedSources = JSON.parse(post?.creative_lens_sources || '[]');
      setCreativeLensSources(Array.isArray(parsedSources) ? parsedSources : []);
    } catch {
      setCreativeLensSources([]);
    }
    setCreativeLensResearch(post?.creative_lens_research || '');
    originalContentRef.current = post?.content || '';
  }, [post]);

  useEffect(() => {
    setTopicSources([]);
    setTopicWasResearched(false);
  }, [selectedDate, post?.date, post?.generation_index]);

  useEffect(() => {
    if ([1, 2, 3].includes(scenePromptCount)) {
      setImagePromptCount(String(scenePromptCount));
    }
  }, [post?.date, post?.generation_index, post?.image_prompts]);

  if (!selectedDate) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
        カレンダーから日付を選択してください。
      </div>
    );
  }

  const getCreativePayload = () => ({
    story_change: storyChange || null,
    dream_motif: dreamMotif || null,
    dream_association: dreamAssociation || null,
    use_moon_cycle: useMoonCycle,
    use_astrology: useAstrology,
    creative_lens_category: creativeLensCategory,
    creative_lens: creativeLens || null,
    creative_lens_web_search: creativeLensWebSearch
  });

  const handleGenerateContent = async () => {
    if (!isLatest) {
      alert('文章の新規生成は、その日の最新チャプターからのみ実行できます。');
      return;
    }

    if (!canGenerateMore) {
      alert('1日あたりの生成回数の上限に達しています。');
      return;
    }

    setIsLoadingContent(true);
    try {
      const count = Math.min(Math.max(parseInt(generationCount, 10) || 1, 1), 10); // 1-10の範囲に制限
      const safeDailyLimit = Math.max(parseInt(dailyGenerationCount || 1, 10) || 1, 1);

      // 現在の日付の既存の生成回を取得して、次のgeneration_indexを決定
      let startIndex = 0;
      let remainingSlots = remainingGenerations;
      try {
        const chaptersRes = await api.get('/novel/chapters');
        const sameDateChapters = chaptersRes.data
          .filter(ch => ch.date === selectedDate)
          .sort((a, b) => (b.generation_index || 0) - (a.generation_index || 0));

        const pendingDraft = sameDateChapters
          .filter((chapter) => !chapter.content)
          .sort((a, b) => (a.generation_index || 0) - (b.generation_index || 0))[0];
        if (pendingDraft) {
          // トピックや夢を先に保存した枠は、新しい回を増やさずに本文で埋める。
          startIndex = pendingDraft.generation_index || 0;
        } else if (sameDateChapters.length > 0) {
          startIndex = (sameDateChapters[0].generation_index || 0) + 1;
        }

        // 下書き枠は本文生成回数に含めない。
        const generatedCount = sameDateChapters.filter((chapter) => Boolean(chapter.content)).length;
        remainingSlots = Math.max(safeDailyLimit - generatedCount, 0);
      } catch (err) {
        console.error('既存の生成回取得エラー:', err);
        // エラーが発生しても続行（startIndex = 0から開始）
        remainingSlots = Math.max(remainingSlots, 0);
      }

      if (!remainingSlots || remainingSlots <= 0) {
        alert('1日あたりの生成回数の上限に達しているため、新しい文章を生成できません。');
        return;
      }

      // 指定された回数分の文章を生成
      let lastGeneratedData = null;
      const executeCount = Math.min(count, remainingSlots);
      if (executeCount < count) {
        alert(`設定された1日の上限(${safeDailyLimit}回)に合わせて、${executeCount}回のみ生成します。`);
      }

      for (let i = 0; i < executeCount; i++) {
        try {
          const currentIndex = startIndex + i;
          const res = await api.post('/novel/generate_content', {
            date: selectedDate,
            ...getCreativePayload(),
            story_change: i === 0 ? (storyChange || null) : null,
            dream_motif: i === 0 ? (dreamMotif || null) : null,
            dream_association: i === 0 ? (dreamAssociation || null) : null,
            deep_thinking: useDeepThinkingForThisRun,
            generation_index: currentIndex
          });

          // 各生成回を更新
          onPostUpdate(res.data);
          lastGeneratedData = res.data;

          // 最後の生成回でない場合は少し待機（APIレート制限対策）
          if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (genErr) {
          console.error(`文章生成エラー（${i + 1}回目）:`, genErr);
          const errorMsg = genErr.response?.data?.details || genErr.response?.data?.error || genErr.message || '不明なエラー';
          alert(`${i + 1}回目の文章生成に失敗しました。\n\nエラー詳細: ${errorMsg}\n\nサーバーログも確認してください。`);
          break; // エラーが発生した場合はループを中断
        }
      }

      await refreshPosts();

      // 成功メッセージを表示
      if (lastGeneratedData) {
        const successMsg = executeCount === 1
          ? '文章を生成しました。'
          : `${executeCount}回分の文章を生成しました。`;
        // アラートは表示しない（ユーザーが既に結果を確認できるため）
        console.log(successMsg);
      }
    } catch (e) {
      console.error('文章生成エラー:', e);
      const errorMsg = e.response?.data?.details || e.response?.data?.error || e.message || '不明なエラー';
      alert(`文章生成に失敗しました。\n\nエラー詳細: ${errorMsg}\n\nサーバーログも確認してください。`);
    } finally {
      setIsLoadingContent(false);
      setUseDeepThinkingForThisRun(false);
    }
  };

  const handleDeleteAndRegenerate = async () => {
    if (!post || post.generation_index === undefined) {
      alert('削除・再生成するには、まず文章を生成してください。');
      return;
    }

    const currentIndex = post.generation_index || 0;
    const count = Math.min(Math.max(parseInt(regenerateCount, 10) || 1, 1), 10); // 1-10の範囲に制限

    const confirmMessage = count === 1
      ? `${selectedDate}の${currentIndex + 1}回目の文章を削除して再生成しますか？\n\n※${currentIndex + 1}回目の文章のみが削除・再生成されます。それ以降の文章は保持されます。`
      : `${selectedDate}の${currentIndex + 1}回目から${count}回分の文章を削除して再生成しますか？\n\n※${currentIndex + 1}回目から${currentIndex + count}回目までの文章のみが削除・再生成されます。それ以降の文章は保持されます。`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoadingDeleteAndRegenerate(true);
    try {
      // 1. 指定日の現在のgeneration_indexから指定回数分の文章のみを削除
      try {
        await api.delete(`/novel/chapters/${selectedDate}`, {
          params: {
            generation_index: currentIndex,
            count: count
          }
        });
        console.log(`${currentIndex}回目から${count}回分の文章を削除しました`);
      } catch (deleteErr) {
        console.error('文章削除エラー:', deleteErr);
        const errorMsg = deleteErr.response?.data?.error || deleteErr.message || '不明なエラー';
        alert(`文章削除に失敗しました。\n\nエラー詳細: ${errorMsg}`);
        return;
      }

      // 2. 指定された回数分の文章を生成（削除された部分のgeneration_indexから開始）
      let lastGeneratedData = null;
      for (let i = 0; i < count; i++) {
        try {
          const targetIndex = currentIndex + i; // 削除された部分のgeneration_indexから開始
          const res = await api.post('/novel/generate_content', {
            date: selectedDate,
            ...getCreativePayload(),
            story_change: i === 0 ? (storyChange || null) : null,
            dream_motif: i === 0 ? (dreamMotif || null) : null,
            dream_association: i === 0 ? (dreamAssociation || null) : null,
            deep_thinking: useDeepThinkingForThisRun,
            generation_index: targetIndex // 削除された部分のgeneration_indexから開始
          });

          // 各生成回を更新
          onPostUpdate(res.data);
          lastGeneratedData = res.data;

          // 最後の生成回でない場合は少し待機（APIレート制限対策）
          if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (genErr) {
          console.error(`文章生成エラー（${i + 1}回目）:`, genErr);
          const errorMsg = genErr.response?.data?.details || genErr.response?.data?.error || genErr.message || '不明なエラー';
          alert(`${i + 1}回目の文章生成に失敗しました。\n\nエラー詳細: ${errorMsg}\n\nサーバーログも確認してください。`);
          break; // エラーが発生した場合はループを中断
        }
      }

      await refreshPosts();

      // 成功メッセージを表示
      if (lastGeneratedData) {
        const successMsg = count === 1
          ? `${currentIndex + 1}回目の文章を削除して再生成しました。`
          : `${currentIndex + 1}回目から${count}回分の文章を削除して再生成しました。`;
        console.log(successMsg);
      }
    } catch (e) {
      console.error('削除・再生成エラー:', e);
      const errorMsg = e.response?.data?.details || e.response?.data?.error || e.message || '不明なエラー';
      alert(`文章の削除・再生成に失敗しました。\n\nエラー詳細: ${errorMsg}\n\nサーバーログも確認してください。`);
    } finally {
      setIsLoadingDeleteAndRegenerate(false);
      setUseDeepThinkingForThisRun(false);
    }
  };

  const handleGenerateImagePrompt = async () => {
    if (!post?.content) {
      alert('まず文章を生成してください。');
      return;
    }

    if (post?.generation_index === undefined) {
      alert('文章の生成回数が不明です。まず文章を生成してください。');
      return;
    }

    if (scenePromptCount > 0 && !window.confirm(
      '現在の場面プロンプトをすべて作り直します。手動編集した内容も置き換わります。続けますか？'
    )) return;

    setIsLoadingImagePrompt(true);
    try {
      console.log('[画像プロンプト生成開始]', { date: selectedDate, generation_index: post.generation_index });
      const res = await api.post('/novel/generate_image_prompt', {
        date: selectedDate,
        generation_index: post.generation_index,
        scene_count: imagePromptCount === 'auto' ? undefined : Number(imagePromptCount)
      });
      console.log('[画像プロンプト生成レスポンス]', res.data);

      if (res.data && res.data.image_prompt) {
        onPostUpdate(res.data);
        console.log('[画像プロンプト更新完了]', res.data.image_prompt);
      } else {
        console.warn('[画像プロンプト生成] レスポンスにimage_promptが含まれていません', res.data);
        alert('画像プロンプトが生成されませんでした。サーバーログを確認してください。');
      }
    } catch (e) {
      console.error('画像プロンプト生成エラー:', e);
      const errorMsg = e.response?.data?.details || e.response?.data?.error || e.message || '不明なエラー';
      alert(`画像プロンプト生成に失敗しました。\n\nエラー詳細: ${errorMsg}\n\nサーバーログも確認してください。`);
    } finally {
      setIsLoadingImagePrompt(false);
    }
  };

  const handleLocalChange = (field, value) => {
    onPostUpdate({ ...(post || { date: selectedDate }), [field]: value });
  };

  const handleSaveContent = async () => {
    if (!localContent || !localContent.trim()) {
      alert('保存する文章がありません。');
      return;
    }

    if (!post?.date || post?.generation_index === undefined) {
      alert('保存するには、まず文章を生成してください。');
      return;
    }

    setIsSaving(true);
    try {
      if (!isContentDirty) {
        alert('文章に変更がありません。要約の更新は行いませんでした。');
        setIsSaving(false);
        return;
      }

      const res = await api.post('/novel/save_content', {
        date: post.date,
        generation_index: post.generation_index,
        content: localContent,
        story_change: post.story_change || null
      });

      onPostUpdate(res.data);
      setLocalContent(res.data.content || '');
      setLocalStorySummary(res.data.story_summary || '');
      originalContentRef.current = res.data.content || '';
      setIsContentDirty(false);
      await refreshPosts();
      alert('文章を保存しました。要約はバックグラウンドで更新します。');
      window.setTimeout(() => {
        refreshPosts().catch((error) => console.error('保存後の表示更新エラー:', error));
      }, 2500);
    } catch (e) {
      console.error('文章保存エラー:', e);
      const errorMsg = e.response?.data?.details || e.response?.data?.error || e.message || '不明なエラー';
      alert(`文章の保存に失敗しました。\n\nエラー詳細: ${errorMsg}\n\nサーバーログも確認してください。`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStoryChange = async () => {
    if (!post?.date || post?.generation_index === undefined) {
      alert('保存するには、まず文章を生成してください。');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post('/novel/save_story_change', {
        date: post.date,
        generation_index: post.generation_index,
        ...getCreativePayload()
      });

      onPostUpdate(res.data);
      alert('今回の創作メモを保存しました。');
    } catch (e) {
      console.error('ストーリー変更指示保存エラー:', e);
      const errorMsg = e.response?.data?.details || e.response?.data?.error || e.message || '不明なエラー';
      alert(`ストーリー変更指示の保存に失敗しました。\n\nエラー詳細: ${errorMsg}\n\nサーバーログも確認してください。`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateStoryChange = async () => {
    if (!selectedDate) {
      alert('日付を選択してください。');
      return;
    }

    if (storyChange.trim() && !window.confirm('現在のトピック・展開案を、AIが新しく提案する案で置き換えますか？')) {
      return;
    }

    setIsGeneratingStoryChange(true);
    try {
      const res = await api.post('/novel/generate_story_change', {
        date: selectedDate,
        generation_index: post?.generation_index,
        current_instruction: storyChange || null,
        dream_motif: dreamMotif || null,
        dream_association: dreamAssociation || null,
        use_moon_cycle: useMoonCycle,
        use_astrology: useAstrology,
        creative_lens_category: creativeLensCategory,
        creative_lens: creativeLens || null,
        creative_lens_web_search: creativeLensWebSearch
      });
      const suggestion = res.data.story_change || '';
      setStoryChange(suggestion);
      setTopicSources(Array.isArray(res.data.sources) ? res.data.sources : []);
      setTopicWasResearched(Boolean(res.data.searched));
      onPostUpdate(res.data.chapter || {
        ...(post || { date: selectedDate, generation_index: 0 }),
        story_change: suggestion
      });
    } catch (e) {
      console.error('トピック・展開案の生成エラー:', e);
      const errorMsg = e.response?.data?.details || e.response?.data?.error || e.message || '不明なエラー';
      alert(`トピック・展開案を生成できませんでした。\n\nエラー詳細: ${errorMsg}`);
    } finally {
      setIsGeneratingStoryChange(false);
    }
  };

  const handleGenerateCreativeLenses = async () => {
    if (creativeLensWebSearch && !creativeLens.trim()) {
      alert('Web検索する場合は、調べたいテーマや問いを自由入力欄へ記入してください。');
      return;
    }
    setIsGeneratingCreativeLenses(true);
    try {
      const res = await api.post('/novel/generate_creative_lenses', {
        date: selectedDate,
        generation_index: post?.generation_index ?? 0,
        category: creativeLensCategory,
        creative_lens: creativeLens || null,
        web_search: creativeLensWebSearch
      });
      setCreativeLensCandidates(Array.isArray(res.data.candidates) ? res.data.candidates : []);
      setCreativeLensSources(Array.isArray(res.data.sources) ? res.data.sources : []);
      setCreativeLensResearch(res.data.research_memo || '');
      if (res.data.chapter) onPostUpdate(res.data.chapter);
    } catch (error) {
      console.error('追加視点の提案エラー:', error);
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`視点の種を提案できませんでした。\n\n${message}`);
    } finally {
      setIsGeneratingCreativeLenses(false);
    }
  };

  const handleAdoptCreativeLens = async (candidate) => {
    const adopted = String(candidate?.perspective || '').trim();
    if (!adopted) return;
    setCreativeLens(adopted);
    try {
      const res = await api.post('/novel/save_story_change', {
        date: selectedDate,
        generation_index: post?.generation_index ?? 0,
        ...getCreativePayload(),
        creative_lens: adopted,
        keep_creative_lens_research: Boolean(creativeLensResearch)
      });
      onPostUpdate(res.data);
    } catch (error) {
      console.error('追加視点の採用保存エラー:', error);
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`採用した視点を保存できませんでした。\n\n${message}`);
    }
  };

  const handleGenerateDreamAssociation = async () => {
    if (dreamAssociation.trim() && !window.confirm('現在の連想・解釈を、AIが生成する下書きで置き換えますか？')) {
      return;
    }

    setIsGeneratingDreamAssociation(true);
    try {
      const res = await api.post('/novel/generate_dream_association', {
        date: selectedDate,
        generation_index: post?.generation_index,
        dream_motif: dreamMotif || null,
        current_association: dreamAssociation || null
      });
      const motif = res.data.dream_motif || dreamMotif;
      const association = res.data.dream_association || '';
      if (!association.trim()) {
        throw new Error('AIから創作解釈が返されませんでした。');
      }
      setDreamMotif(motif);
      setDreamAssociation(association);
      onPostUpdate(res.data.chapter || {
        ...(post || { date: selectedDate, generation_index: 0 }),
        dream_motif: motif,
        dream_association: association
      });
    } catch (e) {
      console.error('夢の創作解釈の生成エラー:', e);
      const errorMsg = e.response?.data?.details || e.response?.data?.error || e.message || '不明なエラー';
      alert(`夢の創作解釈を生成できませんでした。\n\nエラー詳細: ${errorMsg}`);
    } finally {
      setIsGeneratingDreamAssociation(false);
    }
  };

  return (
    <div className="chapter-editor-panel">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition"
      >
        <span className="text-sm font-semibold">
          {selectedDate} の文章
          {post?.generation_index !== undefined && (
            <span className="ml-2 text-xs text-slate-400">（{post.generation_index + 1}回目）</span>
          )}
        </span>
        {isOpen ? <ChevronUp size={17} className="text-slate-400" /> : <ChevronDown size={17} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-800 p-4">
          <div className="space-y-3 text-xs">
        <div className="celestial-card">
          <div className="celestial-moon-symbol" aria-hidden="true">{moon.symbol}</div>
          <div>
            <p className="font-semibold text-slate-100">
              {moon.name} <span className="font-normal text-slate-400">月齢 約{moon.age}・照度 約{moon.illumination}%</span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">{moon.theme}</p>
          </div>
          <div className="celestial-sun">
            <span>太陽</span>
            <strong>{sun.name}</strong>
            <small>{sun.theme}</small>
          </div>
        </div>

        <div className="creative-lens-panel">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsCreativeLensOpen((current) => !current)}
              aria-expanded={isCreativeLensOpen}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
            >
              <span>
                <p className="font-semibold text-[11px] text-cyan-100">今回加えたい視点（任意）</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                  {isCreativeLensOpen
                    ? '筋書きではなく、科学・心理・歴史・自然などから、今回の場面を見る新しい角度を加えます。'
                    : (creativeLens ? '入力済みの視点があります。' : '必要なときだけ開いて追加できます。')}
                </p>
              </span>
              {isCreativeLensOpen ? <ChevronUp size={16} className="shrink-0 text-cyan-300" /> : <ChevronDown size={16} className="shrink-0 text-cyan-300" />}
            </button>
            {isCreativeLensOpen && (
              <button
                type="button"
                onClick={handleGenerateCreativeLenses}
                disabled={isGeneratingCreativeLenses}
                className="rounded-md border border-cyan-600/80 bg-cyan-800/70 px-2.5 py-1 text-[10px] font-semibold text-cyan-50 hover:bg-cyan-700 disabled:opacity-50"
              >
                {isGeneratingCreativeLenses
                  ? creativeLensWebSearch ? '検索して提案中…' : 'アイデアを考えています…'
                  : '視点のアイデアを提案'}
              </button>
            )}
          </div>

          {isCreativeLensOpen && (
            <>
          <div className="mt-3 grid gap-2 md:grid-cols-[150px_minmax(0,1fr)]">
            <label>
              <span className="mb-1 block text-[10px] font-semibold text-slate-300">カテゴリー</span>
              <select
                value={creativeLensCategory}
                onChange={(event) => {
                  setCreativeLensCategory(event.target.value);
                  setCreativeLensResearch('');
                  setCreativeLensSources([]);
                  handleLocalChange('creative_lens_category', event.target.value);
                }}
                className="w-full rounded-md border border-cyan-900/70 bg-slate-950 px-2 py-1.5 text-xs"
              >
                {CREATIVE_LENS_CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold text-slate-300">視点・調べたいテーマ</span>
              <textarea
                value={creativeLens}
                onChange={(event) => {
                  setCreativeLens(event.target.value);
                  setCreativeLensResearch('');
                  setCreativeLensSources([]);
                  handleLocalChange('creative_lens', event.target.value);
                }}
                className="h-20 w-full rounded-md border border-cyan-900/70 bg-slate-950 px-2 py-1.5 text-xs"
                placeholder="例：記憶は保管されるのではなく、思い出すたびに再構築されるものとして描きたい。空欄なら現在の物語からAIが提案します。"
              />
            </label>
          </div>

          <label className="mt-2 flex items-start gap-2 rounded-md border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-300">
            <input
              type="checkbox"
              checked={creativeLensWebSearch}
              onChange={(event) => {
                setCreativeLensWebSearch(event.target.checked);
                handleLocalChange('creative_lens_web_search', event.target.checked);
              }}
              className="mt-0.5 accent-cyan-400"
            />
            <span>
              <strong className="font-semibold text-cyan-100">この内容をWeb検索して事実確認する</strong>
              <span className="mt-0.5 block text-slate-500">チェックした場合だけ、この追加視点について検索します。入力内容が変わらない限り、確認済みメモを再利用します。</span>
            </span>
          </label>

          {creativeLensCandidates.length > 0 && (
            <div className="mt-3 grid gap-2">
              {creativeLensCandidates.map((candidate, index) => (
                <article key={`${candidate.title}-${index}`} className="rounded-lg border border-cyan-900/60 bg-slate-950/55 p-2.5">
                  <p className="text-[10px] font-semibold text-cyan-200">{candidate.title || `視点 ${index + 1}`}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-200">{candidate.perspective}</p>
                  {candidate.application && (
                    <p className="mt-1.5 border-t border-slate-800 pt-1.5 text-[9px] leading-relaxed text-slate-500">
                      {candidate.application}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAdoptCreativeLens(candidate)}
                    className="mt-2 rounded-md border border-cyan-700 bg-cyan-950/70 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-900"
                  >
                    この視点を採用
                  </button>
                </article>
              ))}
            </div>
          )}

          {creativeLensResearch && (
            <details className="mt-2 rounded-md border border-cyan-900/50 bg-slate-950/60 px-2.5 py-2 text-[10px] text-slate-400">
              <summary className="cursor-pointer font-semibold text-cyan-200">
                Web検索で確認したメモ{creativeLensSources.length > 0 ? `・参照元 ${creativeLensSources.length}件` : ''}
              </summary>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{creativeLensResearch}</p>
              {creativeLensSources.length > 0 && (
                <ul className="mt-2 space-y-1 pl-4">
                  {creativeLensSources.map((source) => (
                    <li key={source.url} className="list-disc">
                      <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-sky-300 hover:underline">
                        {source.title || source.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}
            </>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <button
              type="button"
              onClick={() => setIsStoryChangeOpen((current) => !current)}
              aria-expanded={isStoryChangeOpen}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
            >
              <span>
                <span className="block font-semibold text-[11px]">今回のトピック・展開案（任意）</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                  {isStoryChangeOpen
                    ? '今回の生成だけに加える、具体的な出来事や場面の方向です。'
                    : (storyChange ? '入力済みのトピック・展開案があります。' : '空欄でも、これまでの物語を手掛かりに生成できます。')}
                </span>
              </span>
              {isStoryChangeOpen ? <ChevronUp size={16} className="shrink-0 text-violet-300" /> : <ChevronDown size={16} className="shrink-0 text-violet-300" />}
            </button>
            {isStoryChangeOpen && (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={handleGenerateStoryChange}
                disabled={isGeneratingStoryChange}
                className="rounded-md border border-violet-500/80 bg-violet-600/90 px-2 py-0.5 hover:bg-violet-500 disabled:opacity-50 text-[10px] font-semibold"
              >
                {isGeneratingStoryChange ? '日付情報を調査中...' : 'AIでトピック・展開を提案'}
              </button>
              <button
                type="button"
                onClick={handleSaveStoryChange}
                disabled={isSaving || !post?.date || post?.generation_index === undefined}
                className="rounded-md border border-blue-500 bg-blue-600 px-2 py-0.5 hover:bg-blue-500 disabled:opacity-50 text-[10px] font-semibold"
              >
                {isSaving ? '保存中...' : '創作メモを保存'}
              </button>
              </div>
            )}
          </div>
          {isStoryChangeOpen && (
            <>
              <textarea
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 h-20 text-xs"
                value={storyChange}
                onChange={(e) => {
                  setStoryChange(e.target.value);
                  setTopicSources([]);
                  setTopicWasResearched(false);
                  handleLocalChange('story_change', e.target.value);
                }}
                placeholder="AIが、大きな波、今回加えたい視点、これまでの文章、選択日の日付情報を統合して、具体的なトピックと展開を提案します。手入力・編集もできます。"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                押した時に日付情報を検索し、季節、月相、世界の出来事や天文・宇宙の行事を確認します。「今回加えたい視点」は、上の検索チェックがある場合だけ追加調査します。
              </p>
              {topicWasResearched && topicSources.length > 0 && (
                <details className="mt-2 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-[10px] text-slate-400">
                  <summary className="cursor-pointer font-semibold text-slate-300">
                    AIが参照した日付情報（{topicSources.length}件）
                  </summary>
                  <ul className="mt-1.5 space-y-1 pl-4">
                    {topicSources.map((source) => (
                      <li key={source.url} className="list-disc">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-sky-300 hover:text-sky-200 hover:underline"
                        >
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        <div className="dream-panel">
          <div className="dream-panel-heading">
            <button
              type="button"
              onClick={() => setIsDreamOpen((current) => !current)}
              aria-expanded={isDreamOpen}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
            >
              <span>
                <p className="font-semibold text-[11px] text-violet-100">夢の記録（任意）</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                  {isDreamOpen
                    ? '入力した場合だけ、ユング心理学を手掛かりに象徴を読み、小説の情景や人物関係へ控えめに反映します。'
                    : (dreamMotif || dreamAssociation ? '入力済みの夢の記録があります。' : '必要なときだけ開いて入力できます。')}
                </p>
              </span>
              {isDreamOpen ? <ChevronUp size={16} className="shrink-0 text-violet-300" /> : <ChevronDown size={16} className="shrink-0 text-violet-300" />}
            </button>
            {isDreamOpen && (
              <div className="flex items-center gap-2">
                <span>診断ではなく創作の可能性</span>
                <button
                  type="button"
                  onClick={handleGenerateDreamAssociation}
                  disabled={isGeneratingDreamAssociation}
                  className="rounded-md border border-violet-500/80 bg-violet-600/90 px-2 py-0.5 text-[10px] font-semibold text-violet-50 hover:bg-violet-500 disabled:opacity-50"
                >
                  {isGeneratingDreamAssociation ? 'AIが提案中...' : 'AIで夢と創作解釈を生成'}
                </button>
              </div>
            )}
          </div>
          {isDreamOpen && (
            <>
              <div className="grid gap-2 md:grid-cols-2">
                <label>
                  <span className="mb-1 block text-[10px] font-semibold text-slate-300">夢のモチーフ・内容</span>
                  <textarea
                    value={dreamMotif}
                    onChange={(event) => {
                      setDreamMotif(event.target.value);
                      handleLocalChange('dream_motif', event.target.value);
                    }}
                    className="h-24 w-full rounded-md border border-violet-900/60 bg-slate-950 px-2 py-1.5 text-xs"
                    placeholder="空欄のままAIで生成すると、現在の物語に合う夢のモチーフを提案します。"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-[10px] font-semibold text-slate-300">夢から感じたこと・創作上の解釈</span>
                  <textarea
                    value={dreamAssociation}
                    onChange={(event) => {
                      setDreamAssociation(event.target.value);
                      handleLocalChange('dream_association', event.target.value);
                    }}
                    className="h-24 w-full rounded-md border border-violet-900/60 bg-slate-950 px-2 py-1.5 text-xs"
                    placeholder="本人の連想を、一般的な象徴辞典より優先します。AIで創作上の解釈を下書きすることもできます。"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-violet-900/40 pt-3">
                <p className="text-[10px] text-slate-500">
                  夢の記録・本人の連想／創作上の解釈・月相・太陽星座・今回加えたい視点をまとめて保存します。
                </p>
                <button
                  type="button"
                  onClick={handleSaveStoryChange}
                  disabled={isSaving || !post?.date || post?.generation_index === undefined}
                  className="rounded-md border border-violet-500 bg-violet-700 px-2.5 py-1 text-[10px] font-semibold text-violet-50 hover:bg-violet-600 disabled:opacity-50"
                >
                  {isSaving ? '保存中…' : '夢と創作要素を保存'}
                </button>
              </div>
            </>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsInfluenceOpen((current) => !current)}
            aria-expanded={isInfluenceOpen}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span>
              <span className="block font-semibold text-[11px]">今回、物語に響かせるもの（任意）</span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                {isInfluenceOpen
                  ? '月相や太陽星座を、説明せずに場面の感触へ反映します。'
                  : `月相 ${useMoonCycle ? 'オン' : 'オフ'}・太陽星座 ${useAstrology ? 'オン' : 'オフ'}`}
              </span>
            </span>
            {isInfluenceOpen ? <ChevronUp size={16} className="shrink-0 text-amber-300" /> : <ChevronDown size={16} className="shrink-0 text-amber-300" />}
          </button>
          {isInfluenceOpen && (
            <>
              <div className="influence-grid mt-2">
                {[
                  ['moon', '月相', `${moon.name}のリズム`, useMoonCycle, setUseMoonCycle],
                  ['astrology', '太陽星座', `${sun.name}の季節`, useAstrology, setUseAstrology]
                ].map(([key, label, description, checked, setter]) => (
                  <label key={key} className={`influence-toggle ${checked ? 'is-active' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={(event) => setter(event.target.checked)} />
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                選択した周期は説明として挿入せず、光、時間感覚、人物の衝動として薄く反映します。長期の展開は上部の「物語の大きな波」で管理します。
              </p>
            </>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-baseline gap-2">
              <label className="font-semibold text-[11px]">生成された文章</label>
              {localContent && (
                <span className="text-[10px] text-slate-500">
                  {contentCharacterCount.toLocaleString('ja-JP')}文字（改行除く）
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showGenerateControls && (
                <>
                  <input
                    type="number"
                    value={generationCount}
                    onChange={(e) => setGenerationCount(e.target.value)}
                    min="1"
                    max="10"
                    disabled={isLoadingContent || isLoadingDeleteAndRegenerate}
                    className="w-12 rounded-md border border-slate-600 bg-slate-800 px-1 py-0.5 text-[10px] text-center disabled:opacity-50"
                    title="生成回数"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateContent}
                    disabled={isLoadingContent || isLoadingDeleteAndRegenerate}
                    className="rounded-md border border-emerald-500 bg-emerald-600 px-2 py-0.5 hover:bg-emerald-500 disabled:opacity-50 text-[10px] font-semibold"
                  >
                    {isLoadingContent ? '生成中...' : '文章を生成'}
                  </button>
                  <label className="flex items-center gap-1 text-[10px] text-amber-200/90 whitespace-nowrap" title="DeepSeek使用時のみ有効。このクリックで生成する本文だけ、より深い構成検討を行います。">
                    <input
                      type="checkbox"
                      checked={useDeepThinkingForThisRun}
                      onChange={(e) => setUseDeepThinkingForThisRun(e.target.checked)}
                      disabled={isLoadingContent || isLoadingDeleteAndRegenerate}
                      className="accent-amber-400"
                    />
                    今回だけ深く考える
                  </label>
                </>
              )}
              <input
                type="number"
                value={regenerateCount}
                onChange={(e) => setRegenerateCount(e.target.value)}
                min="1"
                max="10"
                disabled={isLoadingContent || isLoadingDeleteAndRegenerate}
                className="w-12 rounded-md border border-slate-600 bg-slate-800 px-1 py-0.5 text-[10px] text-center disabled:opacity-50"
                title="再生成回数"
              />
              <button
                type="button"
                onClick={handleDeleteAndRegenerate}
                disabled={isLoadingContent || isLoadingDeleteAndRegenerate}
                className="rounded-md border border-red-500 bg-red-600 px-2 py-0.5 hover:bg-red-500 disabled:opacity-50 text-[10px] font-semibold"
              >
                {isLoadingDeleteAndRegenerate ? '削除・再生成中...' : '文章の削除・再生成'}
              </button>
              {!showGenerateControls && (
                <label className="flex items-center gap-1 text-[10px] text-amber-200/90 whitespace-nowrap" title="DeepSeek使用時のみ有効。このクリックで再生成する本文だけ、より深い構成検討を行います。">
                  <input
                    type="checkbox"
                    checked={useDeepThinkingForThisRun}
                    onChange={(e) => setUseDeepThinkingForThisRun(e.target.checked)}
                    disabled={isLoadingContent || isLoadingDeleteAndRegenerate}
                    className="accent-amber-400"
                  />
                  今回だけ深く考える
                </label>
              )}
              <button
                type="button"
                onClick={handleSaveContent}
                disabled={isSaving || !post?.content || isLoadingContent || isLoadingDeleteAndRegenerate}
                className="rounded-md border border-blue-500 bg-blue-600 px-2 py-0.5 hover:bg-blue-500 disabled:opacity-50 text-[10px] font-semibold"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
          <textarea
            className="story-content w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 h-48 text-sm"
            value={localContent}
            onChange={(e) => {
              const val = e.target.value;
              setLocalContent(val);
              setIsContentDirty(val !== (originalContentRef.current || ''));
            }}
            placeholder="生成された小説本文がここに表示されます。前の文章、物語地図、今回の創作メモを反映して書き継がれます。"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-[11px]">要約</label>
            <span className="text-[10px] text-slate-500">保存時に自動更新</span>
          </div>
          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 h-12 text-xs"
            value={localStorySummary || ''}
            readOnly
            placeholder="要約がここに表示されます。文章を保存すると最新の要約で更新されます。"
          />
        </div>

        <div className="rounded-md border border-slate-700 bg-slate-950/45 p-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <label className="font-semibold text-[11px]">場面別の画像プロンプト</label>
              <p className="mt-0.5 text-[9px] text-slate-500">
                {scenePromptCount > 0 ? `現在 ${scenePromptCount}件を保存中` : 'まだ作成されていません'}
              </p>
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 text-[10px] text-slate-400">
                <span>場面数</span>
                <select
                  value={imagePromptCount}
                  onChange={(event) => setImagePromptCount(event.target.value)}
                  disabled={isLoadingImagePrompt}
                  className="rounded-md border border-slate-600 bg-slate-800 px-1 py-0.5 text-[10px] text-slate-100 disabled:opacity-50"
                  title="画像化する本文場面の候補数"
                >
                  <option value="auto">自動</option>
                  <option value="1">1件</option>
                  <option value="2">2件</option>
                  <option value="3">3件</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleGenerateImagePrompt}
                disabled={isLoadingImagePrompt || !post?.content}
                className="rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 hover:bg-slate-700 disabled:opacity-50 text-[10px]"
              >
                {isLoadingImagePrompt
                  ? '作成中...'
                  : scenePromptCount > 0
                    ? '全場面をAIで作り直す'
                    : '場面プロンプトをAIで作成'}
              </button>
            </div>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            親となる一つのプロンプトを分割するのではなく、小説本文から異なる瞬間を直接選び、場面1・2・3を個別に作成します。編集・保存・一場面だけのAI再生成・画像生成は、下の「画像プレビュー」で行えます。
          </p>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default PostEditor;
