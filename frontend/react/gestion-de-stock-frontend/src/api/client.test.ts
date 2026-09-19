import { describe, it, expect } from 'vitest';
import { apiClient, API_BASE_URL } from './client';

describe('apiClient', () => {
  it('est configure avec la baseUrl attendue', () => {
    expect(API_BASE_URL).toBe('http://localhost:8081');
  });

  it('expose les methodes GET/POST/PATCH/DELETE typees', () => {
    expect(typeof apiClient.GET).toBe('function');
    expect(typeof apiClient.POST).toBe('function');
    expect(typeof apiClient.PATCH).toBe('function');
    expect(typeof apiClient.DELETE).toBe('function');
  });
});
