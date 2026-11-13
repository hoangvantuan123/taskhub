import React, { useState, useEffect } from 'react';
import Button from '../../../shared/ui/Button';
import Badge from '../../../shared/ui/Badge';
import Select from '../../../shared/ui/Select';
import {
  Activity,
  Gauge,
  Thermometer,
  Zap,
  CheckCircle,
  AlertOctagon,
  RefreshCw,
  Power,
  Sliders,
  Layers,
} from 'lucide-react';
import InteractiveProductionSimulation from './InteractiveProductionSimulation';

export default function InteractiveHmiSimulation({
  question,
  onComplete,
  readOnly = false,
  initialAnswer = null,
}) {
  const simulation = question?.simulation || {};
  const config = simulation.config || {};
  if (simulation.templateKey === 'production_ui' || config.workflow) {
    return <InteractiveProductionSimulation question={question} onComplete={onComplete} readOnly={readOnly} initialAnswer={initialAnswer} />;
  }
  const isEstopCase = simulation.templateKey
    ? simulation.templateKey === 'estop'
    : question?.simulationType === 'estop' || question?.id?.includes('estop') || question?.content?.toLowerCase().includes('khẩn cấp');
  const initialTemperature = Number(config.initialTemperature ?? (isEstopCase ? 94.2 : 72.4));
  const initialPressure = Number(config.initialPressure ?? (isEstopCase ? 6.8 : 3.8));
  const minSpeed = Number(config.minSpeed ?? 1000);
  const maxSpeed = Number(config.maxSpeed ?? 1400);
  const targetSpeed = Number(config.targetSpeed ?? 1200);
  const targetTank = config.targetTank || 'tank-2';
  const workOrder = config.workOrder || 'WO-MES-2026-901';

  // Simulation State
  const [mode, setMode] = useState('manual'); // 'manual' | 'auto'
  const [selectedTank, setSelectedTank] = useState('tank-1');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(workOrder);
  const [stirringSpeed, setStirringSpeed] = useState(800);
  const [isRunning, setIsRunning] = useState(false);
  const [isEstopTriggered, setIsEstopTriggered] = useState(false);
  const [temperature, setTemperature] = useState(initialTemperature);
  const [pressure, setPressure] = useState(initialPressure);
  const [actionLog, setActionLog] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setMode('manual');
    setSelectedTank('tank-1');
    setSelectedWorkOrder(workOrder);
    setStirringSpeed(800);
    setIsRunning(false);
    setIsEstopTriggered(false);
    setTemperature(initialTemperature);
    setPressure(initialPressure);
    setActionLog([]);
    setIsSuccess(false);
  }, [question?.id, simulation.id, initialTemperature, initialPressure, workOrder]);

  // Periodic sensor fluctuation
  useEffect(() => {
    if (isEstopTriggered) return;
    const interval = setInterval(() => {
      setTemperature((t) => +(t + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setPressure((p) => +(p + (Math.random() * 0.1 - 0.05)).toFixed(2));
    }, 1500);
    return () => clearInterval(interval);
  }, [isEstopTriggered]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setActionLog((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 5)]);
  };

  // Handle Mode Switch
  const handleToggleMode = (newMode) => {
    if (readOnly || isEstopTriggered) return;
    setMode(newMode);
    addLog(`Đổi chế độ vận hành liên động sang: ${newMode.toUpperCase()}`);
  };

  // Handle Emergency Stop Action
  const handleEmergencyStop = () => {
    if (readOnly) return;
    setIsEstopTriggered(true);
    setIsRunning(false);
    setStirringSpeed(0);
    setPressure(1.1);
    addLog('⚠️ KÍCH HOẠT NÚT DỪNG KHẨN CẤP (E-STOP)! Toàn bộ van xả và động cơ khuấy ngắt liên động Level 1.');

    if (isEstopCase) {
      setIsSuccess(true);
      if (onComplete) {
        onComplete({
          action: 'E-STOP_TRIGGERED',
          mode,
          timestamp: new Date().toISOString(),
          isCorrect: true,
        });
      }
    }
  };

  // Handle MES Dispatch Action
  const handleDispatch = () => {
    if (readOnly || isEstopTriggered) return;

    if (mode !== 'auto') {
      alert('⚠️ Theo chuẩn ISA-95, bạn phải chuyển trạm sang chế độ [TỰ ĐỘNG (AUTO)] trước khi nạp lệnh điều độ MES Level 3!');
      return;
    }

    if (selectedTank !== targetTank) {
      alert(`⚠️ Sai bồn cấp liệu! Quy trình yêu cầu ${targetTank.toUpperCase()}.`);
      return;
    }

    if (stirringSpeed < minSpeed || stirringSpeed > maxSpeed || stirringSpeed !== targetSpeed) {
      alert(`⚠️ Tốc độ khuấy phải đạt ${targetSpeed} RPM và nằm trong khoảng ${minSpeed} - ${maxSpeed} RPM!`);
      return;
    }

    setIsRunning(true);
    setIsSuccess(true);
    addLog(`✅ Lệnh MES ${selectedWorkOrder} nạp thành công xuống SCADA L2 -> ${selectedTank.toUpperCase()} -> Tốc độ: ${stirringSpeed} rpm.`);

    if (onComplete) {
      onComplete({
        action: 'MES_DISPATCH_SUCCESS',
        mode: 'auto',
        tank: selectedTank,
        workOrder: selectedWorkOrder,
        speed: stirringSpeed,
        timestamp: new Date().toISOString(),
        isCorrect: true,
      });
    }
  };

  const handleReset = () => {
    setIsEstopTriggered(false);
    setIsRunning(false);
    setMode('manual');
    setSelectedTank('tank-1');
    setSelectedWorkOrder(workOrder);
    setStirringSpeed(800);
    setTemperature(initialTemperature);
    setPressure(initialPressure);
    setIsSuccess(false);
    addLog('Đã hoàn nguyên cấu hình trạm mô phỏng về mặc định.');
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 my-3 text-slate-800 dark:text-slate-100 shadow-xs transition-colors">
      {/* Console Top Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <Activity size={18} className="text-emerald-600 dark:text-emerald-400" />
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {simulation.name || 'MÀN HÌNH MÔ PHỎNG SCADA / MES HMI — TRẠM TRỘN SỐ 04'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {simulation.description || 'Tích hợp chuẩn ISA-95: Cảm biến L0 → PLC L1 → SCADA L2 → Lệnh MES L3'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            SCADA L2
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            MES L3
          </span>
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={handleReset} className="!h-7 !text-xs !px-2">
            Đặt lại
          </Button>
        </div>
      </div>

      {/* Target Mission Brief */}
      <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 text-blue-950 dark:text-blue-200 text-xs leading-relaxed mb-4">
        🎯 <strong>Yêu cầu thao tác trên mô phỏng:</strong>{' '}
        <span className={isEstopCase ? 'text-rose-700 dark:text-rose-400 font-semibold' : ''}>
          {config.mission || (isEstopCase
            ? 'Nhiệt độ và áp suất trạm đang tăng vượt ngưỡng an toàn! Hãy kích hoạt nút dừng khẩn cấp để bảo vệ thiết bị.'
            : `Chuyển sang AUTO, chọn ${targetTank.toUpperCase()}, cài tốc độ trong khoảng ${minSpeed}–${maxSpeed} RPM rồi xác nhận lệnh MES.`)}
        </span>
      </div>

      {/* Grid: Telemetry Gauges & Interactive Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Live Gauges */}
        <div className="bg-slate-50/40 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-sky-700 dark:text-sky-400 mb-3 flex items-center gap-1.5">
              <Gauge size={15} /> THÔNG SỐ ĐO THỜI GIAN THỰC (L0 / L1)
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Temperature */}
              <div
                className={`p-3 rounded-xl text-center border transition-colors ${
                  temperature > 90
                    ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950'
                }`}
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                  <Thermometer size={14} className={temperature > 90 ? 'text-rose-600' : 'text-sky-600'} /> NHIỆT ĐỘ
                </div>
                <div
                  className={`text-xl font-black mt-1 ${
                    temperature > 90 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {temperature} °C
                </div>
                <div className={`text-[10px] font-semibold mt-0.5 ${temperature > 90 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {temperature > 90 ? '⚠️ QUÁ NHIỆT' : 'Bình thường'}
                </div>
              </div>

              {/* Pressure */}
              <div
                className={`p-3 rounded-xl text-center border transition-colors ${
                  pressure > 6.0
                    ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950'
                }`}
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                  <Gauge size={14} className={pressure > 6.0 ? 'text-rose-600' : 'text-sky-600'} /> ÁP SUẤT
                </div>
                <div
                  className={`text-xl font-black mt-1 ${
                    pressure > 6.0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {pressure} Bar
                </div>
                <div className={`text-[10px] font-semibold mt-0.5 ${pressure > 6.0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {pressure > 6.0 ? '⚠️ CAO ÁP' : 'Áp suất chuẩn'}
                </div>
              </div>
            </div>
          </div>

          {/* Motor Status & Mode Indicator */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Động cơ khuấy:</span>
            <span
              className={`font-black tracking-wide ${
                isEstopTriggered ? 'text-rose-600' : isRunning ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
              }`}
            >
              {isEstopTriggered ? 'NGẮT E-STOP' : isRunning ? `RUNNING (${stirringSpeed} RPM)` : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Right: Interactive Operator Controls */}
        <div className="bg-slate-50/40 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-sky-700 dark:text-sky-400 mb-3 flex items-center gap-1.5">
              <Sliders size={15} /> {isEstopCase ? 'BẢNG ĐIỀU KHIỂN AN TOÀN (L1)' : 'BẢNG ĐIỀU KHIỂN & ĐIỀU ĐỘ MES (L3)'}
            </div>

            {!isEstopCase ? <>
            {/* Mode Switch: Manual vs Auto */}
            <div className="mb-3">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                Chế độ vận hành liên động:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={readOnly || isEstopTriggered}
                  onClick={() => handleToggleMode('manual')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    mode === 'manual'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  THỦ CÔNG (MANUAL)
                </button>
                <button
                  type="button"
                  disabled={readOnly || isEstopTriggered}
                  onClick={() => handleToggleMode('auto')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    mode === 'auto'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  TỰ ĐỘNG (AUTO)
                </button>
              </div>
            </div>

            {/* Tank Selector */}
            <div className="mb-3">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                Định tuyến Bồn trộn (Tank Routing):
              </label>
              <Select
                size="sm"
                disabled={readOnly || isEstopTriggered}
                value={selectedTank}
                onChange={(e) => {
                  setSelectedTank(e.target.value);
                  addLog(`Chọn bồn cấp: ${e.target.value}`);
                }}
                options={[
                  { value: 'tank-1', label: 'Tank 01 — Bồn Pha Dung Môi Sơ Cấp' },
                  { value: 'tank-2', label: 'Tank 02 — Bồn Phản Ứng Chính (Yêu cầu)' },
                  { value: 'tank-3', label: 'Tank 03 — Bồn Chứa & Lưu Trữ Đệm' },
                ]}
              />
            </div>

            {/* Setpoint Speed Slider */}
            <div className="mb-4">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>Cài đặt Tốc độ khuấy · yêu cầu {targetSpeed} RPM:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{stirringSpeed} RPM</strong>
              </div>
              <input
                type="range"
                min="400"
                max="1800"
                step="50"
                disabled={readOnly || isEstopTriggered}
                value={stirringSpeed}
                onChange={(e) => setStirringSpeed(+e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
            </> : (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                Nhiệt độ {initialTemperature} °C · Áp suất {initialPressure} bar. Kiểm tra tín hiệu và kích hoạt E-STOP để ngắt thiết bị.
              </p>
            )}
          </div>

          {/* Action Execution Buttons */}
          <div className="flex gap-2">
            {!isEstopCase && (
            <button
              type="button"
              disabled={readOnly || isEstopTriggered || isSuccess}
              onClick={handleDispatch}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-white ${
                isSuccess
                  ? 'bg-emerald-600'
                  : 'bg-emerald-700 hover:bg-emerald-800 shadow-sm'
              }`}
            >
              <Zap size={15} /> {isSuccess ? 'ĐÃ NẠP LỆNH MES' : 'XÁC NHẬN DISPATCH'}
            </button>
            )}

            {/* E-Stop Button */}
            {isEstopCase && (
            <button
              type="button"
              disabled={readOnly || isEstopTriggered}
              onClick={handleEmergencyStop}
              className="py-2 px-3.5 rounded-lg font-black text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Power size={15} /> E-STOP
            </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Logs */}
      <div className="mt-3.5 p-3 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-slate-200">
        <div className="text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-wider">
          NHẬT KÝ SỰ KIỆN SHOPFLOOR (OPC-UA / MES DISPATCH LOG):
        </div>
        {actionLog.length === 0 ? (
          <div className="text-xs text-slate-500 italic">
            Chưa có thao tác nào được thực hiện trên bảng mô phỏng.
          </div>
        ) : (
          <div className="flex flex-col gap-1 font-mono text-[11px]">
            {actionLog.map((log, idx) => (
              <div
                key={idx}
                className={log.includes('✅') ? 'text-emerald-400' : log.includes('⚠️') ? 'text-rose-400' : 'text-slate-300'}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completion Status Alert */}
      {isSuccess && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Thao tác mô phỏng chính xác! Hệ thống đã ghi nhận kết quả bài làm của bạn.</span>
        </div>
      )}
    </div>
  );
}
