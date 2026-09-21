import { USE_MOCK } from '../constants/app';
import api from './api';
import { mockApi } from './mockApi';

const service = USE_MOCK ? mockApi : api;

export default service;
