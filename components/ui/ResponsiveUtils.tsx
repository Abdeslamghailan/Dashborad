/**
 * Responsive Utility Components
 * Reusable components for responsive design across the dashboard
 */

import React from 'react';

// Responsive Container - adapts padding based on screen size
export const ResponsiveContainer: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => (
    <div className={`px-2 sm:px-4 lg:px-6 ${className}`}>
        {children}
    </div>
);

// Responsive Grid - auto-adjusts columns
export const ResponsiveGrid: React.FC<{
    children: React.ReactNode;
    cols?: { sm?: number; md?: number; lg?: number; xl?: number };
    gap?: string;
    className?: string;
}> = ({ children, cols = { sm: 1, md: 2, lg: 3 }, gap = '4', className = '' }) => {
    const gridCols = `grid-cols-${cols.sm || 1} ${cols.md ? `md:grid-cols-${cols.md}` : ''} ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''} ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}`;

    return (
        <div className={`grid ${gridCols} gap-${gap} ${className}`}>
            {children}
        </div>
    );
};

// Responsive Card - adapts padding and spacing
export const ResponsiveCard: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 ${className}`}>
        {children}
    </div>
);

// Responsive Section Title
export const ResponsiveSectionTitle: React.FC<{
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}> = ({ children, icon, className = '' }) => (
    <div className={`flex items-center gap-2 mb-3 sm:mb-4 ${className}`}>
        {icon && <span className="text-indigo-600">{icon}</span>}
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{children}</h3>
    </div>
);

// Responsive Button Group - stacks on mobile
export const ResponsiveButtonGroup: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => (
    <div className={`flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 ${className}`}>
        {children}
    </div>
);

// Responsive Table Wrapper - adds horizontal scroll on mobile
export const ResponsiveTable: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => (
    <div className={`overflow-x-auto -mx-2 sm:mx-0 ${className}`}>
        <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
                {children}
            </div>
        </div>
    </div>
);

// Responsive Stat Card
export const ResponsiveStatCard: React.FC<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
    className?: string;
}> = ({ label, value, icon, color = 'blue', className = '' }) => {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
    };

    return (
        <div className={`${colorClasses[color]} rounded-lg sm:rounded-xl border p-3 sm:p-4 ${className}`}>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium opacity-80">{label}</span>
                {icon && <span className="opacity-60">{icon}</span>}
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{value}</div>
        </div>
    );
};

// Responsive Chart Container
export const ResponsiveChartContainer: React.FC<{
    children: React.ReactNode;
    height?: string;
    className?: string;
}> = ({ children, height = '300px', className = '' }) => (
    <div
        className={`w-full ${className}`}
        style={{
            height: height,
            minHeight: '200px',
        }}
    >
        {children}
    </div>
);

// Mobile/Desktop Conditional Render
export const MobileOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="block lg:hidden">{children}</div>
);

export const DesktopOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="hidden lg:block">{children}</div>
);

export const TabletUp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="hidden sm:block">{children}</div>
);

export const TabletDown: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="block sm:hidden">{children}</div>
);
