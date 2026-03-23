import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext";
import { useDemo } from "../context/DemoContext";

const RESET_PASSWORD_COOLDOWN_UNTIL_KEY = "reset-password-cooldown-until";

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { t, language, setLanguage } = useLanguage();
    const { enterDemoMode } = useDemo();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState<string | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetCooldown, setResetCooldown] = useState(0);
    const [resetSent, setResetSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mobileTapLanguage, setMobileTapLanguage] = useState<"pl" | "en" | null>(null);
    const mobileTapTimeoutRef = useRef<number | null>(null);

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);
    const [emailFieldFocused, setEmailFieldFocused] = useState(false);
    const [passwordFieldFocused, setPasswordFieldFocused] = useState(false);

    const [emailCheckPopover, setEmailCheckPopover] = useState<{ message: string; variant: "ok" | "invalid" } | null>(null);
    const emailFieldRowRef = useRef<HTMLDivElement>(null);

    const isValidEmail = (value: string) => {
        const emailValue = value.trim();
        if (!emailValue) return false;
        if (emailValue.length > 254) return false;

        // Must contain exactly one @.
        const atIndex = emailValue.indexOf("@");
        if (atIndex <= 0 || atIndex !== emailValue.lastIndexOf("@")) return false;

        const localPart = emailValue.slice(0, atIndex);
        const domainPart = emailValue.slice(atIndex + 1);

        if (!localPart || !domainPart) return false;
        if (localPart.length > 64) return false;

        // Local part cannot start/end with dot or contain consecutive dots.
        if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) return false;
        // Unquoted local-part conservative character set.
        if (!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(localPart)) return false;

        // Domain must contain at least one dot and no consecutive dots.
        if (!domainPart.includes(".") || domainPart.includes("..")) return false;
        if (!/^[A-Za-z0-9.-]+$/.test(domainPart)) return false;

        const labels = domainPart.split(".");
        if (labels.some((label) => !label)) return false;
        if (labels.some((label) => label.startsWith("-") || label.endsWith("-"))) return false;
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
                message: t("Wpisz adres e-mail.", "Enter an email address."),
                variant: "invalid" as const,
            };
        }

        if (isValidEmail(trimmed)) {
            return {
                message: t("Adres e-mail wygląda na poprawny", "This email address looks valid"),
                variant: "ok" as const,
            };
        }

        return {
            message: t("Podaj poprawny adres e-mail", "Please enter a valid email address"),
            variant: "invalid" as const,
        };
    };

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
        if (!emailCheckPopover) return;
        const nextPopover = getEmailPopoverState(email);
        if (nextPopover.message !== emailCheckPopover.message || nextPopover.variant !== emailCheckPopover.variant) {
            setEmailCheckPopover(nextPopover);
        }
    }, [email, emailCheckPopover]);

    useEffect(() => {
        return () => {
            if (mobileTapTimeoutRef.current !== null) {
                window.clearTimeout(mobileTapTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const syncResetCooldown = () => {
            const savedUntil = window.localStorage.getItem(RESET_PASSWORD_COOLDOWN_UNTIL_KEY);
            if (!savedUntil) {
                setResetCooldown(0);
                setResetSent(false);
                return;
            }

            const until = Number(savedUntil);
            if (!Number.isFinite(until)) {
                window.localStorage.removeItem(RESET_PASSWORD_COOLDOWN_UNTIL_KEY);
                setResetCooldown(0);
                setResetSent(false);
                return;
            }

            const remainingSeconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
            setResetCooldown(remainingSeconds);
            setResetSent(remainingSeconds > 0);

            if (remainingSeconds === 0) {
                window.localStorage.removeItem(RESET_PASSWORD_COOLDOWN_UNTIL_KEY);
            }
        };

        syncResetCooldown();
        const intervalId = window.setInterval(syncResetCooldown, 1000);
        return () => window.clearInterval(intervalId);
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

    const openResetModal = () => {
        setResetEmail(email.trim());
        setError(null);
        setIsResetModalOpen(true);
    };

    const closeResetModal = () => {
        if (resetLoading) return;
        setIsResetModalOpen(false);
    };

    const handleResetPassword = async () => {
        if (resetCooldown > 0 || resetLoading) return;

        setError(null);
        setResetMessage(null);

        if (!isValidEmail(resetEmail)) {
            setError(t("Podaj poprawny adres e-mail, aby zresetować hasło.", "Provide a valid email to reset password."));
            return;
        }

        setResetLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
            redirectTo: `${window.location.origin}/#/update-password`,
        });

        if (error) {
            setError(t("Nie udało się wysłać linku. Spróbuj ponownie.", "Could not send reset link. Try again."));
            setResetSent(false);
        } else {
            const cooldownUntil = Date.now() + 60 * 1000;
            window.localStorage.setItem(RESET_PASSWORD_COOLDOWN_UNTIL_KEY, String(cooldownUntil));
            setResetMessage(
                t(
                    "Jeśli e-mail istnieje w bazie, link do zmiany hasła został wysłany. Ponowna wysyłka za 60 s.",
                    "If this email exists in the database, a password reset link has been sent. You can resend in 60s."
                )
            );
            setResetSent(true);
            setResetCooldown(60);
            setEmail(resetEmail.trim());
        }

        setResetLoading(false);
    };

    const handleViewDemo = () => {
        enterDemoMode();
        navigate("/projects");
    };

    const finalizeLanguageChoice = (el: HTMLElement) => {
        el.blur();
        requestAnimationFrame(() => el.blur());
    };

    const preventFocus = (e: React.SyntheticEvent) => {
        e.preventDefault();
    };

    const handleEmailIconClick = () => {
        if (emailCheckPopover) {
            setEmailCheckPopover(null);
            return;
        }
        setEmailCheckPopover(getEmailPopoverState(email));
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
                                <span style={{ transform: "translateX(0.5px)" }}>▶</span>
                            </span>
                            <span className="font-semibold text-slate-700 group-hover:text-dependable-blue transition-colors">
                                {t("Zobacz demo", "View Demo")}
                            </span>
                            <span
                                className="material-symbols-outlined text-[16px] sm:text-[15px] leading-none transition-transform transition-colors group-hover:translate-x-1 text-slate-700 group-hover:text-dependable-blue"
                                aria-hidden="true"
                            >
                                arrow_forward
                            </span>
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
                    <div className="w-full max-w-md space-y-5 pt-1 max-sm:-translate-y-[34px] sm:-translate-y-3 sm:space-y-7 sm:pt-2">
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
                                                className="auth-input-stable form-input flex h-[51px] w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border-0 bg-off-white p-3 pr-12 font-body text-sm font-medium leading-normal text-text-dark ring-1 ring-inset ring-[#c0c7d3]/20 placeholder:text-neutral-gray transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800/80 dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:bg-slate-900 dark:focus:ring-primary sm:h-12 sm:p-[13.4px] text-[13.9px] sm:text-[13.4px]"
                                                id="email"
                                                name="email"
                                                placeholder={t("Wprowadź swój e-mail", "Enter your e-mail")}
                                                required
                                                type="email"
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
                                                        ? "text-primary dark:text-primary"
                                                        : emailFieldFocused
                                                          ? "text-neutral-gray max-lg:text-primary dark:text-slate-400 max-lg:dark:text-primary [@media(hover:hover)]:hover:text-primary dark:[@media(hover:hover)]:hover:text-primary"
                                                          : "text-neutral-gray [@media(hover:hover)]:hover:text-primary dark:text-slate-400 dark:[@media(hover:hover)]:hover:text-primary"
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
                                                className={`absolute right-0 bottom-[calc(100%+0.5rem)] z-20 w-fit max-w-[min(100%,26rem)] rounded-lg border bg-white px-3 py-2 text-left text-[0.8rem] shadow-lg ${
                                                    emailCheckPopover.variant === "ok"
                                                        ? "border-emerald-500 text-emerald-700"
                                                        : "border-red-500 text-red-700"
                                                }`}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`absolute right-[0.975rem] top-full h-3 w-3 -translate-y-1/2 rotate-45 border-b border-r bg-white ${
                                                        emailCheckPopover.variant === "ok"
                                                            ? "border-emerald-500"
                                                            : "border-red-500"
                                                    }`}
                                                />
                                                <div className="flex items-start">
                                                    <p className="pr-6">{emailCheckPopover.message}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEmailCheckPopover(null)}
                                                        onPointerDown={preventFocus}
                                                        onMouseDown={preventFocus}
                                                        className={`absolute right-[0.6rem] top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] ${
                                                            emailCheckPopover.variant === "ok"
                                                                ? "text-emerald-700 [@media(hover:hover)]:hover:text-emerald-900 focus-visible:ring-emerald-500"
                                                                : "text-red-700 [@media(hover:hover)]:hover:text-red-900 focus-visible:ring-red-500"
                                                        }`}
                                                        aria-label={t("Zamknij komunikat", "Close message")}
                                                    >
                                                        <span className="material-symbols-outlined text-[16px] leading-none">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="max-sm:!mt-4">
                                    <div className="flex items-center justify-between gap-2 pb-2">
                                        <label
                                            className="text-sm font-semibold uppercase tracking-wide text-primary dark:text-slate-100"
                                            htmlFor="password"
                                        >
                                            {t("Hasło", "Password")}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={openResetModal}
                                            className="text-xs sm:text-[13px] font-medium text-primary underline-offset-4 transition-colors hover:underline dark:text-primary"
                                        >
                                            {t("Nie pamiętasz hasła?", "Forgot password?")}
                                        </button>
                                    </div>
                                    <div className="relative flex w-full items-center">
                                        <input
                                            autoComplete="current-password"
                                            className="auth-input-stable form-input flex h-[51px] w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border-0 bg-off-white p-3 pr-12 font-body text-sm font-medium leading-normal text-text-dark ring-1 ring-inset ring-[#c0c7d3]/20 placeholder:text-neutral-gray transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800/80 dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:bg-slate-900 dark:focus:ring-primary sm:h-12 sm:p-[13.4px] text-[13.9px] sm:text-[13.4px]"
                                            id="password"
                                            name="password"
                                            placeholder={t("Wprowadź swoje hasło", "Enter your password")}
                                            required
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setPasswordFieldFocused(true)}
                                            onBlur={() => setPasswordFieldFocused(false)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            onPointerDown={preventFocus}
                                            onMouseDown={preventFocus}
                                            className={`absolute inset-y-0 right-0 z-10 flex w-12 min-w-12 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] lg:inset-y-auto lg:right-3 lg:top-1/2 lg:h-auto lg:w-auto lg:min-w-0 lg:-translate-y-1/2 lg:rounded ${
                                                passwordFieldFocused
                                                    ? "text-neutral-gray max-lg:text-primary dark:text-slate-400 max-lg:dark:text-primary [@media(hover:hover)]:hover:text-primary dark:[@media(hover:hover)]:hover:text-primary"
                                                    : "text-neutral-gray [@media(hover:hover)]:hover:text-primary dark:text-slate-400 dark:[@media(hover:hover)]:hover:text-primary"
                                            }`}
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
                            <div className="mt-3 flex flex-col items-center gap-3 border-t border-[#e7eeff] pt-3 dark:border-slate-600/50 sm:-mb-1.5">
                                <p className="text-center text-sm text-neutral-gray dark:text-slate-400">
                                    {t("Nie masz jeszcze konta?", "Don't have an account yet?")}{" "}
                                    <Link
                                        className="ml-1 font-bold text-primary underline-offset-4 transition-colors hover:underline dark:text-primary"
                                        to="/register"
                                    >
                                        {t("Zarejestruj się", "Register")}
                                    </Link>
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div className="flex w-full items-center justify-center gap-4 sm:gap-5 rounded-b-xl border border-white/40 bg-[#e4ecfb]/86 px-[19.5px] py-[11.5px] shadow-sm shadow-[#0177ca]/20 backdrop-blur-md dark:border-slate-400/20 dark:bg-slate-800/70 dark:shadow-[#0177ca]/30">
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
            {isResetModalOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reset-password-title"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeResetModal();
                    }}
                >
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                        <div className="mb-2.5 flex items-start justify-between gap-4">
                            <h2 id="reset-password-title" className="text-[18.5px] font-bold leading-tight text-text-dark dark:text-off-white">
                                {t("Reset hasła", "Forgot password?")}
                            </h2>
                            <button
                                type="button"
                                onClick={closeResetModal}
                                className="inline-flex h-8 w-8 -translate-y-0.5 items-center justify-center self-start rounded p-1 text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:text-slate-200"
                                aria-label={t("Zamknij", "Close")}
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <p className={`mb-4 text-sm ${resetSent ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-neutral-gray dark:text-slate-300"}`}>
                            {resetSent
                                ? t(
                                      `Jeśli e-mail istnieje w naszej bazie, link został wysłany. Ponowna wysyłka za ${resetCooldown}s.`,
                                      `If your email exists in our database, the reset link has been sent. You can resend in ${resetCooldown}s.`
                                  )
                                : t(
                                      "Jeśli e-mail istnieje w naszej bazie, wyślemy na niego link do zmiany hasła.",
                                      "If your email exists in our database, we will send a password reset link to it."
                                  )}
                        </p>

                        <input
                            id="reset-email"
                            type="email"
                            autoComplete="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder={t("Wprowadź swój e-mail", "Enter your e-mail")}
                            className="auth-input-stable form-input flex h-[51px] w-full min-w-0 resize-none overflow-hidden rounded-lg border-0 bg-off-white p-3 font-body text-sm font-medium leading-normal text-text-dark ring-1 ring-inset ring-[#c0c7d3]/20 placeholder:text-neutral-gray transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800/80 dark:text-off-white dark:placeholder:text-neutral-gray dark:focus:bg-slate-900 dark:focus:ring-primary sm:h-12 sm:p-[13.4px] text-[13.9px] sm:text-[13.4px]"
                        />

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={closeResetModal}
                                disabled={resetLoading}
                                className="flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-transparent px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800/80"
                            >
                                {t("Anuluj", "Cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleResetPassword}
                                disabled={resetLoading || resetCooldown > 0}
                                className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                    resetSent ? "bg-emerald-600 hover:bg-emerald-600" : "bg-primary hover:bg-[#0168b2]"
                                }`}
                            >
                                {resetLoading ? (
                                    t("Wysyłanie...", "Sending...")
                                ) : resetSent ? (
                                    <>
                                        <span className="material-symbols-outlined text-lg">check</span>
                                        {t("Wysłano", "Sent")}
                                        {resetCooldown > 0 ? ` (${resetCooldown}s)` : ""}
                                    </>
                                ) : (
                                    <>
                                        {t("Wyślij", "Send")}
                                        {resetCooldown > 0 ? ` (${resetCooldown}s)` : ""}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
