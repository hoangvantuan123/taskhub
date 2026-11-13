// Zoom preference management for compact enterprise UI scaling

export const ZOOM_LEVELS = [
  { value: '100', label: '100% (Mặc định)', desc: 'Kích thước đầy đủ' },
  { value: '90', label: '90% (Gọn gàng)', desc: 'Khuyên dùng cho màn hình laptop / 1080p' },
  { value: '85', label: '85% (Tiêu chuẩn)', desc: 'Hiển thị nhiều dữ liệu hơn' },
  { value: '80', label: '80% (Siêu gọn)', desc: 'Tối đa mật độ thông tin' },
];

export const DEFAULT_ZOOM = '90';

export function getStoredZoomLevel() {
  try {
    const saved = localStorage.getItem('skillhub_zoom_level');
    if (saved && ZOOM_LEVELS.some(z => z.value === saved)) {
      return saved;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_ZOOM;
}

export function applyZoomLevel(level) {
  // Clear any breaking zoom on root
  document.documentElement.style.zoom = '';
  try {
    localStorage.removeItem('skillhub_zoom_level');
  } catch (e) {
    console.error(e);
  }
}

export function initZoomPreference() {
  document.documentElement.style.zoom = '';
}
