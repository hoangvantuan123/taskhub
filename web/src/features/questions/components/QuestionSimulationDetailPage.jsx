import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, MonitorPlay } from 'lucide-react';
import ManagementFrame from '../../../shared/ui/ManagementFrame';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import Modal from '../../../shared/ui/Modal';
import { questionsApi } from '../services/questions.api';
import { notify } from '../../../shared/lib/notify';
import InteractiveProductionSimulation from './InteractiveProductionSimulation';

const workflowOptions = [
  { value: 'complete_operation', label: 'Hoàn thành thao tác sản xuất' },
  { value: 'receive_material', label: 'Nhận vật liệu cho lệnh' },
  { value: 'return_material', label: 'Hoàn trả nguyên vật liệu' },
];

const templates = {
  complete_operation: {
    name: 'Hoàn thành thao tác sản xuất',
    description: 'Nhập sản lượng đạt và phế phẩm trên cửa sổ hoàn thành lệnh.',
    config: {
      workflow: 'complete_operation',
      mission: 'Mở lệnh sản xuất, nhập số lượng đạt và số lượng phế phẩm theo yêu cầu rồi hoàn thành thao tác.',
      workOrder: 'CD05-1026-0626(683)',
      operation: 'Thao tác bồi duplex',
      machine: 'HN-BOI-01',
      materialCode: 'ACU-BSB-00253',
      materialName: 'ACP03 MCM-B',
      requiredQty: 1326,
      goodQty: 1240,
      scrapQty: 86,
      warehouseFrom: 'GS1-PHO-01',
      warehouseTo: 'GS1-PXU-04',
      issueQty: 1338,
      returnQty: 12,
    },
  },
  receive_material: {
    name: 'Nhận vật liệu cho lệnh',
    description: 'Chọn kho xuất, kho nhập và xác nhận số lượng vật tư nhận.',
    config: {
      workflow: 'receive_material',
      mission: 'Mở lệnh sản xuất, chọn đúng kho xuất, kho nhập và nhận đủ số lượng vật liệu theo yêu cầu.',
      workOrder: 'CD05-1026-0626(683)',
      operation: 'Thao tác nhận cuộn in',
      machine: 'HN-IN-02',
      materialCode: 'ACU-BSB-00253',
      materialName: 'Cuộn giấy Duplex 350gsm',
      requiredQty: 1338,
      goodQty: 1338,
      scrapQty: 0,
      warehouseFrom: 'GS1-PHO-01',
      warehouseTo: 'GS1-PXU-04',
      issueQty: 1338,
      returnQty: 0,
    },
  },
  return_material: {
    name: 'Hoàn trả nguyên vật liệu',
    description: 'Kiểm tra lượng vật tư đã nhận và nhập số lượng cần hoàn trả.',
    config: {
      workflow: 'return_material',
      mission: 'Mở lệnh sản xuất, kiểm tra vật tư còn lại và gửi yêu cầu hoàn trả đúng số lượng.',
      workOrder: 'CD05-1026-0626(683)',
      operation: 'Thao tác hoàn trả cuộn thừa',
      machine: 'HN-IN-02',
      materialCode: 'ACU-BSB-00253',
      materialName: 'Cuộn giấy Duplex 350gsm',
      requiredQty: 1338,
      goodQty: 1240,
      scrapQty: 0,
      warehouseFrom: 'GS1-PXU-04',
      warehouseTo: 'GS1-PHO-01',
      issueQty: 1338,
      returnQty: 98,
    },
  },
};

