
import { User } from '../types';

// JSONBlob API Service
// 用于在无后端环境下实现跨设备数据同步
const BASE_URL = 'https://jsonblob.com/api/jsonBlob';

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

export const cloudService = {
  /**
   * 创建一个新的云端数据库
   * 返回 Blob ID (即 Cloud ID)
   */
  async createDatabase(): Promise<string> {
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(INITIAL_DB)
      });

      if (!response.ok) throw new Error('创建云端数据库失败');
      
      const location = response.headers.get('Location');
      if (!location) throw new Error('未能获取数据库地址');
      
      // Extract ID from URL (e.g. https://jsonblob.com/api/jsonBlob/12345 -> 12345)
      const parts = location.split('/');
      return parts[parts.length - 1];
    } catch (error) {
      console.error('Cloud Create Error:', error);
      throw error;
    }
  },

  /**
   * 获取云端数据
   */
  async getDatabase(cloudId: string): Promise<CloudDB> {
    try {
      const response = await fetch(`${BASE_URL}/${cloudId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error('找不到该云端 ID，请检查输入');
        throw new Error('连接云端失败');
      }

      return await response.json();
    } catch (error) {
      console.error('Cloud Fetch Error:', error);
      throw error;
    }
  },

  /**
   * 更新云端数据
   * 采用乐观锁机制的简单实现（覆盖写）
   */
  async updateDatabase(cloudId: string, data: CloudDB): Promise<void> {
    try {
      data.updatedAt = Date.now();
      const response = await fetch(`${BASE_URL}/${cloudId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('同步数据到云端失败');
    } catch (error) {
      console.error('Cloud Update Error:', error);
      throw error;
    }
  }
};
