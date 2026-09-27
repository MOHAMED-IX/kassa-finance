import React from 'react';
import { Category } from '../types/finance';
import { getCategoryVisual } from '../utils/categoryMeta';
import { Language } from '../utils/i18n';

interface CategoryIconProps {
  category?: Category | string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  withContainer?: boolean;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const containerSizeClasses = {
  xs: 'p-1 rounded-md',
  sm: 'p-1.5 rounded-lg',
  md: 'p-2 rounded-xl',
  lg: 'p-2.5 rounded-xl',
};

/**
 * Standard Category Icon Component.
 * The icon itself is explicitly colored according to the central category configuration.
 * Never uses a plain colored circle/dot.
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  className = '',
  size = 'md',
  withContainer = false,
}) => {
  const visual = getCategoryVisual(category);
  const IconComponent = visual.icon;

  if (withContainer) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 border ${visual.bgColorClass} ${visual.borderColorClass} ${containerSizeClasses[size]} ${className}`}
        style={{
          backgroundColor: `${visual.color}15`, // 8-10% opacity tint
          borderColor: `${visual.color}30`,
        }}
      >
        <IconComponent
          className={`${sizeClasses[size]} shrink-0`}
          style={{ color: visual.color }}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <IconComponent
      className={`${sizeClasses[size]} shrink-0 ${className}`}
      style={{ color: visual.color }}
      aria-hidden="true"
    />
  );
};

/**
 * Category Badge displaying [Colored Category Icon] + Category Name
 */
export const CategoryBadge: React.FC<{
  category?: Category | string | null;
  lang?: Language;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  withContainer?: boolean;
}> = ({ category, lang, size = 'sm', className = '', withContainer = true }) => {
  const visual = getCategoryVisual(category);
  const catObj = typeof category === 'object' && category ? category : null;
  
  // Clean category name without secondary subtitles
  const displayName =
    lang === 'ar' && catObj?.nameAr ? catObj.nameAr : catObj?.name || visual.name;

  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <CategoryIcon category={category} size={size} withContainer={withContainer} />
      <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
        {displayName}
      </span>
    </span>
  );
};
