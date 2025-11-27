
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('Hasła nie są identyczne');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            alert('Rejestracja udana! Możesz się teraz zalogować (sprawdź email jeśli wymagane jest potwierdzenie).');
            navigate('/login');
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col group/design-root bg-background-light dark:bg-background-dark font-display text-text-light dark:text-text-dark">
            <div className="layout-container flex h-full grow flex-col">
                <div className="flex flex-1 items-stretch">
                    <div className="flex w-full flex-col items-center justify-center lg:w-1/2">
                        <div className="flex w-full max-w-md flex-col items-start p-6 sm:p-8">
                            <header className="flex w-full items-center justify-start gap-3 text-text-light dark:text-text-dark pb-8">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                                    <span className="material-symbols-outlined text-2xl">construction</span>
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">Renovation System</h2>
                            </header>
                            <div className="flex w-full flex-col gap-2 pb-8">
                                <h1 className="text-4xl font-black leading-tight tracking-[-0.033em]">Utwórz nowe konto</h1>
                            </div>
                            <form className="flex w-full flex-col gap-6" onSubmit={handleRegister}>
                                {error && (
                                    <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                        {error}
                                    </div>
                                )}
                                <label className="flex flex-col gap-2">
                                    <p className="text-base font-medium">Nazwa użytkownika / E-mail</p>
                                    <input 
                                        className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white p-3 text-base font-normal text-slate-900 placeholder:text-gray-500 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-400" 
                                        placeholder="Wprowadź swój e-mail" 
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <p className="text-base font-medium">Hasło</p>
                                    <div className="relative flex w-full items-center">
                                        <input 
                                            className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white p-3 pr-10 text-base font-normal text-slate-900 placeholder:text-gray-500 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-400" 
                                            placeholder="Wprowadź swoje hasło" 
                                            type="password" 
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button className="absolute right-3 text-gray-500 dark:text-gray-400" type="button">
                                            <span className="material-symbols-outlined text-xl">visibility</span>
                                        </button>
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <p className="text-base font-medium">Powtórz hasło</p>
                                    <div className="relative flex w-full items-center">
                                        <input 
                                            className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white p-3 pr-10 text-base font-normal text-slate-900 placeholder:text-gray-500 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-400" 
                                            placeholder="Potwierdź swoje hasło" 
                                            type="password" 
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                        <button className="absolute right-3 text-gray-500 dark:text-gray-400" type="button">
                                            <span className="material-symbols-outlined text-xl">visibility</span>
                                        </button>
                                    </div>
                                </label>
                                <button 
                                    className="flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-background-dark disabled:opacity-50" 
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Rejestracja...' : 'Zarejestruj się'}
                                </button>
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                    Masz już konto? <Link className="font-semibold text-primary hover:underline" to="/login">Zaloguj się</Link>
                                </p>
                            </form>
                        </div>
                    </div>
                    <div className="relative hidden w-1/2 flex-col items-center justify-center lg:flex">
                        <div className="absolute inset-0 z-0 h-full w-full bg-slate-200">
                            <img className="h-full w-full object-cover" alt="Construction site with workers and equipment" src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop" />
                            <div className="absolute inset-0 bg-primary/70"></div>
                        </div>
                        <div className="relative z-10 flex flex-col items-center text-center text-white p-12">
                            <h2 className="text-4xl font-bold tracking-tight mb-4">Zarządzaj swoimi projektami w jednym miejscu</h2>
                            <p className="max-w-md text-lg text-white/80">Od planowania po realizację, Renovation System pomaga Ci utrzymać kontrolę nad każdym etapem remontu.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
