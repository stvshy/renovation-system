import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients, saveClient } from '../lib/storage';
import { Client } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useDemo } from '../context/DemoContext';

const Clients: React.FC = () => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { isDemoMode, demoRevision } = useDemo();
    const [clients, setClients] = useState<Client[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // New Client Form State
    const [newClient, setNewClient] = useState({
        firstName: '', lastName: '', phone: '', email: '', address: '', city: '', zipCode: ''
    });

    useEffect(() => {
        const load = async () => {
            const data = await getClients();
            setClients(data);
            setIsLoading(false);
        };
        load();
    }, [isDemoMode, demoRevision]);

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const client: Client = {
            id: crypto.randomUUID(),
            ...newClient
        };
        await saveClient(client);
        
        // Reload list
        const updated = await getClients();
        setClients(updated);
        
        setIsModalOpen(false);
        setNewClient({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', zipCode: '' });
    };

    const filteredClients = clients.filter(c => {
        const search = searchTerm.toLowerCase();
        return (
            (c.lastName?.toLowerCase() || '').includes(search) || 
            (c.firstName?.toLowerCase() || '').includes(search) ||
            (c.city?.toLowerCase() || '').includes(search)
        );
    });

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8 relative [scrollbar-gutter:stable]">
            <div className="flex flex-col w-full max-w-7xl mx-auto">
                <header className="flex items-center justify-between gap-3 sm:gap-4 border-b border-solid border-slate-200 dark:border-slate-800 pb-4 mb-2">
                    <div className="flex items-center pl-[6px] sm:pl-[6px] text-slate-900 dark:text-slate-50">
                        <div className="size-9 mr-4 mt-0.5 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[42px] leading-none">groups</span>
                        </div>
                        <h1 className="ml-1 text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">{t('Klienci', 'Clients')}</h1>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="sm:hidden flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                        aria-label={t('Dodaj Klienta', 'Add Client')}
                    >
                        <span className="material-symbols-outlined text-[20px] leading-none">person_add</span>
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="hidden sm:flex w-full sm:w-auto min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-xl h-[46.2px] px-5 bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px] leading-none">person_add</span>
                        <span>{t('Dodaj Klienta', 'Add Client')}</span>
                    </button>
                </header>

                {/* Search Bar */}
                <div className="py-2 -mx-1">
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                        <input 
                            type="text" 
                            placeholder={t('Szukaj klienta...', 'Search client...')} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input w-full pl-11 pr-4 py-3 h-11 sm:h-auto rounded-xl border-gray-300 dark:border-gray-700 dark:bg-slate-800 text-[15px] sm:text-base placeholder:text-[15px] sm:placeholder:text-base"
                        />
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 -mx-1">
                    {isLoading ? (
                        <div className="col-span-full text-center py-10">{t('Ładowanie klientów...', 'Loading clients...')}</div>
                    ) : filteredClients.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-slate-500">{t('Brak klientów', 'No clients')}</p>
                        </div>
                    ) : (
                        filteredClients.map(client => (
                            <div 
                                key={client.id} 
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="bg-white dark:bg-slate-800/50 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base">
                                        {client.firstName?.[0] || '?'}{client.lastName?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-white leading-tight group-hover:text-primary transition-colors">
                                            {client.firstName} {client.lastName}
                                        </h3>
                                        <p className="text-xs text-slate-500">{client.city}</p>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">call</span>
                                        {client.phone}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">mail</span>
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Client Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-xl sm:text-2xl font-black">{t('Nowy Klient', 'New Client')}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveClient} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Imię', 'First name')}</span>
                                    <input required className="form-input rounded-xl dark:bg-slate-800" value={newClient.firstName} onChange={e => setNewClient({...newClient, firstName: e.target.value})} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Nazwisko', 'Last name')}</span>
                                    <input required className="form-input rounded-xl dark:bg-slate-800" value={newClient.lastName} onChange={e => setNewClient({...newClient, lastName: e.target.value})} />
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Telefon', 'Phone')}</span>
                                    <input required className="form-input rounded-xl dark:bg-slate-800" type="tel" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Email</span>
                                    <input required className="form-input rounded-xl dark:bg-slate-800" type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                                </label>
                            </div>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500 uppercase">{t('Ulica i numer', 'Street and number')}</span>
                                <input className="form-input rounded-xl dark:bg-slate-800" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Miasto', 'City')}</span>
                                    <input className="form-input rounded-xl dark:bg-slate-800" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Kod pocztowy', 'Postal code')}</span>
                                    <input className="form-input rounded-xl dark:bg-slate-800" value={newClient.zipCode} onChange={e => setNewClient({...newClient, zipCode: e.target.value})} />
                                </label>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700">{t('Anuluj', 'Cancel')}</button>
                                <button type="submit" className="h-11 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90">{t('Zapisz', 'Save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;