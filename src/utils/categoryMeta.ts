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
  Car,
  Plane,
  Heart,
  Laptop,
  Wallet,
  Coffee,
  Dumbbell,
  BookOpen,
  Smartphone,
  Briefcase,
  Gift,
  Music,
  Film,
  Baby,
  PawPrint,
  Shirt,
  Wrench,
  Wifi,
  Tv,
  Pizza,
  Bike,
  Camera,
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
 * Central dictionary mapping Lucide icon names to actual Lucide icon components.
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Built-ins
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
  PiggyBank,
  AlertTriangle,
  Layers,
  Sparkles,

  // Rich initial category icons
  Car,
  Plane,
  Heart,
  Laptop,
  Wallet,
  Coffee,
  Dumbbell,
  BookOpen,
  Smartphone,
  Briefcase,
  Gift,
  Music,
  Film,
  Baby,
  PawPrint,
  Shirt,
  Wrench,
  Wifi,
  Tv,
  Pizza,
  Bike,
  Camera,
};

export interface CategoryIconOption {
  name: string;
  icon: LucideIcon;
}

/**
 * Initial compact set of popular category icons (12 icons)
 */
export const POPULAR_CATEGORY_ICONS: CategoryIconOption[] = [
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'Utensils', icon: Utensils },
  { name: 'Coffee', icon: Coffee },
  { name: 'Home', icon: Home },
  { name: 'Car', icon: Car },
  { name: 'Bus', icon: Bus },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Receipt', icon: Receipt },
  { name: 'Wallet', icon: Wallet },
  { name: 'HeartPulse', icon: HeartPulse },
  { name: 'ShoppingBag', icon: ShoppingBag },
];

/**
 * Extended set of category icons displayed when clicking "More" (21 additional icons)
 */
export const EXTENDED_CATEGORY_ICONS: CategoryIconOption[] = [
  { name: 'Plane', icon: Plane },
  { name: 'Heart', icon: Heart },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Laptop', icon: Laptop },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Music', icon: Music },
  { name: 'Film', icon: Film },
  { name: 'Tv', icon: Tv },
  { name: 'Wifi', icon: Wifi },
  { name: 'Shirt', icon: Shirt },
  { name: 'Gift', icon: Gift },
  { name: 'Baby', icon: Baby },
  { name: 'PawPrint', icon: PawPrint },
  { name: 'Pizza', icon: Pizza },
  { name: 'Bike', icon: Bike },
  { name: 'Camera', icon: Camera },
  { name: 'Wrench', icon: Wrench },
  { name: 'PiggyBank', icon: PiggyBank },
  { name: 'Tag', icon: Tag },
];

/**
 * Combined full list of category icons
 */
export const ALL_CATEGORY_ICONS: CategoryIconOption[] = [
  ...POPULAR_CATEGORY_ICONS,
  ...EXTENDED_CATEGORY_ICONS,
];

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
 * Resolves by ID, user-selected iconName, name keywords, or custom Category object.
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
  const customIconName = typeof categoryOrId === 'object' && categoryOrId?.iconName ? categoryOrId.iconName : undefined;

  // 1. Direct match by ID for built-in categories
  if (catId && CENTRAL_CATEGORY_CONFIGS[catId]) {
    const config = CENTRAL_CATEGORY_CONFIGS[catId];
    return {
      ...config,
      color: customColor || config.color,
      icon: (customIconName && CATEGORY_ICON_MAP[customIconName]) || config.icon,
    };
  }

  // 2. Direct match by explicitly configured iconName on custom categories
  if (customIconName && CATEGORY_ICON_MAP[customIconName]) {
    const ResolvedIcon = CATEGORY_ICON_MAP[customIconName];
    const color = customColor || '#10B981';
    return {
      id: catId || 'custom',
      name: catName || 'Category',
      icon: ResolvedIcon,
      color,
      textColorClass: 'text-slate-700 dark:text-slate-200',
      bgColorClass: 'bg-slate-100 dark:bg-slate-800',
      borderColorClass: 'border-slate-200 dark:border-slate-700',
    };
  }

  // 3. Direct match if categoryOrId is an icon name string in CATEGORY_ICON_MAP
  if (typeof categoryOrId === 'string' && CATEGORY_ICON_MAP[categoryOrId]) {
    const ResolvedIcon = CATEGORY_ICON_MAP[categoryOrId];
    const color = fallbackColor || '#10B981';
    return {
      id: categoryOrId,
      name: categoryOrId,
      icon: ResolvedIcon,
      color,
      textColorClass: 'text-slate-700 dark:text-slate-200',
      bgColorClass: 'bg-slate-100 dark:bg-slate-800',
      borderColorClass: 'border-slate-200 dark:border-slate-700',
    };
  }

  // 4. Normalize string for keyword matching
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

  // 5. Fallback generic category configuration with preserved accent color
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
