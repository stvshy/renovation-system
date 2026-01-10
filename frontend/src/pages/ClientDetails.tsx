import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClientById, getProjects } from '../lib/storage';
import { Client, Project } from '../types';

const ClientDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | undefined>(undefined);
    const [clientProjects, setClientProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

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
                    const relevant = allProjects.filter(p => 
                        p.clientId === id || 
                        (p.clientData && p.clientData.email === foundClient.email)
                    );
                    setClientProjects(relevant);
                } else {
                    navigate('/clients');
                }
            }
            setLoading(false);
        };
        load();
    }, [id, navigate]);

    if (loading) return <div>Ładowanie...</div>;
    if (!client) return <div>Nie znaleziono klienta.</div>;

    const handleNewProject = () => {
        // Navigate to project creation but pre-fill client data
        navigate('/projects/new/client', { 
            state: { preSelectedClientId: client.id } 
        });
    };

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="layout-content-container flex flex-col w-full max-w-5xl gap-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
                            {client.firstName[0]}{client.lastName[0]}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                                {client.firstName} {client.lastName}
                            </h1>
                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mt-1">
                                <span className="flex items-center gap-1 text-sm"><span className="material-symbols-outlined text-sm">location_on</span> {client.city}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                                <span className="text-sm">ID: {client.id}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleNewProject}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Nowy Projekt
                    </button>
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
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{client.zipCode} {client.city}</p>
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
                                <button onClick={handleNewProject} className="text-primary font-bold text-sm hover:underline">Utwórz pierwszy projekt</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {clientProjects.map(project => (
                                    <div 
                                        key={project.id}
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div 
                                                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                                                style={{ backgroundColor: project.color ? `${project.color}30` : '#ccc', color: project.color }}
                                            >
                                                {project.name[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-primary transition-colors">{project.name}</h3>
                                                <p className="text-xs text-gray-500">{project.startDate || 'Brak daty'} — {project.status}</p>
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
        </div>
    );
};

export default ClientDetails;