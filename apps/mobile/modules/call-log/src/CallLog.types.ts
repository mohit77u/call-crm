export type CallType = 'incoming' | 'outgoing' | 'missed' | 'voicemail' | 'rejected' | 'blocked' | 'unknown';

export type DeviceCall = {
  id: string;
  number: string;
  name: string | null;
  type: CallType;
  timestamp: number;
  durationSec: number;
  sim: string | null;
};

export type SimInfo = {
  id: number;
  iccId: string | null;
  label: string | null;
  number: string | null;
  slotIndex: number;
  accountIds?: string[];
};

export type SimList = {
  sims: SimInfo[];
  slotCount: number;
};

export type DeviceLocation = {
  lat: number;
  lng: number;
  accuracy: number;
  time: number;
};
