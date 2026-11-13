/**
 * Predefined System Avatars for SkillHub Learning & Assessment Platform.
 * All avatars are local SVG vectors (0ms network latency, 100% offline),
 * and convert to compact 128x128 JPEG Base64 (~3KB-5KB) when chosen,
 * fully compatible with Go backend validation (<= 45,000 bytes JPEG/PNG).
 */

export const SYSTEM_AVATARS = [
  // 1. PHONG CÁCH CHÂN DUNG TỐI GIẢN (Black & White Minimalist Line Art)
  {
    id: 'ink-glasses-gentle',
    name: 'Kính tròn tri thức',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>
      <path d="M26 36 C22 18 42 16 50 18 C62 14 78 20 74 36 C70 30 58 26 50 28 C40 28 32 30 26 36 Z" fill="#0F172A"/>
      <circle cx="37" cy="48" r="11" fill="#FFFFFF" stroke="#0F172A" stroke-width="3.5"/>
      <circle cx="63" cy="48" r="11" fill="#FFFFFF" stroke="#0F172A" stroke-width="3.5"/>
      <line x1="48" y1="48" x2="52" y2="48" stroke="#0F172A" stroke-width="3.5"/>
      <circle cx="37" cy="48" r="3.5" fill="#0F172A"/>
      <circle cx="63" cy="48" r="3.5" fill="#0F172A"/>
      <path d="M50 52 L47 60 L52 60" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M40 70 Q50 77 60 70" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'ink-quirky-wink',
    name: 'Lém lỉnh vui vẻ',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <path d="M22 38 C26 16 66 12 76 28 C64 24 46 22 34 32 C30 36 26 38 22 38 Z" fill="#0F172A"/>
      <circle cx="62" cy="46" r="4.5" fill="#0F172A"/>
      <path d="M30 46 Q38 40 46 46" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M58 36 Q64 32 70 36" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M50 48 L46 58 L52 58" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M42 70 Q52 74 62 66" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'ink-headphones',
    name: 'Tai nghe chill',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>
      <path d="M20 50 A30 30 0 0 1 80 50" fill="none" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>
      <rect x="14" y="44" width="10" height="18" rx="5" fill="#0F172A"/>
      <rect x="76" y="44" width="10" height="18" rx="5" fill="#0F172A"/>
      <path d="M36 28 C44 20 56 20 64 28 C56 25 44 25 36 28 Z" fill="#0F172A"/>
      <path d="M32 48 Q38 42 44 48" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M56 48 Q62 42 68 48" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M50 52 L47 58 L52 58" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M42 68 Q50 74 58 68" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'ink-curly-hair',
    name: 'Tóc xoăn cá tính',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <circle cx="30" cy="28" r="14" fill="#0F172A"/>
      <circle cx="50" cy="22" r="14" fill="#0F172A"/>
      <circle cx="70" cy="28" r="14" fill="#0F172A"/>
      <circle cx="20" cy="42" r="12" fill="#0F172A"/>
      <circle cx="80" cy="42" r="12" fill="#0F172A"/>
      <circle cx="38" cy="48" r="4.5" fill="#0F172A"/>
      <circle cx="62" cy="48" r="4.5" fill="#0F172A"/>
      <path d="M50 52 L47 60 L52 60" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M38 68 Q50 80 62 68 Z" fill="#0F172A"/>
      <path d="M42 68 Q50 72 58 68" stroke="#FFFFFF" stroke-width="2.5" fill="none"/>
    </svg>`,
  },
  {
    id: 'ink-beret-cap',
    name: 'Mũ nồi họa sĩ',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>
      <ellipse cx="48" cy="28" rx="28" ry="12" fill="#0F172A" transform="rotate(-8 48 28)"/>
      <line x1="46" y1="16" x2="48" y2="12" stroke="#0F172A" stroke-width="3" stroke-linecap="round"/>
      <rect x="28" y="42" width="18" height="14" rx="2" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <rect x="54" y="42" width="18" height="14" rx="2" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <line x1="46" y1="48" x2="54" y2="48" stroke="#0F172A" stroke-width="3"/>
      <circle cx="37" cy="49" r="3.5" fill="#0F172A"/>
      <circle cx="63" cy="49" r="3.5" fill="#0F172A"/>
      <path d="M50 58 L48 64 L53 64" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M42 72 Q50 78 58 72" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'ink-bun-earrings',
    name: 'Búi tóc khuyên tai',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <circle cx="50" cy="16" r="11" fill="#0F172A"/>
      <path d="M26 36 C24 22 76 22 74 36 Z" fill="#0F172A"/>
      <circle cx="24" cy="56" r="6" fill="none" stroke="#0F172A" stroke-width="2.5"/>
      <circle cx="76" cy="56" r="6" fill="none" stroke="#0F172A" stroke-width="2.5"/>
      <circle cx="38" cy="46" r="4" fill="#0F172A"/>
      <line x1="33" y1="42" x2="30" y2="39" stroke="#0F172A" stroke-width="2.5"/>
      <circle cx="62" cy="46" r="4" fill="#0F172A"/>
      <line x1="67" y1="42" x2="70" y2="39" stroke="#0F172A" stroke-width="2.5"/>
      <path d="M50 50 L48 56 L52 56" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M40 66 Q50 76 60 66" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'ink-plant-sprout',
    name: 'Mầm cây tích cực',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>
      <path d="M50 24 Q50 14 50 12" stroke="#10B981" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M50 12 Q58 6 56 14 Q50 14 50 12" fill="#10B981"/>
      <path d="M50 14 Q42 8 44 16 Q50 16 50 14" fill="#10B981"/>
      <path d="M26 36 C34 26 66 26 74 36 Z" fill="#0F172A"/>
      <circle cx="38" cy="48" r="4.5" fill="#0F172A"/>
      <circle cx="62" cy="48" r="4.5" fill="#0F172A"/>
      <path d="M50 52 L48 58 L52 58" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M42 66 Q50 76 58 66 Z" fill="#0F172A"/>
    </svg>`,
  },
  {
    id: 'ink-coffee-chill',
    name: 'Mũ len thư thái',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <path d="M26 34 C26 16 74 16 74 34 Z" fill="#0F172A"/>
      <rect x="22" y="32" width="56" height="6" rx="3" fill="#334155"/>
      <circle cx="38" cy="48" r="4" fill="#0F172A"/>
      <circle cx="62" cy="48" r="4" fill="#0F172A"/>
      <line x1="32" y1="42" x2="44" y2="42" stroke="#0F172A" stroke-width="2.5"/>
      <line x1="56" y1="42" x2="68" y2="42" stroke="#0F172A" stroke-width="2.5"/>
      <path d="M50 52 L48 58 L52 58" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M40 68 Q50 74 60 68" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'ink-mustache-gentleman',
    name: 'Quý ông ria mép',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <path d="M26 32 C34 16 66 16 74 32 C66 26 50 24 26 32 Z" fill="#0F172A"/>
      <circle cx="36" cy="46" r="4" fill="#0F172A"/>
      <circle cx="64" cy="46" r="10" fill="none" stroke="#0F172A" stroke-width="2.5"/>
      <circle cx="64" cy="46" r="4" fill="#0F172A"/>
      <path d="M74 46 L78 62" stroke="#0F172A" stroke-width="2" stroke-linecap="round"/>
      <path d="M50 50 L48 56 L52 56" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M36 65 Q44 60 50 66 Q56 60 64 65 Q58 72 50 68 Q42 72 36 65 Z" fill="#0F172A"/>
    </svg>`,
  },
  {
    id: 'ink-sleepy-yawn',
    name: 'Ngái ngủ ca sáng',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>
      <path d="M28 36 C32 18 50 20 54 18 C62 14 74 24 72 36 Z" fill="#0F172A"/>
      <path d="M30 46 Q38 40 46 46" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M54 46 Q62 40 70 46" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="66" rx="8" ry="12" fill="#0F172A"/>
      <text x="68" y="32" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0F172A">z</text>
      <text x="76" y="24" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0F172A">Z</text>
    </svg>`,
  },
  {
    id: 'ink-detective',
    name: 'Thám tử tò mò',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>
      <ellipse cx="50" cy="30" rx="34" ry="10" fill="#0F172A"/>
      <path d="M30 30 Q50 14 70 30 Z" fill="#0F172A"/>
      <circle cx="38" cy="48" r="5" fill="#0F172A"/>
      <circle cx="62" cy="48" r="5" fill="#0F172A"/>
      <path d="M32 40 Q40 36 44 40" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M56 40 Q60 36 68 40" stroke="#0F172A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M50 52 L47 58 L52 58" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M42 68 Q50 72 58 66" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'ink-dizzy-spiral',
    name: 'Xoay mòng mòng',
    category: 'Chân dung tối giản',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>
      <path d="M26 34 C30 18 70 18 74 34 Z" fill="#0F172A"/>
      <path d="M38 48 A4 4 0 0 1 34 44 A6 6 0 0 1 42 42 A8 8 0 0 1 42 52" fill="none" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M62 48 A4 4 0 0 1 58 44 A6 6 0 0 1 66 42 A8 8 0 0 1 66 52" fill="none" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M50 52 L48 58 L52 58" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M38 68 Q44 64 50 68 Q56 72 62 68" stroke="#0F172A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },

  // 2. BIỂU CẢM HÀI HƯỚC & VUI NHỘN
  {
    id: 'silly-wink',
    name: 'Tấu hài thè lưỡi',
    category: 'Biểu cảm hài',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FCD34D"/>
      <circle cx="34" cy="38" r="6" fill="#1E293B"/>
      <path d="M60 40 Q68 34 74 40" stroke="#1E293B" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M32 54 Q50 68 68 54" stroke="#1E293B" stroke-width="4" fill="#FFFFFF"/>
      <path d="M42 60 Q50 82 58 60 Z" fill="#F43F5E" stroke="#1E293B" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'big-smile-teeth',
    name: 'Cười hở răng sún',
    category: 'Biểu cảm hài',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FDE047"/>
      <path d="M28 40 Q36 30 44 40" stroke="#1E293B" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M56 40 Q64 30 72 40" stroke="#1E293B" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M24 52 Q50 86 76 52 Z" fill="#BE123C" stroke="#1E293B" stroke-width="4"/>
      <rect x="34" y="52" width="12" height="10" fill="#FFFFFF" rx="2" stroke="#1E293B" stroke-width="1.5"/>
      <rect x="54" y="52" width="12" height="10" fill="#FFFFFF" rx="2" stroke="#1E293B" stroke-width="1.5"/>
      <circle cx="20" cy="50" r="5" fill="#F43F5E" opacity="0.6"/>
      <circle cx="80" cy="50" r="5" fill="#F43F5E" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'cool-sunglasses',
    name: 'Cực ngầu kính đen',
    category: 'Cá tính',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F59E0B"/>
      <path d="M18 42 L48 42 L44 58 L22 58 Z" fill="#0F172A"/>
      <path d="M52 42 L82 42 L78 58 L56 58 Z" fill="#0F172A"/>
      <rect x="46" y="44" width="8" height="4" fill="#0F172A"/>
      <line x1="22" y1="45" x2="36" y2="55" stroke="#FFFFFF" stroke-width="2" opacity="0.6"/>
      <line x1="56" y1="45" x2="70" y2="55" stroke="#FFFFFF" stroke-width="2" opacity="0.6"/>
      <path d="M34 68 Q50 80 66 68" stroke="#1E293B" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'heart-eyes-love',
    name: 'Mắt hình trái tim',
    category: 'Biểu cảm hài',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FBBF24"/>
      <path d="M34 46 C24 34 32 24 38 30 C44 24 52 34 38 46 Z" fill="#E11D48"/>
      <path d="M62 46 C52 34 60 24 66 30 C72 24 80 34 66 46 Z" fill="#E11D48"/>
      <path d="M32 58 Q50 82 68 58" fill="#EF4444" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M35 58 Q50 66 65 58" fill="#FFFFFF"/>
    </svg>`,
  },
  {
    id: 'mind-blown-wow',
    name: 'Mắt tròn ngơ ngác',
    category: 'Biểu cảm hài',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FED7AA"/>
      <circle cx="34" cy="42" r="14" fill="#FFFFFF" stroke="#1E293B" stroke-width="3.5"/>
      <circle cx="66" cy="42" r="14" fill="#FFFFFF" stroke="#1E293B" stroke-width="3.5"/>
      <circle cx="34" cy="42" r="6" fill="#1E293B"/>
      <circle cx="66" cy="42" r="6" fill="#1E293B"/>
      <ellipse cx="50" cy="72" rx="9" ry="12" fill="#1E293B"/>
    </svg>`,
  },
  {
    id: 'coffee-lover',
    name: 'Cốc cà phê ca sáng',
    category: 'Biểu cảm hài',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#DDD6FE"/>
      <rect x="30" y="36" width="40" height="36" rx="6" fill="#8B5CF6"/>
      <path d="M70 42 C78 42 78 58 70 58" fill="none" stroke="#8B5CF6" stroke-width="5" stroke-linecap="round"/>
      <circle cx="42" cy="52" r="3.5" fill="#FFFFFF"/>
      <circle cx="58" cy="52" r="3.5" fill="#FFFFFF"/>
      <path d="M46 60 Q50 66 54 60" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M38 28 Q42 22 38 18" stroke="#A78BFA" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M50 28 Q54 22 50 18" stroke="#A78BFA" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },

  // 3. ROBOT THÔNG MINH (BOTTTS)
  {
    id: 'robot-gizmo',
    name: 'Robot ngố Gizmo',
    category: 'Robot thông minh',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#E2E8F0"/>
      <line x1="50" y1="16" x2="50" y2="28" stroke="#475569" stroke-width="4"/>
      <circle cx="50" cy="14" r="5" fill="#EF4444"/>
      <rect x="18" y="44" width="8" height="12" rx="2" fill="#64748B"/>
      <rect x="74" y="44" width="8" height="12" rx="2" fill="#64748B"/>
      <rect x="24" y="28" width="52" height="46" rx="8" fill="#0284C7"/>
      <rect x="30" y="36" width="40" height="16" rx="4" fill="#0F172A"/>
      <circle cx="40" cy="44" r="4" fill="#38BDF8"/>
      <circle cx="60" cy="44" r="4" fill="#38BDF8"/>
      <line x1="36" y1="62" x2="64" y2="62" stroke="#BAE6FD" stroke-width="3" stroke-dasharray="4,3"/>
    </svg>`,
  },
  {
    id: 'robot-bleep',
    name: 'Robot ngơ Bleep',
    category: 'Robot thông minh',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F1F5F9"/>
      <line x1="36" y1="16" x2="42" y2="28" stroke="#64748B" stroke-width="3.5"/>
      <circle cx="35" cy="14" r="4" fill="#F59E0B"/>
      <line x1="64" y1="16" x2="58" y2="28" stroke="#64748B" stroke-width="3.5"/>
      <circle cx="65" cy="14" r="4" fill="#F59E0B"/>
      <rect x="24" y="28" width="52" height="46" rx="10" fill="#EAB308"/>
      <circle cx="50" cy="46" r="14" fill="#0F172A" stroke="#CA8A04" stroke-width="2"/>
      <circle cx="50" cy="46" r="8" fill="#10B981"/>
      <circle cx="53" cy="43" r="2.5" fill="#FFFFFF"/>
      <circle cx="40" cy="64" r="2" fill="#713F12"/>
      <circle cx="50" cy="64" r="2" fill="#713F12"/>
      <circle cx="60" cy="64" r="2" fill="#713F12"/>
    </svg>`,
  },

  // 4. KỸ THUẬT & KHẢO THÍ
  {
    id: 'engineer-hard-hat',
    name: 'Kỹ sư mũ vàng',
    category: 'Kỹ thuật',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FED7AA"/>
      <path d="M22 36 Q50 14 78 36 Z" fill="#EAB308"/>
      <rect x="18" y="34" width="64" height="6" rx="3" fill="#CA8A04"/>
      <circle cx="36" cy="52" r="4.5" fill="#1E293B"/>
      <circle cx="64" cy="52" r="4.5" fill="#1E293B"/>
      <path d="M38 66 Q50 78 62 66" stroke="#1E293B" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'star-champion',
    name: 'Ngôi sao Goldsun',
    category: 'Cá tính',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#059669"/>
      <polygon points="50,15 59,38 84,38 64,52 71,76 50,62 29,76 36,52 16,38 41,38" fill="#FCD34D" stroke="#D97706" stroke-width="2"/>
      <circle cx="44" cy="46" r="3" fill="#1E293B"/>
      <circle cx="56" cy="46" r="3" fill="#1E293B"/>
      <path d="M45 53 Q50 58 55 53" stroke="#1E293B" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
  },

  // 5. ĐỘNG VẬT DỄ THƯƠNG
  {
    id: 'cat-meow',
    name: 'Mèo lém lỉnh',
    category: 'Động vật',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FDA4AF"/>
      <polygon points="20,34 32,12 44,30" fill="#E11D48"/>
      <polygon points="80,34 68,12 56,30" fill="#E11D48"/>
      <circle cx="50" cy="52" r="34" fill="#FFF1F2"/>
      <ellipse cx="38" cy="48" rx="4" ry="6" fill="#1E293B"/>
      <ellipse cx="62" cy="48" rx="4" ry="6" fill="#1E293B"/>
      <polygon points="50,56 46,60 54,60" fill="#FB7185"/>
      <path d="M44 62 Q50 66 50 60 Q50 66 56 62" stroke="#1E293B" stroke-width="2" fill="none"/>
      <line x1="22" y1="56" x2="34" y2="58" stroke="#94A3B8" stroke-width="2"/>
      <line x1="78" y1="56" x2="66" y2="58" stroke="#94A3B8" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'dog-husky',
    name: 'Cún husky năng động',
    category: 'Động vật',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#CBD5E1"/>
      <polygon points="18,36 28,10 44,28" fill="#334155"/>
      <polygon points="82,36 72,10 56,28" fill="#334155"/>
      <ellipse cx="50" cy="64" rx="18" ry="14" fill="#FFFFFF"/>
      <ellipse cx="50" cy="58" rx="8" ry="5" fill="#0F172A"/>
      <path d="M46 68 Q50 80 54 68 Z" fill="#F43F5E"/>
      <circle cx="36" cy="46" r="4.5" fill="#0284C7"/>
      <circle cx="64" cy="46" r="4.5" fill="#0284C7"/>
    </svg>`,
  },
  {
    id: 'frog-pepe',
    name: 'Chú ếch vui vẻ',
    category: 'Động vật',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#86EFAC"/>
      <circle cx="32" cy="28" r="14" fill="#22C55E"/>
      <circle cx="32" cy="28" r="8" fill="#FFFFFF"/>
      <circle cx="34" cy="28" r="4" fill="#0F172A"/>
      <circle cx="68" cy="28" r="14" fill="#22C55E"/>
      <circle cx="68" cy="28" r="8" fill="#FFFFFF"/>
      <circle cx="66" cy="28" r="4" fill="#0F172A"/>
      <ellipse cx="50" cy="56" rx="38" ry="26" fill="#4ADE80"/>
      <path d="M26 56 Q50 80 74 56" stroke="#166534" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="24" cy="54" r="5" fill="#F472B6" opacity="0.6"/>
      <circle cx="76" cy="54" r="5" fill="#F472B6" opacity="0.6"/>
    </svg>`,
  },
];

/**
 * Converts an SVG string into a lightweight JPEG Base64 data URI (128x128 px, ~3.5KB).
 * Fully compliant with Go backend avatar validation (JPEG/PNG, <= 45,000 bytes).
 */
export async function svgToJpegBase64(svgString, size = 128) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        // Clean white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(base64);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}
