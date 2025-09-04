import { BaseRepository } from './BaseRepository';
import type { TestTemplate } from '../types';
import { db } from '../lib/db';
import { logger } from '../services/logger';

/**
 * Repository for template operations with optimized queries
 */
export class TemplateRepository extends BaseRepository<TestTemplate> {
  constructor() {
    super(db.templates, 'template');
  }

  /**
   * Get templates by category with caching
   */
  async getByCategory(category: string): Promise<TestTemplate[]> {
    const cacheKey = `category_${category}`;
    
    try {
      const templates = await this.table
        .where('category')
        .equals(category)
        .toArray();
      
      logger.debug(`Fetched ${templates.length} templates for category`, { category });
      return templates;
    } catch (error) {
      logger.error('Failed to get templates by category', error, { category });
      throw error;
    }
  }

  /**
   * Get templates by risk level
   */
  async getByRiskLevel(riskLevel: string): Promise<TestTemplate[]> {
    try {
      const templates = await this.table
        .where('riskLevel')
        .equals(riskLevel)
        .toArray();
      
      return templates;
    } catch (error) {
      logger.error('Failed to get templates by risk level', error, { riskLevel });
      throw error;
    }
  }

  /**
   * Search templates by name or description
   */
  async search(query: string): Promise<TestTemplate[]> {
    const lowerQuery = query.toLowerCase();
    
    try {
      const templates = await this.table
        .filter(template => 
          template.name.toLowerCase().includes(lowerQuery) ||
          template.description.toLowerCase().includes(lowerQuery)
        )
        .toArray();
      
      return templates;
    } catch (error) {
      logger.error('Failed to search templates', error, { query });
      throw error;
    }
  }

  /**
   * Get templates using a specific variable
   */
  async getByVariable(variableName: string): Promise<TestTemplate[]> {
    try {
      const templates = await this.table
        .filter(template => {
          // Check in template content
          if (template.template.includes(`{${variableName}}`)) {
            return true;
          }
          
          // Check in templateVariables
          if (template.templateVariables) {
            const { global, private: privateVars } = template.templateVariables;
            if (global?.includes(variableName)) return true;
            if (privateVars && variableName in privateVars) return true;
          }
          
          return false;
        })
        .toArray();
      
      return templates;
    } catch (error) {
      logger.error('Failed to get templates by variable', error, { variableName });
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byRiskLevel: Record<string, number>;
  }> {
    try {
      const templates = await this.getAll();
      
      const byCategory: Record<string, number> = {};
      const byRiskLevel: Record<string, number> = {};
      
      templates.forEach(template => {
        // Count by category
        byCategory[template.category] = (byCategory[template.category] || 0) + 1;
        
        // Count by risk level
        byRiskLevel[template.riskLevel] = (byRiskLevel[template.riskLevel] || 0) + 1;
      });
      
      return {
        total: templates.length,
        byCategory,
        byRiskLevel,
      };
    } catch (error) {
      logger.error('Failed to get template statistics', error);
      throw error;
    }
  }

  /**
   * Bulk update template variables
   */
  async updateTemplateVariables(
    templateId: string,
    variables: TestTemplate['templateVariables']
  ): Promise<void> {
    try {
      await this.update(templateId, { templateVariables: variables });
      logger.info('Updated template variables', { templateId });
    } catch (error) {
      logger.error('Failed to update template variables', error, { templateId });
      throw error;
    }
  }

  /**
   * Clone a template
   */
  async clone(templateId: string, newName: string): Promise<string> {
    try {
      const original = await this.getById(templateId);
      if (!original) {
        throw new Error('Template not found');
      }

      const cloned: Omit<TestTemplate, 'id'> = {
        ...original,
        id: undefined,
        name: newName,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      const newId = await this.create(cloned);
      logger.info('Cloned template', { originalId: templateId, newId });
      return newId;
    } catch (error) {
      logger.error('Failed to clone template', error, { templateId });
      throw error;
    }
  }
}