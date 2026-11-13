import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, Factory, RotateCcw, Search, X } from 'lucide-react';

const fallback = {
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
};

const workflowNames = {
  complete_operation: 'Hoàn thành thao tác',
  receive_material: 'Nhận vật liệu',
  return_material: 'Hoàn trả nguyên vật liệu',
};

export default function InteractiveProductionSimulation({ question, onComplete, readOnly = false }) {
  const simulation = question?.simulation || {};
  const config = { ...fallback, ...(simulation.config || {}) };
  const [open, setOpen] = useState(false);
  const [good, setGood] = useState(String(config.goodQty));
  const [scrap, setScrap] = useState(String(config.scrapQty));
  const [quantity, setQuantity] = useState(String(config.issueQty));
  const [returnQuantity, setReturnQuantity] = useState(String(config.returnQty));
  const [from, setFrom] = useState(config.warehouseFrom);
  const [to, setTo] = useState(config.warehouseTo);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setOpen(false);
    setGood(String(config.goodQty)); setScrap(String(config.scrapQty));
    setQuantity(String(config.issueQty)); setReturnQuantity(String(config.returnQty));
    setFrom(config.warehouseFrom); setTo(config.warehouseTo); setNotice(''); setSuccess(false);
  }, [question?.id, simulation.id]);

  const submit = () => {
    if (readOnly) return;
    let correct = false;
    if (config.workflow === 'complete_operation') {
      correct = Number(good) === Number(config.goodQty) && Number(scrap) === Number(config.scrapQty)
        && Number(good) + Number(scrap) === Number(config.requiredQty);
    } else if (config.workflow === 'receive_material') {
      correct = Number(quantity) === Number(config.issueQty) && from === config.warehouseFrom && to === config.warehouseTo;
    } else {
      correct = Number(returnQuantity) === Number(config.returnQty);
    }
    if (!correct) {
      setNotice('Thông tin chưa khớp với yêu cầu của lệnh. Kiểm tra lại số lượng và kho đã chọn.');
      return;
    }
    setSuccess(true); setNotice('Thao tác đã được hệ thống MES ghi nhận.'); setOpen(false);
    onComplete?.({ action: config.workflow, isCorrect: true, timestamp: new Date().toISOString() });
  };

  const isComplete = config.workflow === 'complete_operation';
  const isReceive = config.workflow === 'receive_material';

  return (
    <div className="my-3 overflow-hidden rounded-md border border-slate-300 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {config.mission && <p className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">🎯 {config.mission}</p>}
      <header className="flex flex-wrap items-center justify-between gap-3 bg-[#294d91] px-4 py-2.5 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Máy bồi dingshung 1 <span className="text-emerald-200">Sẵn sàng</span></div>
        <div className="flex items-center gap-3 text-xs"><span>SẢN LƯỢNG　0 cái</span><span>TỐC ĐỘ　0/h</span><span>GS1 · Operator</span></div>
      </header>
      <div className="flex gap-5 border-b border-slate-200 px-4 pt-3 text-xs dark:border-slate-700"><span className="border-b-2 border-blue-600 pb-2 font-semibold text-blue-700">Lệnh chạy (54)</span><span className="pb-2 text-slate-500">Lệnh hoàn thành (285)</span></div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-700">
        <div className="flex min-w-52 flex-1 items-center gap-2 rounded-md border border-slate-300 px-2.5 py-2 text-xs text-slate-400"><Search size={14} /> Tìm: Lệnh công đoạn / Số lệnh thao tác / Thao tác...</div>
        <button type="button" className="rounded bg-yellow-300 px-3 py-2 text-xs font-semibold text-slate-900">Tìm</button>
        <span className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-600">Trạng thái　⌄</span>
      </div>
      <div className="overflow-x-auto p-3">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><tr>{['#','Trạng thái','Lệnh công đoạn','Số lệnh thao tác','Thao tác sản xuất','Mã hàng','Tên vật tư','SL cần đạt','Máy',''].map(x => <th className="border-b border-slate-200 px-2 py-2 font-medium dark:border-slate-700" key={x}>{x}</th>)}</tr></thead>
          <tbody><tr className="bg-yellow-100/80 dark:bg-yellow-950/30"><td className="px-2 py-3">1</td><td className="px-2">Tạm dừng</td><td className="px-2 font-semibold text-blue-800 dark:text-blue-300">{config.workOrder}</td><td className="px-2">TT2610-1498(242)</td><td className="px-2">{config.operation}</td><td className="px-2">{config.materialCode}</td><td className="px-2">{config.materialName}</td><td className="px-2">{Number(config.requiredQty).toLocaleString('vi-VN')}</td><td className="px-2">{config.machine}</td><td className="px-2"><button disabled={readOnly || success} type="button" onClick={() => { setOpen(true); setNotice(''); }} className="font-semibold text-blue-700 hover:underline disabled:text-slate-400">◉ Mở</button></td></tr></tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-700"><span><Factory size={13} className="mr-1 inline" /> Goldsun MES · Màn hình vận hành sản xuất</span><span>{success ? 'Đã ghi nhận thao tác' : 'Chọn “Mở” trên lệnh để thực hiện nghiệp vụ.'}</span></div>

      {open && <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-[8vh]" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label={workflowNames[config.workflow]} className="w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700"><h3 className="text-sm font-semibold">{workflowNames[config.workflow]} — {config.workOrder} · {config.operation}</h3><button type="button" aria-label="Đóng" onClick={() => setOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button></header>
          <div className="p-4">
            <div className="mb-4 rounded border border-slate-200 text-xs dark:border-slate-700">
              <div className="grid grid-cols-2 bg-slate-50 dark:bg-slate-800 sm:grid-cols-4">{[['Lệnh công đoạn',config.workOrder],['Thao tác',config.operation],['Máy',config.machine],['SL cần đạt',`${Number(config.requiredQty).toLocaleString('vi-VN')} Pcs`]].map(([label,value]) => <div key={label} className="border-b border-r border-slate-200 p-2.5 dark:border-slate-700"><span className="block text-slate-500">{label}</span><strong className="mt-1 block">{value}</strong></div>)}</div>
            </div>
            {isComplete ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs"><thead className="bg-slate-100 text-left dark:bg-slate-800"><tr><th className="p-2">Hàng</th><th className="p-2">SP đạt (Pcs)</th><th className="p-2">SP phế (Pcs)</th><th className="p-2 text-right">Tổng (auto)</th></tr></thead><tbody>{[['Gia công',good,setGood],['Bàn giao',good,setGood]].slice(0,1).map(([label,value,set]) => <tr key={label} className="border-b border-slate-200 dark:border-slate-700"><td className="p-2">{label}</td><td className="p-2"><input aria-label="Số sản phẩm đạt" type="number" min="0" value={value} disabled={readOnly} onChange={e => set(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-2 dark:border-slate-600 dark:bg-slate-950" /></td><td className="p-2"><input aria-label="Số sản phẩm phế" type="number" min="0" value={scrap} disabled={readOnly} onChange={e => setScrap(e.target.value)} className="w-full rounded border border-slate-300 px-2.5 py-2 dark:border-slate-600 dark:bg-slate-950" /></td><td className="p-2 text-right">{(Number(value) || 0) + (Number(scrap) || 0)}</td></tr>)}</tbody></table><div className="mt-3 flex flex-wrap gap-1.5">{[-10,-1,1,10,100].map(delta => <button key={delta} type="button" disabled={readOnly} onClick={() => setGood(String(Math.max(0, Number(good || 0) + delta)))} className="rounded border border-slate-300 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">{delta > 0 ? `+${delta}` : delta}</button>)}<button type="button" onClick={() => { setGood('0'); setScrap('0'); }} className="rounded border border-slate-300 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-600">Đặt lại</button></div></div>
            : isReceive ? <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-600 dark:text-slate-300">Kho xuất<select value={from} disabled={readOnly} onChange={e => setFrom(e.target.value)} className="mt-1 block h-10 w-full rounded border border-slate-300 bg-white px-2.5 text-sm dark:border-slate-600 dark:bg-slate-950"><option>{config.warehouseFrom}</option><option>GS1-TIN-01</option><option>GS1-PHO-02</option></select></label><label className="text-xs text-slate-600 dark:text-slate-300">Kho nhập<select value={to} disabled={readOnly} onChange={e => setTo(e.target.value)} className="mt-1 block h-10 w-full rounded border border-slate-300 bg-white px-2.5 text-sm dark:border-slate-600 dark:bg-slate-950"><option>{config.warehouseTo}</option><option>GS1-PHO-01</option><option>GS1-TIN-01</option></select></label><label className="text-xs text-slate-600 dark:text-slate-300">Số lượng nhận<input aria-label="Số lượng nhận" type="number" min="0" value={quantity} disabled={readOnly} onChange={e => setQuantity(e.target.value)} className="mt-1 block h-10 w-full rounded border border-slate-300 px-2.5 text-sm dark:border-slate-600 dark:bg-slate-950" /></label><div className="self-end text-xs text-slate-500">{config.materialCode} · {config.materialName}</div></div>
            : <div className="grid gap-3 sm:grid-cols-3"><div className="text-xs">Vật tư: <strong>{config.materialCode} · {config.materialName}</strong></div><div className="text-xs">Số lượng đã nhận: <strong>{Number(config.issueQty).toLocaleString('vi-VN')}</strong></div><label className="text-xs">SL hoàn trả<input aria-label="Số lượng hoàn trả" type="number" min="0" value={returnQuantity} disabled={readOnly} onChange={e => setReturnQuantity(e.target.value)} className="mt-1 block h-10 w-full rounded border border-slate-300 px-2.5 text-sm dark:border-slate-600 dark:bg-slate-950" /></label></div>}
            {notice && <p role="status" className={`mt-3 text-xs ${success ? 'text-emerald-700' : 'text-rose-700'}`}>{notice}</p>}
            <footer className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700"><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"><RotateCcw size={14} /> Hủy bỏ</button><button type="button" disabled={readOnly} onClick={submit} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#f2e83c] px-3 text-xs font-semibold text-slate-900 hover:bg-yellow-300 disabled:opacity-50"><ClipboardList size={14} />{isComplete ? 'Đồng ý — Hoàn thành' : isReceive ? 'Đồng ý nhận vật liệu' : 'Gửi yêu cầu hoàn'}</button></footer>
          </div>
        </section>
      </div>}
      {success && <div role="status" className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 size={15} /> Thao tác chính xác. Hệ thống đã ghi nhận kết quả mô phỏng.</div>}
    </div>
  );
}
