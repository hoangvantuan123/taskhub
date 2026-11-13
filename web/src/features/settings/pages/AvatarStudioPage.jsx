import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight,
  Shuffle,
  Plus,
  X,
  Check,
  CheckCircle2,
  Settings,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { authService } from '../../../services/auth/auth.service';
import {
  CATEGORIES,
  SKIN_TONES,
  EYES_OPTIONS,
  EYEBROWS_OPTIONS,
  GLASSES_OPTIONS,
  NOSE_OPTIONS,
  MOUTH_OPTIONS,
  HAIR_OPTIONS,
  ACCESSORY_OPTIONS,
  renderAvatarSvg,
  getRandomConfig,
  configToJpegBase64,
} from '../components/avatar-studio/avatarEngine';

// Default configuration matches the user's latest screenshot (boba tea + braids + smug eyes)!
const DEFAULT_CONFIG = {
  skin: 'halftone_stipple',
  eyes: 'smug_sleepy',
  eyebrows: 'wavy',
  glasses: 'none',
  nose: 'corner_l',
  mouth: 'straw_sip',
  hair: 'boba_braids_horns',
  accessories: 'boba_tea',
};

// Icons for traits category list
const ICONS = {
  skin: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  eyes: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
  ),
  eyebrows: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 3 12 Q 8 8, 13 12 T 21 12"/>
    </svg>
  ),
  glasses: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="4"/>
      <circle cx="18" cy="12" r="4"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  nose: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 12 6 L 10 16 L 15 16"/>
    </svg>
  ),
  mouth: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 6 12 Q 12 18, 18 12"/>
    </svg>
  ),
  hair: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 4 8 L 4 16 M 8 8 L 8 16 M 12 8 L 12 16 M 16 8 L 16 16 M 20 8 L 20 16"/>
      <line x1="3" y1="8" x2="21" y2="8" strokeWidth="3"/>
    </svg>
  ),
  accessories: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
};

