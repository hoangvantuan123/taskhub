import { authService } from '../../../services/auth/auth.service';
import { httpRequest } from '../../../services/http/httpClient';

async function callTaskApi(path, payload = {}) {
  return await authService.requestGateway(path, {
    method: 'POST',
    body: payload,
  });
}

export const taskService = {
  async listTasks(filters = {}) {
    try {
      const res = await callTaskApi('tasks/list', filters);
      return res?.data || [];
    } catch (e) {
      console.error('listTasks error:', e);
      return [];
    }
  },

  async getTasks(filters = {}) {
    return this.listTasks(filters);
  },

  async getStats() {
    try {
      const res = await callTaskApi('tasks/stats', {});
      return res?.data || null;
    } catch (e) {
      console.error('getStats error:', e);
      return null;
    }
  },

  async getTaskDetail(id) {
    try {
      const res = await callTaskApi('tasks/detail', { id });
      return res?.data || null;
    } catch (e) {
      console.error('getTaskDetail error:', e);
      return null;
    }
  },

  async createTask(payload) {
    const res = await callTaskApi('tasks/create', payload);
    return res?.data;
  },

  async updateTask(payload) {
    const res = await callTaskApi('tasks/update', payload);
    return res?.data;
  },

  async toggleImportant(id, isImportant = true) {
    const res = await callTaskApi('tasks/important', { id, isImportant, important: isImportant });
    return res?.data;
  },

  async archiveTask(id, isArchived = true) {
    const res = await callTaskApi('tasks/archive', { id, isArchived, archived: isArchived });
    return res?.data;
  },

  async deleteTask(id) {
    const res = await callTaskApi('tasks/delete', { id });
    return res?.data;
  },

  async restoreTask(id) {
    const res = await callTaskApi('tasks/restore', { id });
    return res?.data;
  },

  async purgeTask(id) {
    const res = await callTaskApi('tasks/purge', { id });
    return res?.data;
  },

  async getTrashTasks(filters = {}) {
    return this.listTasks({ ...filters, view: 'trash' });
  },

  async updateTaskStatus(id, status) {
    const res = await callTaskApi('tasks/status/update', { id, status });
    return res?.data;
  },

  async reportProgress({ taskId, progress, currentProgress, content, summary, issues, workHours, attachmentUrl }) {
    const res = await callTaskApi('tasks/progress/report', {
      taskId,
      progress: progress ?? currentProgress ?? 0,
      currentProgress: currentProgress ?? progress ?? 0,
      content: content || summary || '',
      summary: summary || content || '',
      issues: issues || '',
      workHours: Number(workHours || 0),
      attachmentUrl: attachmentUrl || '',
    });
    return res?.data;
  },

  async submitFeedback({ taskId, logId, feedbackStatus, supervisorFeedback }) {
    const res = await callTaskApi('tasks/feedback/submit', {
      taskId,
      logId,
      feedbackStatus,
      supervisorFeedback,
    });
    return res?.data;
  },

  async addChecklistItem(taskId, title) {
    const res = await callTaskApi('tasks/checklist/add', { taskId, title });
    return res?.data;
  },

  async toggleChecklistItem(itemId, completed) {
    const res = await callTaskApi('tasks/checklist/toggle', { itemId, completed });
    return res?.data;
  },

  async addComment(taskId, content, authorName = '', roleName = '') {
    const res = await callTaskApi('tasks/comments/add', { taskId, content, authorName, roleName });
    return res?.data;
  },

  async submitApprovalRequest({ taskId, requestNote }) {
    const res = await callTaskApi('tasks/approval/request', { taskId, requestNote });
    return res?.data;
  },

  async requestApproval(taskId, requestNote = '') {
    return this.submitApprovalRequest({ taskId, requestNote });
  },

  async processApproval({ requestId, taskId, decision, approvalNote }) {
    const res = await callTaskApi('tasks/approval/process', {
      requestId: requestId || taskId,
      taskId: taskId || requestId,
      decision,
      approvalNote,
    });
    return res?.data;
  },

  async decideApproval(taskIdOrRequestId, statusOrDecision, comment = '') {
    return this.processApproval({
      requestId: taskIdOrRequestId,
      taskId: taskIdOrRequestId,
      decision: statusOrDecision,
      approvalNote: comment,
    });
  },

  async listPendingApprovals(status = '') {
    try {
      const res = await callTaskApi('tasks/approval/list', { status });
      return res?.data || [];
    } catch (e) {
      console.error('listPendingApprovals error:', e);
      return [];
    }
  },

  async listProjects() {
    try {
      const res = await callTaskApi('projects/list', {});
      return res?.data || [];
    } catch (e) {
      console.error('listProjects error:', e);
      return [];
    }
  },

  async getProjects() {
    return this.listProjects();
  },

  async createProject(payload) {
    const res = await callTaskApi('projects/create', payload);
    return res?.data;
  },

  async updateProject(payload) {
    const res = await callTaskApi('projects/update', payload);
    return res?.data;
  },

  async deleteProject(id) {
    const res = await callTaskApi('projects/delete', { id });
    return res?.data;
  },

  async listMilestones(projectId = '') {
    try {
      const res = await callTaskApi('projects/milestones/list', { projectId });
      return res?.data || [];
    } catch (e) {
      console.error('listMilestones error:', e);
      return [];
    }
  },

  async getMilestones(projectId = '') {
    return this.listMilestones(projectId);
  },

  async listDocuments(filters = {}) {
    try {
      const res = await callTaskApi('tasks/documents/list', filters);
      return res?.data || [];
    } catch (e) {
      console.error('listDocuments error:', e);
      return [];
    }
  },

  async getDocuments(filters = {}) {
    return this.listDocuments(filters);
  },

  async createDocument(payload) {
    const res = await callTaskApi('tasks/documents/create', payload);
    return res?.data;
  },

  async updateDocumentStatus(id, action) {
    const res = await callTaskApi('tasks/documents/update', { id, action });
    return res?.data;
  },

  async listEmployees(filters = {}) {
    try {
      const res = await callTaskApi('tasks/employees/list', filters);
      return res?.data || [];
    } catch (e) {
      console.error('listEmployees error:', e);
      return [];
    }
  },

  async getEmployees(filters = {}) {
    return this.listEmployees(filters);
  },

  async createEmployee(payload) {
    const res = await callTaskApi('tasks/employees/create', payload);
    return res?.data;
  },

  async updateEmployee(arg1, arg2) {
    let payload;
    if (typeof arg1 === 'object' && arg1 !== null) {
      payload = arg2 ? { ...arg2, id: arg1.id || arg1.IdSeq || arg1.code } : arg1;
    } else {
      payload = { ...(arg2 || {}), id: arg1 };
    }
    const res = await callTaskApi('tasks/employees/update', payload);
    return res?.data;
  },

  async deleteEmployee(id) {
    const res = await callTaskApi('tasks/employees/delete', { id });
    return res?.data;
  },

  async deleteEmployees(ids) {
    const res = await callTaskApi('tasks/employees/delete', { ids });
    return res?.data;
  },

  async deleteUser(id) {
    const res = await callTaskApi('tasks/users/delete', { id });
    return res?.data;
  },

  async deleteUsers(ids) {
    const res = await callTaskApi('tasks/users/delete', { ids });
    return res?.data;
  },

  async deleteDepartment(id) {
    const res = await callTaskApi('tasks/departments/delete', { id });
    return res?.data;
  },

  async deleteTeam(id) {
    const res = await callTaskApi('tasks/teams/delete', { id });
    return res?.data;
  },

  async deleteWorkflow(id) {
    const res = await callTaskApi('tasks/workflows/delete', { id });
    return res?.data;
  },

  async deleteWorkflowStatus(id) {
    const res = await callTaskApi('tasks/workflows/statuses/delete', { id });
    return res?.data;
  },

  async deleteWorkflowRule(id) {
    const res = await callTaskApi('tasks/workflows/rules/delete', { id });
    return res?.data;
  },

  async deleteWorkflowTemplate(id) {
    const res = await callTaskApi('tasks/workflows/templates/delete', { id });
    return res?.data;
  },

  async deleteWorkflowAutomation(id) {
    const res = await callTaskApi('tasks/workflows/automation/delete', { id });
    return res?.data;
  },

  async getReportConfig(key = 'sharepoint_progress') {
    try {
      const res = await callTaskApi('tasks/reports/config/get', { key });
      return res?.data || null;
    } catch (e) {
      console.error('getReportConfig error:', e);
      return null;
    }
  },

  async updateReportConfig(payload) {
    const res = await callTaskApi('tasks/reports/config/update', payload);
    return res?.data;
  },

  // External Partners & Contacts Management
  async getPartners() {
    try {
      const res = await callTaskApi('partners/list', {});
      return res?.data || [];
    } catch (e) {
      console.error('getPartners error:', e);
      return [];
    }
  },

  async savePartner(partnerData) {
    const res = await callTaskApi('partners/save', partnerData);
    return res?.data;
  },

  async deletePartner(id) {
    const res = await callTaskApi('partners/delete', { id });
    return res?.data;
  },
};
