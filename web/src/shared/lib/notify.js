import { gooeyToast } from 'goey-toast';

export function notify(message, type = 'info', duration) {
  const kind = type === 'danger' ? 'error' : ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';

  // Lấy nội dung text chính của thông báo
  let text = '';
  let customOptions = {};
  if (typeof message === 'string') {
    text = message;
  } else if (message && typeof message === 'object') {
    text = message.title || message.description || message.message || '';
    customOptions = message;
  }

  // Tự động chuyển đổi lỗi xung đột phiên bản dòng (RowVersion Concurrency Conflict)
  if (typeof text === 'string' && (text.includes('ROW_VERSION_CONFLICT') || text.includes('40001'))) {
    text = 'Dữ liệu đã được người dùng khác cập nhật trước đó (Xung đột phiên bản). Vui lòng tải lại.';
  }

  // Dạng Compact Pill (Viên thuốc Dynamic Island):
  // Truyền trực tiếp text vào vị trí title, bỏ hoàn toàn description và progress bar
  const options = {
    ...customOptions,
    description: undefined,
    duration: duration ?? (kind === 'error' || kind === 'warning' ? 4500 : 3000),
    preset: 'smooth',
    showProgress: false,
    showTimestamp: false,
  };

  try {
    if (typeof gooeyToast?.[kind] === 'function') {
      return gooeyToast[kind](text, options);
    } else if (typeof gooeyToast === 'function') {
      return gooeyToast(text, options);
    }
  } catch (err) {
    console.error('Notification dispatch error:', err);
  }
}

notify.success = (msg, duration) => notify(msg, 'success', duration);
notify.error = (msg, duration) => notify(msg, 'error', duration);
notify.warning = (msg, duration) => notify(msg, 'warning', duration);
notify.info = (msg, duration) => notify(msg, 'info', duration);
