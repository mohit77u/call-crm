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
