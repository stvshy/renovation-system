import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggleButton from "../components/LanguageToggleButton";

const UpdatePassword: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(5);
    const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const href = window.location.href;

            if (href.includes("access_token=")) {
                const tokenString = href.substring(href.indexOf("access_token="));
                const params = new URLSearchParams(tokenString);
                const accessToken = params.get("access_token");
                const refreshToken = params.get("refresh_token");

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    window.history.replaceState(null, "", `${window.location.pathname}#/update-password`);
                }
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();
            setHasRecoverySession(Boolean(session));
        };

        checkSession();
    }, []);

    useEffect(() => {
        if (!success || redirectCountdown <= 0) return;

        const timer = window.setInterval(() => {
            setRedirectCountdown((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    navigate("/projects");
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [success, redirectCountdown, navigate]);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError(t("Hasło musi mieć co najmniej 6 znaków.", "Password must be at least 6 characters long."));
            return;
        }

        if (password !== confirmPassword) {
            setError(t("Hasła nie są identyczne.", "Passwords do not match."));
            return;
        }

        setLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(t("Nie udało się zmienić hasła. Spróbuj ponownie.", "Could not change password. Try again."));
            setLoading(false);
            return;
        }

        setSuccess(true);
        setRedirectCountdown(5);
        setLoading(false);
    };

    return (
        <div className="flex min-h-dvh sm:min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100 px-4 py-8 font-body text-text-dark">
            <div className="w-full max-w-md">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:p-7">
                <h1 className="font-display text-[28px] font-bold tracking-tight text-text-dark">
                    {t("Zmień hasło", "Change password")}
                </h1>
                <p className="mt-2 text-sm text-neutral-gray">
                    {t(
                        "Ustaw nowe hasło do swojego konta.",
                        "Set a new password for your account."
                    )}
                </p>

                {hasRecoverySession === false && (
                    <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
                        {t(
                            "Link resetujący jest nieprawidłowy lub wygasł. Wygeneruj nowy link na stronie logowania.",
                            "This reset link is invalid or expired. Generate a new link on the login page."
                        )}
                    </div>
                )}

                {error && <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>}

                {success && (
                    <div className="mt-4 rounded-lg bg-emerald-100 p-3 text-sm font-medium text-emerald-700">
                        {t(
                            `Hasło zmienione. Przekierowanie do dashboardu za ${redirectCountdown}s...`,
                            `Password changed. Redirecting to dashboard in ${redirectCountdown}s...`
                        )}
                    </div>
                )}

                <form className="mt-5 space-y-4" onSubmit={handleChangePassword}>
                    <div className="relative flex w-full items-center">
                        <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("Nowe hasło", "New password")}
                            required
                            disabled={success || hasRecoverySession === false}
                            className="auth-input-stable form-input flex h-12 w-full min-w-0 resize-none overflow-hidden rounded-lg border-0 bg-off-white p-3 pr-10 font-body text-sm font-medium leading-normal text-text-dark ring-1 ring-inset ring-[#c0c7d3]/25 placeholder:text-neutral-gray transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                            type="button"
                            onClick={(e) => {
                                setShowPassword((current) => !current);
                                e.currentTarget.blur();
                                requestAnimationFrame(() => e.currentTarget.blur());
                            }}
                            disabled={success || hasRecoverySession === false}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray transition-colors hover:text-primary focus:outline-none focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={showPassword ? t("Ukryj hasło", "Hide password") : t("Pokaż hasło", "Show password")}
                        >
                            <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                    </div>
                    <div className="relative flex w-full items-center">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t("Powtórz nowe hasło", "Repeat new password")}
                            required
                            disabled={success || hasRecoverySession === false}
                            className="auth-input-stable form-input flex h-12 w-full min-w-0 resize-none overflow-hidden rounded-lg border-0 bg-off-white p-3 pr-10 font-body text-sm font-medium leading-normal text-text-dark ring-1 ring-inset ring-[#c0c7d3]/25 placeholder:text-neutral-gray transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                            type="button"
                            onClick={(e) => {
                                setShowConfirmPassword((current) => !current);
                                e.currentTarget.blur();
                                requestAnimationFrame(() => e.currentTarget.blur());
                            }}
                            disabled={success || hasRecoverySession === false}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray transition-colors hover:text-primary focus:outline-none focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={
                                showConfirmPassword
                                    ? t("Ukryj potwierdzenie hasła", "Hide password confirmation")
                                    : t("Pokaż potwierdzenie hasła", "Show password confirmation")
                            }
                        >
                            <span className="material-symbols-outlined text-xl">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success || hasRecoverySession === false}
                        className={`mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-display text-base font-bold tracking-[0.015em] text-white transition-all ${
                            success
                                ? "bg-emerald-600"
                                : "bg-gradient-to-r from-[#005ea2] to-[#0177ca] hover:scale-[1.01]"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        {loading ? (
                            t("Zapisywanie...", "Saving...")
                        ) : success ? (
                            <>
                                <span className="material-symbols-outlined text-lg">check</span>
                                {t("Hasło zmienione", "Password changed")}
                            </>
                        ) : (
                            t("Zmień hasło", "Change Password")
                        )}
                    </button>
                </form>
            </div>
            <div className="mt-7 flex justify-center">
                <div className="rounded-full border border-slate-300/80 bg-white/80 px-[0.1px] py-[0.1px] shadow-sm dark:border-slate-600/80 dark:bg-slate-900/70">
                    <div className="scale-[0.90]">
                        <LanguageToggleButton size="xs" />
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default UpdatePassword;
