/**
 * Avatar Studio Engine - Expanded Quirky & Humorous Minimalist Vector Engine.
 * Features an extensive library of funny traits:
 * - Bubble tea sipping, toast biting, bubble gum, clover chewing, golden chain,
 * - Cat ears, devil horns, bear ears, chef hat, cowboy hat, palm ponytail,
 * - Halftone stipple patterns, pixel thug shades, spiral eyes, derp eyes, clown nose, etc.
 */

export const CATEGORIES = [
  { id: 'skin', label: 'Tông da', iconKey: 'skin' },
  { id: 'eyes', label: 'Mắt', iconKey: 'eyes' },
  { id: 'eyebrows', label: 'Lông mày', iconKey: 'eyebrows' },
  { id: 'glasses', label: 'Kính mắt', iconKey: 'glasses' },
  { id: 'nose', label: 'Mũi', iconKey: 'nose' },
  { id: 'mouth', label: 'Miệng', iconKey: 'mouth' },
  { id: 'hair', label: 'Tóc', iconKey: 'hair' },
  { id: 'accessories', label: 'Phụ kiện', iconKey: 'accessories' },
];

export const SKIN_TONES = [
  { id: 'halftone_stipple', label: 'Chấm hạt Halftone', hex: '#E2E8F0', desc: 'Hạt mực stipple signature như ảnh' },
  { id: 'white', label: 'Trắng tinh mực đen', hex: '#FFFFFF', desc: 'Phong cách đen trắng nguyên bản' },
  { id: 'warm_peach', label: 'Vàng kem ấm', hex: '#FFFBEB', desc: 'Ấm áp tự nhiên' },
  { id: 'tan', label: 'Bánh mật', hex: '#FED7AA', desc: 'Khỏe khoắn năng động' },
  { id: 'soft_pink', label: 'Hồng phấn cute', hex: '#FFE4E6', desc: 'Tươi tắn dễ thương' },
  { id: 'avocado_green', label: 'Xanh quả bơ', hex: '#DCFCE7', desc: 'Độc lạ hài hước' },
  { id: 'soft_purple', label: 'Tím mộng mơ', hex: '#F3E8FF', desc: 'Ngọt ngào lãng mạn' },
  { id: 'soft_mint', label: 'Xanh bạc hà', hex: '#ECFDF5', desc: 'Tươi mát dễ chịu' },
  { id: 'slate', label: 'Xám hiện đại', hex: '#F1F5F9', desc: 'Tối giản thanh lịch' },
];

export const EYES_OPTIONS = [
  { id: 'smug_sleepy', label: 'Mắt lim dim híp mí', desc: 'Hài hước signature như ảnh' },
  { id: 'spiral', label: 'Xoắn ốc mòng mòng', desc: 'Mắt lốc xoáy vui nhộn' },
  { id: 'derp_cross', label: 'Mắt lé ngơ ngác', desc: 'Tấu hài đỉnh cao' },
  { id: 'dots', label: 'Chấm tròn tối giản', desc: 'Cổ điển nhẹ nhàng' },
  { id: 'wink', label: 'Nháy mắt lém lỉnh', desc: 'Vui tính tinh nghịch' },
  { id: 'happy_curve', label: 'Mắt cười tít', desc: 'Đường cong ấm áp' },
  { id: 'knockout_xx', label: 'Mắt dấu nhân X_X', desc: 'Choáng váng ngất ngây' },
  { id: 'heart', label: 'Mắt trái tim', desc: 'Si tình ngọt ngào' },
  { id: 'stars', label: 'Mắt ngôi sao', desc: 'Lấp lánh hiếu kỳ' },
  { id: 'anime_sparkle', label: 'Mắt anime long lanh', desc: 'Chớp chớp ngây thơ' },
  { id: 'sleepy_z', label: 'Ngái ngủ ca sáng', desc: 'Kèm chữ zZ bay bổng' },
  { id: 'side_glance', label: 'Liếc xéo nghi ngờ', desc: 'Thăm dò tò mò' },
];

export const EYEBROWS_OPTIONS = [
  { id: 'wavy', label: 'Lượn sóng ngộ nghĩnh', desc: 'Nét chữ ngã signature như ảnh' },
  { id: 'flat', label: 'Ngang điềm tĩnh', desc: 'Tự tin dứt khoát' },
  { id: 'arched', label: 'Cong nhẹ nhàng', desc: 'Hiền lành dễ mến' },
  { id: 'raised', label: 'Nhướng một bên tò mò', desc: 'Thú vị ngạc nhiên' },
  { id: 'furrowed', label: 'Cau có sâu róm', desc: 'Tập trung cao độ' },
  { id: 'unibrow', label: 'Lông mày dính liền ngố', desc: 'Một đường liền tấu hài' },
  { id: 'none', label: 'Không lông mày', desc: 'Tối giản tuyệt đối' },
];

