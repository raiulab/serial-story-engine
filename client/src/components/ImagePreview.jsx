import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Maximize2,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import api, { imageApi } from '../api';

const DEFAULT_EXTERNAL_AI_URLS = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app'
};

const REFERENCE_VARIANT_KEYWORDS = [
  '部屋', '室内', '屋外', '全身', '夜', '昼', '朝', '夕方', '草地', '窓辺',
  'あくび', 'びっくり', '驚き', '変身', '少女', 'ウサギ', '猫'
];

const getReferenceBaseName = (name) => String(name || '').split(/[（(]/)[0].trim();

const suggestReferencesForPrompt = (availableImages, prompt) => {
  const text = String(prompt || '');
  if (!text.trim()) return [];

  const stageMatches = availableImages
    .filter((image) => image.type === 'stage' && text.includes(String(image.name || '').trim()))
    .slice(0, 1);
  const characterCandidates = availableImages
    .filter((image) => image.type === 'character')
    .map((image, index) => {
      const name = String(image.name || '').trim();
      const baseName = getReferenceBaseName(name);
      if (!baseName || !text.includes(baseName)) return null;
      let score = text.includes(name) ? 100 : 20;
      for (const keyword of REFERENCE_VARIANT_KEYWORDS) {
        if (name.includes(keyword) && text.includes(keyword)) score += 15;
      }
      return { image, baseName, score, index };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.index - a.index);
  const selectedCharacters = [];
  const selectedBaseNames = new Set();
  for (const candidate of characterCandidates) {
    if (selectedBaseNames.has(candidate.baseName)) continue;
    selectedBaseNames.add(candidate.baseName);
    selectedCharacters.push(candidate.image);
    if (selectedCharacters.length >= 2) break;
  }

  return [...stageMatches, ...selectedCharacters].slice(0, 3);
};

const copyTextToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

const ImagePreview = ({ post, onPostUpdate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [referenceImages, setReferenceImages] = useState([]);
  const [dismissedAutoReferenceIds, setDismissedAutoReferenceIds] = useState([]);
  const [availableImages, setAvailableImages] = useState([]);
  const [projectArtDirection, setProjectArtDirection] = useState('');
  const [includeArtDirectionInExternalPrompt, setIncludeArtDirectionInExternalPrompt] = useState(() => (
    window.localStorage.getItem('serial_story_include_art_direction_in_external_prompt') === 'true'
  ));
  const [includeSourceQuoteInExternalPrompt, setIncludeSourceQuoteInExternalPrompt] = useState(() => (
    window.localStorage.getItem('serial_story_include_source_quote_in_external_prompt') === 'true'
  ));
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [editablePromptOptions, setEditablePromptOptions] = useState([]);
  const [savingPromptIndex, setSavingPromptIndex] = useState(null);
  const [regeneratingPromptIndex, setRegeneratingPromptIndex] = useState(null);
  const [generatingPromptIndex, setGeneratingPromptIndex] = useState(null);
  const [externalProvider, setExternalProvider] = useState('chatgpt');
  const [externalImportFile, setExternalImportFile] = useState(null);
  const [externalImportInputKey, setExternalImportInputKey] = useState(0);
  const [isImportingExternalImage, setIsImportingExternalImage] = useState(false);
  const [externalAiUrls, setExternalAiUrls] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('serial_story_external_ai_urls') || '{}');
      return { ...DEFAULT_EXTERNAL_AI_URLS, ...saved };
    } catch {
      return DEFAULT_EXTERNAL_AI_URLS;
    }
  });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const generatedImages = useMemo(() => {
    if (post?.images?.length) return post.images;
    return post?.image_path
      ? [{ id: null, filename: post.image_path, created_at: null }]
      : [];
  }, [post?.images, post?.image_path]);

  const selectedImage = generatedImages.find((image) => image.id === selectedImageId)
    || generatedImages[0]
    || null;
  const selectedGenerationMetadata = selectedImage?.generation_metadata || null;
  const isPreviousTextVersion = Boolean(post?.image_source?.is_previous_text_version);
  const imagePromptOptions = useMemo(() => {
    try {
      const parsed = JSON.parse(post?.image_prompts || '[]');
      if (Array.isArray(parsed)) {
        const options = parsed
          .map((option, index) => ({
            title: option?.title || `場面 ${index + 1}`,
            sourceQuote: option?.source_quote || '',
            prompt: typeof option === 'string' ? option : option?.prompt
          }))
          .filter((option) => option.prompt?.trim());
        if (options.length > 0) return options;
      }
    } catch (error) {
      console.warn('画像場面プロンプトの読み込みエラー:', error);
    }
    return post?.image_prompt ? [{ title: '画像プロンプト', prompt: post.image_prompt }] : [];
  }, [post?.image_prompt, post?.image_prompts]);
  const selectedImagePrompt = editablePromptOptions[selectedPromptIndex]?.prompt || post?.image_prompt || '';
  const selectedPromptOption = editablePromptOptions[selectedPromptIndex] || null;
  const referenceDetectionText = [
    selectedImagePrompt,
    selectedPromptOption?.title,
    selectedPromptOption?.sourceQuote
  ].filter(Boolean).join('\n');

  useEffect(() => {
    const loadAvailableImages = async () => {
      try {
        const res = await api.get('/novel/settings');
        const characterImages = res.data.character_images || [];
        const stageImages = res.data.stage_images || [];
        setProjectArtDirection(
          res.data.project_art_direction_full || res.data.project_art_direction || ''
        );
        setAvailableImages([
          ...characterImages.map((image) => ({
            ...image,
            type: 'character',
            displayName: `キャラ: ${image.name}`
          })),
          ...stageImages.map((image) => ({
            ...image,
            type: 'stage',
            displayName: `舞台: ${image.name}`
          }))
        ]);
      } catch (error) {
        console.error('利用可能な画像の取得エラー:', error);
      }
    };
    loadAvailableImages();
  }, []);

  useEffect(() => {
    if (!generatedImages.some((image) => image.id === selectedImageId)) {
      setSelectedImageId(generatedImages[0]?.id ?? null);
    }
  }, [generatedImages, selectedImageId]);

  useEffect(() => {
    if (selectedPromptIndex >= imagePromptOptions.length) {
      setSelectedPromptIndex(0);
    }
  }, [imagePromptOptions.length, selectedPromptIndex]);

  useEffect(() => {
    setEditablePromptOptions(imagePromptOptions.map((option) => ({ ...option })));
  }, [imagePromptOptions]);

  useEffect(() => {
    window.localStorage.setItem('serial_story_external_ai_urls', JSON.stringify(externalAiUrls));
  }, [externalAiUrls]);

  useEffect(() => {
    window.localStorage.setItem(
      'serial_story_include_art_direction_in_external_prompt',
      String(includeArtDirectionInExternalPrompt)
    );
  }, [includeArtDirectionInExternalPrompt]);

  useEffect(() => {
    window.localStorage.setItem(
      'serial_story_include_source_quote_in_external_prompt',
      String(includeSourceQuoteInExternalPrompt)
    );
  }, [includeSourceQuoteInExternalPrompt]);

  useEffect(() => {
    setReferenceImages([]);
    setDismissedAutoReferenceIds([]);
  }, [post?.date, post?.generation_index, selectedPromptIndex]);

  useEffect(() => {
    const suggestions = suggestReferencesForPrompt(availableImages, referenceDetectionText)
      .filter((image) => !dismissedAutoReferenceIds.includes(image.id))
      .map((image) => ({ ...image, selectionSource: 'auto' }));
    setReferenceImages((current) => {
      const manualReferences = current.filter((image) => image.selectionSource !== 'auto');
      const next = [
        ...suggestions.filter((image) => !manualReferences.some((manual) => manual.id === image.id)),
        ...manualReferences
      ].slice(0, 3);
      const currentSignature = current.map((image) => `${image.id}:${image.selectionSource}`).join('|');
      const nextSignature = next.map((image) => `${image.id}:${image.selectionSource}`).join('|');
      return currentSignature === nextSignature ? current : next;
    });
  }, [availableImages, referenceDetectionText, dismissedAutoReferenceIds]);

  useEffect(() => {
    if (!isLightboxOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  if (!post) return null;

  const handleGenerateImage = async (promptOverride = '', promptIndex = selectedPromptIndex) => {
    const promptToUse = String(promptOverride || selectedImagePrompt).trim();
    if (!promptToUse) {
      alert('まず画像プロンプトを生成してください。');
      return;
    }

    const selectedReferences = referenceImages.slice(0, 3);
    setIsGenerating(true);
    setGeneratingPromptIndex(promptIndex);
    try {
      const res = await imageApi.post('/novel/generate_image', {
        date: post.date,
        generation_index: post.generation_index,
        image_prompt: promptToUse,
        reference_images: selectedReferences.map((image) => ({
          id: image.id,
          name: image.name,
          image_path: image.image_path,
          type: image.type,
          role: image.type === 'character' ? 'identity_reference' : 'environment_layout_reference'
        }))
      });
      onPostUpdate(res.data);
      setSelectedImageId(res.data.images?.[0]?.id ?? null);
    } catch (error) {
      console.error('画像生成エラー:', error);
      const errorData = error.response?.data || {};
      let errorMessage = errorData.details || errorData.error || error.message || '不明なエラー';

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = '画像生成に時間がかかりすぎました。5〜10分ほど置いてから再度お試しください。';
      }
      if (errorData.serverOverloaded || error.response?.status === 503) {
        errorMessage += '\n\nGemini APIが混雑しています。時間を置き、参照画像を減らしてお試しください。';
      }
      if (errorData.quotaExceeded) {
        errorMessage += '\n\n画像生成モデルの利用枠または契約状況をご確認ください。';
      }
      alert(`画像生成に失敗しました。\n\n${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setGeneratingPromptIndex(null);
    }
  };

  const handlePromptOptionChange = (index, field, value) => {
    setEditablePromptOptions((current) => current.map((option, optionIndex) => (
      optionIndex === index ? { ...option, [field]: value } : option
    )));
  };

  const handleSavePromptOption = async (index) => {
    const option = editablePromptOptions[index];
    if (!option?.prompt?.trim()) {
      alert('保存する画像プロンプトを入力してください。');
      return;
    }
    setSavingPromptIndex(index);
    try {
      const res = await api.post('/novel/save_image_prompt', {
        date: post.date,
        generation_index: post.generation_index,
        image_prompts: editablePromptOptions.map((item, optionIndex) => ({
          title: item.title?.trim() || `場面 ${optionIndex + 1}`,
          source_quote: item.sourceQuote || '',
          prompt: item.prompt?.trim() || ''
        }))
      });
      onPostUpdate(res.data);
      alert(`場面 ${index + 1} の画像プロンプトを保存しました。`);
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`画像プロンプトの保存に失敗しました。\n\n${message}`);
    } finally {
      setSavingPromptIndex(null);
    }
  };

  const handleRegeneratePromptOption = async (index) => {
    const option = editablePromptOptions[index];
    if (!option) return;
    if (!window.confirm(
      `場面 ${index + 1} だけをAIで再生成します。現在のプロンプトは置き換わります。続けますか？`
    )) return;

    setRegeneratingPromptIndex(index);
    setSelectedPromptIndex(index);
    try {
      const res = await api.post('/novel/regenerate_image_prompt_scene', {
        date: post.date,
        generation_index: post.generation_index,
        scene_index: index,
        image_prompts: editablePromptOptions.map((item, optionIndex) => ({
          title: item.title?.trim() || `場面 ${optionIndex + 1}`,
          source_quote: item.sourceQuote || '',
          prompt: item.prompt?.trim() || ''
        }))
      });
      onPostUpdate(res.data);
      alert(`場面 ${index + 1} の画像プロンプトだけを再生成しました。`);
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`場面 ${index + 1} の再生成に失敗しました。\n\n${message}`);
    } finally {
      setRegeneratingPromptIndex(null);
    }
  };

  const buildExternalPromptText = () => {
    const option = selectedPromptOption;
    const referenceList = referenceImages.length > 0
      ? referenceImages.map((image, index) => (
        `${index + 1}. ${image.type === 'character' ? 'キャラクター' : '舞台'}「${image.name}」`
      )).join('\n')
      : 'なし';
    const referenceRules = referenceImages.map((image, index) => (
      image.type === 'character'
        ? `- 参照画像${index + 1}は「${image.name}」の外見・同一性・衣装デザインの基準として使い、背景は場面へ持ち込まない。媒体表現は共通アートディレクションへ翻訳する。`
        : `- 参照画像${index + 1}は舞台「${image.name}」の空間構造・建築・家具配置・素材・色調の基準として使い、配置を変えずに媒体表現だけを共通アートディレクションへ翻訳する。`
    )).join('\n');

    return [
      '以下の指示と添付する参照画像を使い、一枚の画像を生成してください。',
      '',
      `【場面 ${selectedPromptIndex + 1}】${option?.title ? ` ${option.title}` : ''}`,
      includeSourceQuoteInExternalPrompt && option?.sourceQuote
        ? `【本文の根拠】\n${option.sourceQuote}`
        : '',
      `【画像生成プロンプト】\n${selectedImagePrompt}`,
      includeArtDirectionInExternalPrompt && projectArtDirection
        ? `【プロジェクト共通アートディレクション】\n${projectArtDirection}`
        : '',
      '',
      `【添付する参照画像】\n${referenceList}`,
      referenceRules ? `【参照画像の扱い】\n${referenceRules}` : '',
      '- 一つの時刻・場所・瞬間だけを描き、複数場面を混ぜない。',
      '- プロンプトと参照画像が矛盾する場合、人物の外見はキャラクター画像、空間と家具配置は舞台画像を優先する。'
    ].filter(Boolean).join('\n');
  };

  const handleCopyExternalPrompt = async () => {
    if (!selectedImagePrompt.trim()) {
      alert('コピーする画像プロンプトがありません。');
      return;
    }
    try {
      await copyTextToClipboard(buildExternalPromptText());
      alert(`場面 ${selectedPromptIndex + 1} の外部AI用プロンプトをコピーしました。`);
    } catch (error) {
      alert(`プロンプトをコピーできませんでした。\n\n${error.message}`);
    }
  };

  const handleOpenExternalAI = (provider) => {
    const url = String(externalAiUrls[provider] || DEFAULT_EXTERNAL_AI_URLS[provider]).trim();
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('unsupported protocol');
    } catch {
      alert('外部AIのURLが正しくありません。http:// または https:// で始まるURLを設定してください。');
      return;
    }
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    setExternalProvider(provider);
    copyTextToClipboard(buildExternalPromptText())
      .then(() => alert(`${provider === 'chatgpt' ? 'ChatGPT' : 'Gemini'}を別タブで開きました。プロンプトはコピー済みです。`))
      .catch(() => alert(`${provider === 'chatgpt' ? 'ChatGPT' : 'Gemini'}を別タブで開きました。プロンプトは「外部AI用プロンプトをコピー」からコピーしてください。`));
    if (!opened) {
      console.warn('外部AIのタブを開けませんでした。ポップアップ設定を確認してください。');
    }
  };

  const handleDownloadReferenceImage = (image) => {
    const anchor = document.createElement('a');
    anchor.href = `/${image.image_path}`;
    anchor.download = image.image_filename || image.image_path.split('/').pop() || `${image.name}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleCopyReferenceImage = async (image) => {
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('このブラウザは画像コピーに対応していません');
      }
      const response = await fetch(`/${image.image_path}`);
      if (!response.ok) throw new Error('参照画像を読み込めませんでした');
      const sourceBlob = await response.blob();
      const bitmap = await createImageBitmap(sourceBlob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      bitmap.close();
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('画像変換に失敗しました'))), 'image/png');
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      alert(`参照画像「${image.name}」をコピーしました。`);
    } catch (error) {
      handleDownloadReferenceImage(image);
      alert(`画像コピーが利用できないため、「${image.name}」をダウンロードしました。`);
    }
  };

  const handleImportExternalImage = async () => {
    if (!externalImportFile) {
      alert('取り込む完成画像を選択してください。');
      return;
    }
    if (!selectedImagePrompt.trim()) {
      alert('紐付ける場面プロンプトがありません。');
      return;
    }

    setIsImportingExternalImage(true);
    try {
      const formData = new FormData();
      formData.append('image', externalImportFile);
      formData.append('date', post.date);
      formData.append('generation_index', String(post.generation_index ?? 0));
      formData.append('scene_index', String(selectedPromptIndex));
      formData.append('scene_title', selectedPromptOption?.title || `場面 ${selectedPromptIndex + 1}`);
      formData.append('source_quote', selectedPromptOption?.sourceQuote || '');
      formData.append('image_prompt', selectedImagePrompt.trim());
      formData.append('provider', externalProvider);
      formData.append('reference_images', JSON.stringify(referenceImages.map((image) => ({
        id: image.id,
        name: image.name,
        image_path: image.image_path,
        type: image.type,
        role: image.type === 'character' ? 'identity_reference' : 'environment_layout_reference',
        selection_source: image.selectionSource || 'manual'
      }))));
      const res = await api.post('/novel/import_external_image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      onPostUpdate(res.data);
      setSelectedImageId(res.data.images?.[0]?.id ?? null);
      setExternalImportFile(null);
      setExternalImportInputKey((current) => current + 1);
      alert(`外部AIの完成画像を、場面 ${selectedPromptIndex + 1} の履歴へ保存しました。`);
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`外部生成画像の取り込みに失敗しました。\n\n${message}`);
    } finally {
      setIsImportingExternalImage(false);
    }
  };

  const handleDeleteSelectedImage = async () => {
    if (!selectedImage?.id) {
      alert('この画像は履歴情報の読み込み後に削除できます。画面を再読み込みしてください。');
      return;
    }
    if (!window.confirm('選択中の画像を削除しますか？\nこの操作は取り消せません。')) return;

    setIsDeleting(true);
    try {
      const res = await api.delete(`/novel/images/${selectedImage.id}`);
      onPostUpdate(res.data);
      setSelectedImageId(res.data.images?.[0]?.id ?? null);
      setIsLightboxOpen(false);
    } catch (error) {
      const message = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`画像の削除に失敗しました。\n\n${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleReferenceImage = (image) => {
    const selectedReference = referenceImages.find((item) => item.id === image.id);
    if (selectedReference) {
      setReferenceImages((current) => current.filter((item) => item.id !== image.id));
      const isSuggestedReference = suggestReferencesForPrompt(availableImages, referenceDetectionText)
        .some((suggestion) => suggestion.id === image.id);
      if (selectedReference.selectionSource === 'auto' || isSuggestedReference) {
        setDismissedAutoReferenceIds((current) => (
          current.includes(image.id) ? current : [...current, image.id]
        ));
      }
      return;
    }
    if (referenceImages.length >= 3) {
      alert('参照画像は最大3枚まで選択できます。');
      return;
    }
    setDismissedAutoReferenceIds((current) => current.filter((id) => id !== image.id));
    setReferenceImages((current) => [...current, { ...image, selectionSource: 'manual' }]);
  };

  const renderReferenceGroup = (type, label, accentClass) => {
    const items = availableImages.filter((image) => image.type === type);
    if (items.length === 0) return null;

    return (
      <div className="mb-3 last:mb-0">
        <h4 className={`mb-1 text-[10px] font-semibold ${accentClass}`}>{label}</h4>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
          {items.map((image) => {
            const isSelected = referenceImages.some((item) => item.id === image.id);
            return (
              <button
                type="button"
                key={image.id}
                onClick={() => handleToggleReferenceImage(image)}
                aria-pressed={isSelected}
                className={`relative overflow-hidden rounded-md border-2 text-left transition ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/30'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <img
                  src={`/${image.image_path}`}
                  alt={image.displayName || image.name}
                  className="h-20 w-full object-cover"
                />
                {isSelected && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950">
                    ✓
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[9px] text-white">
                  {image.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-800/45"
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="text-sm font-semibold">画像プレビュー</span>
            <span className="text-[10px] text-slate-400">
              {generatedImages.length > 0 ? `生成履歴 ${generatedImages.length}枚` : '画像はまだありません'}
            </span>
          </span>
          {isOpen ? <ChevronUp size={17} className="text-slate-400" /> : <ChevronDown size={17} className="text-slate-400" />}
        </button>

        {isOpen && (
          <div className="border-t border-slate-800 p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
              同じ文章から何度生成しても履歴に残ります。画像を選び、クリックすると拡大できます。
            </p>
            {isPreviousTextVersion && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-700/50 bg-amber-950/25 px-3 py-2 text-[10px] leading-relaxed text-amber-100/90">
                <Clock3 size={13} className="mt-0.5 flex-none" />
                <span>
                  この画像は、本文を編集する前の版をもとにしています。語尾などの微調整ならそのまま使えます。
                  現在の本文に合わせたいときだけ、新しい画像を生成してください。
                </span>
              </div>
            )}
            {editablePromptOptions.length > 0 && (
              <div className="mb-3 rounded-md border border-slate-700 bg-slate-950/55 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-[11px] font-semibold">場面別プロンプト</h3>
                  <span className="text-[10px] text-slate-500">{editablePromptOptions.length}件</span>
                </div>
                <div className="space-y-3">
                  {editablePromptOptions.map((option, index) => {
                    const isSelected = index === selectedPromptIndex;
                    return (
                      <div
                        key={`${option.title}-${index}`}
                        className={`w-full rounded-md border px-3 py-2.5 transition ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/30'
                            : 'border-slate-700 bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPromptIndex(index)}
                            aria-pressed={isSelected}
                            className="inline-flex min-w-0 items-center gap-2 text-left"
                          >
                            <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
                              isSelected ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-slate-500'
                            }`}>
                              {isSelected ? '✓' : ''}
                            </span>
                            <span className="truncate text-[10px] font-semibold text-slate-200">{option.title}</span>
                          </button>
                          <span className="flex-none text-[9px] text-slate-500">場面 {index + 1}</span>
                        </div>
                        {option.sourceQuote && (
                          <p className="mt-2 text-[9px] leading-relaxed text-sky-300/80">
                            本文: {option.sourceQuote}
                          </p>
                        )}
                        <label className="mt-2 block">
                          <span className="mb-1 block text-[9px] font-semibold text-slate-400">画像生成プロンプト（全文編集可）</span>
                          <textarea
                            ref={(node) => {
                              if (!node) return;
                              node.style.height = 'auto';
                              node.style.height = `${node.scrollHeight}px`;
                            }}
                            value={option.prompt}
                            onFocus={() => setSelectedPromptIndex(index)}
                            onChange={(event) => {
                              handlePromptOptionChange(index, 'prompt', event.target.value);
                              event.target.style.height = 'auto';
                              event.target.style.height = `${event.target.scrollHeight}px`;
                            }}
                            className="min-h-28 w-full resize-y overflow-hidden rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-[10px] leading-relaxed text-slate-200 focus:border-amber-500 focus:outline-none"
                          />
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleRegeneratePromptOption(index)}
                            disabled={regeneratingPromptIndex !== null || savingPromptIndex !== null || isGenerating}
                            className="rounded-md border border-violet-500 bg-violet-600 px-2.5 py-1 text-[10px] font-semibold hover:bg-violet-500 disabled:opacity-50"
                          >
                            {regeneratingPromptIndex === index ? 'AIで再生成中...' : 'この場面だけAIで再生成'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSavePromptOption(index)}
                            disabled={savingPromptIndex !== null || regeneratingPromptIndex !== null || !option.prompt?.trim()}
                            className="rounded-md border border-blue-500 bg-blue-600 px-2.5 py-1 text-[10px] font-semibold hover:bg-blue-500 disabled:opacity-50"
                          >
                            {savingPromptIndex === index ? '保存中...' : 'このプロンプトを保存'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPromptIndex(index);
                              handleGenerateImage(option.prompt, index);
                            }}
                            disabled={isGenerating || regeneratingPromptIndex !== null || !option.prompt?.trim()}
                            className="rounded-md border border-emerald-500 bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {generatingPromptIndex === index ? '画像生成中...' : 'この場面で画像生成'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  場面ごとに全文編集・保存・AI再生成・画像生成ができます。個別再生成では他の場面を変更せず、候補同士を混ぜません。
                </p>
              </div>
            )}
            {selectedImagePrompt && (
              <div className="mb-3 rounded-md border border-cyan-800/70 bg-cyan-950/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[11px] font-semibold text-cyan-100">外部AIで生成</h3>
                    <p className="mt-0.5 text-[9px] text-cyan-200/60">
                      選択中: 場面 {selectedPromptIndex + 1}{selectedPromptOption?.title ? `「${selectedPromptOption.title}」` : ''}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-700/60 px-2 py-0.5 text-[9px] text-cyan-200">
                    参照画像 {referenceImages.length}枚
                  </span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                  場面名・画像生成プロンプト・参照画像の役割をコピーします。ChatGPT／Geminiには、下で選択中の参照画像を一枚ずつ貼り付けてください。
                </p>
                <div className="mt-2 grid gap-1.5 text-[9px] text-slate-400">
                  <label className="flex cursor-pointer items-start gap-1.5">
                    <input
                      type="checkbox"
                      checked={includeArtDirectionInExternalPrompt}
                      onChange={(event) => setIncludeArtDirectionInExternalPrompt(event.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      共通アートディレクション全文をコピーに含める（ChatGPTプロジェクト詳細設定に登録済みなら不要）
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-1.5">
                    <input
                      type="checkbox"
                      checked={includeSourceQuoteInExternalPrompt}
                      onChange={(event) => setIncludeSourceQuoteInExternalPrompt(event.target.checked)}
                      className="mt-0.5"
                    />
                    <span>本文の根拠もコピーに含める（画像プロンプトの補足確認用）</span>
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyExternalPrompt}
                    className="inline-flex items-center gap-1 rounded-md border border-cyan-600 bg-cyan-700 px-2.5 py-1 text-[10px] font-semibold hover:bg-cyan-600"
                  >
                    <Copy size={12} />
                    外部AI用プロンプトをコピー
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenExternalAI('chatgpt')}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-600 bg-emerald-700 px-2.5 py-1 text-[10px] font-semibold hover:bg-emerald-600"
                  >
                    <ExternalLink size={12} />
                    ChatGPTで開く
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenExternalAI('gemini')}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-600 bg-blue-700 px-2.5 py-1 text-[10px] font-semibold hover:bg-blue-600"
                  >
                    <ExternalLink size={12} />
                    Geminiで開く
                  </button>
                </div>
                <details className="mt-2 rounded-md border border-slate-700 bg-slate-950/45 px-2.5 py-2">
                  <summary className="cursor-pointer text-[9px] font-semibold text-slate-400">外部AIのリンク設定</summary>
                  <div className="mt-2 grid gap-2">
                    <label className="grid gap-1 text-[9px] text-slate-400">
                      ChatGPTプロジェクト／チャットURL
                      <input
                        type="url"
                        value={externalAiUrls.chatgpt}
                        onChange={(event) => setExternalAiUrls((current) => ({ ...current, chatgpt: event.target.value }))}
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
                      />
                    </label>
                    <label className="grid gap-1 text-[9px] text-slate-400">
                      GeminiチャットURL
                      <input
                        type="url"
                        value={externalAiUrls.gemini}
                        onChange={(event) => setExternalAiUrls((current) => ({ ...current, gemini: event.target.value }))}
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
                      />
                    </label>
                    <p className="text-[9px] leading-relaxed text-slate-500">
                      使用する外部AIプロジェクトを開き、そのURLを登録すると次回から直接開けます。このブラウザ内だけに保存します。
                    </p>
                  </div>
                </details>

                <div className="mt-3 border-t border-cyan-900/60 pt-3">
                  <h4 className="text-[10px] font-semibold text-slate-200">外部生成した完成画像を取り込む</h4>
                  <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                    選択中の場面・編集済みプロンプト・参照画像名・生成元を自動で画像履歴へ保存します。
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={externalProvider}
                      onChange={(event) => setExternalProvider(event.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200"
                      aria-label="外部画像の生成元"
                    >
                      <option value="chatgpt">ChatGPT</option>
                      <option value="gemini">Gemini</option>
                      <option value="other">その他</option>
                    </select>
                    <input
                      key={externalImportInputKey}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setExternalImportFile(event.target.files?.[0] || null)}
                      className="max-w-full text-[9px] text-slate-400 file:mr-2 file:rounded-md file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-[9px] file:text-slate-100"
                      aria-label="外部生成した完成画像"
                    />
                    <button
                      type="button"
                      onClick={handleImportExternalImage}
                      disabled={!externalImportFile || isImportingExternalImage}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-600 bg-amber-700 px-2.5 py-1 text-[10px] font-semibold hover:bg-amber-600 disabled:opacity-50"
                    >
                      <Upload size={12} />
                      {isImportingExternalImage ? '取り込み中...' : '画像履歴へ取り込む'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenerateImage()}
                disabled={isGenerating || regeneratingPromptIndex !== null || !selectedImagePrompt}
                className="rounded-md border border-emerald-500 bg-emerald-600 px-3 py-1 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60"
              >
                {isGenerating ? '画像生成中...' : '選択中の場面で画像生成'}
              </button>
              {selectedImage && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedImage}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-700 bg-rose-950/35 px-3 py-1 text-xs text-rose-200 hover:bg-rose-900/45 disabled:opacity-60"
                >
                  <Trash2 size={13} />
                  {isDeleting ? '削除中...' : '選択画像を削除'}
                </button>
              )}
            </div>

            {selectedGenerationMetadata && (
              <div className="mt-3 rounded-md border border-slate-700 bg-slate-950/55 p-3 text-[10px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">選択画像の生成情報</span>
                  <span className="font-mono text-slate-400">
                    {selectedGenerationMetadata.model || selectedGenerationMetadata.provider || 'モデル情報なし'}
                  </span>
                </div>
                {selectedGenerationMetadata.external_import ? (
                  <>
                    <p className="mt-2 text-cyan-300">
                      外部AIから取り込み・場面 {Number(selectedGenerationMetadata.scene?.index ?? 0) + 1}
                      {selectedGenerationMetadata.scene?.title ? `「${selectedGenerationMetadata.scene.title}」` : ''}
                    </p>
                    {(selectedGenerationMetadata.references || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(selectedGenerationMetadata.references || []).map((reference, index) => (
                          <span
                            key={`${reference.image_path || reference.name}-${index}`}
                            className={`rounded-full border px-2 py-1 ${
                              reference.type === 'character'
                                ? 'border-blue-700/70 bg-blue-950/40 text-blue-200'
                                : 'border-purple-700/70 bg-purple-950/40 text-purple-200'
                            }`}
                          >
                            {reference.type === 'character' ? 'キャラ' : '舞台'}: {reference.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : selectedGenerationMetadata.strict_reference_mode ? (
                  <>
                    <p className="mt-2 text-emerald-300">
                      厳密参照モード: {selectedGenerationMetadata.loaded_reference_count || 0}/
                      {selectedGenerationMetadata.requested_reference_count || 0}枚を使用
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(selectedGenerationMetadata.references || []).map((reference, index) => (
                        <span
                          key={`${reference.image_path || reference.name}-${index}`}
                          className={`rounded-full border px-2 py-1 ${
                            reference.type === 'character'
                              ? 'border-blue-700/70 bg-blue-950/40 text-blue-200'
                              : 'border-purple-700/70 bg-purple-950/40 text-purple-200'
                          }`}
                        >
                          {reference.type === 'character' ? 'キャラ' : '舞台'}: {reference.name}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-slate-400">
                    参照画像なし{selectedGenerationMetadata.default_style_applied ? '・デフォルト画風を適用' : ''}
                  </p>
                )}
              </div>
            )}

            {generatedImages.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold">生成履歴</h3>
                  <span className="text-[10px] text-slate-500">{generatedImages.length}枚</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {generatedImages.map((image, index) => {
                    const isSelected = selectedImage?.id === image.id
                      || (!selectedImage?.id && selectedImage?.filename === image.filename);
                    return (
                      <button
                        type="button"
                        key={image.id || image.filename}
                        onClick={() => setSelectedImageId(image.id)}
                        className={`relative h-20 w-20 flex-none overflow-hidden rounded-lg border-2 transition ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/25'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                        aria-label={`${index === 0 ? '最新の' : ''}生成画像を選択`}
                      >
                        <img
                          src={`/generated/${image.filename}`}
                          alt={`生成画像 ${generatedImages.length - index}`}
                          className="h-full w-full object-cover"
                        />
                        {index === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-amber-500 px-1 py-0.5 text-[8px] font-bold text-slate-950">
                            最新
                          </span>
                        )}
                        {image.generation_metadata?.external_import && (
                          <span className="absolute right-1 top-1 rounded bg-cyan-600 px-1 py-0.5 text-[8px] font-bold text-white">
                            外部
                          </span>
                        )}
                        {!image.is_current_version && (
                          <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.5 text-[8px] font-medium text-amber-100">
                            編集前
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => selectedImage && setIsLightboxOpen(true)}
            disabled={!selectedImage}
            className="group relative aspect-square w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-950 disabled:cursor-default"
            aria-label={selectedImage ? '選択画像を拡大表示' : '画像はまだありません'}
          >
            {selectedImage ? (
              <>
                <img
                  key={selectedImage.filename}
                  src={`/generated/${selectedImage.filename}`}
                  alt="選択中の生成画像"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] text-white opacity-90">
                  <Maximize2 size={12} />
                  拡大
                </span>
              </>
            ) : (
              <span className="px-3 text-center text-[11px] text-slate-500">まだ画像がありません</span>
            )}
          </button>
        </div>

        {availableImages.length > 0 && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-xs font-semibold">参照画像（最大3枚）</label>
              <span className="text-[10px] text-slate-500">{referenceImages.length}/3枚を選択中</span>
            </div>
            <p className="mb-3 text-[10px] text-slate-400">
              選択中の場面プロンプトにある固有名詞と状況から参照画像を自動選択します。不要な画像は「解除」、追加したい画像は下の一覧から手動選択できます。
            </p>
            {referenceImages.length > 0 && (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                {referenceImages.map((image) => (
                  <div
                    key={`selected-${image.id}`}
                    className={`rounded-md border px-2 py-1.5 text-[9px] ${
                      image.type === 'character'
                        ? 'border-blue-700/70 bg-blue-950/40 text-blue-200'
                        : 'border-purple-700/70 bg-purple-950/40 text-purple-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {image.type === 'character' ? '外見・画風' : '舞台・空間'}: {image.name}
                      </span>
                      <span className="flex-none rounded-full border border-current/30 px-1.5 py-0.5 text-[8px] opacity-80">
                        {image.selectionSource === 'auto' ? '自動選択' : '手動選択'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyReferenceImage(image)}
                        className="inline-flex items-center gap-1 rounded border border-current/30 px-1.5 py-0.5 hover:bg-white/10"
                      >
                        <Copy size={9} /> 画像をコピー
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadReferenceImage(image)}
                        className="inline-flex items-center gap-1 rounded border border-current/30 px-1.5 py-0.5 hover:bg-white/10"
                      >
                        <Download size={9} /> DL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleReferenceImage(image)}
                        className="inline-flex items-center gap-1 rounded border border-rose-400/40 px-1.5 py-0.5 text-rose-200 hover:bg-rose-500/15"
                      >
                        <X size={9} /> 解除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {renderReferenceGroup('character', 'キャラクター画像', 'text-blue-300')}
            {renderReferenceGroup('stage', '舞台画像', 'text-purple-300')}
          </div>
        )}

        {post.tokenUsage && (
          <div className="mt-4 border-t border-slate-700 pt-3">
            <h3 className="mb-2 text-xs font-semibold">トークン使用量</h3>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded bg-slate-800/50 px-2 py-1">
                <span className="text-slate-400">プロンプト:</span>
                <span className="ml-1 font-mono">{post.tokenUsage.promptTokenCount || 0}</span>
              </div>
              <div className="rounded bg-slate-800/50 px-2 py-1">
                <span className="text-slate-400">出力:</span>
                <span className="ml-1 font-mono">{post.tokenUsage.candidatesTokenCount || 0}</span>
              </div>
              <div className="rounded border border-emerald-700/50 bg-emerald-900/30 px-2 py-1">
                <span className="font-semibold text-emerald-400">合計:</span>
                <span className="ml-1 font-mono font-semibold text-emerald-300">
                  {post.tokenUsage.totalTokenCount || 0}
                </span>
              </div>
            </div>
          </div>
        )}
            </div>
        )}
      </div>

      {isLightboxOpen && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="生成画像の拡大表示"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsLightboxOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/50 p-2 text-white hover:bg-white/10"
            aria-label="拡大表示を閉じる"
          >
            <X size={22} />
          </button>
          <img
            src={`/generated/${selectedImage.filename}`}
            alt="生成画像の拡大表示"
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
};

export default ImagePreview;
