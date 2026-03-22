import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import LanguageToggleButton from '../components/LanguageToggleButton';
import { useLanguage } from '../context/LanguageContext';

const Register: React.FC = () => {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // State for password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const authInputClassName =
        'auth-input-stable form-input flex !h-12 !min-h-12 !max-h-12 w-full min-w-0 flex-1 resize-none overflow-hidden appearance-none rounded-lg border border-slate-300 bg-white/95 p-3 pr-10 font-body text-base font-medium leading-normal text-slate-900 placeholder:text-slate-500 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/25 dark:border-slate-500 dark:bg-slate-800/95 dark:text-white dark:placeholder:text-slate-300';

    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

    const getLocalizedRegisterError = (errorMessage: string) => {
        const normalizedMessage = errorMessage.toLowerCase();

        if (normalizedMessage.includes('user already registered') || normalizedMessage.includes('already exists')) {
            return t('Konto z tym adresem e-mail już istnieje.', 'An account with this email address already exists.');
        }

        if (normalizedMessage.includes('password should be at least')) {
            return t('Hasło musi mieć co najmniej 6 znaków.', 'Password must be at least 6 characters long.');
        }

        if (normalizedMessage.includes('invalid email')) {
            return t('Podaj poprawny adres e-mail.', 'Please provide a valid email address.');
        }

        if (normalizedMessage.includes('signup is disabled')) {
            return t('Rejestracja jest obecnie wyłączona.', 'Registration is currently disabled.');
        }

        return t('Nie udało się zarejestrować konta. Spróbuj ponownie.', 'Could not register the account. Please try again.');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (!isValidEmail(email)) {
            setError(t('Podaj poprawny adres e-mail.', 'Please provide a valid email address.'));
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError(t('Hasła nie są identyczne', 'Passwords do not match'));
            setLoading(false);
            return;
        }

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) {
                setError(getLocalizedRegisterError(signUpError.message));
                return;
            }

            setSuccess(
                t(
                    'Rejestracja przebiegła pomyślnie. Aby się zalogować, potwierdź konto klikając link wysłany na Twój adres e-mail. Jeśli nie widzisz wiadomości, sprawdź folder SPAM.',
                    'Registration was successful. To sign in, confirm your account by clicking the link sent to your email address. If you do not see the message, check your spam folder.'
                )
            );
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        } catch {
            setError(t('Wystąpił nieoczekiwany błąd podczas rejestracji. Spróbuj ponownie.', 'An unexpected registration error occurred. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-dvh sm:min-h-screen overflow-hidden bg-background-light font-body text-text-light dark:bg-background-dark dark:text-text-dark">
            <div className="absolute inset-0 lg:hidden">
                <img
                    className="h-full w-full object-cover"
                    alt="Construction site with workers and equipment"
                    src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop"
                />
                <div className="absolute inset-0 bg-slate-950/60"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/50 to-slate-950/85"></div>
            </div>

            <div className="relative z-10 flex min-h-dvh sm:min-h-screen w-full flex-col lg:flex-row">
                <section className="flex min-h-dvh sm:min-h-screen w-full lg:min-h-screen lg:w-1/2 lg:border-r lg:border-slate-200 lg:bg-white dark:lg:border-slate-800 dark:lg:bg-slate-950">
                    <div className="flex min-h-dvh sm:min-h-screen w-full flex-col px-4 py-4 sm:px-6 sm:py-6 lg:h-full lg:min-h-0 lg:px-10 lg:pb-12 lg:pt-8 xl:px-14">
                        <header className="flex items-center gap-4 text-white lg:text-slate-900 dark:text-off-white">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/35 lg:h-14 lg:w-14">
                                <span className="material-symbols-outlined text-[30px] lg:text-[34px]">construction</span>
                            </div>
                            <h2 className="font-display text-3xl font-extrabold leading-none tracking-tight sm:text-[2.05rem] lg:text-[2.15rem]">Renovation System</h2>
                        </header>

                        <div className="flex flex-1 items-center justify-center pt-3 sm:pt-4 lg:items-start lg:justify-start lg:pt-14 lg:pb-0">
                            <div className="w-full max-w-xl rounded-3xl bg-white/92 p-5 shadow-2xl backdrop-blur-xl sm:min-h-0 sm:p-8 lg:mt-4 lg:min-h-full lg:max-w-none lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0 dark:bg-slate-900/84 dark:lg:bg-transparent">
                                <div className="flex w-full flex-col gap-2 pb-7 sm:pb-9 lg:pb-10">
                                    <h1 className="font-display text-[1.72rem] font-bold leading-tight tracking-tight text-white sm:text-[2.05rem] lg:text-[2.35rem] dark:text-white">{t('Utwórz nowe konto', 'Create a new account')}</h1>
                                    <p className="text-sm text-slate-400 sm:text-base lg:hidden dark:text-slate-300">{t('Zacznij zarządzać projektami remontowymi w jednym miejscu.', 'Start managing renovation projects in one place.')}</p>
                                </div>

                                <form className="flex w-full flex-col gap-6 sm:gap-7 lg:max-w-lg lg:gap-6" onSubmit={handleRegister}>
                                    {error && (
                                        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
                                            {error}
                                        </div>
                                    )}

                                    {success && (
                                        <div className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                            {success}
                                        </div>
                                    )}

                                    <label className="flex flex-col gap-2">
                                        <p className="text-sm font-semibold uppercase tracking-wide text-primary dark:text-slate-100">{t('E-mail', 'Email')}</p>
                                        <div className="relative flex w-full items-center">
                                            <input
                                                autoComplete="email"
                                                className={authInputClassName}
                                                placeholder={t('Wprowadź swój e-mail', 'Enter your email')}
                                                type="text"
                                                inputMode="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                            <span aria-hidden="true" className="pointer-events-none absolute right-3 h-5 w-5 opacity-0" />
                                        </div>
                                    </label>

                                    <label className="flex flex-col gap-2">
                                        <p className="text-sm font-semibold uppercase tracking-wide text-primary dark:text-slate-100">{t('Hasło', 'Password')}</p>
                                        <div className="relative flex w-full items-center">
                                            <input
                                                autoComplete="new-password"
                                                className={authInputClassName}
                                                placeholder={t('Wprowadź swoje hasło', 'Enter your password')}
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <button
                                                className="absolute right-3 text-slate-500 outline-none transition-colors hover:text-primary focus:text-primary dark:text-slate-400"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                    </label>

                                    <label className="flex flex-col gap-2">
                                        <p className="text-sm font-semibold uppercase tracking-wide text-primary dark:text-slate-100">{t('Powtórz hasło', 'Repeat password')}</p>
                                        <div className="relative flex w-full items-center">
                                            <input
                                                autoComplete="new-password"
                                                className={authInputClassName}
                                                placeholder={t('Potwierdź swoje hasło', 'Confirm your password')}
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                            <button
                                                className="absolute right-3 text-slate-500 outline-none transition-colors hover:text-primary focus:text-primary dark:text-slate-400"
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                <span className="material-symbols-outlined text-xl">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                    </label>

                                    <button
                                        className="mt-6 flex h-[47px] w-full items-center justify-center rounded-lg bg-primary px-6 font-display text-base font-bold tracking-[0.015em] text-white transition-all hover:scale-[0.995] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-background-dark disabled:opacity-50 sm:mt-7"
                                        type="submit"
                                        disabled={loading}
                                    >
                                        {loading ? t('Rejestracja...', 'Registering...') : t('Zarejestruj się', 'Register')}
                                    </button>

                                    <p className="pt-1 text-center text-[14.5px] text-white lg:text-slate-800 dark:text-slate-200">
                                        {t('Masz już konto?', 'Already have an account?')}{' '}
                                        <Link className="font-semibold text-primary hover:underline" to="/login">
                                            {t('Zaloguj się', 'Sign in')}
                                        </Link>
                                    </p>
                                    <div className="flex justify-center pt-0 lg:hidden">
                                        <LanguageToggleButton size="xxs" />
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>

                <aside className="relative hidden min-h-screen w-1/2 lg:flex lg:flex-col lg:items-center lg:justify-center">
                    <div className="absolute inset-0 z-0 h-full w-full bg-slate-200">
                        <img className="h-full w-full object-cover" alt="Construction site with workers and equipment" src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop" />
                        <div className="absolute inset-0 bg-primary/65"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/55 via-primary/30 to-transparent"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-center p-12 text-center text-white xl:p-16">
                        <h2 className="mx-auto max-w-lg font-display text-3xl font-bold tracking-tight xl:text-4xl">{t('Zarządzaj swoimi projektami w jednym miejscu', 'Manage your projects in one place')}</h2>
                        <p className="mt-4 max-w-md text-base text-white/90 xl:text-lg">{t('Od planowania po realizację, Renovation System pomaga utrzymać kontrolę nad każdym etapem remontu.', 'From planning to delivery, Renovation System helps you stay in control of every renovation stage.')}</p>
                    </div>
                </aside>

                <div className="pointer-events-none fixed bottom-5 right-5 z-30 hidden lg:block">
                    <div className="pointer-events-auto">
                        <LanguageToggleButton size="xs" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;