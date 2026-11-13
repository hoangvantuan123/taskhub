import {authService} from '../auth/auth.service';
export function directoryQuery({page=1,pageSize=25,search=[],searchColumns=[],filters=[],sort=[]}={}) {
 return {page,page_size:pageSize,search:Array.isArray(search)?search:[search],search_columns:searchColumns,filters,sort};
}
export function directoryService(resource) {
 const call=(operation,payload)=>authService.request('directory_'+operation,{payload:{resource,...payload}});
 return {
  query:options=>call('q',{query:directoryQuery(options)}),
  add:record=>call('a',{record}),
  update:(idSeq,record,rowVersion)=>call('u',{id_seq:idSeq,record,row_version:String(rowVersion||'')}),
  remove:(idSeq,rowVersion)=>call('d',{id_seq:idSeq,row_version:String(rowVersion||'')}),
  async all(options={}) {
   let page=1,rows=[],result;
   do {result=await this.query({...options,page,pageSize:200});rows.push(...result.rows);page++;}while(rows.length<result.total&&result.rows.length);
   return rows;
  },
 };
}
export const directories=Object.freeze(Object.fromEntries(['accounts','groups','organization','courses','exams','settings'].map(resource=>[resource,directoryService(resource)])));
