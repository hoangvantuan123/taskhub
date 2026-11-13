/**
 * Sidebar Theme Management for SkillHub MES.
 * Default is "Xám trắng" (Light Gray / ChatGPT Light #f3f4f6).
 * Automatically calculates contrast for icons, texts and active pills.
 */

export function isColorLight(hex) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

export const SIDEBAR_THEMES = [
  {
    id: 'light-gray',
    label: 'Xám trắng',
    color: '#ebf0f5',
    darkColor: '#1e293b',
    isLight: true,
  },
  {
    id: 'chatgpt-light',
    label: 'Xám sáng',
    color: '#f9f9f9',
    darkColor: '#171717',
    isLight: true,
  },
  {
    id: 'slate-light',
    label: 'Xám Slate',
    color: '#e2e8f0',
    darkColor: '#1e293b',
    isLight: true,
  },
  {
    id: 'cloud-gray',
    label: 'Xám khói',
    color: '#eceef1',
    darkColor: '#1e293b',
    isLight: true,
  },
  {
    id: 'chatgpt-dark',
    label: 'ChatGPT Tối',
    color: '#202123',
    darkColor: '#171717',
    isLight: false,
  },
  {
    id: 'slate-dark',
    label: 'Slate Tối',
    color: '#1e293b',
    darkColor: '#0f172a',
    isLight: false,
  },
  {
    id: 'onyx',
    label: 'Đen than',
    color: '#111827',
    darkColor: '#030712',
    isLight: false,
  },
  {
    id: 'emerald',
    label: 'Xanh SkillHub',
    color: '#025c27',
    darkColor: '#041f11',
    isLight: false,
  },
];

const THEME_STORAGE_KEY = 'skillhub_sidebar_theme';
const CUSTOM_STORAGE_KEY = 'skillhub_sidebar_custom_color';

export function getSidebarThemeConfig() {
  try {
    let themeId = localStorage.getItem(THEME_STORAGE_KEY);
    if (!themeId || themeId === 'chatgpt' || themeId === 'chatgpt-dark') {
      themeId = 'light-gray';
      localStorage.setItem(THEME_STORAGE_KEY, 'light-gray');
    }
    const customColor = localStorage.getItem(CUSTOM_STORAGE_KEY) || '#ebf0f5';
    return { themeId, customColor };
  } catch (e) {
    return { themeId: 'light-gray', customColor: '#ebf0f5' };
  }
}

export function applySidebarTheme(themeId = 'light-gray', customColor = '') {
  let theme = SIDEBAR_THEMES.find((t) => t.id === themeId);

  if (themeId === 'custom' && customColor) {
    theme = {
      id: 'custom',
      label: 'Tự chọn',
      color: customColor,
      darkColor: customColor,
      isLight: isColorLight(customColor),
    };
  }

  if (!theme) {
    theme = SIDEBAR_THEMES[0]; // light-gray (#ebf0f5) default
  }

  const root = document.documentElement;
  root.style.setProperty('--sidebar-bg', theme.color);
  root.style.setProperty('--sidebar-dark-bg', theme.darkColor);

  if (theme.isLight) {
    root.style.setProperty('--sidebar-text', '#64748b');
    root.style.setProperty('--sidebar-text-hover', '#0f172a');
    root.style.setProperty('--sidebar-hover-bg', '#dfe5ec');
    root.style.setProperty('--sidebar-active-bg', '#dfe5ec');
    root.style.setProperty('--sidebar-active-text', '#0f172a');
    root.style.setProperty('--sidebar-active-shadow', 'none');
    root.style.setProperty('--sidebar-active-bar', 'transparent');
    root.style.setProperty('--sidebar-brand-bg', '#dfe5ec');
    root.style.setProperty('--sidebar-brand-text', '#0f172a');
    root.style.setProperty('--sidebar-border', 'rgba(0, 0, 0, 0.08)');
    root.style.setProperty('--sidebar-avatar-bg', '#f472b6');
    root.style.setProperty('--sidebar-avatar-border', 'transparent');
    root.style.setProperty('--sidebar-avatar-color', '#ffffff');
  } else {
    root.style.setProperty('--sidebar-text', 'rgba(255, 255, 255, 0.72)');
    root.style.setProperty('--sidebar-text-hover', '#ffffff');
    root.style.setProperty('--sidebar-hover-bg', 'rgba(255, 255, 255, 0.14)');
    root.style.setProperty('--sidebar-active-bg', '#ffffff');
    root.style.setProperty('--sidebar-active-text', theme.color === '#025c27' ? '#025c27' : '#0f172a');
    root.style.setProperty('--sidebar-active-shadow', '0 2px 8px rgba(0, 0, 0, 0.14)');
    root.style.setProperty('--sidebar-active-bar', '#ffffff');
    root.style.setProperty('--sidebar-brand-bg', '#ffffff');
    root.style.setProperty('--sidebar-brand-text', theme.color === '#025c27' ? '#025c27' : '#0f172a');
    root.style.setProperty('--sidebar-border', 'rgba(255, 255, 255, 0.14)');
    root.style.setProperty('--sidebar-avatar-border', 'rgba(255, 255, 255, 0.55)');
    root.style.setProperty('--sidebar-avatar-bg', 'rgba(255, 255, 255, 0.16)');
  }
}

export function saveSidebarTheme(themeId, customColor = '') {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    if (customColor) {
      localStorage.setItem(CUSTOM_STORAGE_KEY, customColor);
    }
  } catch (e) {}
  applySidebarTheme(themeId, customColor);
  window.dispatchEvent(new Event('sidebar-theme-changed'));
}

export function initSidebarTheme() {
  const { themeId, customColor } = getSidebarThemeConfig();
  applySidebarTheme(themeId, customColor);
}
