import { authService } from '../../../services/auth/auth.service';

const request = (path, options) => authService.requestGateway(path, options);
export const assessmentsApi = {
  list: () => request('v2/assessment/list'),
  get: id => request('v2/assessment/get', { body: { id } }),
  save: payload => request('v2/assessment/save', { body: payload }),
  publish: (id, payload) => request('v2/assessment/publish', { body: { ...payload, id } }),
  blueprints: mode => request('v2/assessment/blueprints/list', { body: { mode } }),
  saveBlueprint: payload => request('v2/assessment/blueprints/save', { body: payload }),
  // Ca thi (Exam Sessions)
  listSessions: () => request('v2/assessment/sessions/list'),
  saveSession: payload => request('v2/assessment/sessions/save', { body: payload }),
  deleteSession: id => request('v2/assessment/sessions/delete', { body: { id } }),
  // Động cơ thi bảo mật (Secure Attempts Engine)
  startAttempt: payload => request('v2/assessment/attempt/start', { body: payload }),
  heartbeatAttempt: payload => request('v2/assessment/attempt/heartbeat', { body: payload }),
  submitAttempt: payload => request('v2/assessment/attempt/submit', { body: payload }),
  // Nhóm / Lớp đào tạo (Training Groups - A U D Q)
  listGroups: () => request('v2/assessment/groups/list'),
  saveGroup: payload => request('v2/assessment/groups/save', { body: payload }),
  deleteGroup: id => request('v2/assessment/groups/delete', { body: { id } }),
  addGroupMember: (groupId, userId) => request('v2/assessment/groups/member/add', { body: { groupId, userId } }),
  removeGroupMember: (groupId, userId) => request('v2/assessment/groups/member/remove', { body: { groupId, userId } }),
  // Chấm bài thi (Grading - Q & U)
  listGradingQueue: () => request('v2/assessment/grading/queue'),
  getGradingDetail: id => request('v2/assessment/grading/detail', { body: { id } }),
  saveGradingScore: payload => request('v2/assessment/grading/save', { body: payload }),
  // Báo cáo & Phổ điểm (Reports - Q)
  getReportSummary: payload => request('v2/assessment/reports/summary', { body: payload || {} }),
};
