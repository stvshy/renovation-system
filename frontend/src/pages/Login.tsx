import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-off-white">
      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 items-center justify-center p-4 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-dependable-blue dark:bg-primary">
                  <span className="material-symbols-outlined text-3xl text-off-white">construction</span>
                </div>
                <h1 className="text-4xl font-bold tracking-tighter text-text-dark dark:text-off-white">Renovation System</h1>
              </div>
              <p className="text-neutral-gray">Zaloguj się, aby zarządzać swoimi projektami.</p>
            </div>
            <div className="rounded-xl border border-neutral-gray/20 dark:border-neutral-gray/70 bg-off-white dark:bg-background-dark/50 p-6 shadow-sm sm:p-8">
              <form className="space-y-6" onSubmit={handleLogin}>
                {error && <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg">{error}</div>}
                <div>
                  <label className="text-text-dark dark:text-off-white text-base font-medium leading-normal pb-2 block" htmlFor="email">
                    E-mail
                  </label>
                  <input
                    autoComplete="email"
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-dark dark:text-off-white dark:placeholder:text-neutral-gray focus:outline-0 focus:ring-0 border border-neutral-gray/50 dark:border-neutral-gray/70 bg-off-white dark:bg-background-dark focus:border-dependable-blue dark:focus:border-primary h-14 placeholder:text-neutral-gray p-[15px] text-base font-normal leading-normal"
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
                  <input
                    autoComplete="current-password"
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-dark dark:text-off-white dark:placeholder:text-neutral-gray focus:outline-0 focus:ring-0 border border-neutral-gray/50 dark:border-neutral-gray/70 bg-off-white dark:bg-background-dark focus:border-dependable-blue dark:focus:border-primary h-14 placeholder:text-neutral-gray p-[15px] text-base font-normal leading-normal"
                    id="password"
                    name="password"
                    placeholder="Wprowadź swoje hasło"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <a className="font-medium text-dependable-blue hover:text-dependable-blue/80 dark:text-primary dark:hover:text-primary/80" href="#">
                      Zapomniałeś hasła?
                    </a>
                  </div>
                </div>
                <div>
                  <button
                    className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-dependable-blue dark:bg-primary text-off-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-dependable-blue/90 dark:hover:bg-primary/90 transition-colors disabled:opacity-50"
                    type="submit"
                    disabled={loading}
                  >
                    <span className="truncate">{loading ? "Logowanie..." : "Zaloguj się"}</span>
                  </button>
                </div>
              </form>
            </div>
            <div className="text-center text-sm text-neutral-gray">
              Nie masz jeszcze konta?{" "}
              <Link className="font-medium text-dependable-blue hover:text-dependable-blue/80 dark:text-primary dark:hover:text-primary/80" to="/register">
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
