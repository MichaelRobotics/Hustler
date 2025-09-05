/**
 * State Validation and Error Handling
 * 
 * Provides comprehensive state validation, error handling, and recovery mechanisms
 * for the state management system.
 */

import { 
  FrontendState, 
  BackendState, 
  StateContext,
  FunnelData,
  ResourceData,
  ConversationData,
  MessageData
} from './types';

export interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
  expected?: any;
}

export interface ErrorRecovery {
  type: 'auto' | 'manual' | 'rollback';
  action: string;
  description: string;
  canRecover: boolean;
}

class StateValidator {
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.setupDefaultRules();
  }

  /**
   * Validate frontend state
   */
  validateFrontendState(state: Partial<FrontendState>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const rules = this.rules.get('frontend') || [];
    
    for (const rule of rules) {
      const value = this.getNestedValue(state, rule.field);
      const isValid = rule.validator(value);
      
      if (!isValid) {
        const error: ValidationError = {
          field: rule.field,
          message: rule.message,
          severity: rule.severity,
          value
        };

        switch (rule.severity) {
          case 'error':
            result.errors.push(error);
            result.isValid = false;
            break;
          case 'warning':
            result.warnings.push(error);
            break;
          case 'info':
            result.info.push(error);
            break;
        }
      }
    }

    return result;
  }

  /**
   * Validate backend state
   */
  validateBackendState(state: Partial<BackendState>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const rules = this.rules.get('backend') || [];
    
    for (const rule of rules) {
      const value = this.getNestedValue(state, rule.field);
      const isValid = rule.validator(value);
      
      if (!isValid) {
        const error: ValidationError = {
          field: rule.field,
          message: rule.message,
          severity: rule.severity,
          value
        };

        switch (rule.severity) {
          case 'error':
            result.errors.push(error);
            result.isValid = false;
            break;
          case 'warning':
            result.warnings.push(error);
            break;
          case 'info':
            result.info.push(error);
            break;
        }
      }
    }

    return result;
  }

  /**
   * Validate complete state context
   */
  validateStateContext(state: StateContext): ValidationResult {
    const frontendResult = this.validateFrontendState(state.frontend);
    const backendResult = this.validateBackendState(state.backend);

    return {
      isValid: frontendResult.isValid && backendResult.isValid,
      errors: [...frontendResult.errors, ...backendResult.errors],
      warnings: [...frontendResult.warnings, ...backendResult.warnings],
      info: [...frontendResult.info, ...backendResult.info]
    };
  }

  /**
   * Validate specific entity
   */
  validateEntity(entityType: string, entity: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const rules = this.rules.get(entityType) || [];
    
    for (const rule of rules) {
      const value = this.getNestedValue(entity, rule.field);
      const isValid = rule.validator(value);
      
      if (!isValid) {
        const error: ValidationError = {
          field: rule.field,
          message: rule.message,
          severity: rule.severity,
          value
        };

        switch (rule.severity) {
          case 'error':
            result.errors.push(error);
            result.isValid = false;
            break;
          case 'warning':
            result.warnings.push(error);
            break;
          case 'info':
            result.info.push(error);
            break;
        }
      }
    }

    return result;
  }

  /**
   * Add custom validation rule
   */
  addRule(stateType: string, rule: ValidationRule): void {
    if (!this.rules.has(stateType)) {
      this.rules.set(stateType, []);
    }
    
    this.rules.get(stateType)!.push(rule);
  }

  /**
   * Remove validation rule
   */
  removeRule(stateType: string, field: string): void {
    const rules = this.rules.get(stateType);
    if (rules) {
      const index = rules.findIndex(rule => rule.field === field);
      if (index > -1) {
        rules.splice(index, 1);
      }
    }
  }

  /**
   * Get recovery suggestions for validation errors
   */
  getRecoverySuggestions(errors: ValidationError[]): ErrorRecovery[] {
    const recoveries: ErrorRecovery[] = [];

    for (const error of errors) {
      switch (error.field) {
        case 'currentView':
          recoveries.push({
            type: 'auto',
            action: 'resetView',
            description: 'Reset to dashboard view',
            canRecover: true
          });
          break;

        case 'selectedFunnelId':
          if (error.value && typeof error.value === 'string') {
            recoveries.push({
              type: 'auto',
              action: 'clearSelection',
              description: 'Clear invalid funnel selection',
              canRecover: true
            });
          }
          break;

        case 'userSettings':
          recoveries.push({
            type: 'auto',
            action: 'resetSettings',
            description: 'Reset to default user settings',
            canRecover: true
          });
          break;

        case 'funnels':
          recoveries.push({
            type: 'manual',
            action: 'reloadFunnels',
            description: 'Reload funnels from server',
            canRecover: true
          });
          break;

        default:
          recoveries.push({
            type: 'rollback',
            action: 'rollbackState',
            description: 'Rollback to last known good state',
            canRecover: true
          });
      }
    }

    return recoveries;
  }

  /**
   * Sanitize state data
   */
  sanitizeState(state: any): any {
    if (typeof state !== 'object' || state === null) {
      return state;
    }

    const sanitized = { ...state };

    // Remove invalid IDs
    if (sanitized.selectedFunnelId && typeof sanitized.selectedFunnelId !== 'string') {
      sanitized.selectedFunnelId = null;
    }

    if (sanitized.selectedConversationId && typeof sanitized.selectedConversationId !== 'string') {
      sanitized.selectedConversationId = null;
    }

    if (sanitized.selectedResourceId && typeof sanitized.selectedResourceId !== 'string') {
      sanitized.selectedResourceId = null;
    }

    // Sanitize arrays
    if (Array.isArray(sanitized.funnels)) {
      sanitized.funnels = sanitized.funnels.filter(this.isValidFunnel);
    }

    if (Array.isArray(sanitized.resources)) {
      sanitized.resources = sanitized.resources.filter(this.isValidResource);
    }

    if (Array.isArray(sanitized.conversations)) {
      sanitized.conversations = sanitized.conversations.filter(this.isValidConversation);
    }

    if (Array.isArray(sanitized.messages)) {
      sanitized.messages = sanitized.messages.filter(this.isValidMessage);
    }

    // Sanitize user settings
    if (sanitized.userSettings) {
      sanitized.userSettings = this.sanitizeUserSettings(sanitized.userSettings);
    }

    return sanitized;
  }

  // ===== PRIVATE METHODS =====

  /**
   * Setup default validation rules
   */
  private setupDefaultRules(): void {
    // Frontend state rules
    this.rules.set('frontend', [
      {
        field: 'currentView',
        validator: (value) => ['dashboard', 'analytics', 'funnelBuilder', 'liveChat', 'resources'].includes(value),
        message: 'Invalid current view',
        severity: 'error'
      },
      {
        field: 'selectedFunnelId',
        validator: (value) => value === null || (typeof value === 'string' && value.length > 0),
        message: 'Invalid funnel ID',
        severity: 'warning'
      },
      {
        field: 'selectedConversationId',
        validator: (value) => value === null || (typeof value === 'string' && value.length > 0),
        message: 'Invalid conversation ID',
        severity: 'warning'
      },
      {
        field: 'isTyping',
        validator: (value) => typeof value === 'boolean',
        message: 'Invalid typing state',
        severity: 'error'
      },
      {
        field: 'searchQuery',
        validator: (value) => typeof value === 'string',
        message: 'Invalid search query',
        severity: 'error'
      },
      {
        field: 'isLoading',
        validator: (value) => typeof value === 'boolean',
        message: 'Invalid loading state',
        severity: 'error'
      }
    ]);

    // Backend state rules
    this.rules.set('backend', [
      {
        field: 'userSettings',
        validator: (value) => value && typeof value === 'object',
        message: 'User settings are required',
        severity: 'error'
      },
      {
        field: 'userSettings.theme',
        validator: (value) => ['light', 'dark', 'system'].includes(value),
        message: 'Invalid theme setting',
        severity: 'warning'
      },
      {
        field: 'userSettings.language',
        validator: (value) => typeof value === 'string' && value.length >= 2,
        message: 'Invalid language setting',
        severity: 'warning'
      },
      {
        field: 'generationStatus',
        validator: (value) => ['idle', 'generating', 'completed', 'failed'].includes(value),
        message: 'Invalid generation status',
        severity: 'error'
      },
      {
        field: 'deploymentStatus',
        validator: (value) => ['deployed', 'undeployed'].includes(value),
        message: 'Invalid deployment status',
        severity: 'error'
      },
      {
        field: 'syncStatus',
        validator: (value) => ['synced', 'syncing', 'error'].includes(value),
        message: 'Invalid sync status',
        severity: 'error'
      }
    ]);

    // Entity validation rules
    this.rules.set('funnel', [
      {
        field: 'id',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Funnel ID is required',
        severity: 'error'
      },
      {
        field: 'name',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Funnel name is required',
        severity: 'error'
      },
      {
        field: 'isDeployed',
        validator: (value) => typeof value === 'boolean',
        message: 'Invalid deployment state',
        severity: 'error'
      },
      {
        field: 'generationStatus',
        validator: (value) => ['idle', 'generating', 'completed', 'failed'].includes(value),
        message: 'Invalid generation status',
        severity: 'error'
      }
    ]);

    this.rules.set('resource', [
      {
        field: 'id',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Resource ID is required',
        severity: 'error'
      },
      {
        field: 'name',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Resource name is required',
        severity: 'error'
      },
      {
        field: 'type',
        validator: (value) => ['AFFILIATE', 'MY_PRODUCTS'].includes(value),
        message: 'Invalid resource type',
        severity: 'error'
      },
      {
        field: 'category',
        validator: (value) => ['PAID', 'FREE_VALUE'].includes(value),
        message: 'Invalid resource category',
        severity: 'error'
      },
      {
        field: 'link',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Resource link is required',
        severity: 'error'
      }
    ]);

    this.rules.set('conversation', [
      {
        field: 'id',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Conversation ID is required',
        severity: 'error'
      },
      {
        field: 'funnelId',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Funnel ID is required',
        severity: 'error'
      },
      {
        field: 'status',
        validator: (value) => ['active', 'completed', 'abandoned'].includes(value),
        message: 'Invalid conversation status',
        severity: 'error'
      }
    ]);

    this.rules.set('message', [
      {
        field: 'id',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Message ID is required',
        severity: 'error'
      },
      {
        field: 'conversationId',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Conversation ID is required',
        severity: 'error'
      },
      {
        field: 'type',
        validator: (value) => ['user', 'bot', 'system'].includes(value),
        message: 'Invalid message type',
        severity: 'error'
      },
      {
        field: 'content',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Message content is required',
        severity: 'error'
      }
    ]);
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate funnel entity
   */
  private isValidFunnel(funnel: any): boolean {
    return this.validateEntity('funnel', funnel).isValid;
  }

  /**
   * Validate resource entity
   */
  private isValidResource(resource: any): boolean {
    return this.validateEntity('resource', resource).isValid;
  }

  /**
   * Validate conversation entity
   */
  private isValidConversation(conversation: any): boolean {
    return this.validateEntity('conversation', conversation).isValid;
  }

  /**
   * Validate message entity
   */
  private isValidMessage(message: any): boolean {
    return this.validateEntity('message', message).isValid;
  }

  /**
   * Sanitize user settings
   */
  private sanitizeUserSettings(settings: any): any {
    const sanitized = { ...settings };

    // Ensure required fields exist
    if (!sanitized.theme || !['light', 'dark', 'system'].includes(sanitized.theme)) {
      sanitized.theme = 'system';
    }

    if (!sanitized.language || typeof sanitized.language !== 'string') {
      sanitized.language = 'en';
    }

    if (!sanitized.timezone || typeof sanitized.timezone !== 'string') {
      sanitized.timezone = 'UTC';
    }

    if (!sanitized.dateFormat || typeof sanitized.dateFormat !== 'string') {
      sanitized.dateFormat = 'MM/DD/YYYY';
    }

    // Sanitize notifications
    if (!sanitized.notifications || typeof sanitized.notifications !== 'object') {
      sanitized.notifications = {
        email: true,
        push: true,
        inApp: true
      };
    }

    // Sanitize preferences
    if (!sanitized.preferences || typeof sanitized.preferences !== 'object') {
      sanitized.preferences = {
        autoSave: true,
        showTutorials: true,
        compactMode: false
      };
    }

    return sanitized;
  }
}

// Export singleton instance
export const stateValidator = new StateValidator();

// Export types
// Types are already exported above
