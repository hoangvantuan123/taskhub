import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import Modal from '../../../shared/ui/Modal';
import SearchInput from '../../../shared/ui/SearchInput';
import { useToast } from '../../../shared/hooks/useToast';
import { useAuth } from '../../../shared/hooks/useAuth';
import useAttributeCatalog from '../../../shared/hooks/useAttributeCatalog';
import useQuestionCatalogs from '../../questions/hooks/useQuestionCatalogs';
import { questionsApi } from '../../questions/services/questions.api';
import { assessmentsApi } from '../services/assessments.api';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Save,
  Eye,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileQuestion,
  FileText,
  Trophy,
  BookOpen,
  ListChecks,
} from 'lucide-react';

const EMPTY_REGISTRATION = {
  department: '',
  position: '',
  businessRole: '',
  language: 'vi',
  sourceFolderIds: [],
};

const FALLBACK_LEVELS = [
  { value: 'L0', label: 'Cấp L0 — Thiết bị trường & Cảm biến' },
  { value: 'L1', label: 'Cấp L1 — PLC & Điều khiển máy' },
  { value: 'L2', label: 'Cấp L2 — SCADA & Giao diện HMI' },
  { value: 'L3', label: 'Cấp L3 — MES / MOM & ERP Liên vận' },
  { value: 'all', label: 'Đánh giá liên cấp (L0 - L3)' },
];

const normalize = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi');

const loadAllPublishedQuestions = async () => {
  const firstPage = await questionsApi.listPublishedQuestions({ page: 1 });
  const pageSize = firstPage.meta?.pageSize || 500;
  const pageCount = Math.ceil((firstPage.meta?.total || firstPage.data?.length || 0) / pageSize);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      questionsApi.listPublishedQuestions({ page: index + 2 })
    )
  );
  return [firstPage, ...remainingPages].flatMap(result => result.data || []);
};

