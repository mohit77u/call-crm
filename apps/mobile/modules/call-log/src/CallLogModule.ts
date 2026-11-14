import { NativeModule, requireNativeModule } from 'expo';

import type { DeviceCall, DeviceLocation, SimList } from './CallLog.types';

declare class CallLogModule extends NativeModule<{}> {
  hasPermission(): boolean;
  listSims(): Promise<SimList>;
  getLastLocation(): Promise<DeviceLocation | null>;
  getCallsSince(sinceMs: number, sinceId: string | null, limit: number): Promise<DeviceCall[]>;
}

export default requireNativeModule<CallLogModule>('CallLog');
