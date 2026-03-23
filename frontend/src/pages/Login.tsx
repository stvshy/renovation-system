import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext";
import { useDemo } from "../context/DemoContext";

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useLanguage();
    const { enterDemoMode } = useDemo();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mobileTapLanguage, setMobileTapLanguage] = useState<"pl" | "en" | null>(null);
    const mobileTapTimeoutRef = useRef<number | null>(null);

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);

    const [emailCheckPopover, setEmailCheckPopover] = useState<{ message: string; variant: "ok" | "invalid" } | null>(null);
    const emailFieldRowRef = useRef<HTMLDivElement>(null);

    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

    useEffect(() => {
        if (!emailCheckPopover) return;

        const onPointerDown = (e: PointerEvent) => {
            if (emailFieldRowRef.current?.contains(e.target as Node)) return;
            setEmailCheckPopover(null);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setEmailCheckPopover(null);
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [emailCheckPopover]);

    useEffect(() => {
        return () => {
            if (mobileTapTimeoutRef.current !== null) {
                window.clearTimeout(mobileTapTimeoutRef.current);
            }
        };
    }, []);

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

    const finalizeLanguageChoice = (el: HTMLElement) => {
        el.blur();
        requestAnimationFrame(() => el.blur());
    };

    const handleEmailIconClick = () => {
        const trimmed = email.trim();
        if (!trimmed) {
            setEmailCheckPopover({
                message: t("Wpisz adres e-mail.", "Enter an email address."),
                variant: "invalid",
            });
            return;
        }
        if (isValidEmail(trimmed)) {
            setEmailCheckPopover({
                message: t("Adres e-mail wygląda na poprawny.", "This email address looks valid."),
                variant: "ok",
            });
        } else {
            setEmailCheckPopover({
                message: t("Podaj poprawny adres e-mail.", "Please enter a valid email address."),
                variant: "invalid",
            });
        }
    };

    const handleLanguageSwitch = (nextLanguage: "pl" | "en", buttonElement: HTMLButtonElement) => {
        setLanguage(nextLanguage);

        if (window.matchMedia("(hover: none)").matches) {
            if (mobileTapTimeoutRef.current !== null) {
                window.clearTimeout(mobileTapTimeoutRef.current);
            }
            setMobileTapLanguage(nextLanguage);
            // Wait for the blue to actually paint on screen, then start the fade to dark.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    mobileTapTimeoutRef.current = window.setTimeout(() => {
                        setMobileTapLanguage((current) => (current === nextLanguage ? null : current));
                        mobileTapTimeoutRef.current = null;
                    }, 350);
                });
            });
        }

        finalizeLanguageChoice(buttonElement);
    };

    const getLanguageButtonClassName = (buttonLanguage: "pl" | "en") => {
        const isActive = language === buttonLanguage;
        const isTemporarilyBlue = mobileTapLanguage === buttonLanguage;

        if (isActive && isTemporarilyBlue) {
            return "font-bold text-[#0284c7] dark:text-sky-400";
        }

        if (isActive) {
            return "font-bold text-gray-900 dark:text-slate-100";
        }

        return "font-medium text-gray-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary";
    };

    const baseUrl = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
    const mobileBackgroundUrl = `${baseUrl}tlo-mobile3.webp`;
    const desktopBackgroundUrl = `${baseUrl}tlo-desktop1.webp`;

    useEffect(() => {
        const isMobile = window.innerWidth < 640;
        const url = isMobile ? mobileBackgroundUrl : desktopBackgroundUrl;
        let link = document.querySelector<HTMLLinkElement>(`link[rel="preload"][href="${url}"]`);
        if (!link) {
            link = document.createElement("link");
            link.rel = "preload";
            link.as = "image";
            link.type = "image/webp";
            link.href = url;
            document.head.appendChild(link);
        }
    }, []);

    return (
        <div className="relative flex min-h-dvh sm:min-h-screen w-full flex-col overflow-x-hidden max-sm:bg-slate-50 sm:bg-gradient-to-br sm:from-slate-50 sm:via-sky-50 sm:to-slate-100 font-body text-text-dark">
            <style>{`
                @keyframes demo-gradient-shift {
                    0% {
                        background-position: 0% 50%;
                    }
                    100% {
                        background-position: 200% 50%;
                    }
                }
            `}</style>
            {/* Demo: bottom on mobile, top centre from sm */}
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center sm:bottom-auto sm:top-5">
                <div className="pointer-events-auto group relative isolate">
                    <span
                        aria-hidden
                        className="pointer-events-none absolute -inset-1.5 -z-20 rounded-full bg-[linear-gradient(110deg,#7dd3fc,#38bdf8,#0ea5e9,#005ea2,#0ea5e9,#38bdf8,#7dd3fc)] bg-[length:230%_100%] opacity-20 blur-md transition-transform duration-200 group-hover:scale-105"
                        style={{ animation: "demo-gradient-shift 3.4s linear infinite" }}
                    />
                    <div
                        className="relative rounded-full bg-[linear-gradient(110deg,#7dd3fc,#38bdf8,#0ea5e9,#005ea2,#0ea5e9,#38bdf8,#7dd3fc)] bg-[length:230%_100%] p-[1.5px] transition-all duration-200 group-hover:scale-105 group-hover:p-px group-active:scale-[0.98]"
                        style={{ animation: "demo-gradient-shift 3.4s linear infinite" }}
                    >
                        <button
                            onClick={handleViewDemo}
                            className="relative flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/90 px-4 py-2 text-sm shadow-md shadow-sky-200/32 backdrop-blur-md transition-all duration-200 hover:border-sky-300 hover:bg-white hover:shadow-sky-300/45 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] sm:px-4 sm:py-2 sm:shadow-lg sm:shadow-sky-200/35"
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-dependable-blue text-[10px] font-bold text-white shadow-sm sm:h-5 sm:w-5">
                                ▶
                            </span>
                            <span className="font-semibold text-slate-700 group-hover:text-dependable-blue transition-colors">
                                {t("Zobacz demo", "View Demo")}
                            </span>
                            <span className="text-dependable-blue transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                        </button>
                    </div>
                </div>
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 sm:hidden">
                    <img
                        src={mobileBackgroundUrl}
                        alt=""
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        className="absolute inset-0 h-full w-full object-cover object-center saturate-100"
                    />
                    <div className="absolute inset-0 bg-white/50" />
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-300/20 via-sky-100/50 to-blue-200/58" />
                </div>
                <div className="absolute inset-0 hidden sm:block">
                    <div
                        className="absolute inset-0 scale-[1.04] bg-cover bg-center bg-no-repeat opacity-10"
                        style={{ backgroundImage: `url('${desktopBackgroundUrl}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-white/30 to-slate-100/56" />
                </div>
                <div className="absolute inset-0 hidden sm:block bg-[radial-gradient(circle_at_14%_18%,rgba(17,115,212,0.15),transparent_34%),radial-gradient(circle_at_84%_78%,rgba(17,115,212,0.095),transparent_36%),radial-gradient(circle_at_72%_22%,rgba(17,115,212,0.07),transparent_30%)]" />
                <div className="absolute -left-24 top-[-72px] hidden h-72 w-72 rounded-full bg-primary/16 blur-3xl sm:block" />
                <div className="absolute -right-24 bottom-[-80px] hidden h-80 w-80 rounded-full bg-primary/12 blur-3xl sm:block" />
                <div className="absolute inset-y-0 left-0 hidden w-24 bg-[radial-gradient(circle,rgba(100,116,139,0.28)_1px,transparent_1px)] [background-size:15px_15px] opacity-30 sm:block" />
                <div className="absolute inset-y-0 right-0 hidden w-24 bg-[radial-gradient(circle,rgba(100,116,139,0.28)_1px,transparent_1px)] [background-size:15px_15px] opacity-25 sm:block" />
            </div>

            <div className="layout-container relative z-10 flex min-h-dvh flex-1 flex-col sm:min-h-0">
                {/*
                  Mobile: fill viewport minus space for fixed "Zobacz demo" (≈6rem), then vertically center
                  all main content. Desktop: unchanged centered layout in the flex area.
                */}
                <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 max-sm:min-h-[calc(100svh-6rem)] max-sm:overflow-y-auto max-sm:py-4 sm:min-h-0 sm:px-6 sm:py-10 lg:py-14">
                    <div className="w-full max-w-md space-y-5 pt-1 max-sm:-translate-y-[34px] sm:translate-y-0 sm:space-y-7 sm:pt-2">
                        <div className="flex flex-col items-center gap-3 sm:gap-4">
                            <div className="flex items-center justify-center gap-[15px]">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-[#005ea2] to-[#0177ca] shadow-lg shadow-[#005ea2]/25 sm:h-12 sm:w-12">
                                    <span className="material-symbols-outlined text-3xl text-off-white">construction</span>
                                </div>
                                <h1 className="font-display text-3xl font-bold tracking-tight text-text-dark dark:text-off-white sm:text-4xl">
                                    Renovation System
                                </h1>
                            </div>
                            <p
                                className={`mt-1 px-4 text-center text-sm sm:text-base ${
                                    error ? "text-red-600 dark:text-red-400" : "text-neutral-gray"
                                }`}
                                aria-live="polite"
                            >
                                {error ?? t("Zaloguj się, aby zarządzać swoimi projektami.", "Sign in to manage your projects.")}
                            </p>
                        </div>
                        <div>
                        <div className="relative rounded-xl rounded-b-none border border-[#c0c7d3]/10 bg-white/90 p-5 shadow-2xl shadow-[#111c2d]/5 backdrop-blur-sm dark:border-slate-600/20 dark:bg-slate-900/90 sm:p-8">
                            <form className="space-y-6" onSubmit={handleLogin}>
                                <div>
                                    <label
                                        className="block pb-2 text-sm font-semibold uppercase tracking-wide text-primary dark:text-slate-100"
                                        htmlFor="email"
                                    >
                                        {t("E-mail", "Email")}
                                    </label>
                                    <div ref={emailFieldRowRef} className="relative">
                                        <div className="relative w-full">
                                            <input
                                                autoComplete="email"
                                                className="auth-input-stable form-input flex h-[51px] w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border-0 bg-off-white p-3 pr-10 font-body text-sm font-medium leading-normal text-text-dark ring-1 ring-inset ring-[#c0c7d3]/20 placeholder:text-neutral-gray transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800/80 dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:bg-slate-900 dark:focus:ring-primary sm:h-12 sm:p-[13.4px] text-[13.9px] sm:text-[13.4px]"
                                                id="email"
                                                name="email"
                                                placeholder={t("Wprowadź swój e-mail", "Enter your e-mail")}
                                                required
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleEmailIconClick}
                                                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded dark:focus-visible:ring-offset-slate-900 ${
                                                    emailCheckPopover
                                                        ? "text-primary dark:text-primary"
                                                        : "text-neutral-gray hover:text-primary focus-visible:text-primary dark:text-slate-400 dark:hover:text-primary dark:focus-visible:text-primary"
                                                }`}
                                                aria-label={t("Sprawdź poprawność adresu e-mail", "Check email address validity")}
                                                aria-expanded={Boolean(emailCheckPopover)}
                                            >
                                                <span className="material-symbols-outlined text-xl">alternate_email</span>
                                            </button>
                                        </div>
                                        {emailCheckPopover && (
                                            <div
                                                role="status"
                                                className={`absolute right-0 bottom-[calc(100%+0.35rem)] z-20 max-w-[min(100%,18rem)] rounded-lg border px-3 py-2 text-left text-sm shadow-lg ${
                                                    emailCheckPopover.variant === "ok"
                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/80 dark:text-emerald-100"
                                                        : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/80 dark:text-red-100"
                                                }`}
                                            >
                                                {emailCheckPopover.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="max-sm:!mt-4">
                                    <label
                                        className="block pb-2 text-sm font-semibold uppercase tracking-wide text-primary dark:text-slate-100"
                                        htmlFor="password"
                                    >
                                        {t("Hasło", "Password")}
                                    </label>
                                    <div className="relative flex w-full items-center">
                                        <input
                                            autoComplete="current-password"
                                            className="auth-input-stable form-input flex h-[51px] w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border-0 bg-off-white p-3 pr-10 font-body text-sm font-medium leading-normal text-text-dark ring-1 ring-inset ring-[#c0c7d3]/20 placeholder:text-neutral-gray transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800/80 dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:bg-slate-900 dark:focus:ring-primary sm:h-12 sm:p-[13.4px] text-[13.9px] sm:text-[13.4px]"
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
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray transition-colors hover:text-primary focus:outline-none focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded dark:text-slate-400 dark:hover:text-primary dark:focus-visible:text-primary dark:focus-visible:ring-offset-slate-900"
                                        >
                                            <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 max-sm:pt-3 sm:pt-5">
                                    <button
                                        className="group flex h-12 w-full min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#005ea2] to-[#0177ca] px-5 font-display text-base font-bold leading-normal tracking-[0.015em] text-white shadow-lg shadow-[#005ea2]/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-[#005ea2]/30 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                        type="submit"
                                        disabled={loading}
                                    >
                                        <span className="truncate">{loading ? t("Logowanie...", "Signing in...") : t("Zaloguj się", "Sign in")}</span>
                                        {!loading && (
                                            <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                            <div className="mt-3 flex flex-col items-center gap-3 border-t border-[#e7eeff] pt-3 dark:border-slate-600/50">
                                <p className="text-center text-sm text-neutral-gray dark:text-slate-400">
                                    {t("Nie masz jeszcze konta?", "Don't have an account yet?")}{" "}
                                    <Link
                                        className="ml-1 font-bold text-primary decoration-2 underline-offset-4 transition-colors hover:underline dark:text-primary"
                                        to="/register"
                                    >
                                        {t("Zarejestruj się", "Register")}
                                    </Link>
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div className="flex w-full items-center justify-center gap-4 sm:gap-5 rounded-b-xl bg-[#e8f1fd]/85 px-[19.5px] py-[11.5px] backdrop-blur-sm dark:bg-slate-800/70">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                        handleLanguageSwitch("pl", e.currentTarget);
                                    }}
                                    className={`flex items-center gap-2 text-[11.5px] transition-colors duration-[900ms] ease-out sm:duration-0 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 ${getLanguageButtonClassName(
                                        "pl"
                                    )}`}
                                >
                                    <span className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/15 max-sm:h-[15.5px] max-sm:w-[15.5px]">
                                        <img src="https://flagcdn.com/w40/pl.png" alt="" className="h-full w-full object-cover" />
                                    </span>
                                    POLSKI
                                </button>
                                <div className="h-3.5 w-px bg-slate-400/75 dark:bg-slate-500/80 mx-2.5 sm:mx-3" aria-hidden />
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                        handleLanguageSwitch("en", e.currentTarget);
                                    }}
                                    className={`flex items-center gap-2 text-[11.5px] transition-colors duration-[900ms] ease-out sm:duration-0 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 ${getLanguageButtonClassName(
                                        "en"
                                    )}`}
                                >
                                    ENGLISH
                                    <span className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/15 max-sm:h-[15.5px] max-sm:w-[15.5px]">
                                        <img src="https://flagcdn.com/w40/gb.png" alt="" className="h-full w-full object-cover" />
                                    </span>
                                </button>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