export const GLASSES_OPTIONS = [
  { id: 'none', label: 'Không đeo kính', desc: 'Gương mặt mộc mạc' },
  { id: 'square_spiral', label: 'Kính vuông lốc xoáy', desc: 'Kính xoắn signature' },
  { id: 'round_big', label: 'Kính tròn thầy bói', desc: 'To tròn thông thái' },
  { id: 'cool_shades', label: 'Kính râm cực ngầu', desc: 'Kính đen đại ca' },
  { id: 'pixel_thug', label: 'Kính pixel 8-bit', desc: 'Phong cách Thug Life' },
  { id: 'heart_shades', label: 'Kính mắt trái tim', desc: 'Yêu đời lãng mạn' },
  { id: 'monocle', label: 'Kính một tròng quý tộc', desc: 'Cổ điển lịch thiệp' },
  { id: 'safety_goggles', label: 'Kính bảo hộ kỹ thuật', desc: 'An toàn thí nghiệm kỹ thuật' },
  { id: 'cat_eye', label: 'Kính mắt mèo', desc: 'Cá tính thời thượng' },
];

export const NOSE_OPTIONS = [
  { id: 'corner_l', label: 'Chữ L tối giản', desc: 'Đường nét tối giản thanh thoát' },
  { id: 'button_dot', label: 'Chấm nhỏ dễ thương', desc: 'Gọn gàng xinh xắn' },
  { id: 'clown_red', label: 'Mũi chú hề tròn đỏ', desc: 'Tấu hài vui nhộn' },
  { id: 'pig_snout', label: 'Mũi heo ủn ỉn', desc: 'Hai lỗ mũi tròn cute' },
  { id: 'cat_nose', label: 'Mũi mèo tam giác', desc: 'Mũi thú nhỏ xinh' },
  { id: 'hook_angle', label: 'Móc cong sống mũi', desc: 'Sống mũi cao' },
  { id: 'none', label: 'Không vẽ mũi', desc: 'Tối giản hoàn toàn' },
];

export const MOUTH_OPTIONS = [
  { id: 'straw_sip', label: 'Ngậm ống hút trà sữa', desc: 'Chu môi uống nước như ảnh' },
  { id: 'gentle_smile', label: 'Cười mỉm nhẹ', desc: 'Đường cong ấm áp' },
  { id: 'teeth_gap', label: 'Răng sún toe toét', desc: 'Tấu hài vui vẻ' },
  { id: 'tongue_out', label: 'Thè lưỡi trêu đùa', desc: 'Tinh nghịch ngổ ngáo' },
  { id: 'mustache_smirk', label: 'Ria mép quý ông', desc: 'Hài hước quý phái' },
  { id: 'bubble_gum', label: 'Thổi kẹo cao su hồng', desc: 'Bóng kẹo ngọt ngào' },
  { id: 'toast_bread', label: 'Ngậm bánh mì nướng', desc: 'Vội vã ca sáng trễ giờ' },
  { id: 'clover_stem', label: 'Ngậm nhánh cỏ 3 lá', desc: 'Lãng tử may mắn' },
  { id: 'grit_teeth', label: 'Cắn răng cười hì hì', desc: 'Cười tươi hết cỡ' },
  { id: 'kiss_pout', label: 'Chu mỏ hôn gió', desc: 'Môi chúm chím' },
  { id: 'open_gasp', label: 'Chữ O ngạc nhiên', desc: 'Bất ngờ sững sờ' },
  { id: 'wavy_mouth', label: 'Miệng lượn sóng', desc: 'Ngơ ngác bối rối' },
];

export const HAIR_OPTIONS = [
  { id: 'boba_braids_horns', label: 'Bím tóc sừng ngộ nghĩnh', desc: 'Mẫu tóc độc quyền như ảnh' },
  { id: 'curly_halftone', label: 'Xoăn xù chấm hạt', desc: 'Tóc xù bồng bềnh chấm bi' },
  { id: 'cat_ears_hair', label: 'Tai mèo lém lỉnh', desc: 'Đáng yêu tinh quái' },
  { id: 'bear_ears_hair', label: 'Tai gấu mũm mĩm', desc: 'Tròn tròn ngố ngơ' },
  { id: 'palm_ponytail', label: 'Tóc chỏm cây dừa', desc: 'Buộc túm cao hài hước' },
  { id: 'devil_horns', label: 'Sừng ác quỷ nhí nhảnh', desc: 'Quậy phá ngộ nghĩnh' },
  { id: 'chef_hat', label: 'Mũ đầu bếp bánh bao', desc: 'Vua đầu bếp MasterChef' },
  { id: 'cowboy_hat', label: 'Mũ cao bồi viễn tây', desc: 'Phong trần cá tính' },
  { id: 'hardhat_safety', label: 'Mũ bảo hộ kỹ thuật', desc: 'Kỹ thuật viên an toàn' },
  { id: 'beret_artist', label: 'Mũ nồi họa sĩ', desc: 'Phong cách nghệ thuật' },
  { id: 'beanie_cozy', label: 'Mũ len thư thái', desc: 'Ấm áp mùa đông' },
  { id: 'bun_top', label: 'Búi tóc củ tỏi', desc: 'Duyên dáng thanh tú' },
  { id: 'split_hair_90s', label: 'Tóc bổ luống 5/5', desc: 'Thần tượng thập niên 90' },
  { id: 'short_crop', label: 'Tóc tém cá tính', desc: 'Năng động gọn gàng' },
  { id: 'bald_shiny', label: 'Đầu trọc bóng loáng', desc: 'Có tia sáng chói chang' },
];

