import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../config';
import { logger } from '../utils/logger';

interface User {
    id: number;
    username: string | null;
    photoUrl?: string | null;
    role: string;
    telegramId: string;
    mustChangePassword?: boolean;
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
    updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for session on mount
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const userData = await response.json();
                logger.debug('User authenticated successfully');
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            logger.error('Failed to fetch user', error);
            setUser(null);
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
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify(telegramData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Authentication failed');
            }

            const data = await response.json();
            logger.debug('Login successful');
            setUser(data.user);
        } catch (error) {
            logger.error('Login error', error);
            throw error;
        }
    };

    const loginWithPassword = async (username: string, password: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.error || 'Login failed');
                } else {
                    const text = await response.text();
                    throw new Error(`Server error: ${response.status}. Please check backend logs.`);
                }
            }

            const data = await response.json();
            setUser(data.user);
        } catch (error) {
            throw error;
        }
    };

    const updatePassword = async (currentPassword: string, newPassword: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/update-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update password');
            }

            // Re-fetch user to clear mustChangePassword flag
            await fetchCurrentUser();
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });
        } catch (error) {
            logger.error('Logout error', error);
        } finally {
            setUser(null);
            setToken(null);
        }
    };

    const isAdmin = user?.role === 'ADMIN';
    const isMailer = user?.role === 'MAILER';

    return (
        <AuthContext.Provider value={{ user, token, login, loginWithPassword, logout, isAdmin, isMailer, isLoading, updatePassword }}>
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
