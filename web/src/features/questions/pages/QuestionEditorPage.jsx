import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useBlocker } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import Modal from '../../../shared/ui/Modal';
import { useToast } from '../../../shared/hooks/useToast';
import { formatDate } from '../../../shared/lib/formatters';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Folder,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Save,
  Send,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  Maximize2,
  Eye,
  Check,
  FileText,
  MonitorPlay,
} from 'lucide-react';
import useQuestionCatalogs from '../hooks/useQuestionCatalogs';
import { questionsApi } from '../services/questions.api';
import InteractiveHmiSimulation from '../components/InteractiveHmiSimulation';
import { useAuth } from '../../../shared/hooks/useAuth';

const initial = {
  folderId: '',
  levelId: '',
  formatId: '',
  specialtyId: '',
  topicId: '',
  targetGroupId: '',
  cognitiveLevelId: '',
  content: '',
  imageUrl: '',
  explanation: '',
  type: 'single_choice',
  isCritical: false,
  criticalReason: '',
  simulationType: 'dispatch',
  simulationId: '',
  options: Array.from({ length: 4 }, (_, i) => ({ id: String(i + 1), text: '', isCorrect: i === 0 })),
  rubrics: [
    { id: '1', title: 'Nội dung cốt lõi & Tính chính xác', maxScore: 5, description: '' },
    { id: '2', title: 'Quy trình thực tế & Biện pháp an toàn', maxScore: 5, description: '' },
  ],
  RowVersion: '',
  status: 'draft',
};

export const questionFields = [
  ['levelId', 'level', 'Cấp độ (ISA-95 Level)', 'Cấp độ'],
  ['formatId', 'question_format', 'Định dạng chuyên môn', 'Định dạng'],
  ['specialtyId', 'specialty', 'Chuyên môn', 'Chuyên môn'],
  ['topicId', 'question_topic', 'Chủ đề liên kết', 'Chủ đề'],
  ['targetGroupId', 'target_group', 'Nhóm đối tượng áp dụng', 'Đối tượng'],
  ['cognitiveLevelId', 'cognitive_level', 'Mức độ nhận thức', 'Nhận thức'],
];

export default function QuestionEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { addToast } = useToast();
  const catalogs = useQuestionCatalogs();
  const { hasPermission } = useAuth();
  const canApprove = hasPermission('questions:approve');

  const fileInputRef = useRef(null);
  const originalFormRef = useRef(null);
  const [folders, setFolders] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [form, setForm] = useState(() => ({ ...initial, folderId: params.get('folderId') || '' }));
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [optionsViewMode, setOptionsViewMode] = useState('edit'); // 'edit' | 'overview'
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const filledAttrsCount = questionFields.filter(([field]) => Boolean(form[field])).length;

  // Load folders
  useEffect(() => {
    questionsApi.getQuestionFolders()
      .then(({ data }) => setFolders(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const loadSimulations = () => questionsApi.getQuestionSimulations()
      .then(({ data }) => { if (active) setSimulations(data || []); })
      .catch(() => {});
    loadSimulations();
    window.addEventListener('focus', loadSimulations);
    return () => {
      active = false;
      window.removeEventListener('focus', loadSimulations);
    };
  }, []);

  // Load question or handle prefilled folder
  useEffect(() => {
    if (id) {
      let active = true;
      questionsApi.getQuestion(id).then(({ data }) => {
        if (active) {
          const loaded = {
            ...initial,
            ...data,
            imageUrl: data.imageUrl || '',
            rubrics: data.rubrics?.length ? data.rubrics : initial.rubrics,
          };
          setForm(loaded);
          originalFormRef.current = JSON.stringify(loaded);
        }
      })
      .catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }

    const folderId = params.get('folderId');
    if (folderId) {
      questionsApi.getQuestionFolders().then(({ data }) => {
        const folder = (data || []).find(f => f.id === folderId);
        const prefilled = {
          ...initial,
          folderId,
          levelId: folder?.levelId || '',
        };
        setForm(prefilled);
        originalFormRef.current = JSON.stringify(prefilled);
      }).catch(() => {
        originalFormRef.current = JSON.stringify(initial);
      });
    } else {
      originalFormRef.current = JSON.stringify(initial);
    }
  }, [id, params]);

  // Track unsaved modifications (dirty state)
  const isDirty = useMemo(() => {
    if (loading || !originalFormRef.current) return false;
    return JSON.stringify(form) !== originalFormRef.current;
  }, [form, loading]);

  // React Router Navigation blocker when form is dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !saving && currentLocation.pathname !== nextLocation.pathname
  );

  // Browser reload / tab close protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saving]);

  const update = patch => setForm(previous => ({ ...previous, ...patch }));

  const handleFolderChange = folderId => {
    const selectedFolder = folders.find(f => f.id === folderId);
    if (selectedFolder && selectedFolder.levelId) {
      const folderLevel = (catalogs.data.level?.options || []).find(o => o.id === selectedFolder.levelId);
      if (folderLevel && folderLevel.value !== 'All') {
        update({ folderId, levelId: selectedFolder.levelId });
      } else {
        update({ folderId });
      }
    } else {
      update({ folderId });
    }
  };

  const compressImage = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.85) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.onerror = () => resolve(ev.target.result);
        img.src = ev.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError('Kích thước ảnh tối đa là 15MB.');
      addToast('Kích thước ảnh tối đa là 15MB.', 'warning');
      return;
    }
    try {
      const optimizedDataUrl = await compressImage(file, 1280, 1280, 0.85);
      update({ imageUrl: optimizedDataUrl });
      setImgError(false);
      setError('');
    } catch {
      setError('Không thể xử lý hình ảnh này. Vui lòng thử ảnh khác.');
    }
  };

  const format = catalogs.data.question_format?.options.find(option => option.id === form.formatId)?.value;
  const isSimulationQuestion = format === 'simulation_hmi';
  const selectedSimulation = simulations.find(simulation => simulation.id === form.simulationId);
  const currentFolder = folders.find(f => f.id === form.folderId);
  const currentFolderName = currentFolder?.name;
  const levelLabel = catalogs.data.level?.options.find(o => o.id === form.levelId)?.label || 'Chưa chọn cấp độ';

  const save = async status => {
    setError('');

    // 1. Kiểm tra 6 thuộc tính phân loại bắt buộc
    const missingAttributes = questionFields
      .map(([field, key, label, shortName], idx) => ({ field, label, shortName, index: idx + 1, value: form[field] }))
      .filter(item => !item.value);

    if (missingAttributes.length > 0) {
      const names = missingAttributes.map(m => m.shortName || m.label).join(', ');
      const msg = `Vui lòng chọn đầy đủ 6 thuộc tính phân loại bắt buộc (${names}).`;
      setError(msg);
      addToast(msg, 'warning');
      const firstMissingEl = document.getElementById(`field-${missingAttributes[0].field}`);
      if (firstMissingEl) {
        firstMissingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 2. Kiểm tra nội dung đề bài
    if (!form.content?.trim()) {
      const msg = 'Vui lòng nhập nội dung đề bài câu hỏi / tình huống sản xuất.';
      setError(msg);
      addToast(msg, 'warning');
      const contentEl = document.getElementById('field-question-content');
      if (contentEl) {
        contentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (format === 'simulation_hmi' && !form.simulationId) {
      const msg = 'Chọn màn hình mô phỏng đã đăng ký hoặc đăng ký màn hình mới trước khi lưu.';
      setError(msg);
      addToast(msg, 'warning');
      return;
    }

    // 3. Kiểm tra lý do điểm liệt nếu có
    if (form.isCritical && !form.criticalReason?.trim()) {
      const msg = 'Vui lòng nhập lý do đánh điểm liệt.';
      setError(msg);
      addToast(msg, 'warning');
      const criticalEl = document.getElementById('field-critical-reason');
      if (criticalEl) {
        criticalEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 4. Kiểm tra phương án trả lời (trắc nghiệm) hoặc barem (tự luận)
    if (!isSimulationQuestion && form.type === 'single_choice') {
      const emptyOptIndex = form.options.findIndex(opt => !opt.text?.trim());
      if (emptyOptIndex !== -1) {
        const letter = String.fromCharCode(65 + emptyOptIndex);
        const msg = `Vui lòng nhập nội dung cho phương án ${letter}.`;
        setError(msg);
        addToast(msg, 'warning');
        return;
      }
      if (!form.options.some(opt => opt.isCorrect)) {
        const msg = 'Vui lòng chọn 1 phương án làm đáp án đúng.';
        setError(msg);
        addToast(msg, 'warning');
        return;
      }
    } else if (!isSimulationQuestion && form.type === 'essay') {
      if (form.rubrics.some(r => !r.title?.trim())) {
        const msg = 'Vui lòng nhập tên cho tất cả các tiêu chí chấm điểm tự luận.';
        setError(msg);
        addToast(msg, 'warning');
        return;
      }
      if (form.rubrics.some(r => !r.maxScore || r.maxScore <= 0)) {
        const msg = 'Điểm tối đa của mỗi tiêu chí tự luận phải lớn hơn 0.';
        setError(msg);
        addToast(msg, 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = Object.fromEntries([
        ...questionFields.map(([field]) => [field, form[field]]),
        ...['folderId', 'content', 'imageUrl', 'explanation', 'type', 'isCritical', 'criticalReason', 'simulationType', 'options', 'rubrics', 'version', 'RowVersion'].map(field => [field, form[field]]),
        ['simulationId', format === 'simulation_hmi' ? form.simulationId : ''],
      ]);
      if (isSimulationQuestion) {
        payload.type = 'single_choice';
        payload.options = [{ id: 'simulation-complete', text: 'Hoàn thành đúng thao tác mô phỏng', isCorrect: true }];
        payload.rubrics = [];
      }
      await questionsApi.saveQuestion({ ...payload, ...(id ? { id } : {}), status });
      originalFormRef.current = JSON.stringify(form);
      addToast(
        status === 'published' ? 'Đã xuất bản câu hỏi thành công!' : status === 'pending_review' ? 'Đã gửi câu hỏi chờ phê duyệt.' : 'Đã lưu bản nháp câu hỏi.',
        'success'
      );
      navigate('/manage/questions');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  const totalEssayScore = form.rubrics.reduce((sum, r) => sum + (Number(r.maxScore) || 0), 0);

  return (
    <ManagementFrame
      className="management-screen"
      header={
        <div className="flex flex-wrap items-center justify-between w-full gap-2 py-1">
          {/* Left: Compact Breadcrumbs + Title & Badges in one single row/tight stack */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => navigate('/manage/questions')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                Ngân hàng câu hỏi
              </button>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              {currentFolderName && (
                <>
                  <span className="truncate max-w-44 text-slate-500 dark:text-slate-400">{currentFolderName}</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                </>
              )}
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Chi tiết câu hỏi
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {form.content ? (
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-lg">
                  {form.content.slice(0, 75) + (form.content.length > 75 ? '…' : '')}
                </h1>
              ) : null}

              {/* Status Indicators: Clean static colored text without background or borders */}
              {form.content && <span className="text-slate-300 dark:text-slate-600 select-none">•</span>}

              {form.status === 'published' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={12} /> Đã xuất bản
                </span>
              ) : form.status === 'pending_review' ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <Clock size={12} /> Chờ duyệt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Bản nháp
                </span>
              )}

              {form.isCritical && (
                <>
                  <span className="text-slate-300 dark:text-slate-600 select-none">•</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={12} /> Điểm liệt
                  </span>
                </>
              )}

              {levelLabel && (
                <>
                  <span className="text-slate-300 dark:text-slate-600 select-none">•</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <Layers size={12} /> {levelLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Sleek Action Buttons Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              icon={Eye}
              disabled={saving}
              onClick={() => setPreviewModalOpen(true)}
              className="!h-7.5 !text-xs !px-2.5 text-slate-700 dark:text-slate-200"
              title="Xem trước toàn bộ câu hỏi và các phương án trả lời"
            >
              Xem trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={ArrowLeft}
              disabled={saving}
              onClick={() => navigate('/manage/questions')}
              className="!h-7.5 !text-xs !px-2.5"
            >
              Quay lại
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={Save}
              loading={saving}
              disabled={saving}
              onClick={() => save('draft')}
              className="!h-7.5 !text-xs !px-2.5"
            >
              Lưu nháp
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={Send}
              loading={saving}
              disabled={saving}
              onClick={() => save('pending_review')}
              className="!h-7.5 !text-xs !px-2.5"
            >
              Gửi duyệt
            </Button>
            {canApprove && (
              <Button
                size="sm"
                icon={Sparkles}
                loading={saving}
                disabled={saving}
                onClick={() => save('published')}
                className="!h-7.5 !text-xs !px-2.5 !bg-emerald-600 hover:!bg-emerald-700 !text-white"
              >
                Xuất bản
              </Button>
            )}
          </div>
        </div>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{id ? 'Chế độ chỉnh sửa câu hỏi' : 'Chế độ tạo câu hỏi mới'}</span>
            {currentFolderName && (
              <span>• Thư mục: <strong className="text-emerald-700 dark:text-emerald-400">{currentFolderName}</strong></span>
            )}
            {form.updatedAt && (
              <span>• Cập nhật ngày {formatDate(form.updatedAt)}</span>
            )}
          </div>
          {isDirty && (
            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Có thay đổi chưa lưu
            </span>
          )}
        </div>
      }
    >
      <div className="management-body-scroll bg-white dark:bg-slate-950">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-4">
          {/* Alert Message - sleek, compact, enterprise styling */}
          {(error || catalogs.error) && (
            <div role="alert" className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md border border-amber-200 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400" size={15} />
                <span className="truncate leading-relaxed">{error || catalogs.error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-amber-600 hover:text-amber-900 dark:hover:text-amber-100 p-0.5 text-xs font-bold shrink-0"
                title="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          )}

          {loading || catalogs.loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500" role="status">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="text-xs font-medium">Đang tải dữ liệu câu hỏi…</p>
            </div>
          ) : (
            /* 2-COLUMN FULL-WIDTH DETAIL LAYOUT */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 items-start">

              {/* LEFT COLUMN: BASIC ATTRIBUTES, QUESTION CONTENT & IMAGE */}
              <div className="min-w-0 space-y-4">

                {/* SECTION 1: THUỘC TÍNH CƠ BẢN */}
                <section className="min-w-0">
                  {format === 'simulation_hmi' && <div className="mb-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">Câu mô phỏng được xếp theo cấp độ và nhóm đối tượng ở phần phân loại bên trái. Khi lập bộ đề, có thể lọc riêng nhóm mô phỏng theo từng cấp độ để xây dựng đề nâng cao.</div>}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Thuộc tính cơ bản & Phân loại
                      </h2>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {filledAttrsCount}/6 bắt buộc
                      </span>
                    </div>
                  </div>

                  <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Thư mục phân loại (Tùy chọn) */}
                    <div className="grid grid-cols-[minmax(140px,0.7fr)_minmax(0,1.3fr)] items-center gap-3 py-2 text-sm">
                      <dt className="text-slate-500 font-normal flex items-center gap-1.5">
                        <Folder size={14} className="text-slate-400" />
                        <span>Thư mục phân loại</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Tùy chọn)</span>
                      </dt>
                      <dd className="min-w-0">
                        <Select
                          size="sm"
                          aria-label="Thư mục phân loại"
                          value={form.folderId}
                          onChange={e => handleFolderChange(e.target.value)}
                          options={[
                            { value: '', label: 'Chưa gán (Kho câu hỏi chung)' },
                            ...folders.map(f => ({
                              value: f.id,
                              label: `${f.name} (${f.levelName || f.level || 'Chung'})`,
                            })),
                          ]}
                        />
                      </dd>
                    </div>

                    {/* 6 Catalog Fields - Numbered 1 to 6 */}
                    {questionFields.map(([field, key, label], index) => {
                      const isTopic = key === 'question_topic';
                      const isLevel = key === 'level';
                      const isSelected = Boolean(form[field]);
                      const options = (catalogs.data[key]?.options || []).filter(
                        option =>
                          (option.active || option.id === form[field]) &&
                          (!isLevel || option.value !== 'All') &&
                          (!isTopic || option.parentId === form.specialtyId)
                      );
                      const placeholder = isTopic && !form.specialtyId
                        ? 'Vui lòng chọn Chuyên môn trước'
                        : ('Chọn ' + label.toLocaleLowerCase('vi'));

                      return (
                        <div
                          key={field}
                          id={`field-${field}`}
                          className="grid grid-cols-[minmax(140px,0.7fr)_minmax(0,1.3fr)] items-center gap-3 py-2 text-sm"
                        >
                          <dt className="flex items-center gap-2">
                            {/* Number Badge 1 to 6: Clean, neutral style */}
                            <span
                              className={`flex items-center justify-center h-5 w-5 rounded-full text-[11px] font-semibold shrink-0 select-none ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {label} <span className="text-rose-500 font-bold">*</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                Bắt buộc{isTopic ? ' (theo Chuyên môn)' : ''}
                              </span>
                            </div>
                          </dt>
                          <dd className="min-w-0">
                            <Select
                              size="sm"
                              aria-label={label}
                              disabled={isTopic && !form.specialtyId}
                              value={form[field]}
                              onChange={event => {
                                update({
                                  [field]: event.target.value,
                                  ...(field === 'specialtyId' ? { topicId: '' } : {})
                                });
                                if (error) setError('');
                              }}
                              options={[
                                { value: '', label: placeholder },
                                ...options.map(option => ({
                                  value: option.id,
                                  label: option.label + (option.active ? '' : ' (Ngừng sử dụng)'),
                                  disabled: !option.active,
                                })),
                              ]}
                            />
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>

                {/* SECTION 2: NỘI DUNG CÂU HỎI & HÌNH ẢNH MINH HỌA */}
                <section className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Nội dung câu hỏi & Hình ảnh đính kèm
                    </h2>
                    <span className="text-[11px] text-slate-400">{form.content.length} ký tự</span>
                  </div>

                  <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Đề bài câu hỏi */}
                    <div id="field-question-content" className="py-2 text-sm flex flex-col gap-1.5">
                      <dt className="text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>Nội dung đề bài / Tình huống sản xuất</span>
                          <span className="text-rose-500 font-bold">*</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Bắt buộc)</span>
                        </span>
                      </dt>
                      <dd className="min-w-0">
                        <textarea
                          required
                          rows={5}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed transition-all"
                          placeholder="Nhập nội dung câu hỏi hoặc tình huống nhà máy chi tiết..."
                          value={form.content}
                          onChange={e => {
                            update({ content: e.target.value });
                            if (error) setError('');
                          }}
                        />
                      </dd>
                    </div>

                    {/* HÌNH ẢNH ĐÍNH KÈM CÂU HỎI */}
                    <div className="py-2.5 text-sm flex flex-col gap-2">
                      <dt className="text-slate-500 font-normal flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ImageIcon size={14} className="text-slate-400" />
                          Hình ảnh minh họa / Sơ đồ kỹ thuật (tùy chọn)
                        </span>
                        {!form.imageUrl && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <Upload size={12} /> Tải ảnh từ máy
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowImageUrlInput(!showImageUrlInput);
                                setImageUrlDraft('');
                              }}
                              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1"
                            >
                              <LinkIcon size={12} /> {showImageUrlInput ? 'Ẩn ô nhập URL' : 'Dán link ảnh'}
                            </button>
                          </div>
                        )}
                      </dt>

                      <dd className="min-w-0">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />

                        {/* Image URL text input */}
                        {showImageUrlInput && !form.imageUrl && (
                          <div className="flex items-center gap-2 mb-2 max-w-lg">
                            <input
                              type="url"
                              placeholder="Dán đường dẫn ảnh (http://..., https://... hoặc data:image/...)"
                              value={imageUrlDraft}
                              onChange={e => setImageUrlDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (imageUrlDraft.trim()) {
                                    update({ imageUrl: imageUrlDraft.trim() });
                                    setShowImageUrlInput(false);
                                    setImgError(false);
                                  }
                                }
                              }}
                              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={!imageUrlDraft.trim()}
                              onClick={() => {
                                if (imageUrlDraft.trim()) {
                                  update({ imageUrl: imageUrlDraft.trim() });
                                  setShowImageUrlInput(false);
                                  setImgError(false);
                                }
                              }}
                              className="!h-7.5 !px-3 text-xs shrink-0"
                            >
                              Áp dụng
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowImageUrlInput(false);
                                setImageUrlDraft('');
                              }}
                              className="!h-7.5 !px-2 text-xs shrink-0"
                            >
                              Đóng
                            </Button>
                          </div>
                        )}

                        {/* Image Preview Box */}
                        {form.imageUrl && !imgError ? (
                          <div className="relative rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 max-w-lg">
                            <div className="relative group overflow-hidden rounded">
                              <img
                                src={form.imageUrl}
                                alt="Hình ảnh câu hỏi"
                                onError={() => setImgError(true)}
                                className="max-h-56 w-auto object-contain mx-auto rounded"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setImageModalOpen(true)}
                                  className="p-1.5 rounded-full bg-white text-slate-800 hover:bg-slate-100 shadow"
                                  title="Phóng to ảnh"
                                >
                                  <Maximize2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="p-1.5 rounded-full bg-white text-slate-800 hover:bg-slate-100 shadow"
                                  title="Thay đổi ảnh"
                                >
                                  <Upload size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    update({ imageUrl: '' });
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                  }}
                                  className="p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow"
                                  title="Xóa ảnh"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                              <span>Ảnh đã được đính kèm vào câu hỏi</span>
                              <button
                                type="button"
                                onClick={() => {
                                  update({ imageUrl: '' });
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="text-rose-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                <X size={12} /> Gỡ bỏ ảnh này
                              </button>
                            </div>
                          </div>
                        ) : form.imageUrl && imgError ? (
                          <div className="flex items-center justify-between p-3 rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 max-w-lg">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                              Ảnh đính kèm không thể hiển thị (đường dẫn lỗi hoặc không tồn tại)
                            </span>
                            <button
                              type="button"
                              onClick={() => { update({ imageUrl: '' }); setImgError(false); }}
                              className="text-rose-600 hover:underline font-semibold shrink-0 ml-2"
                            >
                              Gỡ bỏ ảnh
                            </button>
                          </div>
                        ) : !showImageUrlInput && (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-md p-3.5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
                          >
                            <ImageIcon className="mx-auto text-slate-400 mb-1" size={20} />
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Nhấp để tải ảnh lên (Sơ đồ mạch, Bản vẽ cơ khí, Lỗi in bao bì...)
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Hỗ trợ PNG, JPG, GIF, WebP (Tối đa 8MB)
                            </p>
                          </div>
                        )}
                      </dd>
                    </div>

                    {/* Câu hỏi điểm liệt */}
                    <div className="grid grid-cols-[minmax(130px,0.7fr)_minmax(0,1.3fr)] items-center gap-3 py-2 text-sm">
                      <dt className="text-slate-500 font-normal">Quy chuẩn an toàn</dt>
                      <dd className="min-w-0">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.isCritical}
                            onChange={e => update({ isCritical: e.target.checked })}
                            className="h-4 w-4 rounded accent-rose-600"
                          />
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Câu hỏi điểm liệt (Critical Safety)
                          </span>
                        </label>
                      </dd>
                    </div>

                    {form.isCritical && (
                      <div id="field-critical-reason" className="py-2 text-sm flex flex-col gap-1.5">
                        <dt className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <span>Lý do đánh điểm liệt</span>
                          <span className="text-rose-500 font-bold">*</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Bắt buộc khi đánh dấu điểm liệt)</span>
                        </dt>
                        <dd className="min-w-0">
                          <input
                            required
                            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Ví dụ: Vi phạm quy trình LOTO đe dọa an toàn tính mạng..."
                            value={form.criticalReason}
                            onChange={e => {
                              update({ criticalReason: e.target.value });
                              if (error) setError('');
                            }}
                          />
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              </div>

              {/* RIGHT COLUMN: ANSWER OPTIONS, EXPLANATION, AND AUDIT */}
              <div className="min-w-0 space-y-4">

                {/* SECTION 3: PHƯƠNG ÁN TRẢ LỜI & BAREM ĐIỂM */}
                <section className="min-w-0">
                  {!isSimulationQuestion && <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Phương án trả lời & Điểm số
                      </h2>
                      <span className="text-[11px] text-slate-400">
                        ({form.type === 'single_choice' ? `${form.options.length} phương án` : `${form.rubrics.length} tiêu chí`})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Mode Switcher: Soạn thảo vs Xem bao quát */}
                      {form.type === 'single_choice' && (
                        <div className="flex items-center rounded-sm bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setOptionsViewMode('edit')}
                            className={`flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-sm transition-all ${
                              optionsViewMode === 'edit'
                                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs font-semibold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Soạn thảo và chỉnh sửa văn bản từng phương án"
                          >
                            <FileText size={12} />
                            <span>Soạn thảo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOptionsViewMode('overview')}
                            className={`flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-sm transition-all ${
                              optionsViewMode === 'overview'
                                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Hiển thị bao quát toàn bộ nội dung phương án không bị che khuất"
                          >
                            <Eye size={12} />
                            <span>Xem bao quát</span>
                          </button>
                        </div>
                      )}

                      {/* Type switcher */}
                      <div className="flex items-center rounded-sm bg-slate-100 dark:bg-slate-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => update({ type: 'single_choice' })}
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-sm transition-all ${
                            form.type === 'single_choice'
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Trắc nghiệm
                        </button>
                        <button
                          type="button"
                          onClick={() => update({ type: 'essay' })}
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-sm transition-all ${
                            form.type === 'essay'
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Tự luận
                        </button>
                      </div>
                    </div>
                  </div>

                  {form.type === 'single_choice' ? (
                    optionsViewMode === 'overview' ? (
                      /* OVERVIEW MODE: SHOW FULL ANSWERS IN EXPANDED READABLE CARDS */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Toàn cảnh các phương án ({form.options.length} phương án):
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Nhấp vào thẻ để đổi đáp án đúng
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {form.options.map((option, index) => {
                            const letter = String.fromCharCode(65 + index);
                            const isCorrect = option.isCorrect;
                            return (
                              <div
                                key={option.id}
                                onClick={() => update({
                                  options: form.options.map((item, i) => ({ ...item, isCorrect: i === index }))
                                })}
                                className={`cursor-pointer group flex items-start gap-3 p-3.5 rounded-lg border transition-all ${
                                  isCorrect
                                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/40 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <span
                                  className={`flex items-center justify-center h-7 w-7 rounded font-bold text-xs shrink-0 select-none ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
                                    {option.text || <span className="italic text-slate-400">(Chưa nhập nội dung phương án {letter})</span>}
                                  </p>
                                </div>
                                {isCorrect && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-2 py-0.5 rounded shrink-0">
                                    <Check size={12} /> Đáp án đúng
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="text-slate-400 italic">
                            Chế độ bao quát: toàn bộ nội dung được hiển thị đầy đủ, không bị rút ngắn.
                          </span>
                          <button
                            type="button"
                            onClick={() => setOptionsViewMode('edit')}
                            className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                          >
                            <FileText size={12} /> Quay lại soạn thảo
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* EDIT MODE: MULTI-LINE AUTO-EXPANDING TEXTAREA SO ALL TEXT IS FULLY VISIBLE */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
                          <span>Chọn đáp án đúng (tích vào chữ cái hoặc nút đáp án):</span>
                          {form.options.length < 6 && (
                            <button
                              type="button"
                              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1"
                              onClick={() => update({
                                options: [
                                  ...form.options,
                                  { id: String(form.options.length + 1), text: '', isCorrect: false }
                                ]
                              })}
                            >
                              <Plus size={12} /> Thêm phương án
                            </button>
                          )}
                        </div>

                        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                          {form.options.map((option, index) => {
                            const letter = String.fromCharCode(65 + index);
                            const isCorrect = option.isCorrect;
                            const calculatedRows = Math.max(2, Math.min(8, Math.ceil((option.text?.length || 0) / 45)));

                            return (
                              <div key={option.id} className="grid grid-cols-[36px_1fr_auto] items-start gap-2.5 py-2 text-sm">
                                <dt className="flex items-center justify-center pt-1">
                                  <label
                                    title={`Đặt phương án ${letter} làm đáp án đúng`}
                                    className={`flex items-center justify-center h-8 w-8 rounded cursor-pointer text-xs font-bold transition-all select-none ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    <input
                                      aria-label={`Đáp án ${letter} đúng`}
                                      type="radio"
                                      name="question_correct_choice"
                                      checked={isCorrect}
                                      onChange={() => update({
                                        options: form.options.map((item, i) => ({ ...item, isCorrect: i === index }))
                                      })}
                                      className="sr-only"
                                    />
                                    <span>{letter}</span>
                                  </label>
                                </dt>
                                <dd className="min-w-0">
                                  <textarea
                                    required
                                    rows={calculatedRows}
                                    aria-label={`Phương án ${letter}`}
                                    className={`w-full rounded-md border px-3 py-2 text-sm leading-relaxed transition-all resize-y ${
                                      isCorrect
                                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 font-medium focus:ring-1 focus:ring-emerald-500'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-slate-400'
                                    }`}
                                    placeholder={`Nội dung phương án ${letter}...`}
                                    value={option.text}
                                    onChange={e => {
                                      update({
                                        options: form.options.map((item, i) => i === index ? { ...item, text: e.target.value } : item)
                                      });
                                      if (error) setError('');
                                    }}
                                  />
                                </dd>
                                <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                                  {isCorrect ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      <Check size={11} /> Đáp án đúng
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="text-[11px] text-slate-400 hover:text-emerald-600 px-1 py-0.5"
                                      onClick={() => update({
                                        options: form.options.map((item, i) => ({ ...item, isCorrect: i === index }))
                                      })}
                                      title={`Đặt ${letter} làm đáp án đúng`}
                                    >
                                      Chọn đúng
                                    </button>
                                  )}
                                  {form.options.length > 2 && (
                                    <button
                                      type="button"
                                      title="Xóa phương án"
                                      className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                                      onClick={() => update({
                                        options: form.options.filter((_, i) => i !== index).map((item, i) => ({
                                          ...item,
                                          isCorrect: item.isCorrect || (index === 0 && i === 0)
                                        }))
                                      })}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    )
                  ) : (
                    /* Essay Rubrics */
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span>Tiêu chí chấm điểm (Tổng: <strong className="text-emerald-700 dark:text-emerald-400">{totalEssayScore}</strong> điểm)</span>
                        <Button
                          type="button"
                          size="sm"
                          icon={Plus}
                          variant="outline"
                          onClick={() => update({
                            rubrics: [
                              ...form.rubrics,
                              { id: crypto.randomUUID(), title: '', maxScore: 5, description: '' }
                            ]
                          })}
                        >
                          Thêm tiêu chí
                        </Button>
                      </div>

                      <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                        {form.rubrics.map((rubric, index) => (
                          <div key={rubric.id} className="grid grid-cols-[28px_1fr_90px_auto] items-start gap-2.5 py-2 text-sm">
                            <dt className="text-xs font-bold text-slate-400 text-center pt-2">
                              #{index + 1}
                            </dt>
                            <dd className="min-w-0 space-y-1">
                              <textarea
                                required
                                rows={2}
                                aria-label="Tên tiêu chí"
                                className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 leading-relaxed resize-y"
                                placeholder="Tiêu chí chấm điểm..."
                                value={rubric.title}
                                onChange={e => update({
                                  rubrics: form.rubrics.map((item, i) => i === index ? { ...item, title: e.target.value } : item)
                                })}
                              />
                              <input
                                aria-label="Mô tả tiêu chí"
                                className="w-full rounded border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 bg-transparent placeholder:text-slate-400"
                                placeholder="Mô tả chi tiết căn cứ chấm điểm (tùy chọn)..."
                                value={rubric.description || ''}
                                onChange={e => update({
                                  rubrics: form.rubrics.map((item, i) => i === index ? { ...item, description: e.target.value } : item)
                                })}
                              />
                            </dd>
                            <div className="flex items-center gap-1 pt-2">
                              <input
                                required
                                type="number"
                                min="0.5"
                                step="0.5"
                                aria-label="Điểm"
                                className="w-16 text-center rounded-md border border-slate-200 dark:border-slate-700 px-1 py-1 text-sm bg-white dark:bg-slate-900"
                                value={rubric.maxScore}
                                onChange={e => update({
                                  rubrics: form.rubrics.map((item, i) => i === index ? { ...item, maxScore: Number(e.target.value) } : item)
                                })}
                              />
                              <span className="text-xs text-slate-400">đ</span>
                            </div>
                            <div className="pt-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                icon={Trash2}
                                disabled={form.rubrics.length === 1}
                                onClick={() => update({ rubrics: form.rubrics.filter((_, i) => i !== index) })}
                              />
                            </div>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  </>}

                  {/* HMI Simulation if applicable */}
                  {format === 'simulation_hmi' && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">Câu này được chấm tự động theo đáp án và điều kiện đã cấu hình trong màn hình mô phỏng. Không cần nhập phương án trắc nghiệm hoặc barem điểm riêng.</div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Màn hình mô phỏng HMI</span>
                        <Select
                          className="min-w-64 flex-1 text-xs"
                          value={form.simulationId}
                          placeholder="Chọn màn hình đã đăng ký..."
                          onChange={e => {
                            const simulation = simulations.find(item => item.id === e.target.value);
                            update({ simulationId: e.target.value, simulationType: simulation?.templateKey || '' });
                          }}
                          options={simulations.map(simulation => ({ value: simulation.id, label: `${simulation.name} · ${({ complete_operation: 'Hoàn thành thao tác', receive_material: 'Nhận vật liệu', return_material: 'Hoàn trả vật liệu' }[simulation.config?.workflow] || 'Màn hình MES')}` }))}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          icon={MonitorPlay}
                          onClick={() => window.open('/manage/question-simulations', '_blank', 'noopener,noreferrer')}
                        >
                          Đăng ký màn hình
                        </Button>
                      </div>
                      {simulations.length === 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">Chưa có màn hình mô phỏng. Đăng ký màn hình riêng rồi quay lại đây để gắn vào câu hỏi.</p>
                      )}
                      {selectedSimulation && (
                        <InteractiveHmiSimulation question={{ ...form, ...selectedSimulation, id: id || 'preview', simulation: selectedSimulation }} />
                      )}
                    </div>
                  )}
                </section>

                {/* SECTION 4: LỜI GIẢI & CƠ SỞ THAM CHIẾU */}
                <section className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Lời giải & Cơ sở tham chiếu
                  </h2>
                  <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="py-2 text-sm flex flex-col gap-1.5">
                      <dt className="text-slate-500 font-normal">Giải thích chi tiết & Căn cứ kỹ thuật nhà máy</dt>
                      <dd className="min-w-0">
                        <textarea
                          rows={3}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all leading-relaxed"
                          placeholder="Nhập giải thích chi tiết, tiêu chuẩn ISA-95, căn cứ kỹ thuật nhà máy..."
                          value={form.explanation}
                          onChange={e => update({ explanation: e.target.value })}
                        />
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* SECTION 5: THÔNG TIN QUẢN TRỊ */}
                <section className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Thông tin quản lý
                  </h2>
                  <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      ['Trạng thái câu hỏi', form.status === 'published' ? 'Đã xuất bản' : form.status === 'pending_review' ? 'Chờ duyệt' : 'Bản nháp'],
                      ['Tác giả', form.author || 'Quản trị viên'],
                      ['Phiên bản', `v${form.version || 1}`],
                      ['Mã bản ghi (UUID)', id || 'Tạo mới tự động'],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[minmax(130px,0.7fr)_minmax(0,1.3fr)] gap-3 py-1.5 text-xs">
                        <dt className="text-slate-500 font-normal">{label}</dt>
                        <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-200 break-all">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UNSAVED CHANGES WARNING MODAL */}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Xác nhận rời khỏi trang"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              size="sm"
              variant="outline"
              onClick={() => blocker.reset?.()}
            >
              Ở lại chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => blocker.proceed?.()}
            >
              Rời khỏi không lưu
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-1 text-slate-700 dark:text-slate-300">
          <div className="p-2 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Bạn có các thay đổi chưa được lưu!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Nếu rời khỏi trang bây giờ hoặc chuyển sang menu khác, tất cả các nội dung bạn vừa nhập sẽ bị mất hoàn toàn. Bạn có chắc chắn muốn rời đi không?
            </p>
          </div>
        </div>
      </Modal>

      {/* FULL QUESTION PREVIEW MODAL */}
      <Modal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Xem trước toàn cảnh câu hỏi & phương án"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">
              Chế độ hiển thị toàn cảnh đề thi phục vụ thẩm định và bao quát
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPreviewModalOpen(false)}
            >
              Đóng xem trước
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Layers size={11} /> {levelLabel}
            </span>
            {currentFolderName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Folder size={11} /> {currentFolderName}
              </span>
            )}
            {form.isCritical && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <AlertTriangle size={11} /> Câu hỏi điểm liệt
              </span>
            )}
          </div>

          {/* Question Prompt */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nội dung đề bài
            </h3>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
              {form.content || '(Chưa nhập nội dung đề bài)'}
            </p>
          </div>

          {/* Question Image if present */}
          {form.imageUrl && !imgError && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-950/50 max-w-md mx-auto">
              <img
                src={form.imageUrl}
                alt="Hình ảnh câu hỏi"
                onError={() => setImgError(true)}
                className="max-h-72 w-auto mx-auto object-contain rounded"
              />
            </div>
          )}

          {/* Options Display */}
          {isSimulationQuestion ? null : form.type === 'single_choice' ? (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Phương án trả lời ({form.options.length} phương án)
              </h3>
              <div className="space-y-2">
                {form.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index);
                  const isCorrect = option.isCorrect;
                  return (
                    <div
                      key={option.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center h-6 w-6 rounded font-bold text-xs shrink-0 select-none ${
                          isCorrect
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {letter}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="leading-relaxed whitespace-pre-wrap break-words">
                          {option.text || <span className="italic text-slate-400">(Trống)</span>}
                        </p>
                      </div>
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded shrink-0">
                          <Check size={12} /> Đáp án đúng
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tiêu chí chấm điểm tự luận (Tổng {totalEssayScore} điểm)
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                {form.rubrics.map((r, i) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        #{i + 1}. {r.title || '(Chưa nhập tiêu chí)'}
                      </p>
                      {r.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                      )}
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {r.maxScore} điểm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation if present */}
          {form.explanation && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Căn cứ kỹ thuật & Giải thích chi tiết
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                {form.explanation}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Image Fullscreen Preview Modal */}
      {imageModalOpen && form.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-lg p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <img
              src={form.imageUrl}
              alt="Hình ảnh phóng to"
              className="max-h-[80vh] w-auto max-w-full object-contain rounded"
            />
            <div className="flex items-center justify-between p-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Hình ảnh minh họa câu hỏi</span>
              <Button size="sm" variant="outline" onClick={() => setImageModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </ManagementFrame>
  );
}
