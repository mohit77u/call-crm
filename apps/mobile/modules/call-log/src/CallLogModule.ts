import { NativeModule, requireNativeModule } from 'expo';

import type { DeviceCall } from './CallLog.types';

declare class CallLogModule extends NativeModule<{}> {
  hasPermission(): boolean;
  getCallsSince(sinceMs: number, limit: number): Promise<DeviceCall[]>;
}

export default requireNativeModule<CallLogModule>('CallLog');
