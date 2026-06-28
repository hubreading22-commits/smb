import axios from 'axios';
import { SMBFile, UserSession } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export async function login(username: string, password: string) {
  const response = await api.post('/api/login', { username, password });
  return response.data as { token: string; username: string; role: UserSession['role']; shortUsername: string; domain: string };
}

export async function getShares(token: string) {
  const response = await api.get<SMBFile[]>('/api/shares', {
    headers: authHeaders(token),
  });
  return response.data;
}

export async function getShareContents(token: string, share: string, path: string) {
  const response = await api.get<SMBFile[]>(`/api/share/${encodeURIComponent(share)}/contents`, {
    headers: authHeaders(token),
    params: { path },
  });
  return response.data;
}

export async function createFolder(token: string, share: string, path: string, folderName: string) {
  const response = await api.post(
    `/api/share/${encodeURIComponent(share)}/folder`,
    { path, folderName },
    { headers: authHeaders(token) }
  );
  return response.data;
}

export async function uploadFile(token: string, share: string, path: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `${API_URL}/api/share/${encodeURIComponent(share)}/upload`,
    formData,
    {
      headers: {
        ...authHeaders(token),
        'Content-Type': 'multipart/form-data',
      },
      params: { path },
    }
  );
  return response.data;
}

export async function renameItem(token: string, share: string, oldPath: string, newPath: string) {
  const response = await api.post(
    `/api/share/${encodeURIComponent(share)}/rename`,
    { oldPath, newPath },
    { headers: authHeaders(token) }
  );
  return response.data;
}

export async function deleteItem(token: string, share: string, path: string) {
  const response = await api.delete(`/api/share/${encodeURIComponent(share)}/item`, {
    headers: authHeaders(token),
    params: { path },
  });
  return response.data;
}

export async function downloadFile(token: string, share: string, path: string) {
  const response = await axios.get(`${API_URL}/api/share/${encodeURIComponent(share)}/download`, {
    headers: authHeaders(token),
    params: { path },
    responseType: 'blob',
  });
  return response.data as Blob;
}
