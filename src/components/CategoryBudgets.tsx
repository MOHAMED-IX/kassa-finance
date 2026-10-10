import React, { useState, useMemo } from 'react';
import {
  CategorySummary,
  PeriodMode,
  Currency,
  PeriodSavingTransferInfo,
} from '../types/finance';
import { formatEUR, getCurrencySymbol } from '../utils/formatters';
import { Language, translations } from '../utils/i18n';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Check,
  X,
  Info,
  RotateCw,
  Lock,
  GripVertical,
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { reconcileCategoryOrder, sortItemsByCategoryOrder } from '../utils/categoryOrder';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CategoryBudgetsProps {
  categorySummaries: CategorySummary[];
  categoryOrder?: string[];
  onReorderCategories?: (newOrder: string[]) => void;
  onUpdateCategoryBudget: (categoryId: string, newBudget: number) => void;
  lang: Language;
  currency?: Currency;
  income?: number;
  totalExpenses?: number;
  remainingIncome?: number;
  periodMode?: PeriodMode;
  periodSavingTransferInfo?: PeriodSavingTransferInfo;
  onTransferSavingToBank?: () => void;
}

interface CategoryCardViewProps {
  catSummary: CategorySummary;
  lang: Language;
  currency?: Currency;
  income: number;
  totalExpenses: number;
  periodMode: PeriodMode;
  defaultGrossTransfers: number;
  defaultGrossReturns: number;
  defaultNetActualSavings: number;
  editingCatId: string | null;
  budgetInput: string;
  setBudgetInput: (val: string) => void;
  handleStartEdit: (id: string, budget: number) => void;
  handleSaveBudget: (id: string) => void;
  setEditingCatId: (id: string | null) => void;
  activeInfoCatId: string | null;
  setActiveInfoCatId: React.Dispatch<React.SetStateAction<string | null>>;
  dragHandleProps?: {
    setActivatorNodeRef: (element: HTMLElement | null) => void;
    attributes: Record<string, any>;
    listeners: Record<string, any> | undefined;
  };
  isDragging?: boolean;
  isOverlay?: boolean;
}

