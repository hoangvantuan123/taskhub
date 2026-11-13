import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import VirtualDataTable from '../../../shared/ui/VirtualDataTable';
import Button from '../../../shared/ui/Button';
import Tabs from '../../../shared/ui/Tabs';
import Select from '../../../shared/ui/Select';
import SearchInput from '../../../shared/ui/SearchInput';
import TableStatusFooter from '../../../shared/ui/TableStatusFooter';
import { Download, RefreshCw, RotateCcw, Award, BarChart2, CheckCircle2, XCircle, TrendingUp, Layers, Calendar, BookOpen, Building2 } from 'lucide-react';
import { assessmentsApi } from '../../assessments/services/assessments.api';
import { notify } from '../../../shared/lib/notify';

const sessionColumns = [
  { id: 'code', label: 'Mã đợt thi', width: 160, minWidth: 130 },
  { id: 'title', label: 'Tên đợt thi / Ca thi', width: 280, minWidth: 200 },
  { id: 'assessmentTitle', label: 'Bộ đề thi áp dụng', width: 260, minWidth: 200 },
  { id: 'startTimeText', label: 'Thời gian tổ chức', width: 170, minWidth: 140 },
  { id: 'statusText', label: 'Trạng thái đợt', width: 130, minWidth: 110 },
  { id: 'attemptsText', label: 'Lượt thi', width: 120, minWidth: 100 },
  { id: 'passedText', label: 'Lượt đạt', width: 110, minWidth: 90 },
  { id: 'avgScoreText', label: 'Điểm TB', width: 120, minWidth: 100 },
  { id: 'maxScoreText', label: 'Điểm cao nhất', width: 130, minWidth: 100 },
  { id: 'passRateText', label: 'Tỷ lệ đạt', width: 120, minWidth: 100 },
];

const assessmentColumns = [
  { id: 'code', label: 'Mã bộ đề', width: 160, minWidth: 130 },
  { id: 'title', label: 'Tên bộ đề thi', width: 300, minWidth: 220 },
  { id: 'passingScoreText', label: 'Điểm chuẩn đạt', width: 140, minWidth: 110 },
  { id: 'totalPointsText', label: 'Thang điểm', width: 120, minWidth: 90 },
  { id: 'statusText', label: 'Trạng thái đề', width: 130, minWidth: 110 },
  { id: 'attemptsText', label: 'Lượt thi', width: 120, minWidth: 100 },
  { id: 'passedText', label: 'Lượt đạt', width: 110, minWidth: 90 },
  { id: 'avgScoreText', label: 'Điểm TB', width: 120, minWidth: 100 },
  { id: 'maxScoreText', label: 'Điểm cao nhất', width: 130, minWidth: 100 },
  { id: 'passRateText', label: 'Tỷ lệ đạt', width: 120, minWidth: 100 },
];

const departmentColumns = [
  { id: 'department', label: 'Phòng ban / Đơn vị', width: 280, minWidth: 200 },
  { id: 'attemptsText', label: 'Số lượt làm bài', width: 160, minWidth: 120 },
  { id: 'passedText', label: 'Số lượt đạt chuẩn', width: 160, minWidth: 120 },
  { id: 'avgScoreText', label: 'Điểm số trung bình', width: 170, minWidth: 130 },
  { id: 'maxScoreText', label: 'Điểm cao nhất', width: 150, minWidth: 120 },
  { id: 'passRateText', label: 'Tỷ lệ đạt chuẩn', width: 160, minWidth: 120 },
];

