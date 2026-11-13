import React, { useMemo, useState } from 'react';
import Modal from '../../../shared/ui/Modal';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';
import useQuestionCatalogs from '../hooks/useQuestionCatalogs';

const fields = [['levelId','level','Cấp độ'],['formatId','question_format','Định dạng chuyên môn'],['specialtyId','specialty','Chuyên môn'],['topicId','question_topic','Chủ đề'],['targetGroupId','target_group','Nhóm đối tượng'],['cognitiveLevelId','cognitive_level','Mức độ nhận thức']];
const sample = '[CÂU HỎI 1]\nNội dung: Nhập nội dung câu hỏi\nA: Phương án A\nB: Phương án B\nC: Phương án C\nD: Phương án D\nĐáp án đúng: A\nGiải thích: Giải thích đáp án';
export default function BatchImportQuestionsModal({ open, onClose, onImportSuccess, folderId = '' }) {
  const catalogs = useQuestionCatalogs();
  const [defaults,setDefaults] = useState({});
  const [text,setText] = useState('');
  const [error,setError] = useState('');
  const [saving,setSaving] = useState(false);
  const parsed = useMemo(() => {
    if (!text.trim()) return { rows: [], error: '' };
    try {
      const rows = text.split(/\[CÂU HỎI\s+\d+\]/i).filter(block => block.trim()).map(block => {
        const row = { ...defaults, folderId, content:'', explanation:'', type:'single_choice', status:'draft', options:[], isCritical:false };
        let correct = '';
        for (const line of block.split('\n').map(item=>item.trim()).filter(Boolean)) {
          const colon = line.indexOf(':'); if (colon < 0) continue;
          const key = line.slice(0,colon).toLocaleLowerCase('vi'); const value = line.slice(colon+1).trim();
          if (key==='nội dung') row.content=value;
          else if(key==='giải thích') row.explanation=value;
          else if(key==='đáp án đúng') correct=value.toUpperCase();
          else if(key==='điểm liệt') row.isCritical=['có','true'].includes(value.toLowerCase());
          else if(/^[a-d]$/.test(key)) row.options.push({id:key,text:value,isCorrect:false});
          else if(key==='level'||key==='format') {
            const catalog = catalogs.data[key==='level'?'level':'question_format'];
            const option = catalog?.options.find(item=>item.active&&item.value===value);
            if (!option) throw new Error('Mã '+key+' không hợp lệ: '+value);
            row[key==='level'?'levelId':'formatId']=option.id;
          }
        }
        row.options=row.options.map(option=>({...option,isCorrect:option.id.toUpperCase()===correct}));
        if(!row.content||row.options.length<2||row.options.filter(option=>option.isCorrect).length!==1) throw new Error('Mỗi câu cần nội dung, ít nhất hai phương án và đúng một đáp án đúng.');
        return row;
      });
      if(rows.length>100) throw new Error('Mỗi lần nhập tối đa 100 câu hỏi.');
      return {rows,error:''};
    } catch(failure) {return {rows:[],error:failure.message};}
  },[text,defaults,catalogs.data,folderId]);
  const save=async()=>{
    if(parsed.rows.some(row=>fields.some(([field])=>!row[field]))) {setError('Chọn đủ sáu thuộc tính cho các câu hỏi.');return;}
    setSaving(true);setError('');
    try {await onImportSuccess(parsed.rows);setText('');onClose();} catch(failure){setError(failure.message);}finally{setSaving(false);}
  };
  return <Modal open={open} onClose={()=>{if(!saving)onClose();}} title="Nhập hàng loạt câu hỏi" size="xl" density="comfortable" footer={<><Button variant="outline" disabled={saving} onClick={onClose}>Hủy</Button><Button disabled={!parsed.rows.length||saving||catalogs.loading||!!catalogs.error} loading={saving} onClick={save}>Nhập {parsed.rows.length} câu hỏi</Button></>}>
    <div className="flex flex-col gap-4">
      {(error||parsed.error||catalogs.error)&&<p role="alert" className="text-sm text-rose-600">{error||parsed.error||catalogs.error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{fields.map(([field,key,label])=><label key={field} className="text-sm font-semibold flex flex-col gap-2">{label}<Select value={defaults[field]||''} onChange={event=>setDefaults(previous=>({...previous,[field]:event.target.value,...(field==='specialtyId'?{topicId:''}:{})}))} options={[{value:'',label:'Chọn '+label.toLowerCase()},...(catalogs.data[key]?.options||[]).filter(option=>option.active&&(key!=='level'||option.value!=='All')&&(key!=='question_topic'||option.parentId===defaults.specialtyId)).map(option=>({value:option.id,label:option.label}))]} /></label>)}</div>
      <div className="flex justify-between items-center"><span className="text-sm font-semibold">Nội dung nhập</span><Button size="sm" variant="outline" onClick={()=>setText(sample)}>Nạp mẫu</Button></div>
      <textarea rows={9} className="w-full p-3 text-sm font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" value={text} onChange={event=>setText(event.target.value)} placeholder={sample}/>
      <p className="text-sm text-slate-500">Câu hỏi được lưu ở trạng thái bản nháp. Có thể dùng Level: L0 và Format: theory để ghi đè các lựa chọn mặc định cho từng câu.</p>
      {parsed.rows.length>0&&<div className="max-h-52 overflow-auto border border-slate-200 dark:border-slate-700 rounded-md">{parsed.rows.map((row,index)=><div key={index} className="p-3 border-b border-slate-100 dark:border-slate-800 text-sm">{index+1}. {row.content} · {row.options.length} phương án</div>)}</div>}
    </div>
  </Modal>;
}
