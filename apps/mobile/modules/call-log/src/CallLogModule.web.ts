import { registerWebModule, NativeModule } from 'expo';

import type { DeviceCall, DeviceLocation, SimInfo } from './CallLog.types';

class CallLogModule extends NativeModule<{}> {
  hasPermission() {
    return false;
  }
  async listSims(): Promise<SimInfo[]> {
    return [];
  }
  async getLastLocation(): Promise<DeviceLocation | null> {
    return null;
  }
  async getCallsSince(): Promise<DeviceCall[]> {
    return [];
  }
}

export default registerWebModule(CallLogModule, 'CallLog');
