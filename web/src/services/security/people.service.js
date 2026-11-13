import {directories} from '../directory/directory.service';
import { authService } from '../auth/auth.service';
import { taskService } from '../../features/tasks/services/taskService';
const call = (action, payload) => authService.request(action, { payload });
const userVersions=new Map(),groupVersions=new Map(),directoryVersions=new Map();
const rememberGroups=rows=>{for(const row of rows)groupVersions.set(row.key,row.RowVersion);return rows};
export const peopleService = {
  list: async (search='',page=1,pageSize=20,filters={},activeTab='users',sort={key:'username',direction:1}) => {
    const queryFilters=Object.entries(filters||{}).filter(([,value])=>value!=='').map(([column,value])=>({column,op:column==='groups'?'contains':'eq',values:[column==='enabled'?value==='true':value]}));
    if(activeTab==='pending') queryFilters.push({column:'registration_source',op:'eq',values:['external']},{column:'approved',op:'eq',values:[false]});
    else queryFilters.push({column:'approved',op:'eq',values:[true]});
    const sortColumn=sort.key==='username'?'username':sort.key==='name'?'label':sort.key;
    const [result,lookups]=await Promise.all([
      directories.accounts.query({page,pageSize,search:search?[search]:[],searchColumns:['username','label','email','contact_email','phone','department','position','job_role','groups'],filters:queryFilters,sort:[{column:sortColumn,direction:sort.direction===-1?'desc':'asc'}]}),
      call('people',{lookups_only:true}),
    ]);
    for(const row of result.rows||[]) userVersions.set(row.id,row.RowVersion);
    for(const row of lookups.directory||[]) directoryVersions.set(row.kind+':'+row.key,row.RowVersion);
    return {users:result.rows||[],total:result.total||0,page:result.page||page,page_size:result.page_size||pageSize,directory:lookups.directory||[]};
  },
  groups: async () => {
    const res = await call('group_list');
    rememberGroups(res.groups || []);
    return res;
  },
  queryGroups: async options => {
    const res = await call('group_list');
    const all = rememberGroups(res.groups || []);
    let rows = all;
    if (options?.search?.length) {
      const q = options.search.join(' ').toLowerCase();
      rows = rows.filter(r => (r.key || '').toLowerCase().includes(q) || (r.label || '').toLowerCase().includes(q));
    }
    if (options?.filters?.length) {
      for (const f of options.filters) {
        if (f.column === 'enabled') {
          rows = rows.filter(r => r.enabled === f.values[0]);
        }
      }
    }
    const total = rows.length;
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const start = (page - 1) * pageSize;
    return {
      rows: rows.slice(start, start + pageSize),
      total,
      page,
      page_size: pageSize
    };
  },
  update: payload => call('user_update', {...payload,RowVersions:payload.RowVersions||Object.fromEntries(payload.ids.map(id=>[id,payload.ids.length===1?(payload.RowVersion||userVersions.get(id)):userVersions.get(id)]))}),
  create: payload => call('user_create', payload),
  sendApprovalOtp: id => call('user_otp_send', { id }),
  approve: id => call('user_approve', { id }),
  resetPassword: (id, password, rowVersion) => call('user_update', { ids: [id], password, RowVersion: rowVersion || userVersions.get(id) }),
  toggleLock: (id, enabled, rowVersion) => call('user_update', { ids: [id], enabled, RowVersion: rowVersion || userVersions.get(id) }),
  bulkLock: (ids, enabled) => call('user_update', { ids, enabled, RowVersions: Object.fromEntries(ids.map(id => [id, userVersions.get(id)])) }),
  saveGroup: payload => call('group_save', {
    key: payload.key,
    label: payload.label,
    enabled: payload.enabled !== false,
    department: payload.department || '',
    position: payload.position || '',
    job_role: payload.job_role || '',
    permissions: (payload.permissions || []).map(p => ({
      module: p.module,
      actions: [...(p.actions || [])]
    })),
    RowVersion: payload.RowVersion || groupVersions.get(payload.key)
  }),
  deleteUser: (id) => taskService.deleteUser(id),
  bulkDeleteUsers: (ids) => taskService.deleteUsers(ids),
  deleteGroup: (idSeq, rowVersion, key) => {
    if (key) return call('group_delete', { key, RowVersion: rowVersion || groupVersions.get(key) });
    return directories.groups.remove(idSeq, rowVersion);
  },
  members: (key, ids, remove = false) => call('group_members', { key, ids, remove }),
  membersMany: (keys, ids, remove = false) => call('group_members', { keys, ids, remove }),
  saveDirectory: payload => call('directory_save', {...payload,RowVersion:payload.RowVersion||directoryVersions.get(payload.kind+':'+payload.key)}),
};
