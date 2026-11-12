import { registerWebModule, NativeModule } from 'expo';

import type { DeviceCall, DeviceLocation, SimList } from './CallLog.types';

class CallLogModule extends NativeModule<{}> {
  hasPermission() {
    return false;
  }
  async listSims(): Promise<SimList> {
    return { sims: [], slotCount: 0 };
  }
  async getLastLocation(): Promise<DeviceLocation | null> {
    return null;
  }
  async getCallsSince(): Promise<DeviceCall[]> {
    return [];
  }
}

export default registerWebModule(CallLogModule, 'CallLog');
