export const formatNumber = (num: number) => num?.toLocaleString() ?? '0';

export const formatPercentage = (value: number, total: number) =>
    total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