export default function QuestionSimulationDetailPage({ item, isCreate = false, onBack, onSaved }) {
  const [draft, setDraft] = useState(() => {
    if (item) return { ...item, config: { ...item.config } };
    const t = templates.complete_operation;
    return {
      name: t.name,
      description: t.description,
      templateKey: 'production_ui',
      config: { ...t.config },
    };
  });

  const initialRef = useRef(JSON.stringify(draft));
  const [saving, setSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const hasChanges = useMemo(() => {
    return JSON.stringify(draft) !== initialRef.current;
  }, [draft]);

  const handleBackAttempt = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const changeWorkflow = (nextWorkflow) => {
    const template = templates[nextWorkflow];
    if (template) {
      setDraft(prev => ({
        ...prev,
        config: { ...prev.config, ...template.config, workflow: nextWorkflow },
      }));
    } else {
      setDraft(prev => ({
        ...prev,
        config: { ...prev.config, workflow: nextWorkflow },
      }));
    }
  };

  const updateConfig = (key, value) => {
    setDraft(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!draft.name?.trim()) {
      notify('Vui lòng nhập tên màn hình mô phỏng!', 'warning');
      return;
    }
    if (!draft.config?.mission?.trim()) {
      notify('Vui lòng nhập yêu cầu thao tác cho người học!', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description?.trim() || '',
        templateKey: draft.templateKey || 'production_ui',
        config: {
          ...draft.config,
          requiredQty: Number(draft.config.requiredQty) || 0,
          goodQty: Number(draft.config.goodQty) || 0,
          scrapQty: Number(draft.config.scrapQty) || 0,
          issueQty: Number(draft.config.issueQty) || 0,
          returnQty: Number(draft.config.returnQty) || 0,
        },
      };

      if (draft.id) {
        await questionsApi.updateQuestionSimulation(draft.id, payload);
        notify('Đã cập nhật màn hình mô phỏng thành công!', 'success');
      } else {
        await questionsApi.createQuestionSimulation(payload);
        notify('Đã tạo màn hình mô phỏng mới thành công!', 'success');
      }

      initialRef.current = JSON.stringify(draft);
      if (onSaved) onSaved();
    } catch (err) {
      notify('Lỗi khi lưu màn hình: ' + (err.message || 'Lỗi hệ thống'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const simulationPreview = useMemo(() => {
    return {
      id: draft.id || 'preview-simulation',
      name: draft.name || 'Goldsun MES Operations',
      description: draft.description || '',
      templateKey: 'production_ui',
      config: draft.config,
    };
  }, [draft]);

  return (
    <ManagementFrame
      scrollableContent={false}
      header={
        <>
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBackAttempt}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Quay lại danh sách màn hình"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-5 w-px bg-slate-200 dark:border-slate-800" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {isCreate ? 'Tạo màn hình MES mô phỏng mới' : `Chi tiết màn hình · ${draft.name || 'Chưa đặt tên'}`}
                </h1>
                {draft.config?.workflow && (
                  <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-medium">
                    @{draft.config.workflow}
                  </span>
                )}
                {hasChanges && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic">
                    (Có thay đổi chưa lưu)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="management-actions flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBackAttempt}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving || (!hasChanges && !isCreate)}
            >
              {isCreate ? 'Tạo màn hình' : 'Lưu màn hình'}
            </Button>
          </div>
        </>
      }
      status={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <span>
            Màn hình mô phỏng MES · {draft.config?.workflow || 'complete_operation'}
          </span>
          <span>{hasChanges ? 'Bản nháp có thay đổi' : 'Đã đồng bộ với máy chủ'}</span>
        </div>
      }
    >
      {/* 2-Column Split Workspace (100% Flat Edge-to-Edge) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] bg-white dark:bg-slate-950 overflow-hidden">
        {/* Left Column: Form Configuration */}
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Cấu hình nghiệp vụ MES
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              <div className="py-2.5 first:pt-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên màn hình mô phỏng <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={draft.name}
                  onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Hoàn thành thao tác bồi duplex"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nghiệp vụ trên màn hình <span className="text-rose-500">*</span>
                </label>
                <Select
                  size="sm"
                  value={draft.config.workflow}
                  onChange={e => changeWorkflow(e?.target?.value ?? e)}
                  options={workflowOptions}
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô tả tình huống
                </label>
                <input
                  value={draft.description}
                  onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Bối cảnh hoặc mục đích của bài mô phỏng"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Yêu cầu thao tác (Mission) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={draft.config.mission}
                  onChange={e => updateConfig('mission', e.target.value)}
                  placeholder="Mô tả đề bài và yêu cầu thí sinh thực hiện trên màn hình MES"
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã lệnh công đoạn <span className="text-rose-500">*</span>
                </label>
                <input
                  value={draft.config.workOrder}
                  onChange={e => updateConfig('workOrder', e.target.value)}
                  placeholder="CD05-1026-0626(683)"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-mono font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none"
                  required
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thao tác sản xuất <span className="text-rose-500">*</span>
                </label>
                <input
                  value={draft.config.operation}
                  onChange={e => updateConfig('operation', e.target.value)}
                  placeholder="Thao tác bồi duplex"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none"
                  required
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Máy sản xuất
                </label>
                <input
                  value={draft.config.machine}
                  onChange={e => updateConfig('machine', e.target.value)}
                  placeholder="HN-BOI-01"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã vật tư
                </label>
                <input
                  value={draft.config.materialCode}
                  onChange={e => updateConfig('materialCode', e.target.value)}
                  placeholder="ACU-BSB-00253"
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-mono font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none"
                />
              </div>

              <div className="py-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số lượng cần đạt <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={draft.config.requiredQty}
                  onChange={e => updateConfig('requiredQty', e.target.value)}
                  className="w-full h-8 px-0 border-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none ring-0 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Answer / Grading Rules */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[11px]">
                Đáp án chuẩn hệ thống
              </span>
              {draft.config.workflow === 'complete_operation' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">SL đạt</label>
                    <input
                      type="number"
                      min="0"
                      value={draft.config.goodQty}
                      onChange={e => updateConfig('goodQty', e.target.value)}
                      className="w-full h-7 border border-slate-200 dark:border-slate-800 rounded bg-transparent px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">SL phế</label>
                    <input
                      type="number"
                      min="0"
                      value={draft.config.scrapQty}
                      onChange={e => updateConfig('scrapQty', e.target.value)}
                      className="w-full h-7 border border-slate-200 dark:border-slate-800 rounded bg-transparent px-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {draft.config.workflow === 'receive_material' && (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Kho xuất đúng</label>
                    <input
                      value={draft.config.warehouseFrom}
                      onChange={e => updateConfig('warehouseFrom', e.target.value)}
                      className="w-full h-7 border border-slate-200 dark:border-slate-800 rounded bg-transparent px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">Kho nhập đúng</label>
                    <input
                      value={draft.config.warehouseTo}
                      onChange={e => updateConfig('warehouseTo', e.target.value)}
                      className="w-full h-7 border border-slate-200 dark:border-slate-800 rounded bg-transparent px-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {draft.config.workflow === 'return_material' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">SL đã nhận</label>
                    <input
                      type="number"
                      min="0"
                      value={draft.config.issueQty}
                      onChange={e => updateConfig('issueQty', e.target.value)}
                      className="w-full h-7 border border-slate-200 dark:border-slate-800 rounded bg-transparent px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">SL cần trả</label>
                    <input
                      type="number"
                      min="0"
                      value={draft.config.returnQty}
                      onChange={e => updateConfig('returnQty', e.target.value)}
                      className="w-full h-7 border border-slate-200 dark:border-slate-800 rounded bg-transparent px-2 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Column: Flat 100% Live Interactive Simulation Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 overflow-hidden">
          <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              XEM TRƯỚC MÀN HÌNH NGƯỜI HỌC (LIVE INTERACTIVE MES)
            </span>
            <span className="text-slate-400">
              Thao tác thử nghiệm trực tiếp trên mô hình
            </span>
          </div>

          <div className="flex-1 overflow-auto p-4 lg:p-6">
            <InteractiveProductionSimulation
              key={`${draft.config.workflow}-${draft.config.workOrder}`}
              question={{
                id: 'preview-simulation',
                simulation: simulationPreview,
              }}
            />
          </div>
        </main>
      </div>

      {/* Confirmation Modal when Leaving with Unsaved Changes */}
      <Modal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Xác nhận rời khỏi màn hình"
        size="sm"
        density="compact"
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setShowExitConfirm(false)}>
              Ở lại chỉnh sửa
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setShowExitConfirm(false);
                onBack();
              }}
            >
              Rời khỏi & Hủy thay đổi
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Bạn có thay đổi chưa lưu cho màn hình mô phỏng này. Nếu quay lại bây giờ, các thông số vừa nhập sẽ bị mất.
        </p>
      </Modal>
    </ManagementFrame>
  );
}
