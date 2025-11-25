
import { User } from '../types';

// JSONBlob API Service
const BASE_URL = 'https://jsonblob.com/api/jsonBlob';
const MOCK_STORAGE_PREFIX = 'streammaster_local_db_';

export interface CloudDB {
  users: Record<string, User & { password?: string }>;
  usedCodes: string[];
  updatedAt: number;
}

const INITIAL_DB: CloudDB = {
  users: {},
  usedCodes: [],
  updatedAt: Date.now()
};

// Helper to generate a random ID for local mode
const generateLocalId = () => `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const cloudService = {
  /**
   * 创建一个新的云端数据库
   * 策略：优先尝试 Cloud，失败则降级为 LocalStorage
   */
  async createDatabase(): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s Timeout

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(INITIAL_DB),
        mode: 'cors', 
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
          throw new Error(`Cloud Error: ${response.status}`);
      }
      
      const location = response.headers.get('Location');
      if (!location) throw new Error('No Location Header');
      
      const parts = location.split('/');
      return parts[parts.length - 1];

    } catch (error: any) {
      console.warn('Cloud creation failed, falling back to local storage:', error);
      // Fallback to Local
      const localId = generateLocalId();
      localStorage.setItem(MOCK_STORAGE_PREFIX + localId, JSON.stringify(INITIAL_DB));
      return localId;
    }
  },

  /**
   * 获取云端数据
   * 策略：先判断 ID 格式，local- 开头直接读本地，否则尝试 Cloud，失败再尝试本地缓存
   */
  async getDatabase(cloudId: string): Promise<CloudDB> {
    // 1. Local Mode Check
    if (cloudId.startsWith('local-')) {
        const localData = localStorage.getItem(MOCK_STORAGE_PREFIX + cloudId);
        if (!localData) throw new Error("找不到该本地 ID 的数据，请检查是否更换了浏览器");
        return JSON.parse(localData);
    }

    // 2. Cloud Mode
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s Timeout for read

      const response = await fetch(`${BASE_URL}/${cloudId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) throw new Error('找不到该云端 ID (404)');
        throw new Error(`Cloud Error: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.warn('Cloud fetch failed:', error);
      
      // Try to see if we happen to have a local backup or if user is offline
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error("连接云服务器失败 (网络错误)。请检查代理设置。如果急需使用，请尝试注册新账号以进入离线模式。");
      }
      throw error;
    }
  },

  /**
   * 更新云端数据
   * 策略：local- 开头写本地，否则写 Cloud，写 Cloud 失败则尝试本地备份
   */
  async updateDatabase(cloudId: string, data: CloudDB): Promise<void> {
    data.updatedAt = Date.now();

    // 1. Local Mode Update
    if (cloudId.startsWith('local-')) {
        localStorage.setItem(MOCK_STORAGE_PREFIX + cloudId, JSON.stringify(data));
        return;
    }

    // 2. Cloud Mode Update
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${BASE_URL}/${cloudId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
        mode: 'cors',
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Cloud Sync Failed');
    } catch (error: any) {
      console.error('Cloud Update Error:', error);
      // Fallback: Save to local storage with a backup key
      localStorage.setItem(MOCK_STORAGE_PREFIX + cloudId + '_backup', JSON.stringify(data));
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error("网络不稳定，数据已临时保存到本地缓存 (Offline Backup)。");
      }
      throw error;
    }
  }
};
