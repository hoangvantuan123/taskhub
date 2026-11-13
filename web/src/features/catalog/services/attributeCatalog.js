import { authService } from '../../../services/auth/auth.service';
export const systemCatalogs = [
  { key: 'rank', label: 'Cấp bậc' },
  { key: 'department', label: 'Phòng ban' },
  { key: 'position', label: 'Vị trí / Nhóm đối tượng' },
  { key: 'businessRole', label: 'Vai trò nghiệp vụ' },
  { key: 'language', label: 'Ngôn ngữ' },
];
export const questionCatalogs = [
  { key: 'level', label: 'Cấp độ ISA-95' },
  { key: 'question_format', label: 'Định dạng chuyên môn' },
  { key: 'specialty', label: 'Chuyên môn' },
  { key: 'question_topic', label: 'Chủ đề liên kết' },
  { key: 'target_group', label: 'Nhóm đối tượng áp dụng' },
  { key: 'cognitive_level', label: 'Mức độ nhận thức' },
  { key: 'assessment_type', label: 'Loại bộ đề' },
];
export const businessCatalogs = systemCatalogs;
export const attributeCatalog = {
  async get(key) {
    const result = await authService.request('catalog_get', { payload: { key } });
    return { data: result.data };
  },
  async save(key, draft) {
    if (!draft.label?.trim()) throw new Error('Vui lòng nhập tên thuộc tính.');
    if (key === 'assessment_type' && !['practice', 'exam'].every(value => draft.options.some(option => option.value === value && option.active !== false))) {
      throw new Error('Loại bộ đề phải giữ hai mã đang sử dụng: practice (luyện tập) và exam (thi chính thức).');
    }
    const values = new Set();
    const options = draft.options.map(option => {
      const value = option.value?.trim();
      const label = option.label?.trim();
      if (!value || !label) throw new Error('Mỗi giá trị cần có mã và tên hiển thị.');
      if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Mã chỉ gồm chữ không dấu, số, dấu gạch ngang hoặc gạch dưới.');
      if (values.has(value.toLowerCase())) throw new Error(`Mã ${value} bị trùng.`);
      values.add(value.toLowerCase());
      return { value, label, active: option.active !== false, ...(option.parentId ? { parentId: option.parentId } : {}) };
    });
    if (!options.some(option => option.active)) throw new Error('Cần ít nhất một giá trị đang sử dụng.');
    const result = await authService.request('catalog_save', { payload: { key, label: draft.label.trim(), options } });
    window.dispatchEvent(new Event('skillhub:catalog-updated'));
    return { data: result.data };
  },
};
