/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

// 1. Keep your existing imports and add the new Order Confirmation import
import { template as orderStatusUpdate } from './order-status-update.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx' // Add this line

export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-status-update': orderStatusUpdate,
  
  // 2. Add the new template configuration to the registry
  'order-confirmation': orderConfirmation,
}
