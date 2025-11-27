import React from 'react';
import { useNavigate } from 'react-router-dom';

const ClientForm: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                <div className="flex flex-wrap justify-between gap-3 p-4">
                    <p className="text-slate-800 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Dane klienta</p>
                </div>
                <div className="flex flex-col gap-6 p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">Imię*</p>
                            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-0 border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal" placeholder="Jan" />
                        </label>
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">Nazwisko*</p>
                            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-0 border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal" placeholder="Kowalski" />
                        </label>
                    </div>
                    <div className="flex flex-col">
                        <label className="flex flex-col flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">Ulica i numer domu*</p>
                            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-0 border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal" placeholder="ul. Kwiatowa 15" />
                        </label>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">Miasto*</p>
                            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-0 border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal" placeholder="Warszawa" />
                        </label>
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">Kod pocztowy*</p>
                            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-0 border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal" placeholder="00-001" />
                        </label>
                    </div>
                    <div className="flex flex-col">
                        <label className="flex flex-col flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">Numer telefonu*</p>
                            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-0 border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal" placeholder="123-456-789" type="tel" />
                        </label>
                    </div>
                    <div className="flex flex-col">
                        <label className="flex flex-col flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">Adres e-mail*</p>
                            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 dark:text-white focus:outline-0 focus:ring-0 border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 p-[15px] text-base font-normal leading-normal" placeholder="jan.kowalski@example.com" required type="email" />
                        </label>
                    </div>
                    <div className="flex flex-wrap justify-end gap-4 p-4 mt-4">
                        <button onClick={() => navigate('/projects')} className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-base hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                            Wróć
                        </button>
                        <button onClick={() => navigate('/projects/new/room')} className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-green-600 text-white font-semibold text-base hover:bg-green-700 transition-colors">
                            Zapisz i Dalej
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientForm;