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

declare global {
    interface Window {
        TelegramLoginWidget: {
            dataOnauth: (user: TelegramUser) => void;
        };
    }
}

export const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
    botName,
    onAuth,
    buttonSize = 'large',
    cornerRadius = 20,
    requestAccess = true,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Define the global callback
        window.TelegramLoginWidget = {
            dataOnauth: (user: TelegramUser) => {
                onAuth(user);
            },
        };

        // Create the script element
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', buttonSize);
        if (cornerRadius) script.setAttribute('data-radius', cornerRadius.toString());
        if (requestAccess) script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
        script.async = true;

        // Clear previous content and append new script
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(script);

        // Cleanup
        return () => {
            // We don't remove the script here to avoid flickering if re-rendered, 
            // but in a strict cleanup we might. 
            // For this widget, leaving it is usually safer unless unmounting.
        };
    }, [botName, buttonSize, cornerRadius, requestAccess, onAuth]);

    return <div ref={containerRef} className="flex justify-center" />;
};
