export const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return '';
    const s = new Date(start).toLocaleDateString();
    const e = new Date(end).toLocaleDateString();
    return `${s} - ${e}`;
};

export const getDayLabel = (dayIndex: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayIndex];
};
