import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients, saveClient } from '../lib/storage';
import { Client } from '../types';

const Clients: React.FC = () => {
    const navigate = useNavigate();
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
    }, []);

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
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8 relative">
            <div className="layout-content-container flex flex-col w-full max-w-5xl">
                <header className="flex items-center justify-between border-b border-solid border-slate-200 dark:border-slate-800 pb-4 px-2">
                    <div className="flex items-center gap-3 text-slate-900 dark:text-slate-50">
                        <div className="size-8 text-primary">
                            <span className="material-symbols-outlined !text-4xl">groups</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Klienci</h1>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        <span className="hidden sm:inline">Dodaj Klienta</span>
                    </button>
                </header>

                {/* Search Bar */}
                <div className="px-2 py-4">
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Szukaj klienta..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input w-full pl-10 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-slate-800"
                        />
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                    {isLoading ? (
                        <div className="col-span-full text-center py-10">Ładowanie klientów...</div>
                    ) : filteredClients.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-slate-500">Brak klientów</p>
                        </div>
                    ) : (
                        filteredClients.map(client => (
                            <div 
                                key={client.id} 
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="bg-white dark:bg-slate-800/50 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                                        {client.firstName?.[0] || '?'}{client.lastName?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight group-hover:text-primary transition-colors">
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-lg font-bold">Nowy Klient</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveClient} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Imię</span>
                                    <input required className="form-input rounded-lg dark:bg-slate-800" value={newClient.firstName} onChange={e => setNewClient({...newClient, firstName: e.target.value})} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Nazwisko</span>
                                    <input required className="form-input rounded-lg dark:bg-slate-800" value={newClient.lastName} onChange={e => setNewClient({...newClient, lastName: e.target.value})} />
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Telefon</span>
                                    <input required className="form-input rounded-lg dark:bg-slate-800" type="tel" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Email</span>
                                    <input required className="form-input rounded-lg dark:bg-slate-800" type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                                </label>
                            </div>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500 uppercase">Ulica i numer</span>
                                <input className="form-input rounded-lg dark:bg-slate-800" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Miasto</span>
                                    <input className="form-input rounded-lg dark:bg-slate-800" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Kod pocztowy</span>
                                    <input className="form-input rounded-lg dark:bg-slate-800" value={newClient.zipCode} onChange={e => setNewClient({...newClient, zipCode: e.target.value})} />
                                </label>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700">Anuluj</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">Zapisz</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;