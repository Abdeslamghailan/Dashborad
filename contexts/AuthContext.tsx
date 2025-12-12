import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../config';

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
                console.log('🟢 User data received:', userData);
                console.log('🟢 PhotoUrl:', userData.photoUrl);
                setUser(userData);
            } else {
                // Token invalid, clear it
                localStorage.removeItem('auth_token');
                setToken(null);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
            localStorage.removeItem('auth_token');
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (telegramData: any) => {
        try {
            console.log('🔵 Frontend: Attempting Telegram login with data:', telegramData);
            console.log('🔵 Frontend: API_URL:', API_URL);
            console.log('🔵 Frontend: Full URL:', `${API_URL}/api/auth/telegram`);

            const response = await fetch(`${API_URL}/api/auth/telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(telegramData)
            });

            console.log('🔵 Frontend: Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.log('🔵 Frontend: Error response:', errorData);
                throw new Error(errorData.error || 'Authentication failed');
            }

            const data = await response.json();
            console.log('🔵 Frontend: Login successful, received token');
            console.log('🔵 Frontend: User data:', data.user);
            console.log('🔵 Frontend: PhotoUrl:', data.user?.photoUrl);
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('auth_token', data.token);
        } catch (error) {
            console.error('🔴 Frontend: Login error:', error);
            throw error;
        }
    };

    const loginWithPassword = async (username: string, password: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
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