export const CategoryCardView: React.FC<CategoryCardViewProps> = ({
  catSummary,
  lang,
  currency,
  income,
  periodMode,
  defaultGrossTransfers,
  defaultGrossReturns,
  defaultNetActualSavings,
  editingCatId,
  budgetInput,
  setBudgetInput,
  handleStartEdit,
  handleSaveBudget,
  setEditingCatId,
  activeInfoCatId,
  setActiveInfoCatId,
  dragHandleProps,
  isOverlay = false,
}) => {
  const t = translations[lang];
  const { category, totalSpent, budget, remainingBudget, percentageUsed, isOverBudget } =
    catSummary;
  const isEditing = editingCatId === category.id;
  const hasBudget = budget > 0;
  const isSavingCategory =
    category.id === 'cat-saving' || category.name.toLowerCase() === 'saving';
  const isFixedCategory =
    category.id === 'cat-fixed' || category.defaultType === 'fixed';

  // 1. Special render for Saving Category
  if (isSavingCategory) {
    const grossTransfers =
      catSummary.grossTransfers !== undefined
        ? catSummary.grossTransfers
        : defaultGrossTransfers;
    const grossReturns =
      catSummary.grossReturns !== undefined
        ? catSummary.grossReturns
        : defaultGrossReturns;
    const netActualSavings =
      catSummary.actualSavings !== undefined
        ? catSummary.actualSavings
        : defaultNetActualSavings;
    const actualSavingsRate =
      income > 0 ? Math.max(0, (netActualSavings / income) * 100) : 0;
    const isPositive = netActualSavings >= 0;
    const progressPercent = hasBudget
      ? Math.min(100, Math.max(0, (netActualSavings / budget) * 100))
      : Math.min(100, Math.max(0, actualSavingsRate));

    return (
      <div
        className={`@container p-3.5 rounded-xl border transition-all h-full bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60 ${
          isOverlay ? 'shadow-2xl border-emerald-500' : ''
        }`}
      >
        {/* Category Header: Single Row [Handle + Icon + Name] ... [Status + %] */}
        <div className="flex items-center justify-between gap-2.5 mb-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {dragHandleProps && (
              <button
                type="button"
                ref={dragHandleProps.setActivatorNodeRef}
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
                aria-label={`${t.dragToReorder || 'Drag to reorder category'}: ${
                  lang === 'ar' && category.nameAr ? category.nameAr : category.name
                }`}
                title={t.dragToReorder || 'Drag to reorder category'}
                className="p-1 -ms-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-grab active:cursor-grabbing transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 touch-none select-none"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
            )}
            <CategoryIcon category={category} size="md" withContainer />
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {lang === 'ar' && category.nameAr ? category.nameAr : category.name}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1 shrink-0">
            {netActualSavings > 0 ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="tabular-nums">
                  {hasBudget
                    ? `${((netActualSavings / budget) * 100).toFixed(1)}%`
                    : t.percentSaved.replace('{percent}', actualSavingsRate.toFixed(1))}
                </span>
              </span>
            ) : netActualSavings < 0 ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{t.deficit}</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                {t.noSavingsTransferredYet}
              </span>
            )}
          </div>
        </div>

        {/* Numbers: Responsive 3 Financial Metrics */}
        {/* Mobile (< sm): 3 vertically stacked rows with clear label and value association */}
        <div className="sm:hidden space-y-2 py-2 border-y border-emerald-200/60 dark:border-emerald-800/60 my-2.5">
          <div className="flex items-center justify-between gap-3 text-xs min-w-0">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight break-words">
              {t.grossTransfers}
            </span>
            <span className="font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums shrink-0 text-right">
              {formatEUR(grossTransfers)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs min-w-0">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight break-words">
              {t.grossReturns}
            </span>
            <span className="font-bold font-mono text-slate-600 dark:text-slate-400 tabular-nums shrink-0 text-right">
              {formatEUR(grossReturns)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs min-w-0 pt-1.5 border-t border-emerald-200/50 dark:border-emerald-800/40">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold leading-tight break-words">
              {t.netActualSavings}
            </span>
            <span
              className={`font-extrabold font-mono tabular-nums shrink-0 text-right ${
                isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatEUR(netActualSavings)}
            </span>
          </div>
        </div>

        {/* Desktop and Tablet (>= sm): 3 balanced horizontal columns */}
        <div className="hidden sm:grid sm:grid-cols-3 items-stretch gap-2 py-2 text-xs border-y border-emerald-200/60 dark:border-emerald-800/60 my-2.5">
          <div className="min-w-0 flex flex-col justify-between items-center text-center px-1">
            <span
              className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight block text-center break-words line-clamp-2"
              title={t.grossTransfers}
            >
              {t.grossTransfers}
            </span>
            <span className="font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block text-center mt-1">
              {formatEUR(grossTransfers)}
            </span>
          </div>

          <div className="min-w-0 flex flex-col justify-between items-center text-center px-1 border-x border-emerald-200/50 dark:border-emerald-800/50">
            <span
              className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight block text-center break-words line-clamp-2"
              title={t.grossReturns}
            >
              {t.grossReturns}
            </span>
            <span className="font-bold font-mono text-slate-600 dark:text-slate-400 tabular-nums block text-center mt-1">
              {formatEUR(grossReturns)}
            </span>
          </div>

          <div className="min-w-0 flex flex-col justify-between items-center text-center px-1">
            <span
              className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold leading-tight block text-center break-words line-clamp-2"
              title={t.netActualSavings}
            >
              {t.netActualSavings}
            </span>
            <span
              className={`font-extrabold font-mono tabular-nums block text-center mt-1 ${
                isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatEUR(netActualSavings)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              netActualSavings > 0
                ? 'bg-emerald-500'
                : netActualSavings < 0
                ? 'bg-rose-500'
                : 'bg-slate-300 dark:bg-slate-600'
            }`}
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>
    );
  }

  // 2. Standard Category Card
  return (
    <div
      className={`@container p-3.5 rounded-xl border transition-all h-full ${
        isOverBudget
          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
      } ${isOverlay ? 'shadow-2xl border-emerald-500' : ''}`}
    >
      {/* Category Header: Single Row [Handle + Icon + Name] ... [Status + %] */}
      <div className="flex items-center justify-between gap-2.5 mb-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {dragHandleProps && (
            <button
              type="button"
              ref={dragHandleProps.setActivatorNodeRef}
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
              aria-label={`${t.dragToReorder || 'Drag to reorder category'}: ${
                lang === 'ar' && category.nameAr ? category.nameAr : category.name
              }`}
              title={t.dragToReorder || 'Drag to reorder category'}
              className="p-1 -ms-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-grab active:cursor-grabbing transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 touch-none select-none"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <CategoryIcon category={category} size="md" withContainer />
          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {lang === 'ar' && category.nameAr ? category.nameAr : category.name}
          </span>
        </div>

        {/* Right: Allocation Badge (if applicable) & Percentage */}
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {periodMode === 'month' && catSummary.hasCycleBudget && (
            isFixedCategory ? (
              <span
                className="hidden @[420px]:inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40 shrink-0 whitespace-nowrap"
                title={t.fixedExpensesDateAttributionNotice}
              >
                <Lock className="w-2.5 h-2.5 shrink-0" />
                <span className="leading-tight">{t.fixedObligationsBadge}</span>
              </span>
            ) : (
              <span
                className={`hidden @[420px]:inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${
                  catSummary.isProjectedBudget
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
                title={t.calendarBudgetNotice}
              >
                <RotateCw className={`w-2.5 h-2.5 shrink-0 ${catSummary.isProjectedBudget ? 'animate-spin-slow' : ''}`} />
                <span className="leading-tight">
                  {catSummary.isProjectedBudget ? t.estimatedFromCycle : t.allocatedFromCycles}
                </span>
              </span>
            )
          )}
          {isOverBudget ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="tabular-nums">{percentageUsed.toFixed(1)}%</span>
            </span>
          ) : hasBudget ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="tabular-nums">{percentageUsed.toFixed(1)}%</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
              {t.noLimit}
            </span>
          )}
        </div>
      </div>

      {/* Numbers Row: 3-Zone Layout (Spent | Budget | Remaining) */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:gap-2 py-1.5 text-xs border-y border-slate-200/60 dark:border-slate-700/60 my-2">
        {/* Zone 1: Spent */}
        <div className="min-w-0 flex flex-col items-center justify-center text-center">
          <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate text-center">
            {t.spent}
          </span>
          <span className="font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block text-xs truncate text-center">
            {formatEUR(totalSpent)}
          </span>
        </div>

        {/* Zone 2: Budget */}
        <div className="min-w-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-1 max-w-full">
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate text-center">
              {periodMode === 'month' && catSummary.hasCycleBudget
                ? isFixedCategory
                  ? t.fixedObligationsBadge
                  : catSummary.isProjectedBudget
                  ? t.estimatedBudget
                  : t.allocatedBudget
                : t.budget}
            </span>
            {periodMode === 'month' && catSummary.hasCycleBudget && !isEditing && (
              <button
                type="button"
                onClick={() =>
                  setActiveInfoCatId((prev) => (prev === category.id ? null : category.id))
                }
                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-0.5 shrink-0 cursor-pointer"
                title={isFixedCategory ? t.fixedExpensesDateAttributionNotice : t.calendarBudgetNotice}
              >
                <Info className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {isEditing ? (
            /* Editing state: [ input ] € ✓ ✕ centered under Budget label */
            <div className="flex items-center justify-center gap-1 max-w-full mt-0.5">
              <div className="relative inline-flex items-center">
                <input
                  type="number"
                  step="10"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="0"
                  className="w-14 sm:w-16 px-1.5 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-emerald-500 rounded text-slate-900 dark:text-white focus:outline-hidden pe-5 sm:pe-5.5 text-center"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveBudget(category.id);
                    if (e.key === 'Escape') setEditingCatId(null);
                  }}
                />
                <span className="absolute end-1.5 font-mono text-[10px] sm:text-[11px] text-slate-400 pointer-events-none select-none">
                  {getCurrencySymbol(currency)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSaveBudget(category.id)}
                className="p-1 min-w-[24px] min-h-[24px] rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 transition-colors flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
                title={t.saveCategory || 'Save'}
                aria-label="Save budget"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingCatId(null)}
                className="p-1 min-w-[24px] min-h-[24px] rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                title={t.cancel || 'Cancel'}
                aria-label="Cancel editing"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : periodMode === 'month' && catSummary.hasCycleBudget ? (
            <button
              type="button"
              onClick={() =>
                setActiveInfoCatId((prev) => (prev === category.id ? null : category.id))
              }
              className="group flex flex-col items-center justify-center font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors text-center max-w-full cursor-pointer"
              title={isFixedCategory ? t.fixedExpensesDateAttributionNotice : t.calendarBudgetNotice}
            >
              <span className="font-semibold tabular-nums truncate block text-center">
                {formatEUR(budget)}
              </span>
              <span className="text-[9px] font-sans text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate block text-center">
                {isFixedCategory ? t.fixedObligationsBadge : t.budgetFromSpendingCycle}
              </span>
            </button>
          ) : (
            <button
              onClick={() => handleStartEdit(category.id, budget)}
              className="group relative inline-flex items-center justify-center font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer max-w-full"
              title={t.clickToEditBudget}
            >
              <span className="font-semibold tabular-nums truncate text-center">
                {hasBudget ? formatEUR(budget) : t.setShort}
              </span>
              <Edit3 className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 absolute -end-3.5 top-1/2 -translate-y-1/2" />
            </button>
          )}
        </div>

        {/* Zone 3: Remaining */}
        <div className="min-w-0 flex flex-col items-center justify-center text-center">
          <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate text-center">
            {t.remaining}
          </span>
          <span
            className={`font-bold font-mono tabular-nums block text-xs truncate text-center ${
              !hasBudget
                ? 'text-slate-400'
                : isOverBudget
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {hasBudget ? formatEUR(remainingBudget) : '—'}
          </span>
        </div>
      </div>

      {/* Optional Popover Notice for Cycle Allocation */}
      {activeInfoCatId === category.id && periodMode === 'month' && catSummary.hasCycleBudget && (
        <div className="mb-2 p-2.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 relative">
          <button
            type="button"
            onClick={() => setActiveInfoCatId(null)}
            className="absolute top-1.5 right-1.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3 h-3" />
          </button>
          <div
            className={`font-semibold flex items-center gap-1 ${
              isFixedCategory
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {isFixedCategory ? <Lock className="w-3 h-3" /> : <RotateCw className="w-3 h-3" />}
            <span>
              {isFixedCategory
                ? t.fixedObligationsBadge
                : catSummary.isProjectedBudget
                ? t.estimatedBudget
                : t.allocatedBudget}
            </span>
          </div>
          <p className="pr-4">
            {isFixedCategory
              ? t.fixedExpensesDateAttributionNotice
              : t.calendarBudgetNotice}
          </p>
          {!isFixedCategory && catSummary.cycleAllocations && catSummary.cycleAllocations.length > 0 && (
            <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700 space-y-0.5 font-mono text-[10px]">
              {catSummary.cycleAllocations.map((alloc, idx) => (
                <div key={idx} className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>
                    {t.cycleDaysOverlap
                      .replace('{overlap}', String(alloc.overlapDays))
                      .replace('{total}', String(alloc.totalCycleDays))}
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {formatEUR(alloc.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
            {t.editAuthoritativeCycleBudget}
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            !hasBudget
              ? 'bg-slate-400'
              : isOverBudget
              ? 'bg-rose-500'
              : 'bg-emerald-500'
          }`}
          style={{
            width: hasBudget ? `${Math.min(100, percentageUsed)}%` : '0%',
          }}
        />
      </div>

      {/* Over Budget Notice */}
      {isOverBudget && (
        <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>
            {t.overBudgetWarning} {formatEUR(Math.abs(remainingBudget))}
          </span>
        </div>
      )}
    </div>
  );
};

interface SortableCategoryCardProps extends Omit<CategoryCardViewProps, 'dragHandleProps' | 'isDragging' | 'isOverlay'> {
  id: string;
}

const SortableCategoryCard: React.FC<SortableCategoryCardProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 0 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <CategoryCardView
        {...props}
        isDragging={isDragging}
        dragHandleProps={{
          setActivatorNodeRef,
          attributes,
          listeners,
        }}
      />
    </div>
  );
};

export const CategoryBudgets: React.FC<CategoryBudgetsProps> = ({
  categorySummaries,
  categoryOrder,
  onReorderCategories,
  onUpdateCategoryBudget,
  lang,
  currency,
  income = 0,
  totalExpenses = 0,
  remainingIncome,
  periodMode = 'month',
  periodSavingTransferInfo,
}) => {
  const t = translations[lang];

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [activeInfoCatId, setActiveInfoCatId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Reconcile and compute effective sorted summaries
  const effectiveOrder = useMemo(() => {
    return reconcileCategoryOrder(
      categorySummaries.map((cs) => cs.category),
      categoryOrder
    );
  }, [categorySummaries, categoryOrder]);

  const sortedSummaries = useMemo(() => {
    return sortItemsByCategoryOrder(categorySummaries, effectiveOrder);
  }, [categorySummaries, effectiveOrder]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedSummaries.findIndex((s) => s.category.id === active.id);
      const newIndex = sortedSummaries.findIndex((s) => s.category.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(sortedSummaries, oldIndex, newIndex);
        const newOrder = newItems.map((item) => item.category.id);
        if (onReorderCategories) {
          onReorderCategories(newOrder);
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeSummary = useMemo(() => {
    if (!activeId) return null;
    return sortedSummaries.find((cs) => cs.category.id === activeId) || null;
  }, [activeId, sortedSummaries]);

  const handleStartEdit = (catId: string, currentBudget: number) => {
    setEditingCatId(catId);
    setBudgetInput(currentBudget > 0 ? currentBudget.toString() : '');
  };

  const handleSaveBudget = (catId: string) => {
    const parsed = parseFloat(budgetInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateCategoryBudget(catId, parsed);
    } else if (budgetInput.trim() === '') {
      onUpdateCategoryBudget(catId, 0);
    }
    setEditingCatId(null);
  };

  const defaultGrossTransfers = periodSavingTransferInfo
    ? periodSavingTransferInfo.grossTransferredAmount
    : 0;
  const defaultGrossReturns = periodSavingTransferInfo
    ? periodSavingTransferInfo.grossReturnedAmount
    : 0;
  const defaultNetActualSavings = periodSavingTransferInfo
    ? periodSavingTransferInfo.netTransferredAmount
    : 0;

  const cardCommonProps = {
    lang,
    currency,
    income,
    totalExpenses,
    remainingIncome,
    periodMode,
    defaultGrossTransfers,
    defaultGrossReturns,
    defaultNetActualSavings,
    editingCatId,
    budgetInput,
    setBudgetInput,
    handleStartEdit,
    handleSaveBudget,
    setEditingCatId,
    activeInfoCatId,
    setActiveInfoCatId,
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            {t.budgetsTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.budgetsSubtitle}
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={sortedSummaries.map((s) => s.category.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sortedSummaries.map((catSummary) => (
              <SortableCategoryCard
                key={catSummary.category.id}
                id={catSummary.category.id}
                catSummary={catSummary}
                {...cardCommonProps}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeSummary ? (
            <div className="shadow-2xl ring-2 ring-emerald-500/50 rounded-xl scale-[1.02] cursor-grabbing select-none pointer-events-none opacity-95">
              <CategoryCardView
                catSummary={activeSummary}
                {...cardCommonProps}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
