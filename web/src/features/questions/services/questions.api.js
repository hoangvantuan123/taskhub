import { authService } from '../../../services/auth/auth.service';
const call = (action, payload = {}) => authService.request(action, { payload });
export const questionsApi = {
  catalogs: () => call('question_catalogs'),
  getQuestions: payload => call('question_list', payload),
  getQuestion: id => call('question_get', { id }),
  saveQuestion: payload => call('question_save', payload),
  createQuestionsBatch: questions => call('question_import', { questions }),
  getQuestionSimulations: () => call('question_simulation_list'),
  saveQuestionSimulation: simulation => call('question_simulation_save', simulation),
  getQuestionFolders: payload => call('question_folder_list', payload),
  createQuestionFolder: payload => call('question_folder_save', payload),
  listPublishedQuestions: payload => call('question_list', { ...payload, filters: { ...(payload?.filters || {}), status: 'Đã xuất bản' }, pageSize: 500 }),
};