export default function AvatarStudioPage() {
  const navigate = useNavigate();
  const { currentUser: user, refreshUser } = useAuth();

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [activeCategory, setActiveCategory] = useState(null); // When clicked, drawer opens smoothly
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const svgContent = useMemo(() => renderAvatarSvg(config), [config]);

  const updateTrait = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
    setSavedSuccess(false);
    setSaveError('');
  };

  const handleRandomize = () => {
    const random = getRandomConfig();
    setConfig(random);
    setSavedSuccess(false);
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate('/app/settings');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSavedSuccess(false);

    try {
      const base64Jpeg = await configToJpegBase64(config, 128);
      await authService.updateProfile({
        RowVersion: user?.RowVersion,
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        birthDate: user?.birthDate || '',
        avatarUrl: base64Jpeg,
      });

      // Notify parent/sibling tabs
      try {
        localStorage.setItem('skillhub_avatar_updated', Date.now().toString());
      } catch {}

      if (refreshUser) {
        await refreshUser();
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Không thể lưu avatar vào hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  // Get options list for current category
  const currentOptions = useMemo(() => {
    if (!activeCategory) return null;
    switch (activeCategory) {
      case 'skin':
        return { key: 'skin', title: 'Tông da & Chất liệu', list: SKIN_TONES, isColor: true };
      case 'eyes':
        return { key: 'eyes', title: 'Đôi mắt & Ánh nhìn', list: EYES_OPTIONS };
      case 'eyebrows':
        return { key: 'eyebrows', title: 'Lông mày', list: EYEBROWS_OPTIONS };
      case 'glasses':
        return { key: 'glasses', title: 'Kính mắt', list: GLASSES_OPTIONS };
      case 'nose':
        return { key: 'nose', title: 'Mũi', list: NOSE_OPTIONS };
      case 'mouth':
        return { key: 'mouth', title: 'Khuôn miệng & Biểu cảm', list: MOUTH_OPTIONS };
      case 'hair':
        return { key: 'hair', title: 'Kiểu tóc & Mũ', list: HAIR_OPTIONS };
      case 'accessories':
        return { key: 'accessories', title: 'Phụ kiện độc lạ', list: ACCESSORY_OPTIONS };
      default:
        return null;
    }
  }, [activeCategory]);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f7f7f5] dark:bg-[#121212] text-[#191919] dark:text-[#e3e3e3] font-sans antialiased select-none relative">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-56 shrink-0 h-full bg-white dark:bg-[#191919] border-r border-[#ecece9] dark:border-[#2a2a2a] flex flex-col justify-between p-3.5 pt-5 z-20">
        <div>
          {/* 8 Categories Navigation */}
          <nav className="space-y-1">
            {CATEGORIES.map(cat => {
              const IconRenderer = ICONS[cat.id];
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(isSelected ? null : cat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#f0f0ee] dark:bg-[#2c2c2c] text-[#191919] dark:text-white font-semibold'
                      : 'text-[#454545] dark:text-[#a0a0a0] hover:bg-[#f7f7f5] dark:hover:bg-[#222222] hover:text-[#191919] dark:hover:text-white'
                  }`}
                >
                  <span className="shrink-0 text-current">
                    {IconRenderer ? <IconRenderer /> : null}
                  </span>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Minimal clean back button at bottom */}
        <div className="pt-3 border-t border-[#f0f0ee] dark:border-[#2a2a2a]">
          <button
            type="button"
            onClick={handleClose}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span>← Quay lại</span>
          </button>
        </div>
      </aside>

      {/* 2. SLIDING OPTIONS DRAWER (Opens when category clicked, can be closed) */}
      {currentOptions && (
        <div className="w-80 shrink-0 h-full bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md border-r border-[#ecece9] dark:border-[#2a2a2a] flex flex-col p-4 z-10 shadow-lg animate-in slide-in-from-left-4 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#f0f0ee] dark:border-[#2a2a2a]">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {currentOptions.title}
            </span>
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {currentOptions.list.map(opt => {
              const isSelected = config[currentOptions.key] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateTrait(currentOptions.key, opt.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-[#0081f2] bg-blue-50/50 dark:bg-blue-950/20 shadow-2xs font-semibold'
                      : 'border-[#eaeae8] dark:border-[#2c2c2c] bg-white dark:bg-[#1f1f1f] hover:border-slate-300 hover:bg-[#fafafa]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {opt.hex ? (
                      <span
                        className="w-5 h-5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                        style={{ backgroundColor: opt.hex }}
                      />
                    ) : (
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? 'bg-[#0081f2]' : 'bg-slate-300'
                        }`}
                      />
                    )}
                    <div className="min-w-0">
                      <span className="block text-xs text-slate-900 dark:text-slate-100 truncate">
                        {opt.label}
                      </span>
                      {opt.desc && (
                        <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                          {opt.desc}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-[#0081f2] shrink-0 ml-2" strokeWidth={3} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CENTER & RIGHT CANVAS STAGE (100% Matching Screenshot) */}
      <main className="flex-1 h-full relative flex items-center justify-center p-6 overflow-hidden">
        {/* TOP RIGHT: White pill button with blue text "Lưu >" */}
        <div className="absolute top-6 right-8 flex items-center gap-3 z-30">
          {saveError && (
            <div className="text-xs text-rose-600 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-200 shadow-2xs">
              {saveError}
            </div>
          )}
          {savedSuccess && (
            <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 size={14} />
              <span>Đã lưu vào hồ sơ!</span>
            </div>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold text-[#0081f2] bg-white dark:bg-[#1e1e1e] border border-[#e2e2e0] dark:border-[#333] shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{saving ? 'Đang lưu…' : 'Lưu'}</span>
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* LARGE CENTRAL CIRCULAR AVATAR STAGE */}
        <div className="relative flex flex-col items-center">
          <div className="w-[500px] h-[500px] max-w-[76vmin] max-h-[76vmin] rounded-full bg-white dark:bg-[#1a1a1a] shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#e6e6e4] dark:border-[#282828] flex items-center justify-center p-8 transition-transform duration-200">
            <div
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>

          {/* FLOATING ACTION BUTTONS AT THE BOTTOM OF CIRCLE (Shuffle 🔀 & + Chân dung mới) */}
          <div className="absolute -bottom-5 flex items-center gap-2.5 z-30">
            {/* 1. Shuffle Button 🔀 */}
            <button
              type="button"
              onClick={handleRandomize}
              className="w-11 h-11 rounded-full bg-white dark:bg-[#202020] border border-[#e2e2e0] dark:border-[#333] shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center text-[#191919] dark:text-white transition-all cursor-pointer"
              title="Đổi kiểu ngẫu nhiên"
            >
              <Shuffle size={17} strokeWidth={2.2} />
            </button>

            {/* 2. Bright Blue Pill Button "+ Chân dung mới" */}
            <button
              type="button"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white bg-[#0081f2] hover:bg-[#0070d6] active:scale-95 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Chân dung mới</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
