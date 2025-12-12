import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TelegramLoginButton } from './TelegramLoginButton';
import { Button } from './ui/Button';
import { Footer } from './Footer';

export const LoginPage: React.FC = () => {
    const { login, loginWithPassword } = useAuth();
    const navigate = useNavigate();
    const [isPasswordLogin, setIsPasswordLogin] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleTelegramAuth = async (user: any) => {
        try {
            await login(user);
            navigate('/');
        } catch (error: any) {
            console.error('Login failed:', error);
            if (error.message === 'Registration pending approval' || error.message === 'Account pending approval') {
                alert('Your account is pending approval from an administrator. Please contact support.');
            } else {
                alert('Login failed. Please try again.');
            }
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await loginWithPassword(username, password);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Entity Dashboard</h1>
                        <p className="text-gray-600">
                            {isPasswordLogin ? 'Sign in with your credentials' : 'Sign in with your Telegram account'}
                        </p>
                    </div>

                    {isPasswordLogin ? (
                        <form onSubmit={handlePasswordLogin} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={false} // You might want to pass loading state here if available
                            >
                                Sign In
                            </Button>
                        </form>
                    ) : (
                        <>
                            <div className="bg-gray-50 rounded-xl p-6 mb-6">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Secure Authentication</h3>
                                        <p className="text-sm text-gray-600">Your data is protected with Telegram's secure login system</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center py-4">
                                <TelegramLoginButton
                                    botName={import.meta.env.VITE_TELEGRAM_BOT_NAME || 'your_bot'}
                                    onAuth={handleTelegramAuth}
                                />
                            </div>
                        </>
                    )}

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsPasswordLogin(!isPasswordLogin)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            {isPasswordLogin ? 'Login with Telegram' : 'Login with Password'}
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                            By signing in, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="py-4 px-8">
                <div className="text-center">
                    <p className="text-sm text-white/90">
                        © 2025 CMHW Team | All Rights Reserved
                    </p>
                </div>
            </div>
        </div>
    );
};
