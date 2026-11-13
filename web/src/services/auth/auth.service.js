import { httpRequest } from '../http/httpClient';
import { authEndpoints } from './auth.endpoints';

let accessToken = '';
let ownRowVersion='';
let refreshPromise;
const PUBLIC_AUTH_ACTIONS = new Set(['login', 'register', 'verify_approval_otp', 'login_otp_verify']);
async function call(action, body = {}) {
  const result = await httpRequest(authEndpoints[action], { body, token: accessToken });
  if (result.access_token) accessToken = result.access_token;
  if(result.user?.RowVersion)ownRowVersion=result.user.RowVersion;
  if(result.RowVersion)ownRowVersion=result.RowVersion;
  return result;
}

export const authService = {
  login: (username, password, remember) => call('login', { username, password, remember }),
  register: (name, username, password, remember, contact_email) => call('register', { name, username, password, remember, contact_email }),
  verifyApprovalOtp: (username, code) => call('verify_approval_otp', { username, code }),
  loginOtp: (username, code, remember) => call('login_otp_verify', { username, code, remember }),
  refresh: () => refreshPromise ||= call('refresh').catch(error => {
    if (error.status === 401) accessToken = '';
    throw error;
  }).finally(() => { refreshPromise = null; }),
  async logout() { try { await call('logout'); } finally { accessToken = ''; } },
  async request(action, body) {
    if (!authEndpoints[action]) throw new Error(`Unknown auth operation: ${action}`);
    try { return await call(action, body); }
    catch (error) {
      if (error.status !== 401 || PUBLIC_AUTH_ACTIONS.has(action)) throw error;
      await this.refresh();
      return call(action, body);
    }
  },
  async requestGateway(path, options = {}) {
    try { return await httpRequest(path, { ...options, token: accessToken }); }
    catch (error) {
      if (error.status !== 401) throw error;
      await this.refresh();
      return httpRequest(path, { ...options, token: accessToken });
    }
  },
  me() { return this.request('me'); },
  history() { return this.request('history'); },
  updateProfile(payload) { return this.request('profile_update', { payload:{...payload,RowVersion:payload.RowVersion||ownRowVersion} }); },
  changePassword(payload) { return this.request('password_change', { payload:{...payload,RowVersion:payload.RowVersion||ownRowVersion} }); },
};
