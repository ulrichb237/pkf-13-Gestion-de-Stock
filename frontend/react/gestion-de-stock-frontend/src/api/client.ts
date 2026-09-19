import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { API_BASE_URL } from './config';
import { authMiddleware } from './auth-middleware';

export { API_BASE_URL };
export const apiClient = createClient<paths>({ baseUrl: API_BASE_URL });
apiClient.use(authMiddleware);
