import React from 'react';
import Input from '../../../shared/ui/Input';
import Select from '../../../shared/ui/Select';
import PermissionTree from './PermissionTree';
import {copyGroupPermissions} from '../permissionTree';
import './permissionGroupEditor.css';

export default function PermissionGroupEditor({draft,onChange,editing=false,groups=[],modules=[],hierarchy,sourceGroup='',onSourceGroupChange,disabled=false}) {
 const update=(key,value)=>onChange({...draft,[key]:value});
 return <div className="permission-group-editor">
  <aside className="permission-group-sidebar">
  <section className="permission-group-info">
   <Input density="comfortable" label="Tên nhóm quyền" required maxLength={120} disabled={disabled} value={draft.label} onChange={event=>update('label',event.target.value)}/>
   <label className="permission-group-enabled"><input type="checkbox" disabled={disabled} checked={draft.enabled} onChange={event=>update('enabled',event.target.checked)}/>Đang hoạt động</label>
  </section>
  <div className="permission-group-templates">
   {!editing&&<Select size="sm" className="permission-group-copy" aria-label="Sao chép quyền từ nhóm" placeholder="Sao chép quyền từ nhóm…" disabled={disabled} value={sourceGroup} onChange={event=>{const key=event.target.value;onSourceGroupChange?.(key);update('permissions',copyGroupPermissions(groups.find(group=>group.key===key)));}} options={[{value:'',label:'Bắt đầu với nhóm trống'},...groups.map(group=>({value:group.key,label:group.label}))]}/>}
   <span className="text-xs text-slate-500">{draft.permissions?.length||0} chức năng được cấp quyền</span>
  </div>

  </aside>
  <section className="permission-group-tree border border-slate-200 dark:border-slate-800 rounded-md">
   <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800"><h3 className="text-sm font-semibold">Quyền theo module & chức năng</h3><p className="text-xs text-slate-500 mt-1">Mở module để chọn thao tác. Quyền được lưu riêng cho nhóm này.</p></div>
   <div className="permission-group-tree-content"><PermissionTree fill hierarchy={hierarchy} modules={modules} value={draft.permissions} disabled={disabled} onChange={permissions=>update('permissions',permissions)}/></div>
  </section>
 </div>;
}
