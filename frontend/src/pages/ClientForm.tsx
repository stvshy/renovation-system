import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getClients, saveClient, getClientById } from '../lib/storage';
import { Client } from '../types';
import { useLanguage } from '../context/LanguageContext';

const ClientForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();

    const [mode, setMode] = useState<'new' | 'existing'>('new');
    const [existingClients, setExistingClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');

    // Form fields for new client
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    
    // Project Dates
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Validation State
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadClients = async () => {
            const clients = await getClients();
            setExistingClients(clients);

            // Check if we came from Client Details page with pre-selected ID
            if (location.state?.preSelectedClientId) {
                setMode('existing');
                setSelectedClientId(location.state.preSelectedClientId);
            } else if (clients.length > 0) {
                // Optional: Default to existing if clients exist, or stay new
                // setMode('existing'); 
            }
        };
        loadClients();
    }, [location.state]);

    // Handle selecting an existing client
    useEffect(() => {
        const loadClientDetails = async () => {
            if (mode === 'existing' && selectedClientId) {
                const client = await getClientById(selectedClientId);
                if (client) {
                    setFirstName(client.firstName);
                    setLastName(client.lastName);
                    setAddress(client.address);
                    setCity(client.city);
                    setZipCode(client.zipCode);
                    setPhone(client.phone);
                    setEmail(client.email);
                    // Clear selection error if exists
                    setErrors(prev => ({...prev, clientSelection: ''}));
                }
            } else if (mode === 'existing' && !selectedClientId) {
                // Clear fields if no selection
                setFirstName('');
                setLastName('');
                setAddress('');
                setCity('');
                setZipCode('');
                setPhone('');
                setEmail('');
            }
        };
        loadClientDetails();
    }, [selectedClientId, mode]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        // Mode specific validation
        if (mode === 'existing') {
            if (!selectedClientId) {
                newErrors.clientSelection = t('Proszę wybrać klienta z listy.', 'Please select a client from the list.');
                isValid = false;
            }
        } else {
            if (!firstName.trim()) {
                newErrors.firstName = t('Imię jest wymagane.', 'First name is required.');
                isValid = false;
            }
            if (!lastName.trim()) {
                newErrors.lastName = t('Nazwisko jest wymagane.', 'Last name is required.');
                isValid = false;
            }
        }

        // Date validation
        if (!startDate) {
            newErrors.startDate = t('Data rozpoczęcia jest wymagana.', 'Start date is required.');
            isValid = false;
        }
        if (!endDate) {
            newErrors.endDate = t('Data zakończenia jest wymagana.', 'End date is required.');
            isValid = false;
        }

        // Logical date validation
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (end < start) {
                newErrors.endDate = t('Data zakończenia nie może być wcześniejsza niż rozpoczęcia.', 'End date cannot be earlier than start date.');
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleNext = async () => {
        if (!validateForm()) {
            // Scroll to top or first error could be added here if needed
            return;
        }

        // If creating new client, save them to DB for future use
        let finalClientId = selectedClientId;
        if (mode === 'new') {
            finalClientId = crypto.randomUUID();
            const newClientObj: Client = {
                id: finalClientId,
                firstName,
                lastName,
                address,
                city,
                zipCode,
                phone,
                email
            };
            await saveClient(newClientObj);
        }

        const clientData = {
            id: finalClientId,
            firstName,
            lastName,
            address,
            city,
            zipCode,
            phone,
            email
        };

        const projectDates = {
            startDate,
            endDate
        };

        // Pass data via state to the next route
        navigate('/projects/new/room', { 
            state: { 
                clientData,
                projectDates
            } 
        });
    };

    // Helper to clear error on input change
    const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>, field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setter(e.target.value);
        if (errors[field]) {
            setErrors(prev => {
                const newErr = { ...prev };
                delete newErr[field];
                return newErr;
            });
        }
    };

    return (
        <div className="px-3 sm:px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-4 sm:py-5">
            <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                <div className="flex flex-wrap justify-between gap-3 p-4">
                    <p className="text-slate-800 dark:text-white text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em]">{t('Nowy Projekt', 'New Project')}</p>
                </div>
                
                <div className="flex flex-col gap-6 p-4">
                    
                    {/* Mode Selection */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                         <button 
                            onClick={() => { setMode('new'); setSelectedClientId(''); setFirstName(''); setLastName(''); setErrors({}); }}
                            className={`flex-1 py-3 rounded-lg font-bold transition-all ${mode === 'new' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'}`}
                        >
                            {t('Nowy Klient', 'New Client')}
                        </button>
                        <button 
                            onClick={() => { setMode('existing'); setErrors({}); }}
                            className={`flex-1 py-3 rounded-lg font-bold border transition-all ${mode === 'existing' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-slate-300 dark:border-slate-600 bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                        >
                            {t('Wybierz z listy', 'Select from list')}
                        </button>
                    </div>

                    {/* Section: Client Data */}
                    <h2 className="text-xl font-bold text-primary pb-2">{t('Dane Klienta', 'Client Details')}</h2>
                    
                    {mode === 'existing' && (
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('Wybierz klienta', 'Select client')}</label>
                            <select 
                                value={selectedClientId}
                                onChange={handleChange(setSelectedClientId, 'clientSelection')}
                                className={`form-select w-full rounded-lg border bg-background-light dark:bg-slate-800 p-3 
                                    ${errors.clientSelection ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                            >
                                <option value="">-- {t('Wybierz klienta', 'Select client')} --</option>
                                {existingClients.map(c => (
                                    <option key={c.id} value={c.id}>{c.lastName} {c.firstName} ({c.city})</option>
                                ))}
                            </select>
                            {errors.clientSelection && <p className="mt-1 text-sm text-red-500 font-medium animate-pulse">{errors.clientSelection}</p>}
                        </div>
                    )}

                    <div className={`transition-opacity duration-300 ${mode === 'existing' && !selectedClientId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex flex-col md:flex-row gap-4">
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Imię*', 'First name*')}</p>
                                <input 
                                    value={firstName} 
                                    onChange={handleChange(setFirstName, 'firstName')} 
                                    disabled={mode === 'existing'}
                                    className={`form-input flex w-full rounded-lg border bg-background-light dark:bg-slate-800 p-[15px] disabled:bg-gray-200 dark:disabled:bg-slate-900 
                                        ${errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                                    placeholder={t('Jan', 'John')} 
                                />
                                {errors.firstName && <p className="mt-1 text-xs text-red-500 font-medium">{errors.firstName}</p>}
                            </label>
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Nazwisko*', 'Last name*')}</p>
                                <input 
                                    value={lastName} 
                                    onChange={handleChange(setLastName, 'lastName')}
                                    disabled={mode === 'existing'}
                                    className={`form-input flex w-full rounded-lg border bg-background-light dark:bg-slate-800 p-[15px] disabled:bg-gray-200 dark:disabled:bg-slate-900 
                                        ${errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                                    placeholder={t('Kowalski', 'Doe')} 
                                />
                                {errors.lastName && <p className="mt-1 text-xs text-red-500 font-medium">{errors.lastName}</p>}
                            </label>
                        </div>
                        
                        <div className="flex flex-col mt-4">
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Ulica i numer domu', 'Street and house number')}</p>
                                <input 
                                    value={address} 
                                    onChange={(e) => setAddress(e.target.value)} 
                                    disabled={mode === 'existing'}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-[15px] disabled:bg-gray-200 dark:disabled:bg-slate-900" 
                                    placeholder={t('ul. Kwiatowa 15', '123 Main St')} 
                                />
                            </label>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mt-4">
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Miasto', 'City')}</p>
                                <input 
                                    value={city} 
                                    onChange={(e) => setCity(e.target.value)} 
                                    disabled={mode === 'existing'}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-[15px] disabled:bg-gray-200 dark:disabled:bg-slate-900" 
                                    placeholder={t('Warszawa', 'London')} 
                                />
                            </label>
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Kod pocztowy', 'Postal code')}</p>
                                <input 
                                    value={zipCode} 
                                    onChange={(e) => setZipCode(e.target.value)} 
                                    disabled={mode === 'existing'}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-[15px] disabled:bg-gray-200 dark:disabled:bg-slate-900" 
                                    placeholder="00-001" 
                                />
                            </label>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mt-4">
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Telefon', 'Phone')}</p>
                                <input 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    disabled={mode === 'existing'}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-[15px] disabled:bg-gray-200 dark:disabled:bg-slate-900" 
                                    placeholder="123-456-789" 
                                    type="tel" 
                                />
                            </label>
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('E-mail', 'Email')}</p>
                                <input 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    disabled={mode === 'existing'}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-[15px] disabled:bg-gray-200 dark:disabled:bg-slate-900" 
                                    placeholder={t('jan.kowalski@example.com', 'john.doe@example.com')} 
                                    type="email" 
                                />
                            </label>
                        </div>
                    </div>

                    {/* Section: Project Dates */}
                    <h2 className="text-xl font-bold text-primary border-b border-gray-200 dark:border-gray-700 pb-2 mt-4">{t('Czas trwania projektu', 'Project timeline')}</h2>
                    <div className="flex flex-col md:flex-row gap-4">
                        <label className="flex flex-col flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Data rozpoczęcia*', 'Start date*')}</p>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={handleChange(setStartDate, 'startDate')} 
                                className={`form-input flex w-full rounded-lg border bg-background-light dark:bg-slate-800 p-[15px] dark:text-white
                                    ${errors.startDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                            />
                            {errors.startDate && <p className="mt-1 text-xs text-red-500 font-medium">{errors.startDate}</p>}
                        </label>
                        <label className="flex flex-col flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Data zakończenia*', 'End date*')}</p>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={handleChange(setEndDate, 'endDate')} 
                                className={`form-input flex w-full rounded-lg border bg-background-light dark:bg-slate-800 p-[15px] dark:text-white
                                    ${errors.endDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                            />
                            {errors.endDate && <p className="mt-1 text-xs text-red-500 font-medium">{errors.endDate}</p>}
                        </label>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 p-4 mt-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                        <button onClick={() => navigate('/projects')} className="flex items-center justify-center gap-2 h-12 min-w-[150px] px-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-base hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                            {t('Anuluj', 'Cancel')}
                        </button>
                        <button onClick={handleNext} className="flex items-center justify-center gap-2 h-12 min-w-[150px] px-6 rounded-lg bg-primary text-white font-semibold text-base hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                            {t('Zapisz i Dalej', 'Save and Continue')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientForm;