/**
 * Quản lý trạng thái Đánh sao (⭐ Theo dõi cá nhân) riêng biệt cho từng người dùng.
 * Đảm bảo mỗi người dùng có danh sách theo dõi riêng, không ảnh hưởng đến người khác.
 */

const getStorageKey = (userId) => `taskgs_user_starred_${userId || 'anonymous'}`;

export function getUserStarredTaskIds(userId) {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
    }
  } catch (e) {
    console.error('Error loading starred tasks:', e);
  }
  return new Set();
}

export function setUserStarredTaskIds(userId, idsSet) {
  if (!userId) return;
  try {
    const arr = Array.from(idsSet).map(String);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(arr));
  } catch (e) {
    console.error('Error saving starred tasks:', e);
  }
}

export function toggleUserStarredTask(userId, taskId) {
  if (!userId || !taskId) return false;
  const current = getUserStarredTaskIds(userId);
  const strId = String(taskId);
  let nextStarred = false;
  if (current.has(strId)) {
    current.delete(strId);
    nextStarred = false;
  } else {
    current.add(strId);
    nextStarred = true;
  }
  setUserStarredTaskIds(userId, current);
  return nextStarred;
}

export function isTaskStarredByUser(userId, taskId) {
  if (!userId || !taskId) return false;
  const current = getUserStarredTaskIds(userId);
  return current.has(String(taskId));
}

