import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { TelegramLoginButton } from './TelegramLoginButton';
import { Button } from './ui/Button';
import { apiService } from '../services/apiService';

export const LoginPage: React.FC = () => {
    const { login, loginWithPassword } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdminRoute = location.pathname === '/login/admin';
    const [isPasswordLogin, setIsPasswordLogin] = useState(isAdminRoute);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

    React.useEffect(() => {
        setIsPasswordLogin(isAdminRoute);
    }, [isAdminRoute]);

    React.useEffect(() => {
        const checkHealth = async () => {
            try {
                const data = await apiService.checkHealth();
                if (data) {
                    setServerStatus('online');
                } else {
                    setServerStatus('offline');
                }
            } catch (err) {
                console.error(`[LoginPage] Health check failed:`, err);
                setServerStatus('offline');
            }
        };
        checkHealth();
    }, []);

    const handleTelegramAuth = async (user: any) => {
        console.log('LoginPage: handleTelegramAuth called with user:', user);
        try {
            await login(user);
            navigate('/');
        } catch (error: any) {
            console.error('Login failed:', error);
            if (error.message === 'Registration pending approval' || error.message === 'Account pending approval') {
                alert('Your account is pending approval from an administrator. Please contact support.');
            } else {
                alert(`Login failed: ${error.message || 'Unknown error'}`);
            }
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await loginWithPassword(username, password);
            // navigate('/') is handled by useEffect if user is logged in
        } catch (err: any) {
            console.error('Password login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        }
    };

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { user, updatePassword } = useAuth();

    React.useEffect(() => {
        if (user && !user.mustChangePassword) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        try {
            await updatePassword(password, newPassword);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        }
    };

    if (user?.mustChangePassword) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Update Password</h1>
                            <p className="text-gray-600">You must change your password before continuing</p>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Enter new password"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Update Password
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="w-60 h-60 bg-white rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4">
                            <img src="/cmhwarmup-logo.png" alt="CMHWARMUP Logo" className="w-full h-full object-contain scale-110" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">CMHW Dashboard</h1>
                        <p className="text-gray-600">
                            {isPasswordLogin ? 'Sign in with your credentials' : 'Sign in with your Telegram account'}
                        </p>
                    </div>

                    {serverStatus === 'offline' && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs mb-6 flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <p className="font-bold mb-1">Backend Connection Issue</p>
                                <p>The application cannot reach the API. This may be due to a deployment in progress or a configuration error.</p>
                            </div>
                        </div>
                    )}

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

                    {!isAdminRoute ? null : (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setIsPasswordLogin(!isPasswordLogin)}
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                {isPasswordLogin ? 'Login with Telegram' : 'Login with Password'}
                            </button>
                        </div>
                    )}

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
