import React from 'react';
import {
  Receipt,
  ShoppingCart,
  GraduationCap,
  Bus,
  ShoppingBag,
  User,
  HeartPulse,
  Gamepad2,
  Tag,
  Home,
  Utensils,
  Layers,
  Sparkles,
  LucideIcon,
  PiggyBank,
  AlertTriangle,
} from 'lucide-react';
import { Category } from '../types/finance';

export interface CategoryVisualConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string; // Hex color e.g. '#3B82F6'
  textColorClass: string; // Tailwind text color e.g. 'text-blue-500'
  bgColorClass: string; // Tailwind subtle bg color e.g. 'bg-blue-50 dark:bg-blue-950/40'
  borderColorClass: string; // Tailwind border color e.g. 'border-blue-200 dark:border-blue-800'
}

/**
 * Standard centralized category configuration.
 * Maps category IDs and keywords to consistent Lucide icons, hex colors, and Tailwind styling.
 */
export const CENTRAL_CATEGORY_CONFIGS: Record<string, CategoryVisualConfig> = {
  'cat-fixed': {
    id: 'cat-fixed',
    name: 'Fixed Expenses',
    icon: Receipt,
    color: '#3B82F6',
    textColorClass: 'text-blue-500 dark:text-blue-400',
    bgColorClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderColorClass: 'border-blue-200 dark:border-blue-800',
  },
  'cat-supermarket': {
    id: 'cat-supermarket',
    name: 'Food & Supermarket',
    icon: ShoppingCart,
    color: '#10B981',
    textColorClass: 'text-emerald-500 dark:text-emerald-400',
    bgColorClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColorClass: 'border-emerald-200 dark:border-emerald-800',
  },
  'cat-study': {
    id: 'cat-study',
    name: 'Study',
    icon: GraduationCap,
    color: '#8B5CF6',
    textColorClass: 'text-purple-500 dark:text-purple-400',
    bgColorClass: 'bg-purple-50 dark:bg-purple-950/40',
    borderColorClass: 'border-purple-200 dark:border-purple-800',
  },
  'cat-transport': {
    id: 'cat-transport',
    name: 'Transportation',
    icon: Bus,
    color: '#F59E0B',
    textColorClass: 'text-amber-500 dark:text-amber-400',
    bgColorClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderColorClass: 'border-amber-200 dark:border-amber-800',
  },
  'cat-shopping': {
    id: 'cat-shopping',
    name: 'Shopping',
    icon: ShoppingBag,
    color: '#EC4899',
    textColorClass: 'text-pink-500 dark:text-pink-400',
    bgColorClass: 'bg-pink-50 dark:bg-pink-950/40',
    borderColorClass: 'border-pink-200 dark:border-pink-800',
  },
  'cat-personal': {
    id: 'cat-personal',
    name: 'Personal',
    icon: User,
    color: '#06B6D4',
    textColorClass: 'text-cyan-500 dark:text-cyan-400',
    bgColorClass: 'bg-cyan-50 dark:bg-cyan-950/40',
    borderColorClass: 'border-cyan-200 dark:border-cyan-800',
  },
  'cat-entertainment': {
    id: 'cat-entertainment',
    name: 'Entertainment',
    icon: Gamepad2,
    color: '#A855F7',
    textColorClass: 'text-violet-500 dark:text-violet-400',
    bgColorClass: 'bg-violet-50 dark:bg-violet-950/40',
    borderColorClass: 'border-violet-200 dark:border-violet-800',
  },
  'cat-health': {
    id: 'cat-health',
    name: 'Health',
    icon: HeartPulse,
    color: '#F43F5E',
    textColorClass: 'text-rose-500 dark:text-rose-400',
    bgColorClass: 'bg-rose-50 dark:bg-rose-950/40',
    borderColorClass: 'border-rose-200 dark:border-rose-800',
  },
  'cat-saving': {
    id: 'cat-saving',
    name: 'Saving',
    icon: PiggyBank,
    color: '#10B981',
    textColorClass: 'text-emerald-500 dark:text-emerald-400',
    bgColorClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColorClass: 'border-emerald-200 dark:border-emerald-800',
  },
};

/**
 * Standard warning icon used across all budget exceeded and over-budget states.
 */
export const StandardOverBudgetIcon = AlertTriangle;

/**
 * Returns the centralized visual configuration (icon, color, styling) for any category.
 * Resolves by ID, name keywords, or custom Category object.
 */
export function getCategoryVisual(
  categoryOrId?: Category | string | null,
  fallbackColor?: string
): CategoryVisualConfig {
  if (!categoryOrId) {
    return {
      id: 'unknown',
      name: 'Other',
      icon: Tag,
      color: fallbackColor || '#64748B',
      textColorClass: 'text-slate-500 dark:text-slate-400',
      bgColorClass: 'bg-slate-50 dark:bg-slate-800/60',
      borderColorClass: 'border-slate-200 dark:border-slate-700',
    };
  }

  const catId = typeof categoryOrId === 'string' ? categoryOrId : categoryOrId.id;
  const catName = typeof categoryOrId === 'string' ? categoryOrId : categoryOrId.name;
  const customColor = typeof categoryOrId === 'object' && categoryOrId?.color ? categoryOrId.color : fallbackColor;

  // Direct match by ID
  if (catId && CENTRAL_CATEGORY_CONFIGS[catId]) {
    const config = CENTRAL_CATEGORY_CONFIGS[catId];
    return {
      ...config,
      color: customColor || config.color,
    };
  }

  // Normalize string for keyword matching
  const lower = (catName || catId || '').toLowerCase();

  if (lower.includes('fixed') || lower.includes('thabit') || lower.includes('rent') || lower.includes('bill')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-fixed'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-fixed'].color,
    };
  }

  if (lower.includes('supermarket') || lower.includes('food') || lower.includes('grocery') || lower.includes('market')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-supermarket'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-supermarket'].color,
    };
  }

  if (lower.includes('study') || lower.includes('educat') || lower.includes('uni') || lower.includes('course') || lower.includes('book')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-study'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-study'].color,
    };
  }

  if (lower.includes('transport') || lower.includes('transit') || lower.includes('bus') || lower.includes('train') || lower.includes('car')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-transport'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-transport'].color,
    };
  }

  if (lower.includes('shop') || lower.includes('store') || lower.includes('mall') || lower.includes('cloth')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-shopping'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-shopping'].color,
    };
  }

  if (lower.includes('personal') || lower.includes('self') || lower.includes('user') || lower.includes('care')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-personal'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-personal'].color,
    };
  }

  if (lower.includes('entertain') || lower.includes('game') || lower.includes('play') || lower.includes('movie')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-entertainment'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-entertainment'].color,
    };
  }

  if (lower.includes('health') || lower.includes('medic') || lower.includes('doctor') || lower.includes('pharm')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-health'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-health'].color,
    };
  }

  if (lower.includes('saving') || lower.includes('spar') || lower.includes('ادخار') || lower.includes('وفر')) {
    return {
      ...CENTRAL_CATEGORY_CONFIGS['cat-saving'],
      color: customColor || CENTRAL_CATEGORY_CONFIGS['cat-saving'].color,
    };
  }

  // Fallback generic category configuration with preserved accent color
  const color = customColor || '#64748B';
  return {
    id: catId || 'custom',
    name: catName || 'Category',
    icon: Tag,
    color,
    textColorClass: 'text-slate-600 dark:text-slate-300',
    bgColorClass: 'bg-slate-100 dark:bg-slate-800',
    borderColorClass: 'border-slate-200 dark:border-slate-700',
  };
}
