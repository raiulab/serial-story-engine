import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getMoonContext } from '../utils/celestial';

// タイムゾーンを考慮して YYYY-MM-DD 形式に変換
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CalendarView = ({ posts, onDateSelect }) => {
  const [value, setValue] = useState(new Date());

  const handleChange = (d) => {
    setValue(d);
    onDateSelect(formatDate(d));
  };

  const getTileClass = ({ date, view }) => {
    if (view !== 'month') return '';
    const dateStr = formatDate(date);
    const sameDatePosts = posts.filter((p) => p.date === dateStr);
    if (sameDatePosts.length === 0) return '';

    // 一日に複数の生成回がある場合は、その日のうち最も進んだ段階を表示する。
    const hasImageOrApproval = sameDatePosts.some((post) => (
      post.status === 'approved'
      || post.status === 'image_ready'
      || Boolean(post.image_path)
      || (Array.isArray(post.images) && post.images.length > 0)
    ));
    if (hasImageOrApproval) return 'calendar-status calendar-status--image';

    const hasContent = sameDatePosts.some((post) => (
      post.status === 'content_ready'
      || Boolean(post.content?.trim())
    ));
    if (hasContent) return 'calendar-status calendar-status--content';

    // 未生成（pendingを含む）は背景色を付けない。
    return '';
  };

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const moon = getMoonContext(formatDate(date));
    return (
      <span
        className={`calendar-moon calendar-moon--${moon.key}`}
        title={`${moon.name}（月齢 約${moon.age}）`}
        aria-label={`${moon.name}、月齢約${moon.age}`}
      >
        {moon.symbol}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">カレンダー（日々の文章生成）</h2>
      </div>
      <Calendar
        locale="ja-JP"
        onChange={handleChange}
        value={value}
        tileClassName={getTileClass}
        tileContent={getTileContent}
        className="w-full bg-slate-900 text-slate-100 border-0 rounded-lg [&_.react-calendar__tile]:py-1"
      />
      <div className="mt-3 space-y-1.5 text-[10px] text-slate-400">
        <p className="mb-2 border-b border-slate-800 pb-2 text-slate-500">
          日付の下の記号は月相です。月齢は創作リズム用の概算です。
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm border border-slate-600 bg-transparent" />
          無色：未生成
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm border border-sky-400/70 bg-sky-600" />
          ブルー：文章生成済み
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm border border-emerald-400/70 bg-emerald-600" />
          グリーン：画像まで生成済み／承認済み
        </p>
      </div>
    </div>
  );
};

export default CalendarView;