const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = d.getDate().toString().padStart(2, '0');
    const mon = (d.getMonth() + 1).toString().padStart(2, '0');
    const yr = d.getFullYear();
    const hr = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${mon}/${yr} ${hr}:${min}`;
  } catch {
    return isoStr;
  }
};

const getSessionStatusLabel = (status) => {
  switch (status) {
    case 'scheduled': return 'Sắp diễn ra';
    case 'in_progress': return 'Đang mở';
    case 'completed': return 'Đã kết thúc';
    case 'cancelled': return 'Đã hủy';
    default: return status || '—';
  }
};

const getAssessmentStatusLabel = (status) => {
  switch (status) {
    case 'published': return 'Đã xuất bản';
    case 'draft': return 'Bản nháp';
    case 'archived': return 'Đã lưu trữ';
    default: return status || '—';
  }
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('spectrum'); // 'spectrum' | 'sessions' | 'assessments' | 'departments'
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSession, setSelectedSession] = useState('all');
  const [selectedAssessment, setSelectedAssessment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Data State
  const [reportData, setReportData] = useState({
    totalAttempts: 0,
    passedAttempts: 0,
    failedAttempts: 0,
    passRate: 0,
    avgScore: 0,
    maxScore: 0,
    minScore: 0,
    medianScore: 0,
    scoreBins: [],
    gradeTiers: [],
    sessionStats: [],
    assessmentStats: [],
    departmentStats: [],
    filterOptions: {
      sessions: [],
      assessments: [],
      departments: [],
    },
  });

  const loadReport = useCallback(async (overrides = {}) => {
    setLoading(true);
    const sId = overrides.sessionId !== undefined ? overrides.sessionId : selectedSession;
    const aId = overrides.assessmentId !== undefined ? overrides.assessmentId : selectedAssessment;

    const payload = {};
    if (sId && sId !== 'all') payload.sessionId = sId;
    if (aId && aId !== 'all') payload.assessmentId = aId;

    try {
      const res = await assessmentsApi.getReportSummary(payload);
      const data = res?.data || res;
      if (data) {
        setReportData({
          totalAttempts: Number(data.totalAttempts) || 0,
          passedAttempts: Number(data.passedAttempts) || 0,
          failedAttempts: Number(data.failedAttempts) || 0,
          passRate: Number(data.passRate) || 0,
          avgScore: Number(data.avgScore) || 0,
          maxScore: Number(data.maxScore) || 0,
          minScore: Number(data.minScore) || 0,
          medianScore: Number(data.medianScore) || 0,
          scoreBins: Array.isArray(data.scoreBins) ? data.scoreBins : [],
          gradeTiers: Array.isArray(data.gradeTiers) ? data.gradeTiers : [],
          sessionStats: Array.isArray(data.sessionStats) ? data.sessionStats : [],
          assessmentStats: Array.isArray(data.assessmentStats) ? data.assessmentStats : [],
          departmentStats: Array.isArray(data.departmentStats) ? data.departmentStats : [],
          filterOptions: data.filterOptions || { sessions: [], assessments: [], departments: [] },
        });
      }
    } catch (e) {
      notify('Không tải được số liệu báo cáo đào tạo: ' + (e.message || 'Lỗi mạng'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedSession, selectedAssessment]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleResetFilters = () => {
    setSelectedSession('all');
    setSelectedAssessment('all');
    setSearchQuery('');
    loadReport({ sessionId: 'all', assessmentId: 'all' });
  };

  const hasActiveFilters = selectedSession !== 'all' || selectedAssessment !== 'all' || searchQuery.trim() !== '';

  // Options for filter selects
  const sessionSelectOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả đợt thi / ca thi' },
    ...(reportData.filterOptions?.sessions || []).map(s => ({
      value: s.id,
      label: `${s.title} (${s.code})`,
    })),
  ], [reportData.filterOptions?.sessions]);

  const assessmentSelectOptions = useMemo(() => [
    { value: 'all', label: 'Tất cả bộ đề thi' },
    ...(reportData.filterOptions?.assessments || []).map(a => ({
      value: a.id,
      label: `${a.title} (${a.code})`,
    })),
  ], [reportData.filterOptions?.assessments]);

  // Formatted data rows for tables
  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (reportData.sessionStats || [])
      .filter(s => !q || s.title?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.assessmentTitle?.toLowerCase().includes(q))
      .map(s => ({
        ...s,
        startTimeText: formatDate(s.startTime),
        statusText: getSessionStatusLabel(s.status),
        attemptsText: `${s.attempts || 0} bài`,
        passedText: `${s.passed || 0} bài`,
        avgScoreText: `${Number(s.avgScore || 0).toFixed(1)} / 10`,
        maxScoreText: `${Number(s.maxScore || 0).toFixed(1)} / 10`,
        passRateText: `${Number(s.passRate || 0).toFixed(1)}%`,
      }));
  }, [reportData.sessionStats, searchQuery]);

  const filteredAssessments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (reportData.assessmentStats || [])
      .filter(a => !q || a.title?.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q))
      .map(a => ({
        ...a,
        passingScoreText: `${Number(a.passingScore || 0).toFixed(1)} điểm`,
        totalPointsText: `${Number(a.totalPoints || 10).toFixed(0)} điểm`,
        statusText: getAssessmentStatusLabel(a.status),
        attemptsText: `${a.attempts || 0} bài`,
        passedText: `${a.passed || 0} bài`,
        avgScoreText: `${Number(a.avgScore || 0).toFixed(1)} / 10`,
        maxScoreText: `${Number(a.maxScore || 0).toFixed(1)} / 10`,
        passRateText: `${Number(a.passRate || 0).toFixed(1)}%`,
      }));
  }, [reportData.assessmentStats, searchQuery]);

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (reportData.departmentStats || [])
      .filter(d => !q || d.department?.toLowerCase().includes(q))
      .map(d => ({
        ...d,
        attemptsText: `${d.attempts || 0} bài`,
        passedText: `${d.passed || 0} bài`,
        avgScoreText: `${Number(d.avgScore || 0).toFixed(1)} / 10`,
        maxScoreText: `${Number(d.maxScore || 0).toFixed(1)} / 10`,
        passRateText: `${Number(d.passRate || 0).toFixed(1)}%`,
      }));
  }, [reportData.departmentStats, searchQuery]);

  // Max count in score bins for scaling histogram bars
  const maxBinCount = useMemo(() => {
    if (!reportData.scoreBins || reportData.scoreBins.length === 0) return 1;
    const max = Math.max(...reportData.scoreBins.map(b => b.count || 0));
    return max > 0 ? max : 1;
  }, [reportData.scoreBins]);

  const handleExportCsv = () => {
    let rows = [];
    let filename = 'bao_cao_nang_luc.csv';

    if (activeTab === 'spectrum') {
      rows = [
        ['--- PHO DIEM THI SAT HACH (SCORE SPECTRUM) ---'],
        ['Dai diem', 'Diem toi thieu', 'Diem toi da', 'So luong bai thi', 'Ty trong (%)', 'Trang thai'],
        ...(reportData.scoreBins || []).map(b => [
          `"${b.range}"`, b.min, b.max, b.count, `${Number(b.percentage || 0).toFixed(1)}%`, b.passed ? 'Dat chuan' : 'Chua dat'
        ]),
        [],
        ['--- PHAN LOAI NANG LUC & XEP HANG ---'],
        ['Xep loai', 'Thang diem', 'So luong bai thi', 'Ty le (%)'],
        ...(reportData.gradeTiers || []).map(t => [
          `"${t.label}"`, `"${t.range}"`, t.count, `${Number(t.percentage || 0).toFixed(1)}%`
        ]),
        [],
        ['--- BO CHI SO THONG KE TOAN DIEN ---'],
        ['Chi so', 'Gia tri'],
        ['Tong so luot thi', reportData.totalAttempts],
        ['So luot dat chuan', reportData.passedAttempts],
        ['So luot chua dat', reportData.failedAttempts],
        ['Ty le dat chuan (%)', `${Number(reportData.passRate || 0).toFixed(1)}%`],
        ['Diem so trung binh', Number(reportData.avgScore || 0).toFixed(1)],
        ['Diem trung vi (Median)', Number(reportData.medianScore || 0).toFixed(1)],
        ['Diem cao nhat', Number(reportData.maxScore || 0).toFixed(1)],
        ['Diem thap nhat', Number(reportData.minScore || 0).toFixed(1)],
      ];
      filename = 'pho_diem_sat_hach.csv';
    } else if (activeTab === 'sessions') {
      rows = [
        ['Ma dot thi', 'Ten dot thi / Ca thi', 'Bo de thi', 'Thoi gian', 'Trang thai', 'So luot thi', 'So luot dat', 'Diem trung binh', 'Diem cao nhat', 'Ty le dat (%)'],
        ...filteredSessions.map(s => [
          `"${s.code}"`, `"${s.title}"`, `"${s.assessmentTitle}"`, `"${s.startTimeText}"`, `"${s.statusText}"`,
          s.attempts, s.passed, Number(s.avgScore || 0).toFixed(1), Number(s.maxScore || 0).toFixed(1), `${Number(s.passRate || 0).toFixed(1)}%`
        ])
      ];
      filename = 'bao_cao_theo_dot_thi.csv';
    } else if (activeTab === 'assessments') {
      rows = [
        ['Ma bo de', 'Ten bo de thi', 'Diem chuan', 'Thang diem', 'Trang thai', 'So luot thi', 'So luot dat', 'Diem trung binh', 'Diem cao nhat', 'Ty le dat (%)'],
        ...filteredAssessments.map(a => [
          `"${a.code}"`, `"${a.title}"`, a.passingScore, a.totalPoints, `"${a.statusText}"`,
          a.attempts, a.passed, Number(a.avgScore || 0).toFixed(1), Number(a.maxScore || 0).toFixed(1), `${Number(a.passRate || 0).toFixed(1)}%`
        ])
      ];
      filename = 'bao_cao_theo_bo_de.csv';
    } else {
      rows = [
        ['Phong ban / Don vi', 'So luot thi', 'So luot dat', 'Diem trung binh', 'Diem cao nhat', 'Ty le dat (%)'],
        ...filteredDepartments.map(d => [
          `"${d.department}"`, d.attempts, d.passed, Number(d.avgScore || 0).toFixed(1), Number(d.maxScore || 0).toFixed(1), `${Number(d.passRate || 0).toFixed(1)}%`
        ])
      ];
      filename = 'bao_cao_theo_phong_ban.csv';
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCell = (column, row) => {
    return row[column.id] || '—';
  };

  return (
    <ManagementFrame
      header={
        <>
          <Tabs
            tabs={[
              { id: 'spectrum', label: 'Tổng quan phổ điểm & Phân loại' },
              { id: 'sessions', label: `Báo cáo theo Đợt thi (${reportData.sessionStats?.length || 0})` },
              { id: 'assessments', label: `Báo cáo theo Bài thi (${reportData.assessmentStats?.length || 0})` },
              { id: 'departments', label: `Báo cáo theo Phòng ban (${reportData.departmentStats?.length || 0})` },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="management-actions flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => loadReport()}
              disabled={loading}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
            >
              Xuất báo cáo (CSV)
            </Button>
          </div>
        </>
      }
      filters={
        <div className="space-y-2.5 py-1">
          {/* Tầng 2: Toolbar Bộ Lọc & Tìm Kiếm */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-56">
              <SearchInput
                size="sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm đợt thi, bài thi, đơn vị…"
              />
            </div>

            <div className="w-60">
              <Select
                size="sm"
                options={sessionSelectOptions}
                value={selectedSession}
                onChange={val => {
                  setSelectedSession(val);
                  loadReport({ sessionId: val });
                }}
                placeholder="Chọn đợt thi / ca thi…"
              />
            </div>

            <div className="w-64">
              <Select
                size="sm"
                options={assessmentSelectOptions}
                value={selectedAssessment}
                onChange={val => {
                  setSelectedAssessment(val);
                  loadReport({ assessmentId: val });
                }}
                placeholder="Chọn bộ đề thi…"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={handleResetFilters}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Đặt lại
              </Button>
            )}
          </div>

          {/* Tầng 2 Sub-strip: Flat KPI stats strip (Strict Design Standard) */}
          <div className="flex items-center gap-6 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tổng lượt thi</span>
              <strong className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {reportData.totalAttempts} bài
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tỷ lệ đạt chuẩn</span>
              <strong className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {Number(reportData.passRate || 0).toFixed(1)}%
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Điểm trung bình</span>
              <strong className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                {Number(reportData.avgScore || 0).toFixed(1)} / 10
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Điểm trung vị</span>
              <strong className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {Number(reportData.medianScore || 0).toFixed(1)} / 10
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cao nhất / Thấp nhất</span>
              <strong className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {Number(reportData.maxScore || 0).toFixed(1)} / {Number(reportData.minScore || 0).toFixed(1)}
              </strong>
            </div>
          </div>
        </div>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Báo cáo đánh giá năng lực & Phổ điểm</span>
            <span>·</span>
            <span>Lọc theo: {selectedSession === 'all' ? 'Tất cả đợt thi' : '1 đợt thi'} · {selectedAssessment === 'all' ? 'Tất cả bài thi' : '1 bài thi'}</span>
          </div>
          <span>{loading ? 'Đang cập nhật số liệu…' : 'Đã đồng bộ số liệu mới nhất'}</span>
        </div>
      }
    >
      {/* TẦNG 3: DATA CANVAS */}
      {activeTab === 'spectrum' && (
        <div className="p-6 space-y-6 w-full overflow-y-auto h-full">
          {/* SECTION A: Phổ điểm trực quan (Score Histogram Distribution - Full Width) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 w-full">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart2 size={16} className="text-emerald-600" />
                  Phổ điểm thi sát hạch (Phân phối tần suất điểm số)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mật độ phân bổ kết quả bài thi theo 10 dải điểm từ 0.0 đến 10.0 điểm
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" />
                  Chưa đạt (&lt; 5.0)
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                  Đạt chuẩn (&ge; 5.0)
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 border-l border-slate-200 dark:border-slate-800 pl-3">
                  <span className="w-4 border-t-2 border-dashed border-emerald-600 inline-block" />
                  Ngưỡng đạt (5.0 điểm)
                </span>
              </div>
            </div>

            {/* Histogram Canvas with Y-Axis */}
            <div className="pt-6 pb-2 px-1 w-full">
              <div className="flex w-full gap-2">
                {/* Y-Axis scale labels */}
                <div className="flex flex-col justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono pr-1 select-none h-60">
                  <span>{maxBinCount}</span>
                  <span>{Math.round(maxBinCount * 0.75)}</span>
                  <span>{Math.round(maxBinCount * 0.5)}</span>
                  <span>{Math.round(maxBinCount * 0.25)}</span>
                  <span>0</span>
                </div>

                {/* Histogram Area */}
                <div className="relative flex-1 h-60 flex items-end justify-between gap-3 sm:gap-4 border-b border-l border-slate-200 dark:border-slate-800 pb-0 pl-1">
                  {/* Horizontal reference grid lines */}
                  <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-100 dark:border-slate-800/80 pointer-events-none" />
                  <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-100 dark:border-slate-800/80 pointer-events-none" />
                  <div className="absolute inset-x-0 top-2/4 border-t border-dashed border-slate-100 dark:border-slate-800/80 pointer-events-none" />
                  <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-100 dark:border-slate-800/80 pointer-events-none" />

                  {/* Vertical Passing Score Marker (50% position between bin 4-5 and 5-6) */}
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-600/70 pointer-events-none z-10"
                    style={{ left: '50%' }}
                  >
                    <span className="absolute -top-5 -left-12 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shadow-xs">
                      Chuẩn đạt 5.0
                    </span>
                  </div>

                  {/* 10 Score Bins Bars */}
                  {(reportData.scoreBins || []).map((bin, idx) => {
                    const heightPercent = maxBinCount > 0 ? (bin.count / maxBinCount) * 100 : 0;
                    const isPassed = bin.passed;

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap">
                          Dải [{bin.range}]: <strong>{bin.count} bài thi</strong> ({Number(bin.percentage || 0).toFixed(1)}%)
                        </div>

                        {/* Top Metric text */}
                        <span className={`text-[11px] font-mono font-semibold mb-1.5 transition-colors ${
                          bin.count > 0 ? (isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : 'text-slate-300 dark:text-slate-600'
                        }`}>
                          {bin.count}
                        </span>

                        {/* Bar Pillar */}
                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 cursor-pointer ${
                            isPassed
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-700 group-hover:to-emerald-500 shadow-xs'
                              : 'bg-gradient-to-t from-rose-500 to-rose-400 group-hover:from-rose-600 group-hover:to-rose-500 shadow-xs'
                          }`}
                          style={{
                            height: `${Math.max(bin.count > 0 ? 10 : 3, heightPercent * 0.9)}%`,
                            opacity: bin.count === 0 ? 0.35 : 1,
                          }}
                        />

                        {/* Bottom Range Label */}
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2 font-medium">
                          {bin.range}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: Phân loại Năng lực & Xếp hạng (Grade Tiers Breakdown - Full Width) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 w-full">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award size={16} className="text-purple-600" />
              Phân loại Năng lực & Đánh giá Xếp hạng
            </h3>

            {/* Segmented Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Tỷ trọng xếp loại bài thi toàn hệ thống</span>
                <span>{reportData.totalAttempts} bài thi</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                {(reportData.gradeTiers || []).map((tier, idx) => (
                  <div
                    key={idx}
                    title={`${tier.label}: ${tier.count} bài (${Number(tier.percentage || 0).toFixed(1)}%)`}
                    style={{ width: `${tier.percentage || 0}%`, backgroundColor: tier.color }}
                    className="h-full transition-all duration-300"
                  />
                ))}
              </div>
            </div>

            {/* Tiers Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 w-full">
              {(reportData.gradeTiers || []).map((tier, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{tier.label}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">Dải: {tier.range}</div>
                  <div className="flex items-baseline justify-between pt-1">
                    <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {tier.count} <span className="text-[11px] font-normal text-slate-400">bài</span>
                    </strong>
                    <span className="text-xs font-mono font-medium" style={{ color: tier.color }}>
                      {Number(tier.percentage || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION C: Bảng chỉ số thống kê đo lường toàn diện (Full Width) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3 w-full">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" />
              Chỉ số Đo lường & Thống kê Tham số Kỳ thi
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs pt-1 w-full">
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Điểm trung bình (Mean)</span>
                <strong className="text-sm text-purple-600 dark:text-purple-400">{Number(reportData.avgScore || 0).toFixed(2)}</strong>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Điểm trung vị (Median)</span>
                <strong className="text-sm text-indigo-600 dark:text-indigo-400">{Number(reportData.medianScore || 0).toFixed(2)}</strong>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Điểm cao nhất (Max)</span>
                <strong className="text-sm text-emerald-600 dark:text-emerald-400">{Number(reportData.maxScore || 0).toFixed(2)}</strong>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Điểm thấp nhất (Min)</span>
                <strong className="text-sm text-slate-600 dark:text-slate-400">{Number(reportData.minScore || 0).toFixed(2)}</strong>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Số bài đạt (Pass)</span>
                <strong className="text-sm text-emerald-600 dark:text-emerald-400">{reportData.passedAttempts} bài</strong>
              </div>
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Số bài trượt (Fail)</span>
                <strong className="text-sm text-rose-600 dark:text-rose-400">{reportData.failedAttempts} bài</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sessions */}
      {activeTab === 'sessions' && (
        <VirtualDataTable
          preferenceKey="reports-sessions-stats"
          columns={sessionColumns}
          rows={filteredSessions}
          formatCell={formatCell}
          rowHeight={44}
        />
      )}

      {/* Tab 3: Assessments */}
      {activeTab === 'assessments' && (
        <VirtualDataTable
          preferenceKey="reports-assessments-stats"
          columns={assessmentColumns}
          rows={filteredAssessments}
          formatCell={formatCell}
          rowHeight={44}
        />
      )}

      {/* Tab 4: Departments */}
      {activeTab === 'departments' && (
        <VirtualDataTable
          preferenceKey="reports-department-stats"
          columns={departmentColumns}
          rows={filteredDepartments}
          formatCell={formatCell}
          rowHeight={44}
        />
      )}
    </ManagementFrame>
  );
}
