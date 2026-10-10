import { Category, Expense, MonthRecord } from '../types/finance';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-fixed',
    name: 'Fixed Expenses',
    nameAr: 'المصروفات الثابتة',
    color: '#3B82F6', // Blue
    iconName: 'Home',
    defaultType: 'fixed',
    stores: ['Rent', 'Health Insurance', 'Barmer', 'TK', 'Internet', 'Radio/TV Fee', 'GEZ', 'Mobile Contract'],
  },
  {
    id: 'cat-supermarket',
    name: 'Food & Supermarket',
    nameAr: 'طعام وسوبرماركت',
    color: '#10B981', // Emerald
    iconName: 'ShoppingCart',
    defaultType: 'variable',
    stores: ['Lidl', 'Aldi', 'Rewe', 'Edeka', 'Euroshop', 'Penny', 'Netto', 'Kaufland', 'Other Supermarket'],
  },
  {
    id: 'cat-study',
    name: 'Study',
    nameAr: 'الدراسة والجامعة',
    color: '#8B5CF6', // Purple
    iconName: 'GraduationCap',
    defaultType: 'variable',
    stores: ['University Fees', 'Student ID', 'German Course', 'Books', 'Semesterticket', 'Other Study'],
  },
  {
    id: 'cat-transport',
    name: 'Transportation',
    nameAr: 'المواصلات',
    color: '#F59E0B', // Amber
    iconName: 'Bus',
    defaultType: 'variable',
    stores: ['Deutschlandticket', 'Deutsche Bahn', 'Flixbus', 'Local Transit', 'Other Transportation'],
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    nameAr: 'التسوق والمشتريات',
    color: '#EC4899', // Pink
    iconName: 'ShoppingBag',
    defaultType: 'variable',
    stores: ['Amazon', 'Temu', 'Clothing', 'Electronics', 'Zalando', 'Ikea', 'Other Shopping'],
  },
  {
    id: 'cat-personal',
    name: 'Personal',
    nameAr: 'شخصي وترفيه',
    color: '#06B6D4', // Cyan
    iconName: 'User',
    defaultType: 'variable',
    stores: ['Hygiene', 'Entertainment', 'Games', 'Restaurant', 'Cafe', 'Pharmacy', 'Other Personal'],
  },
  {
    id: 'cat-saving',
    name: 'Saving',
    nameAr: 'الادخار',
    color: '#10B981', // Emerald
    iconName: 'PiggyBank',
    defaultType: 'fixed',
    stores: ['Emergency Fund', 'Savings Account', 'Long-term Savings'],
  },
];

export const DEFAULT_MONTH_RECORDS: MonthRecord[] = [];

export const DEFAULT_EXPENSES: Expense[] = [];

