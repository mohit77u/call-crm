import { NativeModule, requireNativeModule } from 'expo';

import type { DeviceCall, DeviceLocation, SimInfo } from './CallLog.types';

declare class CallLogModule extends NativeModule<{}> {
  hasPermission(): boolean;
  listSims(): Promise<SimInfo[]>;
  getLastLocation(): Promise<DeviceLocation | null>;
  getCallsSince(sinceMs: number, limit: number, phoneAccountId?: string | null): Promise<DeviceCall[]>;
}

export default requireNativeModule<CallLogModule>('CallLog');
