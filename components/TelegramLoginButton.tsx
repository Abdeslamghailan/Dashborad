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
        if (!containerRef.current) {
            console.log('TelegramLoginButton: containerRef is null');
            return;
        }

        console.log('TelegramLoginButton: Mounting widget for bot:', botName);

        // Define the global callback
        console.log('TelegramLoginButton: Defining global callback window.onTelegramAuth');
        (window as any).onTelegramAuth = (user: TelegramUser) => {
            console.log('TelegramLoginButton: 🟢 onTelegramAuth called by widget!', user);
            try {
                onAuth(user);
            } catch (e) {
                console.error('TelegramLoginButton: 🔴 Error in onAuth prop:', e);
            }
        };

        // Create the script element
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', buttonSize);
        if (cornerRadius) script.setAttribute('data-radius', cornerRadius.toString());
        if (requestAccess) script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.async = true;

        script.onload = () => {
            console.log('TelegramLoginButton: Script loaded successfully');
        };
        script.onerror = (e) => {
            console.error('TelegramLoginButton: Script load error:', e);
        };

        // Clear previous content and append new script
        console.log('TelegramLoginButton: Appending script to container');
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(script);

        // Cleanup
        return () => {
            console.log('TelegramLoginButton: Unmounting');
        };
    }, [botName, buttonSize, cornerRadius, requestAccess, onAuth]);

    return <div ref={containerRef} className="flex justify-center" />;
};
