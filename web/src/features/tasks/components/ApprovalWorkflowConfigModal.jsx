import React, { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import { notify } from '../../../shared/lib/notify';
import {
  Workflow,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  Save,
  Info,
  Check,
  Building2,
  AlertCircle
} from 'lucide-react';

export default function ApprovalWorkflowConfigModal({ isOpen, onClose, onUpdated }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // local edits: { [projectId]: { requiresApproval: boolean, approvalWorkflow: string } }
  const [configs, setConfigs] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    taskService.getProjects().then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setProjects(arr);
      const initial = {};
      arr.forEach((p) => {
        initial[p.id] = {
          requiresApproval: Boolean(p.requiresApproval),
          approvalWorkflow: p.approvalWorkflow || '1_level',
        };
      });
      setConfigs(initial);
    }).catch((err) => {
      console.error('Error loading projects for workflow config:', err);
      notify.error('Không thể tải danh sách dự án');
    }).finally(() => {
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleApproval = (projId, checked) => {
    setConfigs((prev) => ({
      ...prev,
      [projId]: {
        ...(prev[projId] || {}),
        requiresApproval: checked,
      },
    }));
  };

  const handleWorkflowChange = (projId, wf) => {
    setConfigs((prev) => ({
      ...prev,
      [projId]: {
        ...(prev[projId] || {}),
        approvalWorkflow: wf,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(configs).map(([projId, cfg]) =>
        taskService.updateProject({
          id: projId,
          requiresApproval: cfg.requiresApproval,
          approvalWorkflow: cfg.approvalWorkflow,
        })
      );
      await Promise.all(promises);
      notify.success('Cập nhật cấu hình quy trình duyệt thành công!');
      onUpdated?.();
      onClose();
    } catch (e) {
      console.error('Error saving approval workflow configs:', e);
      notify.error('Có lỗi xảy ra khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 grid place-items-center border border-emerald-200 dark:border-emerald-800/50">
              <Workflow className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Thiết lập & Cấu hình Quy trình Phê duyệt Công việc
              </h2>
              <p className="text-[11px] text-slate-500">
                Quản lý điều kiện kích hoạt hàng đợi duyệt nghiệm thu theo từng dự án hoặc mặc định hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0 bg-white dark:bg-slate-900">
          {/* Workflow Principles Diagram Card */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
              <Info className="w-4 h-4 text-blue-600" />
              Nguyên tắc vận hành Quy trình Duyệt nghiệm thu ETPMS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              {/* Flow 1: Mặc định */}
              <div className="p-3 rounded border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Luồng 1: Mặc định (Tự động hoàn thành)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Mặc định
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Áp dụng cho các công việc độc lập hoặc dự án <strong>không tích chọn Duyệt</strong>:
                </p>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 p-2 rounded border border-emerald-100 dark:border-emerald-900/30">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">Đang làm</span>
                  <ArrowRight className="w-3 h-3 text-emerald-500" />
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">Xong 100%</span>
                  <ArrowRight className="w-3 h-3 text-emerald-500" />
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-bold text-[10px]">Duyệt luôn (Done)</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] italic">
                  * Tối ưu tốc độ, không gây tồn đọng hay phiền hà cho các tác vụ thường nhật.
                </p>
              </div>

              {/* Flow 2: Có tích chọn Duyệt */}
              <div className="p-3 rounded border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Luồng 2: Khi Dự án có tích Duyệt
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    Kiểm soát chặt
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Chỉ kích hoạt khi dự án được bật <strong>"Yêu cầu phê duyệt"</strong>:
                </p>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">Xong 100%</span>
                  <ArrowRight className="w-3 h-3 text-amber-500" />
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 font-bold text-[10px]">Chờ duyệt</span>
                  <ArrowRight className="w-3 h-3 text-emerald-500" />
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-bold text-[10px]">Quản lý Duyệt</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] italic">
                  * Yêu cầu xuất hiện trong trang "Ban Giám sát" này để người phụ trách thẩm định nghiệm thu.
                </p>
              </div>
            </div>
          </div>

          {/* Project Approval Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Danh sách Dự án & Kế hoạch (Bật / Tắt theo dõi duyệt)
              </h3>
              <span className="text-[11px] text-slate-500">
                Tổng số: <strong>{projects.length}</strong> dự án
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Đang tải dữ liệu cấu hình dự án...</div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800 rounded">
                Chưa có dự án nào trong hệ thống.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-28">Mã DA</th>
                      <th className="py-2.5 px-3">Tên Dự án / Kế hoạch</th>
                      <th className="py-2.5 px-3 w-40">Phòng ban chủ trì</th>
                      <th className="py-2.5 px-3 w-36 text-center">Bắt buộc duyệt?</th>
                      <th className="py-2.5 px-3 w-64">Cấp độ phê duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {projects.map((p) => {
                      const cfg = configs[p.id] || { requiresApproval: false, approvalWorkflow: '1_level' };
                      const isChecked = cfg.requiresApproval;
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                            isChecked ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                            {p.code}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            <div>{p.name}</div>
                            {p.managerName && (
                              <div className="text-[10px] text-slate-400">
                                Quản lý: {p.managerName}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {p.department || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleToggleApproval(p.id, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {isChecked ? 'Có duyệt' : 'Xong là duyệt luôn'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {isChecked ? (
                              <Select
                                size="sm"
                                value={cfg.approvalWorkflow || '1_level'}
                                onChange={(e) => handleWorkflowChange(p.id, e?.target?.value ?? e)}
                                options={[
                                  { value: '1_level', label: '1 Cấp: Quản lý trực tiếp duyệt' },
                                  { value: '2_level', label: '2 Cấp: Theo dõi kỹ thuật -> PM duyệt' },
                                ]}
                              />
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">
                                Tự động đóng hoàn thành khi 100%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Các thiết lập sẽ có hiệu lực ngay lập tức cho các lượt báo cáo hoàn thành tiếp theo.
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={Save}
              disabled={saving}
              onClick={handleSaveAll}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Đang lưu cấu hình...' : 'Lưu quy trình duyệt'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

