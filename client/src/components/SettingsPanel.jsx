import React, { useEffect, useState } from 'react';
import api from '../api';

const SettingsPanel = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [novelTheme, setNovelTheme] = useState('');
  const [characterSettings, setCharacterSettings] = useState('');
  const [perGenerationWordCount, setPerGenerationWordCount] = useState('500');
  const [generationCount, setGenerationCount] = useState('30');
  const [dailyGenerationCount, setDailyGenerationCount] = useState('1');
  const [projectArtDirection, setProjectArtDirection] = useState('');
  const [imageStylePreset, setImageStylePreset] = useState('');
  const [imageProvider, setImageProvider] = useState('google');
  const [imageModels, setImageModels] = useState({
    google: 'gemini-3-pro-image',
    openai: 'gpt-image-2'
  });
  const [textProvider, setTextProvider] = useState('deepseek');
  const [textModel, setTextModel] = useState('deepseek-v4-pro');
  const [textModels, setTextModels] = useState(null);
  const [apiStatus, setApiStatus] = useState({
    google_configured: false,
    openai_configured: false,
    anthropic_configured: false
  });
  const [themeFiles, setThemeFiles] = useState([]);
  const [characterFiles, setCharacterFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [savedEditingContent, setSavedEditingContent] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [characterImages, setCharacterImages] = useState([]);
  const [stageImages, setStageImages] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterImage, setNewCharacterImage] = useState(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageImage, setNewStageImage] = useState(null);
  const [editingCharacterId, setEditingCharacterId] = useState(null);
  const [editingCharacterName, setEditingCharacterName] = useState('');
  const [editingCharacterDescription, setEditingCharacterDescription] = useState('');
  const [editingStageId, setEditingStageId] = useState(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [editingStageDescription, setEditingStageDescription] = useState('');

  const tabs = [
    { id: 'basic', label: '基本設定' },
    { id: 'characters', label: 'キャラクター' },
    { id: 'stages', label: '舞台' }
  ];

  useEffect(() => {
    const load = async () => {
      try {
        console.log('[SettingsPanel] 設定を読み込み中...');
        const res = await api.get('/novel/settings');
        console.log('[SettingsPanel] 設定読み込み成功:', res.data);
        setNovelTheme(res.data.novel_theme || '');
        setCharacterSettings(res.data.character_settings || '');
        setPerGenerationWordCount(res.data.per_generation_word_count || '500');
        setGenerationCount(res.data.generation_count || '30');
        setDailyGenerationCount(res.data.daily_generation_count || '1');
        setProjectArtDirection(res.data.project_art_direction || '');
        setImageStylePreset(res.data.image_style_preset || '');
        setImageProvider(res.data.image_provider || 'google');
        setImageModels(res.data.image_models || {
          google: 'gemini-3-pro-image',
          openai: 'gpt-image-2'
        });
        setTextProvider(res.data.text_provider || 'deepseek');
        setTextModel(res.data.text_model || 'deepseek-v4-pro');
        setTextModels(res.data.text_models || null);
        setApiStatus(res.data.api_status || {
          google_configured: false,
          openai_configured: false,
          anthropic_configured: false,
          deepseek_configured: false
        });
        setThemeFiles(res.data.theme_files || []);
        setCharacterFiles(res.data.character_files || []);
        setCharacterImages(res.data.character_images || []);
        setStageImages(res.data.stage_images || []);
        console.log('[SettingsPanel] キャラクター画像:', res.data.character_images?.length || 0, '件');
        console.log('[SettingsPanel] 舞台画像:', res.data.stage_images?.length || 0, '件');
      } catch (e) {
        console.error('[SettingsPanel] 設定読み込みエラー:', e);
        alert('設定の読み込みに失敗しました。サーバーログを確認してください。');
      }
    };
    load();
  }, []);

  const handleThemeFileUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = 3 - themeFiles.length;
    if (remainingSlots <= 0) {
      alert('ファイル数の上限（3つ）に達しています。');
      e.target.value = '';
      return;
    }

    const files = Array.from(selectedFiles).slice(0, remainingSlots);
    if (files.length === 0) {
      alert('ファイル数の上限（3つ）に達しています。');
      e.target.value = '';
      return;
    }

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const res = await api.post('/novel/upload-theme-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.files && res.data.files.length > 0) {
        setThemeFiles([...themeFiles, ...res.data.files]);
      } else {
        throw new Error('サーバーからの応答が不正です。');
      }
      e.target.value = '';
    } catch (err) {
      console.error('ファイルアップロードエラー:', err);
      const errorMsg = err.response?.data?.error || err.message || '不明なエラー';
      alert(`ファイルアップロードに失敗しました。\n\nエラー詳細: ${errorMsg}`);
      e.target.value = '';
    }
  };

  const handleCharacterFileUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = 3 - characterFiles.length;
    if (remainingSlots <= 0) {
      alert('ファイル数の上限（3つ）に達しています。');
      e.target.value = '';
      return;
    }

    const files = Array.from(selectedFiles).slice(0, remainingSlots);
    if (files.length === 0) {
      alert('ファイル数の上限（3つ）に達しています。');
      e.target.value = '';
      return;
    }

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const res = await api.post('/novel/upload-character-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.files && res.data.files.length > 0) {
        setCharacterFiles([...characterFiles, ...res.data.files]);
      } else {
        throw new Error('サーバーからの応答が不正です。');
      }
      e.target.value = '';
    } catch (err) {
      console.error('ファイルアップロードエラー:', err);
      const errorMsg = err.response?.data?.error || err.message || '不明なエラー';
      alert(`ファイルアップロードに失敗しました。\n\nエラー詳細: ${errorMsg}`);
      e.target.value = '';
    }
  };

  const handleRemoveThemeFile = (index) => {
    if (!window.confirm('このテーマ設定ファイルを削除しますか？')) {
      return;
    }
    setThemeFiles(themeFiles.filter((_, i) => i !== index));
  };

  const handleRemoveCharacterFile = (index) => {
    if (!window.confirm('このキャラクター設定ファイルを削除しますか？')) {
      return;
    }
    setCharacterFiles(characterFiles.filter((_, i) => i !== index));
  };

  const getUploadedFileUrl = (file) => {
    const encodedPath = file.split('/').map(encodeURIComponent).join('/');
    return `/uploads/${encodedPath}`;
  };

  const isHtmlFile = (file) => /\.html?$/i.test(file);
  const isEditableTextFile = (file) => /\.(md|txt)$/i.test(file);

  const openSettingFile = async (file) => {
    if (!isEditableTextFile(file)) {
      setPreviewFile(file);
      return;
    }

    setIsLoadingFile(true);
    try {
      const res = await api.get('/novel/setting-files/content', { params: { file } });
      const content = res.data.content || '';
      setEditingFile(res.data.file || file);
      setEditingContent(content);
      setSavedEditingContent(content);
    } catch (err) {
      console.error('設定資料の読み込みエラー:', err);
      alert(err.response?.data?.error || '設定資料を開けませんでした。');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const closeTextEditor = () => {
    if (editingContent !== savedEditingContent && !window.confirm('未保存の編集があります。保存せずに閉じますか？')) {
      return;
    }
    setEditingFile(null);
    setEditingContent('');
    setSavedEditingContent('');
  };

  const saveTextEditor = async () => {
    if (!editingFile) return;
    setIsSavingFile(true);
    try {
      const res = await api.put('/novel/setting-files/content', {
        file: editingFile,
        content: editingContent
      });
      const savedContent = res.data.content || '';
      setEditingContent(savedContent);
      setSavedEditingContent(savedContent);
      alert('設定資料を保存しました。直前の内容は自動的にバックアップされています。');
    } catch (err) {
      console.error('設定資料の保存エラー:', err);
      alert(err.response?.data?.error || '設定資料を保存できませんでした。');
    } finally {
      setIsSavingFile(false);
    }
  };

  const handleAddCharacter = async () => {
    if (!newCharacterName || !newCharacterImage) {
      alert('キャラクター名と画像を入力してください');
      return;
    }

    // 画像ファイルの検証
    if (!newCharacterImage.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newCharacterName);
      formData.append('image', newCharacterImage);

      console.log('キャラクター画像アップロード開始:', {
        name: newCharacterName,
        fileName: newCharacterImage.name,
        fileSize: newCharacterImage.size,
        fileType: newCharacterImage.type
      });

      const res = await api.post('/novel/upload-character-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // 60秒（画像解析に時間がかかる場合があるため）
      });

      console.log('[SettingsPanel] キャラクター画像アップロード成功:', res.data);
      const updatedCharacters = [...characterImages, res.data];
      setCharacterImages(updatedCharacters);
      console.log('[SettingsPanel] キャラクター画像一覧を更新:', updatedCharacters.length, '件');
      setIsAddingCharacter(false);
      setNewCharacterName('');
      setNewCharacterImage(null);
      alert(`キャラクター「${res.data.name}」を追加しました`);
    } catch (err) {
      console.error('キャラクター追加エラー詳細:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        config: err.config
      });

      let errorMsg = '不明なエラー';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        } else {
          errorMsg = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      alert(`キャラクターの追加に失敗しました。\n\nエラー: ${errorMsg}\n\nブラウザのコンソールに詳細なエラー情報が表示されています。`);
    }
  };

  const handleAddStage = async () => {
    if (!newStageName || !newStageImage) {
      alert('舞台名と画像を入力してください');
      return;
    }

    // 画像ファイルの検証
    if (!newStageImage.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newStageName);
      formData.append('image', newStageImage);

      console.log('舞台画像アップロード開始:', {
        name: newStageName,
        fileName: newStageImage.name,
        fileSize: newStageImage.size,
        fileType: newStageImage.type
      });

      const res = await api.post('/novel/upload-stage-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // 60秒（画像解析に時間がかかる場合があるため）
      });

      console.log('[SettingsPanel] 舞台画像アップロード成功:', res.data);
      const updatedStages = [...stageImages, res.data];
      setStageImages(updatedStages);
      console.log('[SettingsPanel] 舞台画像一覧を更新:', updatedStages.length, '件');
      setIsAddingStage(false);
      setNewStageName('');
      setNewStageImage(null);
      alert(`舞台「${res.data.name}」を追加しました`);
    } catch (err) {
      console.error('舞台追加エラー詳細:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        config: err.config
      });

      let errorMsg = '不明なエラー';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        } else {
          errorMsg = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      alert(`舞台の追加に失敗しました。\n\nエラー: ${errorMsg}\n\nブラウザのコンソールに詳細なエラー情報が表示されています。`);
    }
  };

  const handleEditCharacter = (character) => {
    setEditingCharacterId(character.id);
    setEditingCharacterName(character.name);
    setEditingCharacterDescription(character.description || '');
  };

  const handleSaveCharacter = async () => {
    try {
      const res = await api.put(`/novel/character-image/${editingCharacterId}`, {
        name: editingCharacterName,
        description: editingCharacterDescription
      });

      setCharacterImages(characterImages.map(char =>
        char.id === editingCharacterId ? res.data : char
      ));
      setEditingCharacterId(null);
      setEditingCharacterName('');
      setEditingCharacterDescription('');
    } catch (err) {
      console.error('キャラクター更新エラー:', err);
      alert('キャラクターの更新に失敗しました');
    }
  };

  const handleDeleteCharacter = async (id) => {
    if (!confirm('このキャラクターを削除しますか？')) {
      return;
    }

    try {
      await api.delete(`/novel/character-image/${id}`);
      setCharacterImages(characterImages.filter(char => char.id !== id));
      alert('キャラクターを削除しました');
    } catch (err) {
      console.error('キャラクター削除エラー:', err);
      alert('キャラクターの削除に失敗しました');
    }
  };

  const handleEditStage = (stage) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
    setEditingStageDescription(stage.description || '');
  };

  const handleSaveStage = async () => {
    try {
      const res = await api.put(`/novel/stage-image/${editingStageId}`, {
        name: editingStageName,
        description: editingStageDescription
      });

      setStageImages(stageImages.map(stage =>
        stage.id === editingStageId ? res.data : stage
      ));
      setEditingStageId(null);
      setEditingStageName('');
      setEditingStageDescription('');
    } catch (err) {
      console.error('舞台更新エラー:', err);
      alert('舞台の更新に失敗しました');
    }
  };

  const handleDeleteStage = async (id) => {
    if (!confirm('この舞台を削除しますか？')) {
      return;
    }

    try {
      await api.delete(`/novel/stage-image/${id}`);
      setStageImages(stageImages.filter(stage => stage.id !== id));
      alert('舞台を削除しました');
    } catch (err) {
      console.error('舞台削除エラー:', err);
      alert('舞台の削除に失敗しました');
    }
  };

  // ストーリーコンテキスト再生成機能はUIから削除（要約修正はDB直接編集で対応）

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/novel/settings', {
        novel_theme: novelTheme,
        character_settings: characterSettings,
        per_generation_word_count: perGenerationWordCount,
        generation_count: generationCount,
        daily_generation_count: dailyGenerationCount,
        project_art_direction: projectArtDirection,
        image_style_preset: imageStylePreset,
        image_provider: imageProvider,
        theme_files: themeFiles,
        character_files: characterFiles,
        character_images: characterImages,
        stage_images: stageImages
      });
      alert('設定を保存しました。');
      onClose();
    } catch (err) {
      console.error(err);
      alert('設定の保存に失敗しました。サーバーログを確認してください。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
        {/* ヘッダー（固定） */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-semibold">初期設定</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* タブナビゲーション（固定） */}
        <div className="flex gap-2 px-4 py-2 border-b border-slate-700 flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツ（スクロール可能） */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {activeTab === 'basic' && (
              <>
                <div>
                  <label className="block font-semibold mb-1 text-[11px]">小説全体のテーマ</label>
                  <textarea
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 h-24 text-xs"
                    value={novelTheme}
                    onChange={(e) => setNovelTheme(e.target.value)}
                    placeholder="例: 現代ファンタジー。魔法が存在する世界で、普通の高校生が魔法使いになる物語..."
                  />
                  <div className="mt-2">
                    <label className="block font-semibold mb-1 text-[11px] text-slate-300">テーマ設定ファイル（最大3つ）</label>
                    <input
                      type="file"
                      multiple
                      accept=".txt,.pdf,.md,.html,.htm,.zip"
                      onChange={handleThemeFileUpload}
                      disabled={themeFiles.length >= 3}
                      className="w-full text-[10px] text-slate-400 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 disabled:opacity-50"
                    />
                    {themeFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {themeFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-800 px-2 py-1 rounded text-[10px]">
                            <span className="text-slate-300 truncate">{file}</span>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => openSettingFile(file)}
                                disabled={isLoadingFile}
                                className="text-sky-300 hover:text-sky-200"
                              >
                                {isEditableTextFile(file) ? '編集' : '開く'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveThemeFile(index)}
                                className="text-red-400 hover:text-red-300"
                                aria-label={`${file}を削除`}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">ZIP、PDF、テキスト、Markdown、HTMLファイルをアップロードできます</p>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[11px]">キャラクター設定</label>
                  <textarea
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 h-32 text-xs"
                    value={characterSettings}
                    onChange={(e) => setCharacterSettings(e.target.value)}
                    placeholder="例: 主人公: 山田太郎（17歳、高校2年生。内気だが正義感が強い。魔法の才能を秘めている）&#10;ヒロイン: 佐藤花子（17歳、転校生。実は魔法使いの一族の出身）..."
                  />
                  <div className="mt-2">
                    <label className="block font-semibold mb-1 text-[11px] text-slate-300">キャラクター設定ファイル（最大3つ）</label>
                    <input
                      type="file"
                      multiple
                      accept=".txt,.pdf,.md,.html,.htm,.zip"
                      onChange={handleCharacterFileUpload}
                      disabled={characterFiles.length >= 3}
                      className="w-full text-[10px] text-slate-400 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 disabled:opacity-50"
                    />
                    {characterFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {characterFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-800 px-2 py-1 rounded text-[10px]">
                            <span className="text-slate-300 truncate">{file}</span>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => openSettingFile(file)}
                                disabled={isLoadingFile}
                                className="text-sky-300 hover:text-sky-200"
                              >
                                {isEditableTextFile(file) ? '編集' : '開く'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCharacterFile(index)}
                                className="text-red-400 hover:text-red-300"
                                aria-label={`${file}を削除`}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">ZIP、PDF、テキスト、Markdown、HTMLファイルをアップロードできます</p>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-2 text-[11px]">文章生成モデル</label>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">
                        {{ anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', deepseek: 'DeepSeek' }[textProvider] || textProvider}
                      </span>
                      <span className={`text-[9px] ${
                        apiStatus[`${textProvider}_configured`] ? 'text-emerald-300' : 'text-rose-300'
                      }`}>
                        {apiStatus[`${textProvider}_configured`] ? 'APIキー設定済み' : 'APIキー未設定'}
                      </span>
                    </span>
                    <span className="mt-1 block font-mono text-[9px] text-slate-500">{textModel}</span>
                    {textProvider === 'deepseek' && textModels?.economical && (
                      <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                        本文・物語地図: {textModels.novel} ／ 画像プロンプトと整合性検査: {textModels.image_prompt || textModels.novel} ／ 要約・夢・別メディア案: {textModels.economical}
                      </span>
                    )}
                    <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                      モデルの変更は .env の TEXT_PROVIDER と各プロバイダーのモデル設定で行います。日付検索は WEB_SEARCH_PROVIDER、検索結果を小説案へ変換する担当は TEXT_PROVIDER で選びます。
                    </span>
                  </div>
                  {!apiStatus[`${textProvider}_configured`] && (
                    <p className="mt-2 text-[10px] text-rose-300">
                      有効なモデルを使うには、対応するAPIキーを .env に追加してください。
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-2 text-[11px]">画像生成モデル</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        id: 'google',
                        title: 'Gemini 3 Pro Image',
                        model: imageModels.google || 'gemini-3-pro-image',
                        description: 'これまでのGoogle画像生成を継続',
                        configured: apiStatus.google_configured
                      },
                      {
                        id: 'openai',
                        title: 'GPT Image 2',
                        model: imageModels.openai || 'gpt-image-2',
                        description: '高品質・1024pxでOpenAI画像生成',
                        configured: apiStatus.openai_configured
                      }
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setImageProvider(option.id)}
                        className={`rounded-lg border p-3 text-left transition ${
                          imageProvider === option.id
                            ? 'border-amber-500/70 bg-amber-950/30'
                            : 'border-slate-700 bg-slate-950/60 hover:border-slate-600'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-100">{option.title}</span>
                          <span className="flex items-center gap-1.5 text-[9px]">
                            {imageProvider === option.id && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-200">使用中</span>
                            )}
                            <span className={option.configured ? 'text-emerald-300' : 'text-rose-300'}>
                              {option.configured ? 'APIキー設定済み' : 'APIキー未設定'}
                            </span>
                          </span>
                        </span>
                        <span className="mt-1 block font-mono text-[9px] text-slate-500">{option.model}</span>
                        <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  {!apiStatus[`${imageProvider}_configured`] && (
                    <p className="mt-2 text-[10px] text-rose-300">
                      選択したモデルを使うには、対応するAPIキーを .env に追加してください。
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-500">
                    選択後に「設定を保存」を押すと、以後の画像生成へ反映されます。
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[11px]">プロジェクト共通アートディレクション（実行用短縮版）</label>
                  <textarea
                    className="w-full rounded-md border border-cyan-800/70 bg-slate-950 px-3 py-2 h-72 text-xs leading-relaxed"
                    value={projectArtDirection}
                    onChange={(e) => setProjectArtDirection(e.target.value)}
                    placeholder="小説・画像プロンプト・関連メディアに共通で反映するアートディレクション"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    小説、画像プロンプト提案、関連メディアではこの短縮版を使用します。最終画像生成と外部AI用コピーでは、同じ方針の全文版を使用します。参照画像がある場合も、人物の同一性や部屋・家具の配置を優先します。空欄で無効になります。
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[11px]">参照画像がない場合のデフォルト画風・スタイル</label>
                  <textarea
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 h-24 text-xs"
                    value={imageStylePreset}
                    onChange={(e) => setImageStylePreset(e.target.value)}
                    placeholder={`例: 柔らかい水彩タッチのアニメ調。淡いパステルカラー基調で、やさしい光と空気感を強調する。細い線画とシンプルな陰影。\\n\\n例: 90年代少女漫画風。大きくキラキラした瞳、繊細な線、スクリーントーン風の影、少し懐かしい色合い。`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    参照画像を選択しない画像生成で自動的に反映されます。参照画像がある場合は、参照画像の画風を優先してこの設定は適用しません。
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[11px]">1回に生成する文章量（文字数）</label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    value={perGenerationWordCount}
                    onChange={(e) => setPerGenerationWordCount(e.target.value)}
                    placeholder="500"
                    min="100"
                    max="2000"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">1回の生成で作成する文章量を文字数で指定します（推奨: 300-800文字）</p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[11px]">1日あたりの生成回数</label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    value={dailyGenerationCount}
                    onChange={(e) => setDailyGenerationCount(e.target.value)}
                    placeholder="1"
                    min="1"
                    max="10"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    1日に何回文章を生成するか指定します（最大10回）。物語全体の設計は、日付とは別の「物語設計」ページで行います。
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[11px]">文章生成回数</label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    value={generationCount}
                    onChange={(e) => setGenerationCount(e.target.value)}
                    placeholder="1"
                    min="1"
                    max="10"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">文章生成ボタンを押したときに、何回分の文章を生成するか指定します（最大10回）</p>
                </div>

              </>
            )}

            {activeTab === 'characters' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">キャラクター画像管理</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingCharacter(true)}
                    className="px-3 py-1 rounded-md bg-emerald-600 text-xs font-semibold hover:bg-emerald-500"
                  >
                    + キャラクターを追加
                  </button>
                </div>

                {isAddingCharacter && (
                  <div className="mb-4 p-4 bg-slate-800 rounded-md border border-slate-700">
                    <h4 className="text-xs font-semibold mb-2">新しいキャラクター</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="キャラクター名"
                        value={newCharacterName}
                        onChange={(e) => setNewCharacterName(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewCharacterImage(e.target.files?.[0] || null)}
                        className="w-full text-[10px] text-slate-400 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddCharacter}
                          className="px-3 py-1 rounded-md bg-emerald-600 text-xs font-semibold hover:bg-emerald-500"
                        >
                          追加
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCharacter(false);
                            setNewCharacterName('');
                            setNewCharacterImage(null);
                          }}
                          className="px-3 py-1 rounded-md bg-slate-700 text-xs font-semibold hover:bg-slate-600"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {characterImages.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-8">キャラクター画像が登録されていません</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {characterImages.map((character) => (
                      <div key={character.id} className="bg-slate-800 rounded-md border border-slate-700 p-3">
                        {editingCharacterId === character.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingCharacterName}
                              onChange={(e) => setEditingCharacterName(e.target.value)}
                              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                            />
                            <textarea
                              value={editingCharacterDescription}
                              onChange={(e) => setEditingCharacterDescription(e.target.value)}
                              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs h-20"
                              placeholder="説明"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleSaveCharacter}
                                className="px-2 py-1 rounded-md bg-emerald-600 text-xs hover:bg-emerald-500"
                              >
                                保存
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCharacterId(null);
                                  setEditingCharacterName('');
                                  setEditingCharacterDescription('');
                                }}
                                className="px-2 py-1 rounded-md bg-slate-700 text-xs hover:bg-slate-600"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-2">
                              <img
                                src={`/${character.image_path}`}
                                alt={character.name}
                                className="w-full h-32 object-cover rounded-md"
                                onError={(e) => {
                                  console.error(`[SettingsPanel] キャラクター画像の読み込みエラー:`, {
                                    name: character.name,
                                    path: character.image_path,
                                    fullUrl: `/${character.image_path}`
                                  });
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `<div class="w-full h-32 flex items-center justify-center bg-slate-800 rounded-md text-slate-400 text-xs">画像読み込みエラー</div>`;
                                }}
                                onLoad={() => {
                                  console.log(`[SettingsPanel] キャラクター画像読み込み成功: ${character.name}`);
                                }}
                              />
                            </div>
                            <div className="mb-2">
                              <p className="font-semibold text-xs text-slate-100">{character.name}</p>
                              {character.description && (
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{character.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditCharacter(character)}
                                className="flex-1 px-2 py-1 rounded-md bg-slate-700 text-xs hover:bg-slate-600"
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCharacter(character.id)}
                                className="px-2 py-1 rounded-md bg-red-600 text-xs hover:bg-red-500"
                              >
                                削除
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stages' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">舞台画像管理</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingStage(true)}
                    className="px-3 py-1 rounded-md bg-emerald-600 text-xs font-semibold hover:bg-emerald-500"
                  >
                    + 舞台を追加
                  </button>
                </div>

                {isAddingStage && (
                  <div className="mb-4 p-4 bg-slate-800 rounded-md border border-slate-700">
                    <h4 className="text-xs font-semibold mb-2">新しい舞台</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="舞台名"
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewStageImage(e.target.files?.[0] || null)}
                        className="w-full text-[10px] text-slate-400 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddStage}
                          className="px-3 py-1 rounded-md bg-emerald-600 text-xs font-semibold hover:bg-emerald-500"
                        >
                          追加
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingStage(false);
                            setNewStageName('');
                            setNewStageImage(null);
                          }}
                          className="px-3 py-1 rounded-md bg-slate-700 text-xs font-semibold hover:bg-slate-600"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {stageImages.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-8">舞台画像が登録されていません</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stageImages.map((stage) => (
                      <div key={stage.id} className="bg-slate-800 rounded-md border border-slate-700 p-3">
                        {editingStageId === stage.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingStageName}
                              onChange={(e) => setEditingStageName(e.target.value)}
                              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                            />
                            <textarea
                              value={editingStageDescription}
                              onChange={(e) => setEditingStageDescription(e.target.value)}
                              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs h-20"
                              placeholder="説明"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleSaveStage}
                                className="px-2 py-1 rounded-md bg-emerald-600 text-xs hover:bg-emerald-500"
                              >
                                保存
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStageId(null);
                                  setEditingStageName('');
                                  setEditingStageDescription('');
                                }}
                                className="px-2 py-1 rounded-md bg-slate-700 text-xs hover:bg-slate-600"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-2">
                              <img
                                src={`/${stage.image_path}`}
                                alt={stage.name}
                                className="w-full h-32 object-cover rounded-md"
                                onError={(e) => {
                                  console.error(`[SettingsPanel] 舞台画像の読み込みエラー:`, {
                                    name: stage.name,
                                    path: stage.image_path,
                                    fullUrl: `/${stage.image_path}`
                                  });
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `<div class="w-full h-32 flex items-center justify-center bg-slate-800 rounded-md text-slate-400 text-xs">画像読み込みエラー</div>`;
                                }}
                                onLoad={() => {
                                  console.log(`[SettingsPanel] 舞台画像読み込み成功: ${stage.name}`);
                                }}
                              />
                            </div>
                            <div className="mb-2">
                              <p className="font-semibold text-xs text-slate-100">{stage.name}</p>
                              {stage.description && (
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{stage.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditStage(stage)}
                                className="flex-1 px-2 py-1 rounded-md bg-slate-700 text-xs hover:bg-slate-600"
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStage(stage.id)}
                                className="px-2 py-1 rounded-md bg-red-600 text-xs hover:bg-red-500"
                              >
                                削除
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* フッター（固定） */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-md border border-emerald-500 bg-emerald-600 px-3 py-1 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>

        {editingFile && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${editingFile}を編集`}
              className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-700 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-200">{editingFile}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Markdown・テキストの原稿編集。保存時に直前版を自動バックアップします。</p>
                </div>
                <button
                  type="button"
                  onClick={closeTextEditor}
                  className="text-xl leading-none text-slate-400 hover:text-slate-100"
                  aria-label="編集画面を閉じる"
                >
                  ×
                </button>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-slate-700 md:grid-cols-2">
                <section className="flex min-h-0 flex-col bg-slate-900">
                  <div className="border-b border-slate-700 px-4 py-2 text-[11px] font-semibold text-slate-300">編集</div>
                  <textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    spellCheck={false}
                    className="min-h-0 flex-1 resize-none bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-100 outline-none"
                    aria-label="設定資料の内容"
                  />
                </section>
                <section className="flex min-h-0 flex-col bg-slate-900">
                  <div className="border-b border-slate-700 px-4 py-2 text-[11px] font-semibold text-slate-300">原稿表示</div>
                  <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-6 text-slate-300">
                    {editingContent || '（空のファイルです）'}
                  </pre>
                </section>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-700 px-4 py-3">
                <span className="text-[10px] text-slate-500">{editingContent.length.toLocaleString()}文字</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeTextEditor}
                    disabled={isSavingFile}
                    className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700 disabled:opacity-60"
                  >
                    閉じる
                  </button>
                  <button
                    type="button"
                    onClick={saveTextEditor}
                    disabled={isSavingFile || editingContent === savedEditingContent}
                    className="rounded-md border border-emerald-500 bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {isSavingFile ? '保存中…' : 'この資料を保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {previewFile && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${previewFile}のプレビュー`}
              className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-700 px-4 py-3">
                <p className="truncate text-xs text-slate-200">{previewFile}</p>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <a
                    href={getUploadedFileUrl(previewFile)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-300 hover:text-sky-200"
                  >
                    別タブで開く
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="text-xl leading-none text-slate-400 hover:text-slate-100"
                    aria-label="プレビューを閉じる"
                  >
                    ×
                  </button>
                </div>
              </div>
              <iframe
                title={`${previewFile}の内容`}
                src={getUploadedFileUrl(previewFile)}
                sandbox={isHtmlFile(previewFile) ? '' : undefined}
                className="min-h-0 flex-1 bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
