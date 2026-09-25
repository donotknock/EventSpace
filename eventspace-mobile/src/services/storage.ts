import { Preferences } from '@capacitor/preferences';
import type { ServerConfig } from '../types';

const CONFIG_KEY = 'eventspace_server_config';

export const storage = {
  async getServerConfig(): Promise<ServerConfig | null> {
    try {
      const { value } = await Preferences.get({ key: CONFIG_KEY });
      if (value) {
        return JSON.parse(value);
      }
    } catch {
      // Fallback for environments where Preferences is not available
      const local = localStorage.getItem(CONFIG_KEY);
      if (local) {
        try {
          return JSON.parse(local);
        } catch {}
      }
    }
    return null;
  },

  async setServerConfig(config: ServerConfig): Promise<void> {
    const serialized = JSON.stringify(config);
    try {
      await Preferences.set({ key: CONFIG_KEY, value: serialized });
    } catch {}
    try {
      localStorage.setItem(CONFIG_KEY, serialized);
    } catch {}
  },

  async clearServerConfig(): Promise<void> {
    try {
      await Preferences.remove({ key: CONFIG_KEY });
    } catch {}
    try {
      localStorage.removeItem(CONFIG_KEY);
    } catch {}
  },
};
