/**
 * Packaging sample images and media assets for Goldsun Packaging ETPMS
 */

export const PACKAGING_MEDIA_SAMPLES = [
  {
    id: 'pkg-carton-samsung',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=160&auto=format&fit=crop&q=80',
    title: 'Thùng carton sóng BC 5 lớp xuất khẩu',
    category: 'Sản phẩm mẫu carton',
    spec: 'Khổ 600x400x350 mm · Sóng BC · Chịu nén ECT 44',
  },
  {
    id: 'pkg-offset-box',
    url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=160&auto=format&fit=crop&q=80',
    title: 'Hộp bánh kẹo quà tặng in Offset cao cấp',
    category: 'Sản phẩm Offset',
    spec: 'Giấy Ivory 350gsm · Cán màng mờ · Ép kim nhũ vàng · UV định hình',
  },
  {
    id: 'pkg-flexo-labels',
    url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=900&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=160&auto=format&fit=crop&q=80',
    title: 'Cuộn nhãn mác Flexo 6 màu kháng nước',
    category: 'Tem nhãn cuộn Flexo',
    spec: 'Decal nhựa Fasson PP · Mực UV bền màu · Bế đứt cuộn tự động',
  },
  {
    id: 'pkg-cad-drawing',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=160&auto=format&fit=crop&q=80',
    title: 'Tài liệu tiêu chuẩn kỹ thuật kết cấu khuôn bế',
    category: 'Hồ sơ tiêu chuẩn & Khuôn',
    spec: 'File PDF/DOCX · Khổ dao 1020x720 mm · Tiêu chuẩn Thụy Điển',
  },
  {
    id: 'pkg-qc-testing',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=160&auto=format&fit=crop&q=80',
    title: 'Biên bản kiểm tra độ nén BCT & Độ bục thùng carton',
    category: 'Kiểm định chất lượng QA/QC',
    spec: 'Máy nén KES-100 · Đạt tiêu chuẩn ASTM D642 / ISO 12048',
  },
  {
    id: 'pkg-tray-flute',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=900&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=160&auto=format&fit=crop&q=80',
    title: 'Khay định hình sóng E chống sốc linh kiện điện tử',
    category: 'Khay carton chống sốc',
    spec: 'Sóng E mỏng · Giấy Kraft chống ẩm · Tải trọng 12kg',
  },
];

/**
 * Returns a packaging media item for a given task (only if task actually has an image)
 */
export function getTaskMedia(task) {
  if (task?.imageUrl) {
    return {
      url: task.imageUrl,
      thumbUrl: task.imageUrl,
      title: task.title || 'Ảnh nhiệm vụ',
      category: 'Tài liệu đính kèm',
      spec: task.code || 'Bao bì Goldsun',
    };
  }
  return null;
}

/**
 * Avatar background colors based on user name
 */
const AVATAR_COLORS = [
  'bg-emerald-600 text-white',
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-violet-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
  'bg-teal-600 text-white',
];

export function getAvatarInfo(name) {
  if (!name || typeof name !== 'string') {
    return { initials: 'GS', colorClass: 'bg-slate-500 text-white' };
  }
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;

  return {
    initials,
    colorClass: AVATAR_COLORS[colorIndex],
  };
}

