import * as Application from 'expo-application';
import * as Device from 'expo-device';

import type { DeviceLocation } from '../modules/call-log';
import { API_URL } from './config';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, body: unknown, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Server error (${res.status})`, res.status);
  return data as T;
}

export const appVersion = Application.nativeApplicationVersion ?? 'dev';

export const verifyClient = (clientCode: string) =>
  request<{ companyName: string }>('/api/app/verify-client', { clientCode });

export const login = (clientCode: string, username: string, password: string) =>
  request<{ token: string; agent: { name: string; phone: string | null }; company: { name: string }; syncFrom: number }>('/api/app/login', {
    clientCode,
    username,
    password,
    device: { model: [Device.manufacturer, Device.modelName].filter(Boolean).join(' '), osVersion: Device.osVersion, appVersion },
  });

export const uploadCalls = (token: string, calls: unknown[]) => request<{ saved: number }>('/api/app/calls', { calls }, token);

export const heartbeat = (token: string, permissionsOk: boolean, location?: DeviceLocation | null) =>
  request<{ ok: boolean; syncRequestedAt?: string | null }>('/api/app/heartbeat', { permissionsOk, appVersion, location: location ?? null }, token);
