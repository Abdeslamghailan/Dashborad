# Quick Responsive Design Guide

## Common Responsive Patterns

### 1. Responsive Padding/Margin
```tsx
// Mobile: 1rem, Tablet: 1.5rem, Desktop: 2rem
className="p-4 sm:p-6 lg:p-8"

// Mobile: 0.5rem, Tablet: 1rem
className="px-2 sm:px-4"
className="py-2 sm:py-4"
```

### 2. Responsive Typography
```tsx
// Headers
className="text-2xl sm:text-3xl lg:text-4xl"  // Large headers
className="text-xl sm:text-2xl lg:text-3xl"   // Medium headers
className="text-lg sm:text-xl lg:text-2xl"    // Small headers

// Body text
className="text-sm sm:text-base"              // Regular text
className="text-xs sm:text-sm"                // Small text
```

### 3. Responsive Grids
```tsx
// 1 column mobile, 2 tablet, 3 desktop
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"

// 1 column mobile, 2 tablet, 4 desktop
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"

// Auto-fit responsive grid
className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4"
```

### 4. Responsive Flex Layouts
```tsx
// Stack on mobile, row on desktop
className="flex flex-col sm:flex-row gap-3 sm:gap-4"

// Wrap items
className="flex flex-wrap gap-2 sm:gap-3"

// Center on mobile, space-between on desktop
className="flex flex-col sm:flex-row items-center sm:justify-between gap-3"
```

### 5. Responsive Buttons
```tsx
// Full width on mobile, auto on desktop
className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5"

// Smaller padding on mobile
className="px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5"

// Responsive icon size
<Icon size={16} className="sm:w-5 sm:h-5" />
```

### 6. Responsive Tables
```tsx
// Wrapper for horizontal scroll
<div className="overflow-x-auto -mx-2 sm:mx-0">
  <table className="min-w-full">
    {/* table content */}
  </table>
</div>

// Mobile card view (hide table on mobile)
<div className="hidden sm:block">
  <table>{/* desktop table */}</table>
</div>
<div className="block sm:hidden">
  {/* mobile card view */}
  {data.map(item => (
    <div className="bg-white p-4 rounded-lg mb-3 border">
      <div className="font-bold">{item.name}</div>
      <div className="text-sm text-gray-600">{item.value}</div>
    </div>
  ))}
</div>
```

### 7. Responsive Charts
```tsx
// Responsive container with adaptive height
<div className="h-48 sm:h-64 lg:h-80 w-full">
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>{/* chart content */}</PieChart>
  </ResponsiveContainer>
</div>
```

### 8. Responsive Cards
```tsx
// Adaptive padding and border radius
className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8"

// Responsive shadow
className="shadow-sm sm:shadow-md lg:shadow-lg"
```

### 9. Hide/Show Based on Screen Size
```tsx
// Hide on mobile
className="hidden sm:block"

// Show only on mobile
className="block sm:hidden"

// Hide on mobile and tablet
className="hidden lg:block"

// Show only on desktop
className="hidden lg:block"

// Show on tablet and up
className="hidden sm:block"
```

### 10. Responsive Spacing
```tsx
// Gap in grids/flex
className="gap-2 sm:gap-4 lg:gap-6"

// Space between elements
className="space-y-3 sm:space-y-4 lg:space-y-6"
className="space-x-2 sm:space-x-3 lg:space-x-4"
```

## Component-Specific Patterns

### Filter Sections
```tsx
<div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
  <MultiSelect className="w-full sm:w-auto sm:min-w-[200px]" />
  <MultiSelect className="w-full sm:w-auto sm:min-w-[200px]" />
  <button className="w-full sm:w-auto px-4 py-2">Apply</button>
</div>
```

### Stat Cards Grid
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
  <StatCard />
  <StatCard />
  {/* ... */}
</div>
```

### Sidebar Layout
```tsx
<div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
  {/* Main content - full width on mobile */}
  <div className="flex-1 min-w-0">
    {/* content */}
  </div>
  
  {/* Sidebar - full width on mobile, fixed width on desktop */}
  <aside className="w-full lg:w-80 xl:w-96">
    {/* sidebar content */}
  </aside>
</div>
```

### Modal/Dialog
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-lg sm:rounded-xl w-full max-w-md sm:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
    {/* modal content */}
  </div>
</div>
```

### Header with Actions
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Title</h2>
  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
    <button className="w-full sm:w-auto">Action 1</button>
    <button className="w-full sm:w-auto">Action 2</button>
  </div>
</div>
```

## Tailwind Breakpoints Reference

```
sm:  640px  @media (min-width: 640px)
md:  768px  @media (min-width: 768px)
lg:  1024px @media (min-width: 1024px)
xl:  1280px @media (min-width: 1280px)
2xl: 1536px @media (min-width: 1536px)
```

## Testing Checklist

For each component:
- [ ] Test at 375px (iPhone SE)
- [ ] Test at 390px (iPhone 12/13)
- [ ] Test at 428px (iPhone 14 Pro Max)
- [ ] Test at 768px (iPad)
- [ ] Test at 1024px (iPad Pro)
- [ ] Test at 1280px (Desktop)
- [ ] Test at 1920px (Large Desktop)
- [ ] No horizontal scroll
- [ ] All text is readable
- [ ] Buttons are touch-friendly (min 44x44px)
- [ ] Forms are usable
- [ ] Charts display correctly
- [ ] Tables are accessible

## Common Mistakes to Avoid

1. **Don't use fixed widths** - Use `w-full`, `max-w-*`, or flex/grid
2. **Don't forget touch targets** - Minimum 44x44px for buttons
3. **Don't hide critical content** - Make it accessible on all screens
4. **Don't use tiny text** - Minimum 14px (text-sm) on mobile
5. **Don't forget horizontal scroll** - Test with narrow viewports
6. **Don't use complex animations on mobile** - Can cause performance issues
7. **Don't forget landscape orientation** - Test both portrait and landscape
8. **Don't use hover-only interactions** - Provide touch alternatives
