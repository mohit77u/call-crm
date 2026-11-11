import { registerWebModule, NativeModule } from 'expo';

import type { DeviceCall } from './CallLog.types';

class CallLogModule extends NativeModule<{}> {
  hasPermission() {
    return false;
  }
  async getCallsSince(): Promise<DeviceCall[]> {
    return [];
  }
}

export default registerWebModule(CallLogModule, 'CallLog');
