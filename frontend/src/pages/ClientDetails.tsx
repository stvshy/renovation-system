import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getClientById, getProjects, saveClient } from "../lib/storage";
import { Client, Project } from "../types";

const ClientDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | undefined>(undefined);
    const [clientProjects, setClientProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Client>>({});

    useEffect(() => {
        const load = async () => {
            if (id) {
                const foundClient = await getClientById(id);
                if (foundClient) {
                    setClient(foundClient);
                    const allProjects = await getProjects();
                    // Filter projects by matching client name (since we use clientName in project ID mostly in this simple app,
                    // ideally we should match by clientId if we migrated fully.
                    // For this implementation, we will check if project.clientId matches OR match exact name as fallback)
                    const relevant = allProjects.filter((p) => p.clientId === id || (p.clientData && p.clientData.email === foundClient.email));
                    setClientProjects(relevant);
                } else {
                    navigate("/clients");
                }
            }
            setLoading(false);
        };
        load();
    }, [id, navigate]);

    // Populate edit form when opening modal
    useEffect(() => {
        if (isEditModalOpen && client) {
            setEditForm({ ...client });
        }
    }, [isEditModalOpen, client]);

    if (loading) return <div>Ładowanie...</div>;
    if (!client) return <div>Nie znaleziono klienta.</div>;

    const handleNewProject = () => {
        // Navigate to project creation but pre-fill client data
        navigate("/projects/new/client", {
            state: { preSelectedClientId: client.id },
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client) return;

        const updatedClient: Client = {
            ...client,
            ...(editForm as Client),
        };

        await saveClient(updatedClient);
        setClient(updatedClient);
        setIsEditModalOpen(false);
    };

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="layout-content-container flex flex-col w-full max-w-5xl gap-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
                            {client.firstName[0]}
                            {client.lastName[0]}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                                {client.firstName} {client.lastName}
                            </h1>
                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mt-1">
                                <span className="flex items-center gap-1 text-sm">
                                    <span className="material-symbols-outlined text-sm">location_on</span> {client.city}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                                <span className="text-sm">ID: {client.id}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
                        >
                            <span className="material-symbols-outlined">edit</span>
                            Edytuj Dane
                        </button>
                        <button
                            onClick={handleNewProject}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            Nowy Projekt
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Contact Info Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-1 h-fit">
                        <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined">contact_page</span>
                            Dane kontaktowe
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-gray-400 mt-1">call</span>
                                <div>
                                    <p className="text-xs text-gray-500">Telefon</p>
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{client.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-gray-400 mt-1">mail</span>
                                <div>
                                    <p className="text-xs text-gray-500">E-mail</p>
                                    <p className="font-medium text-gray-800 dark:text-gray-200 break-all">{client.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-gray-400 mt-1">home</span>
                                <div>
                                    <p className="text-xs text-gray-500">Adres</p>
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{client.address}</p>
                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                        {client.zipCode} {client.city}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Projects List */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2">
                        <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined">folder</span>
                            Historia Projektów
                        </h2>

                        {clientProjects.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                <p className="text-gray-500 mb-2">Brak projektów dla tego klienta</p>
                                <button onClick={handleNewProject} className="text-primary font-bold text-sm hover:underline">
                                    Utwórz pierwszy projekt
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {clientProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                                                style={{ backgroundColor: project.color ? `${project.color}30` : "#ccc", color: project.color }}
                                            >
                                                {project.name[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-primary transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {project.startDate || "Brak daty"} — {project.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-800 dark:text-white">{project.value.toLocaleString()} zł</p>
                                            <span className="material-symbols-outlined text-gray-300 group-hover:text-primary">arrow_forward</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edytuj Klienta</h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Imię</span>
                                    <input
                                        className="form-input rounded-lg dark:bg-slate-800"
                                        value={editForm.firstName || ""}
                                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Nazwisko</span>
                                    <input
                                        className="form-input rounded-lg dark:bg-slate-800"
                                        value={editForm.lastName || ""}
                                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                    />
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Telefon</span>
                                    <input
                                        className="form-input rounded-lg dark:bg-slate-800"
                                        type="tel"
                                        value={editForm.phone || ""}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Email</span>
                                    <input
                                        className="form-input rounded-lg dark:bg-slate-800"
                                        type="email"
                                        value={editForm.email || ""}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </label>
                            </div>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500 uppercase">Ulica i numer</span>
                                <input
                                    className="form-input rounded-lg dark:bg-slate-800"
                                    value={editForm.address || ""}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                />
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Miasto</span>
                                    <input
                                        className="form-input rounded-lg dark:bg-slate-800"
                                        value={editForm.city || ""}
                                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Kod pocztowy</span>
                                    <input
                                        className="form-input rounded-lg dark:bg-slate-800"
                                        value={editForm.zipCode || ""}
                                        onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                                    />
                                </label>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                    Anuluj
                                </button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">
                                    Zapisz Zmiany
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDetails;
