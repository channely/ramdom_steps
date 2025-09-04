import Dexie, { Table } from 'dexie';
import { logger } from '../services/logger';

/**
 * Base repository class providing common database operations
 */
export abstract class BaseRepository<T extends { id?: string }> {
  protected table: Table<T, string>;
  protected tableName: string;
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(table: Table<T, string>, tableName: string) {
    this.table = table;
    this.tableName = tableName;
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, 'id'>): Promise<string> {
    try {
      const id = await this.table.add(data as T);
      this.clearCache();
      logger.debug(`Created ${this.tableName} record`, { id });
      return id as string;
    } catch (error) {
      logger.error(`Failed to create ${this.tableName} record`, error);
      throw error;
    }
  }

  /**
   * Create multiple records in batch
   */
  async createBatch(items: Omit<T, 'id'>[]): Promise<string[]> {
    try {
      const ids = await this.table.bulkAdd(items as T[]);
      this.clearCache();
      logger.debug(`Created ${items.length} ${this.tableName} records`);
      return ids as string[];
    } catch (error) {
      logger.error(`Failed to create batch ${this.tableName} records`, error);
      throw error;
    }
  }

  /**
   * Get a record by ID
   */
  async getById(id: string): Promise<T | undefined> {
    // Check cache first
    const cached = this.getFromCache(id);
    if (cached) return cached;

    try {
      const record = await this.table.get(id);
      if (record) {
        this.addToCache(id, record);
      }
      return record;
    } catch (error) {
      logger.error(`Failed to get ${this.tableName} by ID`, error, { id });
      throw error;
    }
  }

  /**
   * Get all records
   */
  async getAll(): Promise<T[]> {
    try {
      return await this.table.toArray();
    } catch (error) {
      logger.error(`Failed to get all ${this.tableName} records`, error);
      throw error;
    }
  }

  /**
   * Get records with pagination
   */
  async getPaginated(page: number, pageSize: number): Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    try {
      const offset = (page - 1) * pageSize;
      const total = await this.table.count();
      const data = await this.table
        .offset(offset)
        .limit(pageSize)
        .toArray();

      return {
        data,
        total,
        page,
        pageSize,
        hasMore: offset + data.length < total,
      };
    } catch (error) {
      logger.error(`Failed to get paginated ${this.tableName} records`, error, { page, pageSize });
      throw error;
    }
  }

  /**
   * Update a record
   */
  async update(id: string, updates: Partial<T>): Promise<void> {
    try {
      await this.table.update(id, updates);
      this.removeFromCache(id);
      logger.debug(`Updated ${this.tableName} record`, { id });
    } catch (error) {
      logger.error(`Failed to update ${this.tableName} record`, error, { id });
      throw error;
    }
  }

  /**
   * Update multiple records in batch
   */
  async updateBatch(updates: Array<{ id: string; changes: Partial<T> }>): Promise<void> {
    try {
      await this.table.bulkUpdate(
        updates.map(({ id, changes }) => ({ key: id, changes }))
      );
      updates.forEach(({ id }) => this.removeFromCache(id));
      logger.debug(`Updated ${updates.length} ${this.tableName} records`);
    } catch (error) {
      logger.error(`Failed to batch update ${this.tableName} records`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<void> {
    try {
      await this.table.delete(id);
      this.removeFromCache(id);
      logger.debug(`Deleted ${this.tableName} record`, { id });
    } catch (error) {
      logger.error(`Failed to delete ${this.tableName} record`, error, { id });
      throw error;
    }
  }

  /**
   * Delete multiple records
   */
  async deleteBatch(ids: string[]): Promise<void> {
    try {
      await this.table.bulkDelete(ids);
      ids.forEach(id => this.removeFromCache(id));
      logger.debug(`Deleted ${ids.length} ${this.tableName} records`);
    } catch (error) {
      logger.error(`Failed to batch delete ${this.tableName} records`, error);
      throw error;
    }
  }

  /**
   * Delete all records
   */
  async deleteAll(): Promise<void> {
    try {
      await this.table.clear();
      this.clearCache();
      logger.warn(`Deleted all ${this.tableName} records`);
    } catch (error) {
      logger.error(`Failed to delete all ${this.tableName} records`, error);
      throw error;
    }
  }

  /**
   * Count records
   */
  async count(): Promise<number> {
    try {
      return await this.table.count();
    } catch (error) {
      logger.error(`Failed to count ${this.tableName} records`, error);
      throw error;
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.table.where('id').equals(id).count();
      return count > 0;
    } catch (error) {
      logger.error(`Failed to check ${this.tableName} existence`, error, { id });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<R>(
    fn: (table: Table<T, string>) => Promise<R>
  ): Promise<R> {
    try {
      return await (this.table as any).db.transaction('rw', this.table, async () => {
        return await fn(this.table);
      });
    } catch (error) {
      logger.error(`Transaction failed for ${this.tableName}`, error);
      throw error;
    }
  }

  /**
   * Cache management methods
   */
  private getFromCache(id: string): T | undefined {
    const cached = this.cache.get(id);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(id);
    }
    return undefined;
  }

  private addToCache(id: string, data: T): void {
    this.cache.set(id, {
      data,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  private removeFromCache(id: string): void {
    this.cache.delete(id);
  }

  protected clearCache(): void {
    this.cache.clear();
  }
}