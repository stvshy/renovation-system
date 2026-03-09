import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // AuthContext will detect the change and App.tsx will redirect
            navigate("/projects");
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-background-light via-slate-100 to-slate-200 font-body text-text-dark dark:from-background-dark dark:via-slate-900 dark:to-slate-950 dark:text-off-white">
            <div className="layout-container flex h-full grow flex-col">
                <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
                    <div className="w-full max-w-md space-y-6 sm:space-y-8">
                        <div className="flex flex-col items-center gap-3 sm:gap-4">
                            <div className="flex items-center justify-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-dependable-blue shadow-lg shadow-dependable-blue/25 dark:bg-primary sm:h-12 sm:w-12">
                                    <span className="material-symbols-outlined text-3xl text-off-white">construction</span>
                                </div>
                                <h1 className="font-display text-3xl font-bold tracking-tight text-text-dark dark:text-off-white sm:text-4xl">Renovation System</h1>
                            </div>
                            <p className="px-4 text-center text-sm text-neutral-gray sm:text-base">Zaloguj się, aby zarządzać swoimi projektami.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-300/70 bg-white/85 p-5 shadow-xl backdrop-blur-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900/70">
                            <form className="space-y-6" onSubmit={handleLogin}>
                                {error && <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg">{error}</div>}
                                <div>
                                    <label className="text-text-dark dark:text-off-white text-base font-medium leading-normal pb-2 block" htmlFor="email">
                                        E-mail
                                    </label>
                                    <input
                                        autoComplete="email"
                                        className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-neutral-gray/45 bg-off-white p-[13px] text-base font-medium leading-normal text-text-dark placeholder:text-neutral-gray focus:border-dependable-blue focus:outline-0 focus:ring-2 focus:ring-dependable-blue/20 dark:border-neutral-gray/70 dark:bg-background-dark dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:border-primary dark:focus:ring-primary/25 sm:h-14 sm:p-[15px]"
                                        id="email"
                                        name="email"
                                        placeholder="np. jan.kowalski@email.com"
                                        required
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-text-dark dark:text-off-white text-base font-medium leading-normal pb-2 block" htmlFor="password">
                                        Hasło
                                    </label>
                                    <div className="relative flex w-full items-center">
                                        <input
                                            autoComplete="current-password"
                                            className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-neutral-gray/45 bg-off-white p-[13px] pr-10 text-base font-medium leading-normal text-text-dark placeholder:text-neutral-gray focus:border-dependable-blue focus:outline-0 focus:ring-2 focus:ring-dependable-blue/20 dark:border-neutral-gray/70 dark:bg-background-dark dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:border-primary dark:focus:ring-primary/25 sm:h-14 sm:p-[15px]"
                                            id="password"
                                            name="password"
                                            placeholder="Wprowadź swoje hasło"
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

                                <div>
                                    <button
                                        className="flex h-12 w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-dependable-blue px-5 font-display text-base font-bold leading-normal tracking-[0.015em] text-off-white transition-all hover:scale-[0.995] hover:bg-dependable-blue/90 disabled:opacity-50 dark:bg-primary dark:hover:bg-primary/90"
                                        type="submit"
                                        disabled={loading}
                                    >
                                        <span className="truncate">{loading ? "Logowanie..." : "Zaloguj się"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="text-center text-sm text-neutral-gray sm:text-base">
                            Nie masz jeszcze konta?{" "}
                            <Link
                                className="font-semibold text-dependable-blue transition-colors hover:text-dependable-blue/80 dark:text-primary dark:hover:text-primary/80"
                                to="/register"
                            >
                                Zarejestruj się
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