export const ACCESSORY_OPTIONS = [
  { id: 'boba_tea', label: 'Cốc trà sữa trân châu', desc: 'Cốc boba trân châu cắm ống hút như ảnh' },
  { id: 'none', label: 'Không phụ kiện', desc: 'Để trống tự nhiên' },
  { id: 'coffee_cup', label: 'Cốc cà phê ca sáng', desc: 'Tỉnh táo làm việc' },
  { id: 'headphones', label: 'Tai nghe chụp tai chill', desc: 'Đang nghe nhạc' },
  { id: 'plant_sprout', label: 'Mầm cây mọc đầu', desc: 'Năng lượng xanh tích cực' },
  { id: 'blush_dots', label: 'Má hồng chấm bi', desc: 'Hai vệt má hồng cute' },
  { id: 'band_aid', label: 'Băng dán cá nhân mũi', desc: 'Nghịch ngợm hiếu động' },
  { id: 'gold_chain', label: 'Dây chuyền vàng xích to', desc: 'Phong cách Rapper ngầu' },
  { id: 'red_bowtie', label: 'Nơ đỏ quý ông', desc: 'Lịch thiệp trang trọng' },
  { id: 'sweat_drop', label: 'Giọt mồ hôi bối rối', desc: 'Anime sweat drop' },
  { id: 'sparkle_stars', label: 'Ngôi sao tỏa sáng', desc: 'Ý tưởng đột phá' },
  { id: 'beauty_mole', label: 'Nốt ruồi duyên', desc: 'Điểm nhấn quý phái' },
];

/**
 * Render Vector SVG matching the user screenshot 100%.
 */
