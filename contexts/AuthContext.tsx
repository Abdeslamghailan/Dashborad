import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../config';
import { logger } from '../utils/logger';

interface User {
    id: number;
    username: string | null;
    photoUrl?: string | null;
    role: string;
    telegramId: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (telegramData: any) => Promise<void>;
    loginWithPassword: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAdmin: boolean;
    isMailer: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const savedToken = localStorage.getItem('auth_token');
        if (savedToken) {
            setToken(savedToken);
            fetchCurrentUser(savedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchCurrentUser = async (authToken: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                logger.debug('User authenticated successfully');
                setUser(userData);
            } else {
                // Token invalid, clear it
                localStorage.removeItem('auth_token');
                setToken(null);
            }
        } catch (error) {
            logger.error('Failed to fetch user', error);
            localStorage.removeItem('auth_token');
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (telegramData: any) => {
        try {
            logger.debug('Attempting Telegram login');

            const response = await fetch(`${API_URL}/api/auth/telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(telegramData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Authentication failed');
            }

            const data = await response.json();
            logger.debug('Login successful');
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('auth_token', data.token);
        } catch (error) {
            logger.error('Login error', error);
            throw error;
        }
    };

    const loginWithPassword = async (username: string, password: string) => {
        try {
            console.log(`[AuthContext] Attempting login for ${username} at ${API_URL}/api/auth/login`);
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.error || 'Login failed');
                } else {
                    const text = await response.text();
                    console.error('[AuthContext] Login failed with non-JSON response:', text.substring(0, 500));
                    throw new Error(`Server error: ${response.status}. Please check backend logs.`);
                }
            }

            const data = await response.json();
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('auth_token', data.token);
        } catch (error) {
            console.error('Password login error:', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
    };

    const isAdmin = user?.role === 'ADMIN';
    const isMailer = user?.role === 'MAILER';

    return (
        <AuthContext.Provider value={{ user, token, login, loginWithPassword, logout, isAdmin, isMailer, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