export default function AssessmentEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id && id !== 'new');
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const canPublish = hasPermission('assessments:publish');
  const canEditPermission = editing ? hasPermission('assessments:update') : hasPermission('assessments:create');

  const catalogs = useQuestionCatalogs();
  const ranks = useAttributeCatalog('rank');
  const departments = useAttributeCatalog('department');
  const positions = useAttributeCatalog('position');
  const roles = useAttributeCatalog('businessRole');

  // Loading & Saving
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [rowVersion, setRowVersion] = useState('');
  const [assessmentStatus, setAssessmentStatus] = useState('draft');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Core Assessment Config
  const [assessmentLevel, setAssessmentLevel] = useState('L1'); // Cấp độ L duy nhất của bộ đề
  const [assessmentType, setAssessmentType] = useState('practice'); // 'practice' (Luyện tập) | 'exam' (Thi thật)
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [passingScore, setPassingScore] = useState(7);

  // Critical Knockout Rule Settings
  const [hasCriticalRule, setHasCriticalRule] = useState(true);
  const [requiredCriticalCount, setRequiredCriticalCount] = useState(2);

  // Distribution & Scope
  const [targetGroup, setTargetGroup] = useState('all');
  const [targetRank, setTargetRank] = useState('all');
  const [registration, setRegistration] = useState(EMPTY_REGISTRATION);
  const [registrationError, setRegistrationError] = useState('');

  // Questions and Folder Data
  const [questionsPool, setQuestionsPool] = useState([]);
  const [questionFolders, setQuestionFolders] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Folder View state
  const [expandedFolders, setExpandedFolders] = useState({}); // Mặc định đóng hết cây thư mục
  const [questionSearch, setQuestionSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'selected' | 'critical'
  const [randomCount, setRandomCount] = useState(20);

  const getLevelLabel = lvl => {
    if (!lvl || lvl === 'All' || lvl === 'all') return 'Tất cả cấp';
    if (lvl === 'L0') return 'Cấp L0 — Trường';
    if (lvl === 'L1') return 'Cấp L1 — PLC';
    if (lvl === 'L2') return 'Cấp L2 — SCADA';
    if (lvl === 'L3') return 'Cấp L3 — MES';
    return `Cấp ${lvl}`;
  };

  const canEdit = canEditPermission && (!editing || assessmentStatus === 'draft');

  const updateRegistration = (key, value) =>
    setRegistration(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!editing && !subjectId && catalogs.data?.specialty?.options?.length > 0) {
      const firstActive = catalogs.data.specialty.options.find(opt => opt.active);
      if (firstActive) setSubjectId(firstActive.id);
    }
  }, [editing, subjectId, catalogs.data?.specialty?.options]);

  // Level options from catalog with all levels + multi-level support
  const levelOptions = useMemo(() => {
    const opts = (catalogs.data?.level?.options || []).filter(opt => opt.active);
    const mapped = opts.map(opt => ({
      value: opt.value === 'All' ? 'all' : opt.value,
      label: opt.value === 'All' ? 'Đánh giá liên cấp (L0 - L3)' : (opt.label || `Cấp ${opt.value}`),
    }));
    return mapped.length > 0 ? mapped : FALLBACK_LEVELS;
  }, [catalogs.data?.level?.options]);

  const assessmentTypeOptions = useMemo(() => {
    const registered = (catalogs.data?.assessment_type?.options || [])
      .filter(opt => opt.active && ['practice', 'exam'].includes(opt.value))
      .map(opt => ({ value: opt.value, label: opt.label }));
    return registered.length === 2 ? registered : [
      { value: 'practice', label: '📝 Đề thi luyện tập (Ôn tập & kiểm tra tiến độ)' },
      { value: 'exam', label: '🏆 Đề thi chính thức (Sát hạch cấp chứng chỉ)' },
    ];
  }, [catalogs.data?.assessment_type?.options]);

  // Load existing assessment or initialize
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');

    Promise.all([
      loadAllPublishedQuestions(),
      questionsApi.getQuestionFolders({}),
      editing ? assessmentsApi.get(id) : Promise.resolve(null),
    ])
      .then(([publishedQuestions, folderResult, assessmentResult]) => {
        if (!active) return;
        const published = publishedQuestions.filter(q => q.status === 'published');
        setQuestionsPool(published);
        const fList = folderResult.data || [];
        setQuestionFolders(fList);

        // Mặc định đóng hết các thư mục câu hỏi
        setExpandedFolders({});

        const data = assessmentResult?.data;
        if (!data) {
          if (!code) {
            const suffix = Math.floor(1000 + Math.random() * 9000);
            setCode(`DE-MES-L1-${suffix}`);
          }
          return;
        }

        setRegistration({
          ...EMPTY_REGISTRATION,
          ...data.registration,
          department: data.targetDepartment || data.registration?.department || '',
          position: data.targetPosition || data.registration?.position || '',
          businessRole: data.targetRole || data.registration?.businessRole || '',
        });

        if (data.registration?.assessmentLevel) {
          setAssessmentLevel(data.registration.assessmentLevel);
        }
        if (data.registration?.assessmentType) setAssessmentType(data.registration.assessmentType);
        if (data.registration?.requiredCriticalCount !== undefined) {
          setRequiredCriticalCount(data.registration.requiredCriticalCount);
        }

        setTargetGroup(data.targetGroupId || data.targetGroup || 'all');
        setTitle(data.title || '');
        setCode(data.code || '');
        setSubjectId(data.subjectId || '');
        setDurationMinutes(data.durationMinutes || 45);
        setPassingScore(data.passingScore ?? 7);
        const savedLevel = data.registration?.assessmentLevel || 'L1';
        setSelectedQuestions((data.questions || []).filter(questionId => {
          const question = published.find(item => item.id === questionId);
          return question && (savedLevel === 'all' || question.level === savedLevel || question.level === 'All' || question.isCritical);
        }));

        setTargetRank(data.targetRank || 'all');
        setHasCriticalRule(data.hasCriticalRule !== false);
        setRowVersion(data.RowVersion || '');
        setAssessmentStatus(data.status || 'draft');
      })
      .catch(failure => {
        const msg = failure.message || 'Không tải được dữ liệu bộ đề.';
        setLoadError(msg);
        addToast(msg, 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, editing, ranks.options, departments.options, positions.options, roles.options]);

  const levelQuestions = useMemo(
    () => assessmentLevel === 'all'
      ? questionsPool
      : questionsPool.filter(question => question.level === assessmentLevel || question.level === 'All' || question.isCritical),
    [questionsPool, assessmentLevel]
  );

  // Questions currently chosen in this assessment
  const activeQuestions = useMemo(
    () => levelQuestions.filter(q => selectedQuestions.includes(q.id)),
    [levelQuestions, selectedQuestions]
  );

  const criticalCount = activeQuestions.filter(q => q.isCritical).length;
  const simulationCount = activeQuestions.filter(q => q.format === 'simulation_hmi').length;
  const isCriticalSatisfied = !hasCriticalRule || criticalCount >= Number(requiredCriticalCount);

  // Group questions by folder for View Cấp Thư Mục (hỗ trợ đầy đủ các cấp L0, L1, L2, L3)
  const folderTree = useMemo(() => {
    const searchNorm = normalize(questionSearch);
    const map = new Map();
    const knownFolderIds = new Set(questionFolders.map(folder => folder.id));

    // 1. Khởi tạo toàn bộ các thư mục câu hỏi từ hệ thống
    questionFolders
      .filter(folder => assessmentLevel === 'all' || !folder.level || folder.level === 'All' || folder.level === assessmentLevel)
      .forEach(f => {
        map.set(f.id, {
          ...f,
          level: f.level && f.level !== 'All' ? f.level : (assessmentLevel === 'all' ? 'All' : assessmentLevel),
          questions: [],
        });
      });

    const unassigned = [];

    // 2. Phân phối câu hỏi vào từng thư mục
    levelQuestions.forEach(q => {
      let matchesSearch = true;
      if (searchNorm) {
        matchesSearch = [q.id, q.content, q.topicName, q.difficultyLabel, q.code, q.folderName].some(v =>
          normalize(v).includes(searchNorm)
        );
      }

      let matchesFilter = true;
      if (filterMode === 'selected') matchesFilter = selectedQuestions.includes(q.id);
      else if (filterMode === 'critical') matchesFilter = q.isCritical;

      if (!matchesSearch || !matchesFilter) return;

      if (q.folderId && map.has(q.folderId)) {
        map.get(q.folderId).questions.push(q);
      } else if (q.folderId && !map.has(q.folderId)) {
        if (knownFolderIds.has(q.folderId)) return;
        map.set(q.folderId, {
          id: q.folderId,
          name: q.folderName || q.topicName || `Thư mục ${q.folderId}`,
          level: q.level || 'All',
          questions: [q],
        });
      } else {
        unassigned.push(q);
      }
    });

    let result = Array.from(map.values()).filter(f => f.questions.length > 0);

    if (unassigned.length > 0) {
      result.push({
        id: '__unassigned__',
        name: 'Thư mục chung / Chưa phân loại',
        level: 'All',
        description: 'Các câu hỏi dùng chung hoặc chưa gắn thư mục chuyên môn',
        questions: unassigned,
      });
    }

    return result;
  }, [questionFolders, levelQuestions, assessmentLevel, questionSearch, filterMode, selectedQuestions]);

  // Toggle single question inside a folder
  const toggleQuestion = qId => {
    setSelectedQuestions(prev =>
      prev.includes(qId) ? prev.filter(x => x !== qId) : [...prev, qId]
    );
  };

  // Check / Uncheck entire folder:
  // KHI TÍCH CHỌN MỘT THƯ MỤC CÂU HỎI ➔ TẤT CẢ CÂU HỎI BÊN TRONG ĐƯỢC TÍCH CHỌN SẴN NGAY LẬP TỨC!
  const toggleFolderAll = folder => {
    const fIds = folder.questions.map(q => q.id);
    if (!fIds.length) return;

    const allSelected = fIds.every(qId => selectedQuestions.includes(qId));

    if (allSelected) {
      // Bỏ chọn tất cả câu hỏi của thư mục này khỏi đề thi
      setSelectedQuestions(prev => prev.filter(qId => !fIds.includes(qId)));
      addToast(`Đã bỏ toàn bộ câu hỏi của thư mục "${folder.name}" khỏi đề thi.`, 'info');
    } else {
      // TÍCH CHỌN SẴN TOÀN BỘ CÂU HỎI TRONG THƯ MỤC VÀO ĐỀ THI
      setSelectedQuestions(prev => [...new Set([...prev, ...fIds])]);
      setExpandedFolders(prev => ({ ...prev, [folder.id]: true }));
      addToast(`Đã chọn thư mục "${folder.name}": Tự động tích chọn sẵn toàn bộ ${fIds.length} câu hỏi vào đề thi!`, 'success');
    }
  };

  // Bốc ngẫu nhiên số câu nhất định từ một thư mục cụ thể
  const randomizeFromFolder = (folder, count = 5) => {
    const fQuestions = folder.questions || [];
    if (!fQuestions.length) return;
    const pickCount = Math.min(count, fQuestions.length);
    const shuffled = [...fQuestions].sort(() => Math.random() - 0.5).slice(0, pickCount);
    const pickIds = shuffled.map(q => q.id);
    setSelectedQuestions(prev => {
      const fQuestionIds = new Set(fQuestions.map(q => q.id));
      const others = prev.filter(idVal => !fQuestionIds.has(idVal));
      return [...others, ...pickIds];
    });
    setExpandedFolders(prev => ({ ...prev, [folder.id]: true }));
    addToast(`Đã bốc ngẫu nhiên ${pickCount} câu từ thư mục "${folder.name}" vào đề thi!`, 'success');
  };

  // Chọn toàn bộ tất cả các thư mục đang hiển thị vào đề thi
  const selectAllFolders = () => {
    const visibleIds = folderTree.flatMap(f => f.questions.map(q => q.id));
    if (!visibleIds.length) {
      addToast('Không có câu hỏi nào trong danh sách thư mục đang hiển thị.', 'warning');
      return;
    }
    setSelectedQuestions(prev => [...new Set([...prev, ...visibleIds])]);
    expandAll();
    addToast(`Đã tích chọn sẵn toàn bộ ${visibleIds.length} câu hỏi từ các thư mục vào đề thi!`, 'success');
  };

  const toggleSelectAllVisibleFolders = () => {
    const visibleIds = folderTree.flatMap(f => f.questions.map(q => q.id));
    if (!visibleIds.length) return;

    const visibleIdSet = new Set(visibleIds);
    const allVisibleSelected = visibleIds.every(questionId => selectedQuestions.includes(questionId));

    if (allVisibleSelected) {
      setSelectedQuestions(previous => previous.filter(questionId => !visibleIdSet.has(questionId)));
      return;
    }

    setSelectedQuestions(previous => [...new Set([...previous, ...visibleIds])]);
    expandAll();
  };

  // Bỏ chọn tất cả câu hỏi khỏi đề thi
  const deselectAllFolders = () => {
    setSelectedQuestions([]);
    addToast('Đã xóa toàn bộ câu hỏi khỏi đề thi.', 'info');
  };

  const toggleFolderExpand = folderId => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const expandAll = () => {
    const all = {};
    folderTree.forEach(f => { all[f.id] = true; });
    setExpandedFolders(all);
  };

  const collapseAll = () => {
    setExpandedFolders({});
  };

  // Khi chuyển Cấp độ đào tạo của bộ đề
  const handleLevelChange = newLevel => {
    const visibleIds = new Set(questionsPool
      .filter(question => newLevel === 'all' || question.level === newLevel)
      .map(question => question.id));
    const removedCount = selectedQuestions.filter(questionId => !visibleIds.has(questionId)).length;
    setSelectedQuestions(previous => previous.filter(questionId => visibleIds.has(questionId)));
    setAssessmentLevel(newLevel);
    setExpandedFolders({});
    addToast(`Đã chuyển bộ đề sang ${newLevel === 'all' ? 'tất cả cấp' : `Cấp ${newLevel}`}${removedCount ? `; đã bỏ ${removedCount} câu khác cấp khỏi đề` : ''}.`, 'info');
  };

  // Bốc ngẫu nhiên câu hỏi từ các thư mục của cấp độ đang chọn
  const randomizeAssessment = () => {
    const requested = Math.max(1, Number(randomCount) || 20);
    const criticalRequired = hasCriticalRule ? Math.max(0, Number(requiredCriticalCount) || 0) : 0;

    const available = levelQuestions;
    if (!available.length) {
      addToast(`Không có câu hỏi đã xuất bản ở ${assessmentLevel === 'all' ? 'các cấp' : `Cấp ${assessmentLevel}`}.`, 'warning');
      return;
    }

    const critical = available
      .filter(q => q.isCritical)
      .sort(() => Math.random() - 0.5)
      .slice(0, criticalRequired);

    const remainder = available
      .filter(q => !critical.some(item => item.id === q.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, requested - critical.length));

    const selected = [...critical, ...remainder];
    setSelectedQuestions(selected.slice(0, requested).map(q => q.id));
    expandAll();
    addToast(`Đã tự động bốc ngẫu nhiên ${selected.length} câu hỏi từ các thư mục vào đề thi.`, 'success');
  };

  // Điền mẫu nhanh
  const handleQuickFill = () => {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const lvl = assessmentLevel === 'all' ? 'L0-L3' : (assessmentLevel || 'L1');
    if (!code) setCode(`DE-MES-${lvl}-${suffix}`);
    if (!title) {
      setTitle(
        assessmentType === 'exam'
          ? `Đề thi sát hạch năng lực kỹ thuật Cấp ${lvl} #${suffix}`
          : `Bộ đề ôn tập & luyện thi năng lực Cấp ${lvl} #${suffix}`
      );
    }
    const specialty = (catalogs.data.specialty?.options || []).find(opt => opt.active);
    if (specialty && !subjectId) setSubjectId(specialty.id);

    // Tích chọn sẵn thư mục đầu tiên
    if (!selectedQuestions.length && folderTree.length > 0) {
      const firstFolder = folderTree[0];
      const picks = firstFolder.questions.map(q => q.id);
      setSelectedQuestions(picks);
    }
    addToast('Đã điền thông tin mẫu và tích chọn sẵn thư mục câu hỏi.', 'success');
  };

  // Lưu hoặc xuất bản bộ đề
  const saveAssessment = async publish => {
    if (!canEdit) return addToast('Bạn không có quyền tạo hoặc chỉnh sửa bộ đề.', 'warning');
    setRegistrationError('');

    if (!code.trim()) {
      setRegistrationError('Vui lòng nhập mã bộ đề.');
      return;
    }
    if (!title.trim()) {
      setRegistrationError('Vui lòng nhập tên bộ đề.');
      return;
    }
    if (!subjectId) {
      setRegistrationError('Vui lòng chọn chuyên môn đào tạo.');
      return;
    }
    if (!assessmentLevel) {
      setRegistrationError('Vui lòng chọn cấp độ đào tạo của bộ đề.');
      return;
    }
    if (!selectedQuestions.length) {
      addToast('Bộ đề phải có ít nhất một câu hỏi từ các thư mục nguồn.', 'warning');
      return;
    }

    // Đề thi thật bắt buộc đủ câu điểm liệt
    if (assessmentType === 'exam' && hasCriticalRule && criticalCount < Number(requiredCriticalCount)) {
      addToast(
        `Đề thi chính thức yêu cầu tối thiểu ${requiredCriticalCount} câu điểm liệt (hiện có ${criticalCount} câu). Vui lòng chọn thêm từ các thư mục điểm liệt.`,
        'error'
      );
      return;
    }

    // Kiểm tra tính tương thích nhóm đối tượng của câu hỏi với bộ đề
    if (targetGroup && targetGroup !== 'all') {
      const allGroup = (catalogs.data?.target_group?.options || []).find(o => o.value === 'all');
      const allGroupId = allGroup?.id;
      const incompatibleQuestions = activeQuestions.filter(q => 
        q.targetGroupId && q.targetGroupId !== targetGroup && q.targetGroupId !== allGroupId
      );
      if (incompatibleQuestions.length > 0) {
        addToast(
          `Có ${incompatibleQuestions.length} câu hỏi thuộc nhóm đối tượng khác. Vui lòng chuyển nhóm đối tượng bộ đề thành 'Tất cả các nhóm' hoặc chỉ chọn câu hỏi thuộc nhóm này.`,
          'error'
        );
        return;
      }
    }

    // Thư mục nguồn được chọn
    const selectedFolderIds = folderTree
      .filter(f => f.questions.some(q => selectedQuestions.includes(q.id)))
      .map(f => f.id);

    const payload = {
      code: code.trim(),
      title: title.trim(),
      subjectId: subjectId || null,
      subjectName: catalogs.data.specialty?.options.find(item => item.id === subjectId)?.label || '',
      targetGroup: targetGroup === 'all' ? null : targetGroup,
      targetRank: targetRank === 'all' ? null : targetRank,
      targetDepartment: registration.department || null,
      targetPosition: registration.position || null,
      targetRole: registration.businessRole || null,
      registration: {
        ...registration,
        language: 'vi',
        assessmentLevel,
        assessmentType,
        sourceFolderIds: selectedFolderIds,
        randomCount: Number(randomCount),
        requiredCriticalCount: Number(requiredCriticalCount),
      },
      hasCriticalRule,
      durationMinutes: Number(durationMinutes),
      totalPoints: 10,
      passingScore: Number(passingScore),
      questions: selectedQuestions,
      status: 'draft',
      ...(editing ? { id, RowVersion: rowVersion } : {}),
    };

    setSaving(true);
    try {
      if (editing && !rowVersion) {
        throw new Error('Thiếu phiên bản dữ liệu để cập nhật an toàn. Vui lòng tải lại trang.');
      }
      const saved = await assessmentsApi.save(payload);
      if (publish) {
        await assessmentsApi.publish(saved.data.id, { RowVersion: saved.data.RowVersion });
      }
      addToast(publish ? 'Đã xuất bản bộ đề thành công!' : 'Đã lưu bản nháp bộ đề thành công.', 'success');
      navigate('/manage/assessments');
    } catch (failure) {
      addToast(failure.message || 'Không lưu được bộ đề.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedFoldersCount = folderTree.filter(f =>
    f.questions.some(q => selectedQuestions.includes(q.id))
  ).length;

  return (
    <ManagementFrame
      className="management-screen"
      scrollableContent
      header={
        <div className="flex flex-wrap items-center justify-between w-full gap-2 py-1">
          {/* Left: Compact Breadcrumbs + Title & Badges in one single row matching /manage/questions/new */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => navigate('/manage/assessments')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                Quản lý bộ đề
              </button>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {editing ? 'Chi tiết bộ đề' : 'Setup bộ đề từ thư mục câu hỏi'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-lg">
                {title || (editing ? code : 'Thiết lập bộ đề thi từ thư mục câu hỏi')}
              </h1>

              <span className="text-slate-300 dark:text-slate-600 select-none">•</span>

              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  assessmentStatus === 'published' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {assessmentStatus === 'published' ? <><CheckCircle2 size={12} /> Đã xuất bản</> : 'Bản nháp'}
              </span>

              <span className="text-slate-300 dark:text-slate-600 select-none">•</span>

              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  assessmentType === 'exam' ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {assessmentType === 'exam' ? <><Trophy size={12} /> Đề thi chính thức</> : <><BookOpen size={12} /> Đề luyện tập</>}
              </span>

              <span className="text-slate-300 dark:text-slate-600 select-none">•</span>

              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <Layers size={12} /> Cấp {assessmentLevel}
              </span>

              <span className="text-slate-300 dark:text-slate-600 select-none">•</span>

              <span className="text-xs text-slate-500">
                {selectedQuestions.length} câu đã chọn ({selectedFoldersCount}/{folderTree.length} thư mục)
              </span>
            </div>
          </div>

          {/* Right: Sleek Action Buttons Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!editing && (
              <Button
                size="sm"
                variant="outline"
                icon={Sparkles}
                disabled={loading || saving}
                onClick={handleQuickFill}
                className="!h-7.5 !text-xs !px-2.5"
              >
                Điền mẫu
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              icon={Eye}
              disabled={loading || saving}
              onClick={() => setPreviewModalOpen(true)}
              className="!h-7.5 !text-xs !px-2.5 text-slate-700 dark:text-slate-200"
              title="Xem trước toàn bộ câu hỏi và đáp án của bộ đề"
            >
              Xem trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={ArrowLeft}
              disabled={saving}
              onClick={() => navigate('/manage/assessments')}
              className="!h-7.5 !text-xs !px-2.5"
            >
              Quay lại
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="secondary"
                icon={Save}
                loading={saving}
                disabled={loading || saving}
                onClick={() => saveAssessment(false)}
                className="!h-7.5 !text-xs !px-2.5"
              >
                Lưu nháp
              </Button>
            )}
            {canEdit && canPublish && (
              <Button
                size="sm"
                icon={CheckCircle2}
                loading={saving}
                disabled={loading || saving}
                onClick={() => saveAssessment(true)}
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
            <span>{editing ? `Chế độ chỉnh sửa bộ đề: ${code || id}` : 'Setup bộ đề từ thư mục câu hỏi'}</span>
            <span>• Cấp độ đề: <strong className="text-emerald-700 dark:text-emerald-400">{assessmentLevel}</strong></span>
            <span>• Đã chọn <strong className="text-slate-800 dark:text-slate-200">{selectedQuestions.length}</strong> câu ({criticalCount} câu điểm liệt, {simulationCount} câu mô phỏng)</span>
          </div>
          <span className={canEdit ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 font-medium'}>
            {canEdit ? 'Có thể lưu thay đổi' : 'Bộ đề đã khóa chỉnh sửa'}
          </span>
        </div>
      }
    >
      <div className="w-full min-h-full bg-white dark:bg-slate-950 flex flex-col p-3 sm:p-4">
        <div className="w-full max-w-[1900px] mx-auto flex flex-col">
          {loadError && (
            <div role="alert" className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-none border border-amber-200 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 shrink-0 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="shrink-0 text-amber-600 dark:text-amber-400" size={15} />
                <span className="truncate leading-relaxed">{loadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setLoadError('')}
                className="text-amber-600 hover:text-amber-900 dark:hover:text-amber-100 p-0.5 text-xs font-bold shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {loading || catalogs.loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500" role="status">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="text-xs font-medium">Đang tải cấu hình bộ đề và thư mục câu hỏi…</p>
            </div>
          ) : (
            /* Compact configuration followed by the question selection workspace */
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                {/* TOP CONFIGURATION STRIP */}
              <div className="xl:col-span-12 min-w-0 grid grid-cols-1 xl:grid-cols-12 gap-x-4 gap-y-2 content-start">
                {/* SECTION 1: CẤU HÌNH & PHÂN LOẠI BỘ ĐỀ */}
                <section className="min-w-0 xl:col-span-12">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span aria-hidden="true" className="assessment-section-title w-5 shrink-0 text-sm font-semibold">1.</span>
                    <h2 className="assessment-section-title text-sm font-semibold">
                      Cấu hình & Phân loại bộ đề
                    </h2>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nội dung bộ đề</h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3">
                        <div className="min-w-0 space-y-1">
                          <dt className="text-xs font-medium text-slate-700 dark:text-slate-300">Cấp độ đào tạo <span className="text-rose-500">*</span></dt>
                          <dd><Select size="sm" aria-label="Cấp độ đào tạo" value={assessmentLevel} onChange={e => handleLevelChange(e.target.value)} options={levelOptions} /></dd>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <dt className="text-xs font-medium text-slate-700 dark:text-slate-300">Loại bộ đề <span className="text-rose-500">*</span></dt>
                          <dd><Select size="sm" aria-label="Loại bộ đề" value={assessmentType} onChange={e => setAssessmentType(e.target.value)} options={assessmentTypeOptions} /></dd>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <dt className="text-xs font-medium text-slate-700 dark:text-slate-300">Chuyên môn đào tạo <span className="text-rose-500">*</span></dt>
                          <dd>
                            <Select
                              size="sm"
                              aria-label="Chuyên môn"
                              value={subjectId}
                              onChange={e => setSubjectId(e.target.value)}
                              options={(catalogs.data.specialty?.options || []).filter(opt => opt.active).map(opt => ({ value: opt.id, label: opt.label }))}
                              placeholder="Chọn chuyên môn"
                            />
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Đối tượng áp dụng</h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-x-5 gap-y-3">
                        <div className="min-w-0 space-y-1">
                          <dt className="text-xs font-medium text-slate-700 dark:text-slate-300">Nhóm đối tượng</dt>
                          <dd><Select size="sm" aria-label="Nhóm đối tượng" value={targetGroup} onChange={e => setTargetGroup(e.target.value)} options={[{ value: 'all', label: 'Tất cả các nhóm' }, ...(catalogs.data.target_group?.options || []).filter(opt => opt.active).map(opt => ({ value: opt.id, label: opt.label }))]} /></dd>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <dt className="text-xs font-medium text-slate-700 dark:text-slate-300">Cấp bậc</dt>
                          <dd><Select size="sm" aria-label="Cấp bậc thăng tiến" value={targetRank} onChange={e => setTargetRank(e.target.value)} options={[{ value: 'all', label: 'Tất cả cấp bậc' }, ...(ranks.options || []).filter(opt => opt.active).map(opt => ({ value: opt.id, label: opt.label }))]} /></dd>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <dt className="text-xs font-medium text-slate-700 dark:text-slate-300">Phòng ban</dt>
                          <dd><Select size="sm" aria-label="Phòng ban" value={registration.department} onChange={e => updateRegistration('department', e.target.value)} options={[{ value: '', label: 'Tất cả phòng ban' }, ...(departments.options || []).filter(opt => opt.active).map(opt => ({ value: opt.id, label: opt.label }))]} /></dd>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <dt className="text-xs font-medium text-slate-700 dark:text-slate-300">Vị trí chức danh</dt>
                          <dd><Select size="sm" aria-label="Vị trí" value={registration.position} onChange={e => updateRegistration('position', e.target.value)} options={[{ value: '', label: 'Tất cả vị trí' }, ...(positions.options || []).filter(opt => opt.active).map(opt => ({ value: opt.id, label: opt.label }))]} /></dd>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <dt className="text-xs font-medium text-slate-700 dark:text-slate-300">Vai trò nghiệp vụ</dt>
                          <dd><Select size="sm" aria-label="Vai trò nghiệp vụ" value={registration.businessRole} onChange={e => updateRegistration('businessRole', e.target.value)} options={[{ value: '', label: 'Tất cả vai trò' }, ...(roles.options || []).filter(opt => opt.active).map(opt => ({ value: opt.id, label: opt.label }))]} /></dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </section>

                {/* SECTION 2: THÔNG TIN NHẬN DIỆN & THỜI LƯỢNG THI */}
                <section className="min-w-0 xl:col-span-7 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span aria-hidden="true" className="assessment-section-title w-5 shrink-0 text-sm font-semibold">2.</span>
                    <h2 className="assessment-section-title text-sm font-semibold">
                      Thông tin nhận diện & Thời lượng thi
                    </h2>
                  </div>

                  <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="grid grid-cols-[minmax(140px,0.7fr)_minmax(0,1.3fr)] items-center gap-3 py-2 text-sm">
                      <dt className="text-slate-700 dark:text-slate-300 font-medium">
                        Mã bộ đề <span className="text-rose-500 font-bold">*</span>
                      </dt>
                      <dd className="min-w-0">
                        <input
                          type="text"
                          value={code}
                          onChange={e => setCode(e.target.value)}
                          disabled={editing}
                          placeholder="Ví dụ: DE-MES-L1-01"
                          className="h-8 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        />
                      </dd>
                    </div>

                    <div className="grid grid-cols-[minmax(140px,0.7fr)_minmax(0,1.3fr)] items-center gap-3 py-2 text-sm">
                      <dt className="text-slate-700 dark:text-slate-300 font-medium">
                        Tên bộ đề tiếng Việt <span className="text-rose-500 font-bold">*</span>
                      </dt>
                      <dd className="min-w-0">
                        <input
                          type="text"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Ví dụ: Đánh giá Năng lực Kỹ thuật Cấp độ 1 - Điều khiển PLC & Máy"
                          className="h-8 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        />
                      </dd>
                    </div>

                    <div className="grid grid-cols-[minmax(140px,0.7fr)_minmax(0,1.3fr)] items-center gap-3 py-2 text-sm">
                      <dt className="text-slate-700 dark:text-slate-300 font-medium">
                        Thời lượng thi (phút) <span className="text-rose-500 font-bold">*</span>
                      </dt>
                      <dd className="min-w-0">
                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={durationMinutes}
                          onChange={e => setDurationMinutes(e.target.value)}
                          className="h-8 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        />
                      </dd>
                    </div>

                    <div className="grid grid-cols-[minmax(140px,0.7fr)_minmax(0,1.3fr)] items-center gap-3 py-2 text-sm">
                      <dt className="text-slate-700 dark:text-slate-300 font-medium">
                        Điểm sàn đạt chuẩn (/10) <span className="text-rose-500 font-bold">*</span>
                      </dt>
                      <dd className="min-w-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            value={passingScore}
                            onChange={e => setPassingScore(e.target.value)}
                            className="h-8 w-24 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold"
                          />
                          <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Tương đương: {Math.round((Number(passingScore || 0) / 10) * 100)}%
                          </span>
                        </div>
                      </dd>
                    </div>
                  </dl>

                  {registrationError && (
                    <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">
                      {registrationError}
                    </p>
                  )}
                </section>

                {/* SECTION 3: CẤU HÌNH QUY ĐỊNH ĐIỂM LIỆT */}
                <section className="min-w-0 xl:col-span-5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="assessment-section-title w-5 shrink-0 text-sm font-semibold">3.</span>
                      <h2 className="assessment-section-title text-sm font-semibold">
                        Cấu hình quy định điểm liệt
                      </h2>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasCriticalRule}
                        onChange={e => setHasCriticalRule(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-rose-600"></div>
                      <span className="ml-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {hasCriticalRule ? 'Bật' : 'Tắt'}
                      </span>
                    </label>
                  </div>

                  {hasCriticalRule ? (
                    <div className="p-3 rounded-md bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <label className="text-xs font-semibold">
                          Số câu điểm liệt tối thiểu trong đề:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={requiredCriticalCount}
                          onChange={e => setRequiredCriticalCount(e.target.value)}
                          className="h-7.5 w-20 rounded-md border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 px-2 text-xs font-bold text-center text-rose-700 dark:text-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
                        <span className="text-slate-600 dark:text-slate-300">
                          Đã chọn trong đề: <strong className="text-slate-900 dark:text-white">{criticalCount}</strong> / {requiredCriticalCount} câu
                        </span>
                        {isCriticalSatisfied ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 size={13} /> Đạt chỉ tiêu điểm liệt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                            <AlertTriangle size={13} /> Thiếu {Number(requiredCriticalCount) - criticalCount} câu
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] leading-relaxed opacity-90">
                        <strong>Quy tắc điểm liệt tuyệt đối:</strong> Trong kỳ thi chính thức, sai bất kỳ câu hỏi điểm liệt nào sẽ bị tính <strong>TRƯỢT</strong> ngay lập tức kể cả khi tổng điểm vượt điểm đạt sàn.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-1">
                      Quy định điểm liệt đang tắt. Điểm kết luận chỉ tính theo tổng điểm đạt sàn.
                    </p>
                  )}
                </section>
              </div>

              {/* QUESTION TREE: USES THE REMAINING PAGE HEIGHT */}
              <div className="xl:col-span-12 min-w-0 flex flex-col space-y-2">
                {/* 1. Header Bar: Tiêu đề Cây thư mục câu hỏi + Thống kê số câu đã chọn */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="assessment-section-title w-5 shrink-0 text-sm font-semibold">4.</span>
                    <h3 className="assessment-section-title text-sm font-semibold">
                      Cây thư mục câu hỏi
                    </h3>
                    <span className="text-xs text-slate-400 font-normal">
                      ({folderTree.length} thư mục nguồn)
                    </span>
                  </div>

                </div>

                {/* 3. Toolbar: Fast Tree Actions & Random Picker */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={selectAllFolders}
                      disabled={!folderTree.length}
                      className="!h-7.5 !text-xs !px-2.5"
                    >
                      Chọn tất cả thư mục
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={deselectAllFolders}
                      disabled={!selectedQuestions.length}
                      className="!h-7.5 !text-xs !px-2.5"
                    >
                      Bỏ chọn tất cả
                    </Button>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={expandAll}
                      className="!h-7.5 !text-xs !px-2.5"
                    >
                      Mở tất cả
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={collapseAll}
                      className="!h-7.5 !text-xs !px-2.5"
                    >
                      Đóng tất cả
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">Bốc ngẫu nhiên:</span>
                    <input
                      type="number"
                      min="1"
                      max={levelQuestions.length || 50}
                      value={randomCount}
                      onChange={e => setRandomCount(e.target.value)}
                      className="h-7.5 w-14 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-center font-bold text-slate-800 dark:text-slate-100"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Sparkles}
                      onClick={randomizeAssessment}
                      disabled={!levelQuestions.length}
                      className="!h-7.5 !text-xs !px-2.5"
                    >
                      Bốc câu hỏi
                    </Button>
                  </div>
                </div>

                {/* 4. Search & Filter Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="w-full min-w-[260px] flex-1">
                    <SearchInput
                      size="sm"
                      value={questionSearch}
                      onChange={e => setQuestionSearch(e.target.value)}
                      placeholder="Tìm thư mục, mã câu, nội dung..."
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`h-7 px-2.5 rounded text-xs font-medium transition-colors ${
                        filterMode === 'all'
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('selected')}
                      className={`h-7 px-2.5 rounded text-xs font-medium transition-colors ${
                        filterMode === 'selected'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Đã đưa vào đề ({activeQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('critical')}
                      className={`h-7 px-2.5 rounded text-xs font-medium transition-colors ${
                        filterMode === 'critical'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      ⚡ Điểm liệt
                    </button>
                  </div>
                </div>

                {/* 5. CÂY THƯ MỤC CÂU HỎI (CHỈ CUỘN NỘI DUNG DANH SÁCH THƯ MỤC) */}
                <div className="flex flex-col pt-1">
                  {/* Tree Header */}
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={folderTree.length > 0 && folderTree.every(f => f.questions.length > 0 && f.questions.every(q => selectedQuestions.includes(q.id)))}
                        ref={el => {
                          if (el) {
                            const anySelected = folderTree.some(f => f.questions.some(q => selectedQuestions.includes(q.id)));
                            const allSelected = folderTree.length > 0 && folderTree.every(f => f.questions.length > 0 && f.questions.every(q => selectedQuestions.includes(q.id)));
                            el.indeterminate = anySelected && !allSelected;
                          }
                        }}
                        onChange={toggleSelectAllVisibleFolders}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                        title={folderTree.length > 0 && folderTree.every(f => f.questions.length > 0 && f.questions.every(q => selectedQuestions.includes(q.id)))
                          ? 'Bỏ chọn tất cả câu hỏi đang hiển thị'
                          : 'Tích chọn tất cả câu hỏi đang hiển thị'}
                      />
                      <span>Thư mục câu hỏi nguồn &amp; Danh sách câu con</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-normal">
                      <span>Tổng: <strong className="text-slate-800 dark:text-slate-200">{folderTree.length}</strong> thư mục</span>
                    </div>
                  </div>

                  {/* Tree nodes and their question details */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 pr-1">
                    {folderTree.length === 0 ? (
                      <div className="py-16 text-center text-slate-400">
                        <FileQuestion size={30} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Không có thư mục câu hỏi nào phù hợp với bộ lọc hiện tại.
                        </p>
                      </div>
                    ) : (
                      folderTree.map(folder => {
                        const folderQuestions = folder.questions;
                        const selectedInFolder = folderQuestions.filter(q => selectedQuestions.includes(q.id));
                        const isAllSelected = folderQuestions.length > 0 && selectedInFolder.length === folderQuestions.length;
                        const isPartial = selectedInFolder.length > 0 && !isAllSelected;
                        const isExpanded = !!expandedFolders[folder.id];
                        const criticalInFolder = folderQuestions.filter(q => q.isCritical).length;
                        const folderLevel = folder.level || 'All';

                        return (
                          <div key={folder.id} className="group">
                            {/* HÀNG THƯ MỤC GỐC (ROOT FOLDER NODE) */}
                            <div
                              className="flex items-center justify-between gap-2 px-2 py-2.5 transition-colors cursor-pointer select-none border-b border-slate-100/60 dark:border-slate-800/40 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                              onClick={() => toggleFolderExpand(folder.id)}
                            >
                              {/* Folder title, selected state, and question count */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleFolderExpand(folder.id);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                  title={isExpanded ? 'Thu gọn thư mục' : 'Mở rộng thư mục'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown size={15} className="text-slate-600 dark:text-slate-300" />
                                  ) : (
                                    <ChevronRight size={15} className="text-slate-400" />
                                  )}
                                </button>

                                <input
                                  type="checkbox"
                                  ref={el => { if (el) el.indeterminate = isPartial; }}
                                  checked={isAllSelected}
                                  onClick={e => e.stopPropagation()}
                                  onChange={() => toggleFolderAll(folder)}
                                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                                  title="Tích để chọn sẵn toàn bộ câu hỏi con trong thư mục này vào đề"
                                />

                                <span className={`font-semibold text-xs truncate ${
                                  criticalInFolder > 0
                                    ? 'text-rose-700 dark:text-rose-300'
                                    : 'text-slate-800 dark:text-slate-100'
                                }`}>
                                  {folder.name}
                                </span>

                                <span className="text-[11px] text-slate-400 shrink-0">
                                  ({folderQuestions.length} câu)
                                </span>

                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 shrink-0">
                                  {getLevelLabel(folderLevel)}
                                </span>

                                {criticalInFolder > 0 && (
                                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 shrink-0">
                                    ⚡ {criticalInFolder} điểm liệt
                                  </span>
                                )}
                              </div>

                              {/* Right: Counter + Action Buttons */}
                              <div className="flex items-center gap-2 shrink-0 text-xs" onClick={e => e.stopPropagation()}>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  selectedInFolder.length > 0
                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'text-slate-400'
                                }`}>
                                  Đã lấy: {selectedInFolder.length}/{folderQuestions.length} câu
                                </span>

                                <button
                                  type="button"
                                  onClick={() => toggleFolderAll(folder)}
                                  className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold px-1"
                                  title="Tích/Bỏ chọn tất cả câu hỏi trong thư mục này"
                                >
                                  {isAllSelected ? 'Bỏ chọn cả thư mục' : 'Chọn cả thư mục'}
                                </button>

                                {folderQuestions.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => randomizeFromFolder(folder, Math.min(5, folderQuestions.length))}
                                    className="text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                                    title="Bốc ngẫu nhiên 5 câu từ thư mục này"
                                  >
                                    Bốc 5
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* NHÁNH CÂU HỎI CON (INDENTED TREE BRANCH - ĐÓNG MẶC ĐỊNH) */}
                            {isExpanded && (
                              <div className="border-l-2 border-emerald-500/40 dark:border-emerald-500/30 ml-5 pl-2 py-1 space-y-0.5">
                                {folderQuestions.map((q, idx) => {
                                  const isSelected = selectedQuestions.includes(q.id);
                                  return (
                                    <div
                                      key={q.id}
                                      onClick={() => toggleQuestion(q.id)}
                                      className={`flex items-start gap-2 px-2 py-1.5 text-xs transition-colors cursor-pointer border-b border-slate-100/40 dark:border-slate-800/30 hover:bg-sky-50 dark:hover:bg-sky-950/30 ${
                                        isSelected ? 'text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      {/* Tree branch connector character */}
                                      <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none pt-0.5">
                                        {idx === folderQuestions.length - 1 ? '└─' : '├─'}
                                      </span>

                                      <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleQuestion(q.id)}
                                          className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                                        />
                                      </div>

                                      <FileText size={14} className={isSelected ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-slate-400 shrink-0 mt-0.5'} />

                                      <span className="font-mono text-[11px] text-slate-400 shrink-0 pt-0.5">
                                        {q.code || q.id.slice(0, 8)}
                                      </span>

                                      {q.level && !['All', 'all', folder?.level].includes(q.level) && (
                                        <span className="font-mono font-semibold text-[10px] text-emerald-700 dark:text-emerald-400 shrink-0">
                                          {q.level}
                                        </span>
                                      )}

                                      <p className="min-w-0 flex-1 text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                                        {q.content}
                                      </p>

                                      {/* Colored text attributes */}
                                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                                        {q.isCritical && (
                                          <span className="font-mono font-bold text-[10px] text-rose-700 dark:text-rose-300">
                                            ⚡ Điểm liệt
                                          </span>
                                        )}

                                        {q.format === 'simulation_hmi' && (
                                          <span className="font-mono font-bold text-[10px] text-sky-700 dark:text-sky-300">
                                            🎮 Mô phỏng
                                          </span>
                                        )}

                                        <span className="text-[10px] text-slate-400">
                                          {q.difficultyLabel || 'Thông hiểu'}
                                        </span>

                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewModalOpen && (
        <Modal
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={`Xem trước bộ đề thi: ${title || code || 'Chưa đặt tên'}`}
          size="xl"
          density="comfortable"
          footer={
            <Button variant="outline" size="sm" onClick={() => setPreviewModalOpen(false)}>
              Đóng xem trước
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-none font-mono text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {code || 'CHƯA ĐẶT MÃ'}
                </span>
                <span className="px-2 py-0.5 rounded-none text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Cấp {assessmentLevel}
                </span>
                <span className="px-2 py-0.5 rounded-none text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {assessmentType === 'exam' ? 'Đề thi chính thức' : 'Đề luyện tập'}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {durationMinutes} phút • Đạt {passingScore}/10 • {activeQuestions.length} câu hỏi • {criticalCount} câu điểm liệt
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto pr-1">
              {activeQuestions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chưa có câu hỏi nào được chọn từ các thư mục nguồn.
                </div>
              ) : (
                activeQuestions.map((q, idx) => (
                  <div key={q.id} className="py-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-700 dark:text-emerald-400">Câu {idx + 1}</strong>
                        <span className="font-mono text-slate-400">({q.code || q.id})</span>
                        {q.isCritical && (
                          <span className="px-1.5 py-0.2 rounded-none text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            ⚡ Điểm liệt
                          </span>
                        )}
                        {q.format === 'simulation_hmi' && (
                          <span className="px-1.5 py-0.2 rounded-none text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                            🎮 Mô phỏng HMI
                          </span>
                        )}
                      </div>
                      <span>{q.difficultyLabel || 'Thông hiểu'}</span>
                    </div>

                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-2">
                      {q.content}
                    </p>

                    {/* Technical Diagram / Simulation Image */}
                    {q.imageUrl && (
                      <div className="my-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 flex justify-center">
                        <img
                          src={q.imageUrl}
                          alt="Sơ đồ kỹ thuật"
                          className="max-h-56 max-w-full rounded object-contain"
                        />
                      </div>
                    )}

                    {q.options?.length > 0 && (
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={opt.id || oIdx}
                            className={`p-2 rounded-none text-xs flex items-center justify-between border ${
                              opt.isCorrect
                                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                                : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>
                              <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt.text}
                            </span>
                            {opt.isCorrect && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                                <Check size={12} /> Đáp án đúng
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </ManagementFrame>
  );
}
