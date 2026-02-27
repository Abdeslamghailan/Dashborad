export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TASK_COLORS: Record<string, string> = {
    'CMH3': '#90EE90',
    'CMH9': '#90EE90',
    'CMH12': '#FFFFE0',
    'CMH5': '#FFFFE0',
    'CMH16': '#FFFFE0',
    'HOTMAIL': '#FFD700',
    'Gmail': '#FFD700',
    'Desktop': '#FFA500',
    'Webautomat': '#FFA500',
    'Night Desktop': '#FFA500',
    'Night tool it': '#FFA500',
    'congé': '#FFB6C1',
    'default': '#E0E0E0'
};

export const DEFAULT_ENTITY_PRESETS = [
    { label: 'CMH3-CMH9', codes: ['CMH3', 'CMH9'], color: '#90EE90' },
    { label: 'CMH12-CMH5-CMH16', codes: ['CMH12', 'CMH5', 'CMH16'], color: '#FFFFE0' },
    { label: 'HOTMAIL-Gmail', codes: ['HOTMAIL', 'Gmail'], color: '#FFD700' },
    { label: 'Desktop-Webautomat', codes: ['Desktop', 'Webautomat'], color: '#FFA500' },
    { label: 'Night Desktop-Night tool it', codes: ['Night Desktop', 'Night tool it'], color: '#FFA500' },
    { label: 'congé', codes: ['congé'], color: '#FFB6C1' }
];
