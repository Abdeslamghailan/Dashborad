import React, { useEffect, useRef } from 'react';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface TelegramLoginButtonProps {
    botName: string;
    onAuth: (user: TelegramUser) => void;
    buttonSize?: 'large' | 'medium' | 'small';
    cornerRadius?: number;
    requestAccess?: boolean;
}

export const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
    botName,
    onAuth,
    buttonSize = 'large',
    cornerRadius = 20,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Get the current page URL for redirect
        const currentUrl = window.location.origin + window.location.pathname;
        console.log('TelegramLoginButton: Setting up widget with redirect URL:', currentUrl);

        // Create an iframe-based widget with ONLY redirect
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius.toString());
        // script.setAttribute('data-request-access', 'write'); // Keep disabled

        // IMPORTANT: Use data-auth-url for redirect flow. 
        // We append ?tg_auth=1 so we know it's a callback when we return.
        script.setAttribute('data-auth-url', currentUrl + '?tg_auth=1');

        script.async = true;

        script.onload = () => {
            console.log('TelegramLoginButton: Widget script loaded');
        };

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(script);
    }, [botName, buttonSize, cornerRadius]);

    // Check for auth data in URL on mount (for redirect flow)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        // Check if this is a Telegram auth redirect
        if (urlParams.get('tg_auth') === '1') {
            console.log('TelegramLoginButton: Detected Telegram auth redirect');

            // Parse Telegram auth data from URL hash or query params
            const hashParams = new URLSearchParams(window.location.hash.substring(1));

            const id = urlParams.get('id') || hashParams.get('id');
            const first_name = urlParams.get('first_name') || hashParams.get('first_name');
            const last_name = urlParams.get('last_name') || hashParams.get('last_name');
            const username = urlParams.get('username') || hashParams.get('username');
            const photo_url = urlParams.get('photo_url') || hashParams.get('photo_url');
            const auth_date = urlParams.get('auth_date') || hashParams.get('auth_date');
            const hash = urlParams.get('hash') || hashParams.get('hash');

            if (id && auth_date && hash) {
                console.log('TelegramLoginButton: Auth data found in URL');
                const userData: TelegramUser = {
                    id: parseInt(id),
                    first_name: first_name || '',
                    last_name: last_name || undefined,
                    username: username || undefined,
                    photo_url: photo_url || undefined,
                    auth_date: parseInt(auth_date),
                    hash: hash,
                };

                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);

                // Call the auth handler
                onAuth(userData);
            }
        }
    }, [onAuth]);

    return (
        <div className="flex flex-col items-center gap-2">
            <div ref={containerRef} className="flex justify-center" />
        </div>
    );
};