export function renderAvatarSvg(config) {
  const {
    skin = 'halftone_stipple',
    eyes = 'smug_sleepy',
    eyebrows = 'wavy',
    glasses = 'none',
    nose = 'corner_l',
    mouth = 'straw_sip',
    hair = 'boba_braids_horns',
    accessories = 'boba_tea',
  } = config;

  const ink = '#000000';
  const strokeW = '4';

  let skinFill = '#FFFFFF';
  let hasStippleSkin = false;

  if (skin === 'halftone_stipple') {
    hasStippleSkin = true;
    skinFill = 'url(#skin-halftone)';
  } else {
    skinFill = SKIN_TONES.find(s => s.id === skin)?.hex || '#FFFFFF';
  }

  let svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Halftone Stipple Texture -->
      <pattern id="skin-halftone" width="3.2" height="3.2" patternUnits="userSpaceOnUse">
        <circle cx="1.6" cy="1.6" r="1.0" fill="#000000"/>
      </pattern>
      <pattern id="hair-halftone" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.3" fill="#000000"/>
      </pattern>
    </defs>`;

  // 1. HAIR BACK LAYER (Pigtails, afro back, ears)
  if (hair === 'boba_braids_horns') {
    // Braided Pigtails (segmented like in screenshot)
    svg += `<g stroke="${ink}" stroke-width="${strokeW}" fill="${ink}">
      <!-- Left Braid -->
      <path d="M 33 60 C 31 64, 30 68, 32 72 C 34 76, 31 82, 33 86" stroke-linecap="round" fill="none"/>
      <ellipse cx="32" cy="65" rx="3.5" ry="3" fill="${ink}"/>
      <ellipse cx="31" cy="72" rx="3" ry="3" fill="${ink}"/>
      <ellipse cx="32" cy="79" rx="2.5" ry="2.5" fill="${ink}"/>
      <circle cx="33" cy="85" r="2" fill="${ink}"/>
      <!-- Right Braid -->
      <path d="M 67 60 C 69 64, 70 68, 68 72 C 66 76, 69 82, 67 86" stroke-linecap="round" fill="none"/>
      <ellipse cx="68" cy="65" rx="3.5" ry="3" fill="${ink}"/>
      <ellipse cx="69" cy="72" rx="3" ry="3" fill="${ink}"/>
      <ellipse cx="68" cy="79" rx="2.5" ry="2.5" fill="${ink}"/>
      <circle cx="67" cy="85" r="2" fill="${ink}"/>
    </g>`;
  } else if (hair === 'curly_halftone') {
    svg += `<g stroke="${ink}" stroke-width="${strokeW}" fill="url(#hair-halftone)">
      <path d="M 24 38
        C 18 34, 18 24, 26 20
        C 22 14, 32 8, 40 12
        C 44 6, 56 6, 60 12
        C 68 8, 78 14, 74 20
        C 82 24, 82 34, 76 38
        C 84 44, 82 54, 76 60
        C 74 66, 66 70, 60 66
        L 40 66
        C 34 70, 26 66, 24 60
        C 18 54, 16 44, 24 38 Z" stroke-linejoin="round"/>
    </g>`;
  } else if (hair === 'bun_top') {
    svg += `<circle cx="50" cy="14" r="11" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (hair === 'palm_ponytail') {
    // Palm tree high ponytail pointing up
    svg += `<path d="M 50 20 Q 40 8, 30 10 M 50 20 Q 50 4, 50 2 M 50 20 Q 60 8, 70 10" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <rect x="46" y="18" width="8" height="5" rx="2" fill="#F43F5E"/>`;
  } else if (hair === 'cowboy_hat') {
    svg += `<ellipse cx="50" cy="28" rx="36" ry="10" fill="#78350F" stroke="${ink}" stroke-width="${strokeW}"/>
      <path d="M 32 26 Q 50 10, 68 26 Z" fill="#92400E" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (hair === 'chef_hat') {
    svg += `<path d="M 32 28 C 24 20, 30 8, 40 10 C 44 4, 56 4, 60 10 C 70 8, 76 20, 68 28 Z" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>
      <rect x="32" y="26" width="36" height="8" rx="2" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>`;
  }

  // 2. HEAD / EARS / FACE CONTOUR
  // Left Ear
  svg += `<path d="M 28 48 C 22 46, 22 58, 28 56" fill="${hasStippleSkin ? 'url(#skin-halftone)' : skinFill}" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  // Right Ear
  svg += `<path d="M 72 48 C 78 46, 78 58, 72 56" fill="${hasStippleSkin ? 'url(#skin-halftone)' : skinFill}" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;

  // Chin & Face outline
  svg += `<path d="M 29 44 C 29 65, 40 76, 50 76 C 60 76, 71 65, 71 44" fill="${hasStippleSkin ? 'url(#skin-halftone)' : skinFill}" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;

  // 3. HAIR TOP & FOREHEAD TUFTS / HORNS / HATS
  if (hair === 'boba_braids_horns') {
    svg += `<path d="M 37 32 L 32 24 L 41 28 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}" stroke-linejoin="round"/>
      <path d="M 63 32 L 68 24 L 59 28 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}" stroke-linejoin="round"/>
      <path d="M 27 44 C 27 28, 73 28, 73 44 C 64 36, 58 46, 50 42 C 42 46, 36 36, 27 44 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (hair === 'curly_halftone') {
    svg += `<path d="M 29 42 C 37 34, 63 34, 71 42" fill="none" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  } else if (hair === 'cat_ears_hair') {
    svg += `<polygon points="26,38 34,16 46,32" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}" stroke-linejoin="round"/>
      <polygon points="74,38 66,16 54,32" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}" stroke-linejoin="round"/>
      <path d="M 28 44 C 36 36, 64 36, 72 44 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (hair === 'bear_ears_hair') {
    svg += `<circle cx="28" cy="28" r="11" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>
      <circle cx="72" cy="28" r="11" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>
      <path d="M 28 44 C 36 36, 64 36, 72 44 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (hair === 'devil_horns') {
    svg += `<path d="M 34 34 Q 28 14, 38 16 Q 36 26, 42 32 Z" fill="#DC2626" stroke="${ink}" stroke-width="${strokeW}"/>
      <path d="M 66 34 Q 72 14, 62 16 Q 64 26, 58 32 Z" fill="#DC2626" stroke="${ink}" stroke-width="${strokeW}"/>
      <path d="M 28 44 C 34 32, 66 32, 72 44 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (hair === 'split_hair_90s') {
    // Dan Truong 5/5 split curtain hair
    svg += `<path d="M 26 44 C 28 26, 48 26, 50 36 C 52 26, 72 26, 74 44 C 64 34, 52 38, 50 42 C 48 38, 36 34, 26 44 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (hair === 'short_crop') {
    svg += `<path d="M 26 44 C 26 24, 74 24, 74 44 C 64 34, 36 34, 26 44 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (hair === 'hardhat_safety' || hair === 'hardhat_mes') {
    svg += `<path d="M 22 40 Q 50 14 78 40 Z" fill="#EAB308" stroke="${ink}" stroke-width="${strokeW}"/>
      <rect x="18" y="38" width="64" height="6" rx="3" fill="#CA8A04" stroke="${ink}" stroke-width="2.5"/>
      <rect x="42" y="24" width="16" height="9" rx="2" fill="#FFFFFF" stroke="${ink}" stroke-width="2"/>
      <text x="44" y="31" font-size="6" font-weight="900" fill="#000">SKILL</text>`;
  } else if (hair === 'beret_artist') {
    svg += `<ellipse cx="48" cy="28" rx="28" ry="12" fill="${ink}" transform="rotate(-8 48 28)"/>
      <line x1="46" y1="16" x2="48" y2="12" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  } else if (hair === 'beanie_cozy') {
    svg += `<path d="M 26 38 C 26 18, 74 18, 74 38 Z" fill="${ink}" stroke="${ink}" stroke-width="${strokeW}"/>
      <rect x="22" y="36" width="56" height="6" rx="3" fill="#475569" stroke="${ink}" stroke-width="2.5"/>`;
  } else if (hair === 'bald_shiny') {
    svg += `<path d="M 36 30 Q 44 24, 52 26" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <line x1="64" y1="26" x2="68" y2="22" stroke="#EAB308" stroke-width="3" stroke-linecap="round"/>
      <line x1="68" y1="30" x2="74" y2="30" stroke="#EAB308" stroke-width="3" stroke-linecap="round"/>`;
  }

  // 4. EYEBROWS
  if (eyebrows === 'wavy') {
    svg += `<path d="M 33 42 Q 37 38, 41 42 T 47 42" fill="none" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>
      <path d="M 53 42 Q 57 38, 61 42 T 67 42" fill="none" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  } else if (eyebrows === 'unibrow') {
    svg += `<path d="M 33 42 Q 50 36, 67 42" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
  } else if (eyebrows === 'flat') {
    svg += `<line x1="34" y1="42" x2="46" y2="42" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>
      <line x1="54" y1="42" x2="66" y2="42" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  } else if (eyebrows === 'arched') {
    svg += `<path d="M 34 43 Q 40 37, 46 43" fill="none" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>
      <path d="M 54 43 Q 60 37, 66 43" fill="none" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  } else if (eyebrows === 'raised') {
    svg += `<line x1="34" y1="44" x2="46" y2="38" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>
      <line x1="54" y1="38" x2="66" y2="44" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  } else if (eyebrows === 'furrowed') {
    svg += `<line x1="34" y1="38" x2="46" y2="44" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>
      <line x1="54" y1="44" x2="66" y2="38" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  }

  // 5. EYES
  if (eyes === 'smug_sleepy') {
    svg += `<path d="M 33 48 Q 40 43, 47 48" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="40" cy="51" r="3.2" fill="${ink}"/>
      <path d="M 53 48 Q 60 43, 67 48" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <circle cx="60" cy="51" r="3.2" fill="${ink}"/>`;
  } else if (eyes === 'spiral') {
    svg += `<path d="M 39 50 A 2.5 2.5 0 0 1 36.5 47.5 A 4.5 4.5 0 0 1 42 46 A 6.5 6.5 0 0 1 42 53.5" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M 61 50 A 2.5 2.5 0 0 1 58.5 47.5 A 4.5 4.5 0 0 1 64 46 A 6.5 6.5 0 0 1 64 53.5" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>`;
  } else if (eyes === 'derp_cross') {
    svg += `<circle cx="36" cy="50" r="7" fill="#FFFFFF" stroke="${ink}" stroke-width="2.5"/>
      <circle cx="64" cy="50" r="7" fill="#FFFFFF" stroke="${ink}" stroke-width="2.5"/>
      <circle cx="39" cy="50" r="3.5" fill="${ink}"/>
      <circle cx="61" cy="50" r="3.5" fill="${ink}"/>`;
  } else if (eyes === 'knockout_xx') {
    svg += `<path d="M 35 46 L 43 54 M 43 46 L 35 54" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>
      <path d="M 57 46 L 65 54 M 65 46 L 57 54" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
  } else if (eyes === 'dots') {
    svg += `<circle cx="39" cy="50" r="4" fill="${ink}"/>
      <circle cx="61" cy="50" r="4" fill="${ink}"/>`;
  } else if (eyes === 'wink') {
    svg += `<circle cx="39" cy="50" r="4.5" fill="${ink}"/>
      <path d="M 55 50 Q 61 44, 67 50" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>`;
  } else if (eyes === 'happy_curve') {
    svg += `<path d="M 33 50 Q 39 44, 45 50" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>
      <path d="M 55 50 Q 61 44, 67 50" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>`;
  } else if (eyes === 'heart') {
    svg += `<path d="M 39 52 C 32 44, 37 36, 41 41 C 45 36, 50 44, 41 52 Z" fill="#E11D48"/>
      <path d="M 61 52 C 54 44, 59 36, 63 41 C 67 36, 72 44, 63 52 Z" fill="#E11D48"/>`;
  } else if (eyes === 'stars') {
    svg += `<polygon points="39,44 41,48 45,49 41,51 39,55 37,51 33,49 37,48" fill="${ink}"/>
      <polygon points="61,44 63,48 67,49 63,51 61,55 59,51 55,49 59,48" fill="${ink}"/>`;
  } else if (eyes === 'anime_sparkle') {
    svg += `<ellipse cx="39" cy="50" rx="5" ry="6" fill="${ink}"/>
      <circle cx="37" cy="48" r="2" fill="#FFFFFF"/>
      <circle cx="41" cy="52" r="1.2" fill="#FFFFFF"/>
      <ellipse cx="61" cy="50" rx="5" ry="6" fill="${ink}"/>
      <circle cx="59" cy="48" r="2" fill="#FFFFFF"/>
      <circle cx="63" cy="52" r="1.2" fill="#FFFFFF"/>`;
  } else if (eyes === 'sleepy_z') {
    svg += `<path d="M 33 50 Q 39 45, 45 50" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 55 50 Q 61 45, 67 50" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <text x="69" y="38" font-family="sans-serif" font-size="10" font-weight="900" fill="${ink}">z</text>
      <text x="75" y="30" font-family="sans-serif" font-size="13" font-weight="900" fill="${ink}">Z</text>`;
  } else if (eyes === 'side_glance') {
    svg += `<circle cx="43" cy="50" r="4.2" fill="${ink}"/>
      <circle cx="65" cy="50" r="4.2" fill="${ink}"/>`;
  }

  // 6. GLASSES
  if (glasses === 'square_spiral') {
    svg += `<rect x="29" y="45" width="20" height="15" rx="3" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>
      <rect x="53" y="45" width="20" height="15" rx="3" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>
      <line x1="49" y1="51" x2="53" y2="51" stroke="${ink}" stroke-width="${strokeW}"/>
      <line x1="29" y1="49" x2="25" y2="49" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>
      <line x1="73" y1="49" x2="77" y2="49" stroke="${ink}" stroke-width="${strokeW}" stroke-linecap="round"/>
      <path d="M 39 52 A 2 2 0 0 1 37 50 A 3.5 3.5 0 0 1 42 49 A 5 5 0 0 1 42 55" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 63 52 A 2 2 0 0 1 61 50 A 3.5 3.5 0 0 1 66 49 A 5 5 0 0 1 66 55" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (glasses === 'pixel_thug') {
    // 8-bit Thug Life pixel sunglasses
    svg += `<path d="M 26 46 H 48 V 56 H 43 V 54 H 31 V 56 H 26 Z M 52 46 H 74 V 56 H 69 V 54 H 57 V 56 H 52 Z M 48 48 H 52 V 51 H 48 Z" fill="${ink}"/>
      <rect x="29" y="48" width="4" height="2" fill="#FFFFFF"/>
      <rect x="55" y="48" width="4" height="2" fill="#FFFFFF"/>`;
  } else if (glasses === 'heart_shades') {
    svg += `<path d="M 38 45 C 31 38, 32 52, 38 56 C 44 52, 45 38, 38 45 Z" fill="#F43F5E" stroke="${ink}" stroke-width="2.5"/>
      <path d="M 62 45 C 55 38, 56 52, 62 56 C 68 52, 69 38, 62 45 Z" fill="#F43F5E" stroke="${ink}" stroke-width="2.5"/>
      <line x1="44" y1="47" x2="56" y2="47" stroke="${ink}" stroke-width="3"/>`;
  } else if (glasses === 'round_big') {
    svg += `<circle cx="38" cy="50" r="10.5" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>
      <circle cx="62" cy="50" r="10.5" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>
      <line x1="48.5" y1="50" x2="51.5" y2="50" stroke="${ink}" stroke-width="${strokeW}"/>
      <circle cx="38" cy="50" r="3.5" fill="${ink}"/>
      <circle cx="62" cy="50" r="3.5" fill="${ink}"/>`;
  } else if (glasses === 'cool_shades') {
    svg += `<path d="M 27 46 L 47 46 L 44 58 L 29 58 Z" fill="${ink}"/>
      <path d="M 53 46 L 73 46 L 71 58 L 56 58 Z" fill="${ink}"/>
      <line x1="47" y1="48" x2="53" y2="48" stroke="${ink}" stroke-width="${strokeW}"/>
      <line x1="31" y1="48" x2="41" y2="56" stroke="#FFFFFF" stroke-width="2" opacity="0.8"/>
      <line x1="57" y1="48" x2="67" y2="56" stroke="#FFFFFF" stroke-width="2" opacity="0.8"/>`;
  } else if (glasses === 'safety_goggles') {
    svg += `<rect x="25" y="44" width="50" height="15" rx="6" fill="#67E8F9" stroke="${ink}" stroke-width="${strokeW}" fill-opacity="0.5"/>
      <line x1="22" y1="50" x2="25" y2="50" stroke="${ink}" stroke-width="${strokeW}"/>
      <line x1="75" y1="50" x2="78" y2="50" stroke="${ink}" stroke-width="${strokeW}"/>`;
  } else if (glasses === 'monocle') {
    svg += `<circle cx="62" cy="50" r="9" fill="none" stroke="${ink}" stroke-width="3"/>
      <path d="M 71 50 L 75 64" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>`;
  }

  // 7. NOSE
  if (nose === 'corner_l') {
    svg += `<path d="M 50 51 L 48 59 L 52 59" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (nose === 'clown_red') {
    svg += `<circle cx="50" cy="56" r="5.5" fill="#EF4444" stroke="${ink}" stroke-width="2.5"/>
      <circle cx="48" cy="54" r="1.5" fill="#FFFFFF"/>`;
  } else if (nose === 'pig_snout') {
    svg += `<ellipse cx="50" cy="56" rx="6" ry="4" fill="#F472B6" stroke="${ink}" stroke-width="2.5"/>
      <circle cx="48" cy="56" r="1.3" fill="${ink}"/>
      <circle cx="52" cy="56" r="1.3" fill="${ink}"/>`;
  } else if (nose === 'cat_nose') {
    svg += `<polygon points="50,54 47,57 53,57" fill="${ink}"/>`;
  } else if (nose === 'button_dot') {
    svg += `<circle cx="50" cy="56" r="2.5" fill="${ink}"/>`;
  } else if (nose === 'hook_angle') {
    svg += `<path d="M 49 51 L 46 58 L 51 58" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>`;
  }

  // 8. MOUTH
  if (mouth === 'straw_sip') {
    svg += `<ellipse cx="50" cy="65" rx="3.5" ry="2.5" fill="${ink}"/>`;
  } else if (mouth === 'toast_bread') {
    // Biting a slice of toast
    svg += `<rect x="42" y="62" width="16" height="12" rx="2" fill="#FDE68A" stroke="${ink}" stroke-width="2.5"/>
      <rect x="44" y="64" width="12" height="8" rx="1" fill="#D97706" opacity="0.6"/>
      <path d="M 45 64 Q 50 67, 55 64" stroke="${ink}" stroke-width="3" fill="none"/>`;
  } else if (mouth === 'clover_stem') {
    // Chewing clover
    svg += `<path d="M 44 65 Q 50 69, 56 65" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>
      <path d="M 52 66 Q 60 70, 68 68" stroke="#10B981" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="68" cy="67" r="2" fill="#10B981"/>
      <circle cx="71" cy="69" r="2" fill="#10B981"/>`;
  } else if (mouth === 'grit_teeth') {
    svg += `<rect x="38" y="63" width="24" height="7" rx="3.5" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>
      <line x1="44" y1="63" x2="44" y2="70" stroke="${ink}" stroke-width="2"/>
      <line x1="50" y1="63" x2="50" y2="70" stroke="${ink}" stroke-width="2"/>
      <line x1="56" y1="63" x2="56" y2="70" stroke="${ink}" stroke-width="2"/>`;
  } else if (mouth === 'kiss_pout') {
    svg += `<path d="M 48 64 C 46 62, 46 67, 49 65 C 52 63, 53 66, 51 64" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'gentle_smile') {
    svg += `<path d="M 43 65 Q 50 70, 57 65" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'teeth_gap') {
    svg += `<path d="M 37 64 Q 50 78, 63 64 Z" fill="#BE123C" stroke="${ink}" stroke-width="3"/>
      <rect x="44" y="64" width="5.5" height="4.5" fill="#FFFFFF" rx="1"/>
      <rect x="50.5" y="64" width="5.5" height="4.5" fill="#FFFFFF" rx="1"/>`;
  } else if (mouth === 'tongue_out') {
    svg += `<path d="M 41 65 Q 50 70, 59 65" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>
      <path d="M 47 67 Q 50 78, 53 67 Z" fill="#F43F5E" stroke="${ink}" stroke-width="2"/>`;
  } else if (mouth === 'mustache_smirk') {
    svg += `<path d="M 38 63 Q 44 60, 50 64 Q 56 60, 62 63 Q 56 68, 50 65 Q 44 68, 38 63 Z" fill="${ink}"/>
      <path d="M 44 70 Q 50 74, 56 70" stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  } else if (mouth === 'open_gasp') {
    svg += `<ellipse cx="50" cy="67" rx="5.5" ry="7.5" fill="${ink}"/>`;
  } else if (mouth === 'bubble_gum') {
    svg += `<path d="M 43 66 Q 50 70, 57 66" stroke="${ink}" stroke-width="2.5" fill="none"/>
      <circle cx="56" cy="64" r="9" fill="#F472B6" stroke="${ink}" stroke-width="2.5"/>
      <circle cx="59" cy="61" r="2" fill="#FFFFFF"/>`;
  } else if (mouth === 'wavy_mouth') {
    svg += `<path d="M 42 66 Q 46 63, 50 66 T 58 66" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>`;
  }

  // 9. ACCESSORIES
  if (accessories === 'boba_tea') {
    // Tilted bubble tea cup with straw directly into mouth
    svg += `<g stroke="${ink}" stroke-width="${strokeW}">
      <line x1="50" y1="65" x2="33" y2="72" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
      <g transform="translate(18, 62) rotate(-35)">
        <rect x="0" y="0" width="16" height="22" rx="3" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>
        <line x1="2" y1="3" x2="14" y2="3" stroke="${ink}" stroke-width="2"/>
        <circle cx="4" cy="16" r="1.8" fill="${ink}"/>
        <circle cx="8" cy="18" r="1.8" fill="${ink}"/>
        <circle cx="12" cy="17" r="1.8" fill="${ink}"/>
        <circle cx="5" cy="12" r="1.8" fill="${ink}"/>
        <circle cx="10" cy="13" r="1.8" fill="${ink}"/>
        <circle cx="7" cy="8" r="1.6" fill="${ink}"/>
        <circle cx="11" cy="9" r="1.6" fill="${ink}"/>
        <circle cx="4" cy="7" r="1.5" fill="${ink}"/>
      </g>
    </g>`;
  } else if (accessories === 'gold_chain') {
    svg += `<path d="M 36 74 Q 50 86, 64 74" stroke="#F59E0B" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="3,1"/>
      <circle cx="50" cy="81" r="4.5" fill="#D97706" stroke="${ink}" stroke-width="2"/>`;
  } else if (accessories === 'red_bowtie') {
    svg += `<polygon points="43,74 50,77 43,80" fill="#EF4444" stroke="${ink}" stroke-width="1.5"/>
      <polygon points="57,74 50,77 57,80" fill="#EF4444" stroke="${ink}" stroke-width="1.5"/>
      <circle cx="50" cy="77" r="2.5" fill="#B91C1C"/>`;
  } else if (accessories === 'sweat_drop') {
    svg += `<path d="M 72 38 C 72 38, 76 43, 76 45 C 76 47, 74 49, 72 49 C 70 49, 68 47, 68 45 C 68 43, 72 38, 72 38 Z" fill="#38BDF8" stroke="${ink}" stroke-width="2"/>`;
  } else if (accessories === 'beauty_mole') {
    svg += `<circle cx="41" cy="62" r="1.8" fill="${ink}"/>`;
  } else if (accessories === 'coffee_cup') {
    svg += `<rect x="68" y="66" width="14" height="15" rx="3" fill="#FFFFFF" stroke="${ink}" stroke-width="${strokeW}"/>
      <path d="M 82 70 C 86 70, 86 77, 82 77" stroke="${ink}" stroke-width="2.5" fill="none"/>
      <line x1="72" y1="62" x2="72" y2="59" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="75" y1="62" x2="75" y2="58" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>`;
  } else if (accessories === 'headphones') {
    svg += `<path d="M 22 50 A 28 28 0 0 1 78 50" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>
      <rect x="16" y="44" width="9" height="16" rx="4" fill="${ink}"/>
      <rect x="75" y="44" width="9" height="16" rx="4" fill="${ink}"/>`;
  } else if (accessories === 'plant_sprout') {
    svg += `<path d="M 50 18 Q 50 9, 50 6" stroke="#10B981" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 50 6 Q 58 1, 56 8 Q 50 8, 50 6" fill="#10B981"/>
      <path d="M 50 8 Q 42 3, 44 10 Q 50 10, 50 8" fill="#10B981"/>`;
  } else if (accessories === 'blush_dots') {
    svg += `<circle cx="32" cy="58" r="4.5" fill="#FB7185" opacity="0.6"/>
      <circle cx="68" cy="58" r="4.5" fill="#FB7185" opacity="0.6"/>`;
  } else if (accessories === 'band_aid') {
    svg += `<rect x="42" y="55" width="16" height="5" rx="2" fill="#FED7AA" stroke="${ink}" stroke-width="1.5" transform="rotate(-10 50 57)"/>`;
  } else if (accessories === 'sparkle_stars') {
    svg += `<polygon points="76,26 78,31 83,33 78,35 76,40 74,35 69,33 74,31" fill="#FBBF24"/>
      <polygon points="22,32 23,35 26,36 23,37 22,40 21,37 18,36 21,35" fill="#FBBF24"/>`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Randomizes full configuration for playful variety.
 */
export function getRandomConfig() {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)].id;
  return {
    skin: pick(SKIN_TONES),
    eyes: pick(EYES_OPTIONS),
    eyebrows: pick(EYEBROWS_OPTIONS),
    glasses: pick(GLASSES_OPTIONS),
    nose: pick(NOSE_OPTIONS),
    mouth: pick(MOUTH_OPTIONS),
    hair: pick(HAIR_OPTIONS),
    accessories: pick(ACCESSORY_OPTIONS),
  };
}

/**
 * Converts configuration to lightweight Base64 JPEG data URI for PostgreSQL backend.
 */
export async function configToJpegBase64(config, size = 128) {
  const svg = renderAvatarSvg(config);
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(base64);
      };
      img.onerror = err => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}
