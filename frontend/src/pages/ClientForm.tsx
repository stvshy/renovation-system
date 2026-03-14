import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getClients, saveClient, getClientById } from '../lib/storage';
import { Client } from '../types';
import { useLanguage } from '../context/LanguageContext';
import EditWizardExitControl from '../components/EditWizardExitControl';
import ScrollableSelect from '../components/ScrollableSelect';
import { clearProjectCreationDirty, setProjectCreationDirty } from '../lib/projectCreationGuard';
import { clearCurrentProjectSnapshot, setCurrentProjectSnapshot } from '../lib/projectDrafts';
import { saveEditedProjectFromSnapshot } from '../lib/projectWizardSave';

const ClientForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const draftSnapshot = location.state?.draftSnapshot;
    const draftId = location.state?.draftId || draftSnapshot?.id;
    const editProjectId = location.state?.editProjectId;
    const editProjectMeta = location.state?.editProjectMeta;
    const draftClientForm = draftSnapshot?.clientForm;
    const draftProjectDates = draftSnapshot?.projectDates;
    const incomingClientData = location.state?.clientData || draftSnapshot?.clientData;
    const incomingProjectDates = location.state?.projectDates || draftProjectDates;
    const existingRooms = location.state?.rooms || draftSnapshot?.rooms || [];
    const isEditMode = Boolean(editProjectId);
    const preservedProjectMeta = incomingClientData?.projectMeta || draftSnapshot?.clientData?.projectMeta;

    const [mode, setMode] = useState<'new' | 'existing'>(draftClientForm?.mode || (incomingClientData?.id ? 'existing' : 'new'));
    const [existingClients, setExistingClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>(draftClientForm?.selectedClientId || incomingClientData?.id || '');
    const [isEditingSelectedClient, setIsEditingSelectedClient] = useState(false);

    // Form fields for new client
    const [firstName, setFirstName] = useState(draftClientForm?.firstName || incomingClientData?.firstName || '');
    const [lastName, setLastName] = useState(draftClientForm?.lastName || incomingClientData?.lastName || '');
    const [address, setAddress] = useState(draftClientForm?.address || incomingClientData?.address || '');
    const [city, setCity] = useState(draftClientForm?.city || incomingClientData?.city || '');
    const [zipCode, setZipCode] = useState(draftClientForm?.zipCode || incomingClientData?.zipCode || '');
    const [phone, setPhone] = useState(draftClientForm?.phone || incomingClientData?.phone || '');
    const [email, setEmail] = useState(draftClientForm?.email || incomingClientData?.email || '');
    
    // Project Dates
    const [startDate, setStartDate] = useState(incomingProjectDates?.startDate || draftClientForm?.startDate || '');
    const [endDate, setEndDate] = useState(incomingProjectDates?.endDate || draftClientForm?.endDate || '');

    // Validation State
    const [errors, setErrors] = useState<Record<string, string>>({});

    const hasWizardData =
        !!selectedClientId ||
        !!firstName.trim() ||
        !!lastName.trim() ||
        !!address.trim() ||
        !!city.trim() ||
        !!zipCode.trim() ||
        !!phone.trim() ||
        !!email.trim() ||
        !!startDate ||
        !!endDate;

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

    useEffect(() => {
        setProjectCreationDirty(hasWizardData);
    }, [hasWizardData]);

    useEffect(() => {
        if (!hasWizardData) {
            clearCurrentProjectSnapshot();
            return;
        }

        const clientData = {
            id: selectedClientId || draftSnapshot?.clientData?.id,
            firstName,
            lastName,
            address,
            city,
            zipCode,
            phone,
            email,
            projectMeta: preservedProjectMeta,
        };

        setCurrentProjectSnapshot({
            id: draftId,
            currentStep: 'client',
            updatedAt: new Date().toISOString(),
            clientData,
            projectDates: { startDate, endDate },
            rooms: existingRooms,
            clientForm: {
                mode,
                selectedClientId,
                firstName,
                lastName,
                address,
                city,
                zipCode,
                phone,
                email,
                startDate,
                endDate,
            },
        });
    }, [address, city, draftId, email, endDate, existingRooms, firstName, hasWizardData, lastName, mode, phone, selectedClientId, startDate, zipCode]);

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
                    setIsEditingSelectedClient(false);
                    // Clear selection error if exists
                    setErrors(prev => ({...prev, clientSelection: ''}));
                } else if (incomingClientData?.id === selectedClientId) {
                    setFirstName(incomingClientData.firstName || '');
                    setLastName(incomingClientData.lastName || '');
                    setAddress(incomingClientData.address || '');
                    setCity(incomingClientData.city || '');
                    setZipCode(incomingClientData.zipCode || '');
                    setPhone(incomingClientData.phone || '');
                    setEmail(incomingClientData.email || '');
                    setErrors(prev => ({ ...prev, clientSelection: '' }));
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
                setIsEditingSelectedClient(false);
            }
        };
        loadClientDetails();
    }, [incomingClientData, mode, selectedClientId]);

    const buildWizardState = () => ({
        clientData: {
            id: selectedClientId || draftSnapshot?.clientData?.id,
            firstName,
            lastName,
            address,
            city,
            zipCode,
            phone,
            email,
            projectMeta: preservedProjectMeta,
        },
        projectDates: {
            startDate,
            endDate,
        },
        rooms: existingRooms,
        draftId,
        editProjectId,
        editProjectMeta,
    });

    const handleExitWithoutSaving = () => {
        clearProjectCreationDirty();
        clearCurrentProjectSnapshot();
        navigate(editProjectId ? `/projects/${editProjectId}` : '/projects');
    };

    const handleSaveAndExit = async () => {
        if (editProjectId) {
            await saveEditedProjectFromSnapshot(editProjectId);
        }
        clearProjectCreationDirty();
        clearCurrentProjectSnapshot();
        navigate(editProjectId ? `/projects/${editProjectId}` : '/projects');
    };

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

        // If creating new client, save them to DB for future use.
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
        } else if (mode === 'existing' && selectedClientId && isEditingSelectedClient) {
            const updatedClient: Client = {
                id: selectedClientId,
                firstName,
                lastName,
                address,
                city,
                zipCode,
                phone,
                email,
            };
            await saveClient(updatedClient);

            setExistingClients((prev) =>
                prev.map((client) => (client.id === selectedClientId ? { ...client, ...updatedClient } : client))
            );
            setIsEditingSelectedClient(false);
        }

        const wizardState = buildWizardState();
        const clientData = {
            ...wizardState.clientData,
            id: finalClientId,
        };

        // Pass data via state to the next route
        navigate('/projects/new/room', { 
            state: { 
                clientData,
                projectDates: wizardState.projectDates,
                rooms: existingRooms,
                draftId,
                editProjectId,
                editProjectMeta,
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
        <div className="px-3 sm:px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-4 sm:py-5">
            <div className="layout-content-container flex flex-col w-full max-w-[1280px] flex-1">
                <div className="flex flex-col gap-2 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 pb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div>
                            <p className="text-text-dark dark:text-off-white text-[34px] font-black leading-tight">{t('Dane Klienta', 'Client Data')}</p>
                            <span className="mt-2 inline-flex flex-col bg-primary/10 text-primary text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider w-fit leading-tight">
                                <span>{t('WPROWADZANIE DANYCH KLIENTA', 'ENTERING CLIENT DATA')}</span>
                            </span>
                        </div>
                        <EditWizardExitControl visible={isEditMode} onSaveAndExit={handleSaveAndExit} onExitWithoutSaving={handleExitWithoutSaving} />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button type="button" className="text-[11.9px] font-bold rounded-lg border border-primary bg-white dark:bg-slate-900 px-[10.3px] py-[4.4px] text-primary">
                            {t('Krok 1', 'Step 1')}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/projects/new/room', { state: buildWizardState() })}
                            className="text-[11.9px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-[10.3px] py-[4.4px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {t('Krok 2', 'Step 2')}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/projects/new/services', { state: buildWizardState() })}
                            className="text-[11.9px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-[10.3px] py-[4.4px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {t('Krok 3', 'Step 3')}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/projects/new/offer', { state: buildWizardState() })}
                            className="text-[11.9px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-[10.3px] py-[4.4px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {t('Krok 4', 'Step 4')}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4 p-4">
                    
                    {/* Mode Selection */}
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div className="flex p-0.5 bg-[rgba(17,115,212,0.1)] rounded-lg divide-x divide-primary/20">
                            <button
                                onClick={() => { setMode('new'); setSelectedClientId(''); setFirstName(''); setLastName(''); setErrors({}); }}
                                className={`flex-1 px-4 py-[8.5px] rounded-md text-sm font-bold leading-5 transition-all ${mode === 'new' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                {t('Nowy Klient', 'New Client')}
                            </button>
                            <button
                                onClick={() => { setMode('existing'); setErrors({}); }}
                                className={`flex-1 px-4 py-[8.5px] rounded-md text-sm font-bold leading-5 transition-all ${mode === 'existing' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                {t('Wybierz z listy', 'Select from list')}
                            </button>
                        </div>
                    </div>

                    {mode === 'existing' && (
                        <div className="mb-4">
                            <ScrollableSelect
                                value={selectedClientId}
                                onChange={(e) => {
                                    handleChange(setSelectedClientId, 'clientSelection')(e);
                                    setIsEditingSelectedClient(false);
                                }}
                                className={`form-select w-full h-[42px] rounded-lg border bg-background-light dark:bg-slate-800 px-3 
                                    ${errors.clientSelection ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                            >
                                <option value="">-- {t('Wybierz klienta', 'Select client')} --</option>
                                {existingClients.map(c => (
                                    <option key={c.id} value={c.id}>{c.lastName} {c.firstName} ({c.city})</option>
                                ))}
                            </ScrollableSelect>
                            {errors.clientSelection && <p className="mt-1 text-sm text-red-500 font-medium animate-pulse">{errors.clientSelection}</p>}
                            {selectedClientId && (
                                <div className="flex justify-end mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingSelectedClient((prev) => !prev)}
                                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border transition-colors ${
                                            isEditingSelectedClient
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                        title={
                                            isEditingSelectedClient
                                                ? t('Wyłącz edycję klienta', 'Disable client edit')
                                                : t('Edytuj dane klienta', 'Edit client data')
                                        }
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                        {isEditingSelectedClient ? t('Edytujesz', 'Editing') : t('Edytuj', 'Edit')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={`transition-opacity duration-300 ${mode === 'existing' && !selectedClientId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex flex-col md:flex-row gap-4">
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Imię*', 'First name*')}</p>
                                <input 
                                    value={firstName} 
                                    onChange={handleChange(setFirstName, 'firstName')} 
                                    disabled={mode === 'existing' && !isEditingSelectedClient}
                                    className={`form-input flex w-full rounded-lg border bg-background-light dark:bg-slate-800 p-2.5 text-sm disabled:bg-gray-200 dark:disabled:bg-slate-900 
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
                                    disabled={mode === 'existing' && !isEditingSelectedClient}
                                    className={`form-input flex w-full rounded-lg border bg-background-light dark:bg-slate-800 p-2.5 text-sm disabled:bg-gray-200 dark:disabled:bg-slate-900 
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
                                    disabled={mode === 'existing' && !isEditingSelectedClient}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-2.5 text-sm disabled:bg-gray-200 dark:disabled:bg-slate-900" 
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
                                    disabled={mode === 'existing' && !isEditingSelectedClient}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-2.5 text-sm disabled:bg-gray-200 dark:disabled:bg-slate-900" 
                                    placeholder={t('Warszawa', 'London')} 
                                />
                            </label>
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Kod pocztowy', 'Postal code')}</p>
                                <input 
                                    value={zipCode} 
                                    onChange={(e) => setZipCode(e.target.value)} 
                                    disabled={mode === 'existing' && !isEditingSelectedClient}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-2.5 text-sm disabled:bg-gray-200 dark:disabled:bg-slate-900" 
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
                                    disabled={mode === 'existing' && !isEditingSelectedClient}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-2.5 text-sm disabled:bg-gray-200 dark:disabled:bg-slate-900" 
                                    placeholder="123-456-789" 
                                    type="tel" 
                                />
                            </label>
                            <label className="flex flex-col flex-1">
                                <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('E-mail', 'Email')}</p>
                                <input 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    disabled={mode === 'existing' && !isEditingSelectedClient}
                                    className="form-input flex w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-background-light dark:bg-slate-800 p-2.5 text-sm disabled:bg-gray-200 dark:disabled:bg-slate-900" 
                                    placeholder={t('jan.kowalski@example.com', 'john.doe@example.com')} 
                                    type="email" 
                                />
                            </label>
                        </div>
                    </div>

                    {/* Section: Project Dates */}
                    <h2 className="text-xl font-bold text-primary border-b border-gray-200 dark:border-gray-700 pb-2 mt-3">{t('Czas trwania projektu', 'Project timeline')}</h2>
                    <div className="flex flex-col md:flex-row gap-4">
                        <label className="flex flex-col flex-1">
                            <p className="text-slate-700 dark:text-slate-300 text-base font-medium leading-normal pb-2">{t('Data rozpoczęcia*', 'Start date*')}</p>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={handleChange(setStartDate, 'startDate')} 
                                className={`form-input flex w-full rounded-lg border bg-background-light dark:bg-slate-800 p-2.5 text-sm dark:text-white
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
                                className={`form-input flex w-full rounded-lg border bg-background-light dark:bg-slate-800 p-2.5 text-sm dark:text-white
                                    ${errors.endDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700'}`}
                            />
                            {errors.endDate && <p className="mt-1 text-xs text-red-500 font-medium">{errors.endDate}</p>}
                        </label>
                    </div>

                    {isEditMode ? (
                        <div className="flex justify-end p-4 mt-4 border-t border-gray-200 dark:border-gray-700 pt-6 w-full">
                            <button
                                onClick={handleNext}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all"
                            >
                                <span>{t('Pokoje', 'Rooms')}</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-3 p-4 mt-4 border-t border-gray-200 dark:border-gray-700 pt-6 w-full justify-end md:items-center">
                            <button onClick={() => navigate('/projects')} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all">
                                {t('Anuluj', 'Cancel')}
                            </button>
                            <button onClick={handleNext} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all md:ml-auto">
                                {t('Zapisz i Dalej', 'Save and Continue')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientForm;