import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import LanguageToggleButton from "../components/LanguageToggleButton";
import { useLanguage } from "../context/LanguageContext";
import { useDemo } from "../context/DemoContext";

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { enterDemoMode } = useDemo();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);

    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

    const getLocalizedLoginError = (errorMessage: string) => {
        const normalizedMessage = errorMessage.toLowerCase();

        if (normalizedMessage.includes("invalid login credentials")) {
            return t("Nieprawidłowy e-mail lub hasło.", "Invalid email or password.");
        }

        if (normalizedMessage.includes("email not confirmed")) {
            return t("Potwierdź adres e-mail przed zalogowaniem.", "Please confirm your email address before signing in.");
        }

        if (normalizedMessage.includes("invalid email")) {
            return t("Podaj poprawny adres e-mail.", "Please provide a valid email address.");
        }

        if (normalizedMessage.includes("too many requests")) {
            return t("Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.", "Too many sign-in attempts. Please try again in a moment.");
        }

        return t("Nie udało się zalogować. Spróbuj ponownie.", "Could not sign in. Please try again.");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!isValidEmail(email)) {
            setError(t("Podaj poprawny adres e-mail.", "Please provide a valid email address."));
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(getLocalizedLoginError(error.message));
            setLoading(false);
        } else {
            // AuthContext will detect the change and App.tsx will redirect
            navigate("/projects");
        }
    };

    const handleViewDemo = () => {
        enterDemoMode();
        navigate("/projects");
    };

    return (
        <div className="relative flex min-h-dvh sm:min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100 font-body text-text-dark">
            {/* Demo button – fixed pill at the top centre */}
            <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center">
                <button
                    onClick={handleViewDemo}
                    className="pointer-events-auto group flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-4 py-2 shadow-lg shadow-sky-200/40 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-sky-300 hover:bg-white hover:shadow-sky-300/50 active:scale-[0.98]"
                >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-dependable-blue text-[10px] font-bold text-white shadow-sm">
                        ▶
                    </span>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-dependable-blue transition-colors">
                        {t("Zobacz demo", "View Demo")}
                    </span>
                    <span className="text-dependable-blue transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </button>
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.24),transparent_34%),radial-gradient(circle_at_84%_78%,rgba(14,165,233,0.2),transparent_36%),radial-gradient(circle_at_72%_22%,rgba(125,211,252,0.2),transparent_30%)]" />
                <div className="absolute -left-24 top-[-72px] h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
                <div className="absolute -right-24 bottom-[-80px] h-80 w-80 rounded-full bg-sky-200/35 blur-3xl" />
                <div className="absolute inset-y-0 left-0 w-24 bg-[radial-gradient(circle,rgba(100,116,139,0.28)_1px,transparent_1px)] [background-size:15px_15px] opacity-30" />
                <div className="absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle,rgba(100,116,139,0.28)_1px,transparent_1px)] [background-size:15px_15px] opacity-25" />
            </div>

            <div className="layout-container relative z-10 flex h-full grow flex-col">
                <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
                    <div className="w-full max-w-md space-y-5 pt-1 sm:space-y-7 sm:pt-2">
                        <div className="flex flex-col items-center gap-3 sm:gap-4">
                            <div className="flex items-center justify-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-dependable-blue shadow-lg shadow-dependable-blue/25 dark:bg-primary sm:h-12 sm:w-12">
                                    <span className="material-symbols-outlined text-3xl text-off-white">construction</span>
                                </div>
                                <h1 className="font-display text-3xl font-bold tracking-tight text-text-dark dark:text-off-white sm:text-4xl">Renovation System</h1>
                            </div>
                            <p className="mt-1 px-4 text-center text-sm text-neutral-gray sm:text-base">{t("Zaloguj się, aby zarządzać swoimi projektami.", "Sign in to manage your projects.")}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-300/70 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900/70">
                            <form className="space-y-6" onSubmit={handleLogin}>
                                {error && <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg">{error}</div>}
                                <div>
                                    <label className="text-sm font-semibold uppercase tracking-wide text-primary pb-2 block dark:text-slate-100" htmlFor="email">
                                        {t("E-mail", "Email")}
                                    </label>
                                    <input
                                        autoComplete="email"
                                        className="auth-input-stable form-input flex h-[51px] w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-neutral-gray/45 bg-off-white p-3 font-body text-sm font-medium leading-normal text-text-dark placeholder:text-neutral-gray focus:border-dependable-blue focus:outline-0 focus:ring-2 focus:ring-dependable-blue/20 dark:border-neutral-gray/70 dark:bg-background-dark dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:border-primary dark:focus:ring-primary/25 sm:h-12 sm:p-[13.4px] text-[13.9px] sm:text-[13.4px]"
                                        id="email"
                                        name="email"
                                        placeholder={t("Wprowadź swój e-mail", "Enter your email")}
                                        required
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold uppercase tracking-wide text-primary pb-2 block dark:text-slate-100" htmlFor="password">
                                        {t("Hasło", "Password")}
                                    </label>
                                    <div className="relative flex w-full items-center">
                                        <input
                                            autoComplete="current-password"
                                            className="auth-input-stable form-input flex h-[51px] w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-neutral-gray/45 bg-off-white p-3 pr-10 font-body text-sm font-medium leading-normal text-text-dark placeholder:text-neutral-gray focus:border-dependable-blue focus:outline-0 focus:ring-2 focus:ring-dependable-blue/20 dark:border-neutral-gray/70 dark:bg-background-dark dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:border-primary dark:focus:ring-primary/25 sm:h-12 sm:p-[13.4px] text-[13.9px] sm:text-[13.4px]"
                                            id="password"
                                            name="password"
                                            placeholder={t("Wprowadź swoje hasło", "Enter your password")}
                                            required
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 text-gray-500 transition-colors hover:text-dependable-blue dark:text-gray-400 dark:hover:text-primary focus:outline-none"
                                        >
                                            <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 sm:pt-5">
                                    <button
                                        className="flex h-12 w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-dependable-blue px-5 font-display text-base font-bold leading-normal tracking-[0.015em] text-off-white transition-all hover:scale-[0.995] hover:bg-dependable-blue/90 disabled:opacity-50 dark:bg-primary dark:hover:bg-primary/90"
                                        type="submit"
                                        disabled={loading}
                                    >
                                        <span className="truncate">{loading ? t("Logowanie...", "Signing in...") : t("Zaloguj się", "Sign in")}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="text-center text-sm text-neutral-gray sm:text-base">
                            {t("Nie masz jeszcze konta?", "Don't have an account yet?")}{" "}
                            <Link
                                className="font-semibold text-dependable-blue transition-colors hover:text-dependable-blue/80 dark:text-primary dark:hover:text-primary/80"
                                to="/register"
                            >
                                {t("Zarejestruj się", "Register")}
                            </Link>
                        </div>
                        <div className="flex justify-center pt-0">
                            <LanguageToggleButton size="xxs" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
