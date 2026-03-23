import React, { useEffect, useRef, useState } from 'react';
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
    const [emailFieldFocused, setEmailFieldFocused] = useState(false);
    const [passwordFieldFocused, setPasswordFieldFocused] = useState(false);
    const [confirmPasswordFieldFocused, setConfirmPasswordFieldFocused] = useState(false);
    const [emailCheckPopover, setEmailCheckPopover] = useState<{ message: string; variant: 'ok' | 'invalid' } | null>(null);
    const emailFieldRowRef = useRef<HTMLDivElement>(null);

    const authInputClassName =
        'auth-input-stable form-input flex !h-12 !min-h-12 !max-h-12 w-full min-w-0 flex-1 resize-none overflow-hidden appearance-none rounded-lg border border-slate-300 bg-white/95 p-3 pr-10 font-body text-base font-medium leading-normal text-slate-900 placeholder:text-slate-500 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/25 dark:border-slate-500 dark:bg-slate-800/95 dark:text-white dark:placeholder:text-slate-300';

    const isValidEmail = (value: string) => {
        const emailValue = value.trim();
        if (!emailValue) return false;
        if (emailValue.length > 254) return false;

        const atIndex = emailValue.indexOf('@');
        if (atIndex <= 0 || atIndex !== emailValue.lastIndexOf('@')) return false;

        const localPart = emailValue.slice(0, atIndex);
        const domainPart = emailValue.slice(atIndex + 1);

        if (!localPart || !domainPart) return false;
        if (localPart.length > 64) return false;
        if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return false;
        if (!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(localPart)) return false;

        if (!domainPart.includes('.') || domainPart.includes('..')) return false;
        if (!/^[A-Za-z0-9.-]+$/.test(domainPart)) return false;

        const labels = domainPart.split('.');
        if (labels.some((label) => !label)) return false;
        if (labels.some((label) => label.startsWith('-') || label.endsWith('-'))) return false;
        if (labels.some((label) => label.length > 63)) return false;
        if (labels.some((label) => !/^[A-Za-z0-9-]+$/.test(label))) return false;

        const topLevelDomain = labels[labels.length - 1];
        if (!/^[A-Za-z]{2,63}$/.test(topLevelDomain)) return false;

        return true;
    };

    const getEmailPopoverState = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return {
                message: t('Wpisz adres e-mail.', 'Enter an email address.'),
                variant: 'invalid' as const,
            };
        }

        if (isValidEmail(trimmed)) {
            return {
                message: t('Adres e-mail wygląda na poprawny', 'This email address looks valid'),
                variant: 'ok' as const,
            };
        }

        return {
            message: t('Podaj poprawny adres e-mail', 'Please enter a valid email address'),
            variant: 'invalid' as const,
        };
    };

    useEffect(() => {
        if (!emailCheckPopover) return;

        const onPointerDown = (e: PointerEvent) => {
            if (emailFieldRowRef.current?.contains(e.target as Node)) return;
            setEmailCheckPopover(null);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setEmailCheckPopover(null);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [emailCheckPopover]);

    useEffect(() => {
        if (!emailCheckPopover) return;
        const nextPopover = getEmailPopoverState(email);
        if (nextPopover.message !== emailCheckPopover.message || nextPopover.variant !== emailCheckPopover.variant) {
            setEmailCheckPopover(nextPopover);
        }
    }, [email, emailCheckPopover]);

    const handleEmailIconClick = () => {
        if (emailCheckPopover) {
            setEmailCheckPopover(null);
            return;
        }
        setEmailCheckPopover(getEmailPopoverState(email));
    };
    const preventFocus = (e: React.SyntheticEvent) => {
        e.preventDefault();
    };

    const getLocalizedRegisterError = (errorMessage: string) => {
        const normalizedMessage = errorMessage.toLowerCase();

        if (normalizedMessage.includes('user already registered') || normalizedMessage.includes('already exists')) {
            return t('Konto z tym adresem e-mail już istnieje.', 'An account with this email address already exists.');
        }

        if (normalizedMessage.includes('password should be at least')) {
            return t('Hasło musi mieć co najmniej 6 znaków.', 'Password must be at least 6 characters long.');
        }

        if (normalizedMessage.includes('invalid email')) {
            return t('Podaj poprawny adres e-mail', 'Please provide a valid email address.');
        }

        if (normalizedMessage.includes('signup is disabled')) {
            return t('Rejestracja jest obecnie wyłączona.', 'Registration is currently disabled.');
        }

        if (
            normalizedMessage.includes('too many requests') ||
            normalizedMessage.includes('rate limit') ||
            normalizedMessage.includes('over_email_send_rate_limit')
        ) {
            return t(
                'Przekroczono limit prób rejestracji. Odczekaj chwilę i spróbuj ponownie.',
                'Registration rate limit reached. Please wait a moment and try again.'
            );
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
        <div className="relative min-h-dvh max-sm:h-svh max-sm:min-h-svh max-sm:overflow-hidden sm:min-h-screen overflow-hidden bg-background-light font-body text-text-light dark:bg-background-dark dark:text-text-dark">
            <div className="absolute inset-0 lg:hidden">
                <img
                    className="h-full w-full object-cover"
                    alt="Construction site with workers and equipment"
                    src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop"
                />
                <div className="absolute inset-0 bg-slate-950/60"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/50 to-slate-950/85"></div>
            </div>

            <div className="relative z-10 flex min-h-dvh max-sm:h-full max-sm:min-h-0 sm:min-h-screen w-full flex-col lg:flex-row">
                <section className="flex min-h-dvh max-sm:h-full max-sm:min-h-0 sm:min-h-screen w-full lg:min-h-screen lg:w-1/2 lg:border-r lg:border-slate-200 lg:bg-white dark:lg:border-slate-800 dark:lg:bg-slate-950">
                    <div className="relative flex min-h-dvh max-sm:h-full max-sm:min-h-0 sm:min-h-screen w-full flex-col px-4 py-4 sm:px-6 sm:py-6 lg:h-full lg:min-h-0 lg:px-10 lg:pb-12 lg:pt-8 xl:px-14">
                        <header className="flex items-center gap-4 text-white lg:absolute lg:left-1/2 lg:top-8 lg:w-full lg:max-w-lg lg:-translate-x-1/2 lg:text-slate-900 dark:text-off-white">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/35 lg:h-14 lg:w-14">
                                <span className="material-symbols-outlined text-[30px] lg:text-[34px]">construction</span>
                            </div>
                            <h2 className="font-display text-3xl font-extrabold leading-none tracking-tight sm:text-[2.05rem] lg:text-[2.15rem]">Renovation System</h2>
                        </header>

                        <div className="flex flex-1 items-center justify-center pt-2 sm:pt-4 lg:items-center lg:justify-center lg:pt-0 lg:pb-0">
                            <div className="w-full max-w-xl rounded-3xl bg-white/92 p-5 shadow-2xl backdrop-blur-xl sm:min-h-0 sm:p-8 lg:w-full lg:max-w-lg lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0 dark:bg-slate-900/84 dark:lg:bg-transparent">
                                <div className="flex w-full flex-col gap-2 pb-6 sm:pb-9 lg:pb-10">
                                    <h1 className="font-display text-[24px] font-bold leading-tight tracking-tight text-white sm:text-[2.05rem] lg:text-[2.35rem] dark:text-white">{t('Utwórz nowe konto', 'Create a new account')}</h1>
                                    <p className="text-[13px] text-slate-400 sm:text-base lg:hidden dark:text-slate-300">{t('Zacznij zarządzać projektami remontowymi w jednym miejscu.', 'Start managing renovation projects in one place.')}</p>
                                </div>

                                <form className="flex w-full flex-col gap-[1.35rem] sm:gap-7 lg:max-w-lg lg:gap-6" onSubmit={handleRegister}>
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
                                        <div ref={emailFieldRowRef} className="relative flex w-full items-center">
                                            <input
                                                autoComplete="email"
                                                className={authInputClassName}
                                                placeholder={t('Wprowadź swój e-mail', 'Enter your e-mail')}
                                                type="text"
                                                inputMode="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                onFocus={() => setEmailFieldFocused(true)}
                                                onBlur={() => setEmailFieldFocused(false)}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleEmailIconClick}
                                                onPointerDown={preventFocus}
                                                onMouseDown={preventFocus}
                                                className={`absolute inset-y-0 right-0 z-10 flex w-12 min-w-12 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] lg:inset-y-auto lg:right-3 lg:top-1/2 lg:h-auto lg:w-auto lg:min-w-0 lg:-translate-y-1/2 lg:rounded ${
                                                    emailCheckPopover
                                                        ? 'text-primary dark:text-primary'
                                                        : emailFieldFocused
                                                          ? 'text-neutral-gray max-lg:text-primary dark:text-slate-400 max-lg:dark:text-primary [@media(hover:hover)]:hover:text-primary dark:[@media(hover:hover)]:hover:text-primary'
                                                          : 'text-neutral-gray [@media(hover:hover)]:hover:text-primary dark:text-slate-400 dark:[@media(hover:hover)]:hover:text-primary'
                                                }`}
                                                aria-label={t('Sprawdź poprawność adresu e-mail', 'Check email address validity')}
                                                aria-expanded={Boolean(emailCheckPopover)}
                                            >
                                                <span className="material-symbols-outlined text-xl">alternate_email</span>
                                            </button>
                                            {emailCheckPopover && (
                                                <div
                                                    role="status"
                                                    className={`absolute right-0 bottom-[calc(100%+0.5rem)] z-20 w-fit max-w-[min(100%,26rem)] rounded-lg border bg-slate-900 px-3 py-2 text-left text-[0.92rem] shadow-lg lg:bg-white ${
                                                        emailCheckPopover.variant === 'ok'
                                                            ? 'border-emerald-500 text-emerald-300 lg:text-emerald-700'
                                                            : 'border-red-500 text-red-300 lg:text-red-700'
                                                    }`}
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className={`absolute right-[0.975rem] top-full h-3 w-3 -translate-y-1/2 rotate-45 border-b border-r bg-slate-900 lg:bg-white ${
                                                            emailCheckPopover.variant === 'ok' ? 'border-emerald-500' : 'border-red-500'
                                                        }`}
                                                    />
                                                    <div className="flex items-start">
                                                        <p className="pr-8">{emailCheckPopover.message}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEmailCheckPopover(null)}
                                                            onPointerDown={preventFocus}
                                                            onMouseDown={preventFocus}
                                                            className={`absolute right-[0.6rem] top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] ${
                                                                emailCheckPopover.variant === 'ok'
                                                                    ? 'text-emerald-300 lg:text-emerald-700 [@media(hover:hover)]:hover:text-emerald-200 lg:[@media(hover:hover)]:hover:text-emerald-900 focus-visible:ring-emerald-500'
                                                                    : 'text-red-300 lg:text-red-700 [@media(hover:hover)]:hover:text-red-200 lg:[@media(hover:hover)]:hover:text-red-900 focus-visible:ring-red-500'
                                                            }`}
                                                            aria-label={t('Zamknij komunikat', 'Close message')}
                                                        >
                                                            <span className="material-symbols-outlined text-[16px] leading-none">close</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
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
                                                onFocus={() => setPasswordFieldFocused(true)}
                                                onBlur={() => setPasswordFieldFocused(false)}
                                            />
                                            <button
                                                className={`absolute inset-y-0 right-0 z-10 flex w-12 min-w-12 items-center justify-center rounded-md text-slate-500 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:text-slate-400 dark:focus-visible:ring-offset-slate-900 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] lg:inset-y-auto lg:right-3 lg:top-1/2 lg:h-auto lg:w-auto lg:min-w-0 lg:-translate-y-1/2 lg:rounded ${
                                                    passwordFieldFocused
                                                        ? 'max-lg:text-primary max-lg:dark:text-primary [@media(hover:hover)]:hover:text-primary dark:[@media(hover:hover)]:hover:text-primary'
                                                        : '[@media(hover:hover)]:hover:text-primary dark:[@media(hover:hover)]:hover:text-primary'
                                                }`}
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                onPointerDown={preventFocus}
                                                onMouseDown={preventFocus}
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
                                                onFocus={() => setConfirmPasswordFieldFocused(true)}
                                                onBlur={() => setConfirmPasswordFieldFocused(false)}
                                            />
                                            <button
                                                className={`absolute inset-y-0 right-0 z-10 flex w-12 min-w-12 items-center justify-center rounded-md text-slate-500 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:text-slate-400 dark:focus-visible:ring-offset-slate-900 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] lg:inset-y-auto lg:right-3 lg:top-1/2 lg:h-auto lg:w-auto lg:min-w-0 lg:-translate-y-1/2 lg:rounded ${
                                                    confirmPasswordFieldFocused
                                                        ? 'max-lg:text-primary max-lg:dark:text-primary [@media(hover:hover)]:hover:text-primary dark:[@media(hover:hover)]:hover:text-primary'
                                                        : '[@media(hover:hover)]:hover:text-primary dark:[@media(hover:hover)]:hover:text-primary'
                                                }`}
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                onPointerDown={preventFocus}
                                                onMouseDown={preventFocus}
                                            >
                                                <span className="material-symbols-outlined text-xl">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                    </label>

                                    <button
                                        className="mt-5 flex h-[47px] w-full items-center justify-center rounded-lg bg-primary px-6 font-display text-base font-bold tracking-[0.015em] text-white transition-all hover:scale-[0.995] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-background-dark disabled:opacity-50"
                                        type="submit"
                                        disabled={loading}
                                    >
                                        {loading ? t('Rejestracja...', 'Registering...') : t('Zarejestruj się', 'Register')}
                                    </button>

                                    <p className="pt-1 text-center text-[14.5px] text-white lg:text-slate-800 dark:text-slate-200">
                                        {t('Masz już konto?', 'Already have an account?')}{' '}
                                        <Link className="font-bold text-primary hover:underline" to="/login">
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