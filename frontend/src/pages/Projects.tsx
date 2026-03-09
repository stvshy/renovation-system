import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../lib/storage';
import { Project } from '../types';
import { useLanguage } from '../context/LanguageContext';

const Projects: React.FC = () => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const [projects, setProjects] = useState<Project[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [isLoading, setIsLoading] = useState(true);

    const currencyCode = language === 'en' ? 'EUR' : 'PLN';

    useEffect(() => {
        const load = async () => {
            const data = await getProjects();
            setProjects(data);
            setIsLoading(false);
        };
        load();
    }, []);

    const filteredProjects = statusFilter === 'All' 
        ? projects 
        : projects.filter(p => p.status === statusFilter);

    const statuses = [
        { label: t('Wszystkie', 'All'), value: 'All' },
        { label: t('Planowane', 'Planned'), value: 'Planned' },
        { label: t('W trakcie', 'In Progress'), value: 'In Progress' },
        { label: t('Zakończone', 'Completed'), value: 'Completed' },
        { label: t('Archiwum', 'Archive'), value: 'Archived' }
    ];

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="layout-content-container flex flex-col w-full max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-solid border-slate-200 dark:border-slate-800 pb-4 px-2">
                    <div className="flex items-center text-slate-900 dark:text-slate-50">
                        <div className="size-8 mr-3 mt-1 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[34px] leading-none">folder</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none pt-1 text-gray-900 dark:text-white">{t('Projekty', 'Projects')}</h1>
                    </div>
                    <div className="flex w-full sm:w-auto sm:flex-1 sm:justify-end gap-2 sm:gap-4">
                        <button 
                            onClick={() => navigate('/projects/new/client')}
                            className="flex w-full sm:w-auto min-w-[120px] items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-slate-50 text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg mr-2">add</span>
                            <span className="truncate">{t('Nowy Projekt', 'New Project')}</span>
                        </button>
                    </div>
                </header>
                
                {/* Status Tabs */}
                <div className="flex justify-center px-2 py-4">
                    <div className="w-full max-w-md overflow-x-auto rounded-xl">
                    <div className="inline-flex min-w-max h-10 items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mx-auto">
                        {statuses.map((status) => (
                            <label key={status.value} className="flex cursor-pointer h-full items-center justify-center rounded-lg px-4 has-[:checked]:bg-white dark:has-[:checked]:bg-slate-700 has-[:checked]:shadow-sm has-[:checked]:text-slate-900 dark:has-[:checked]:text-slate-50 text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal transition-all duration-200 whitespace-nowrap">
                                <span className="truncate">{status.label}</span>
                                <input 
                                    className="invisible w-0" 
                                    name="status-toggle" 
                                    type="radio" 
                                    value={status.value}
                                    checked={statusFilter === status.value}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                />
                            </label>
                        ))}
                    </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 px-2">
                    {isLoading ? (
                        <div className="text-center py-10">{t('Ładowanie projektów...', 'Loading projects...')}</div>
                    ) : filteredProjects.length === 0 ? (
                         <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-slate-500 text-base mb-2">{t('Brak projektów w tej kategorii', 'No projects in this category')}</p>
                            {statusFilter === 'All' && (
                                <button onClick={() => navigate('/projects/new/client')} className="text-primary text-sm font-bold hover:underline">{t('Utwórz pierwszy projekt', 'Create your first project')}</button>
                            )}
                         </div>
                    ) : (
                        filteredProjects.map((project) => (
                            <div 
                                key={project.id} 
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className="cursor-pointer flex items-center gap-4 bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-slate-100 dark:border-slate-800"
                            >
                                <div 
                                    className="flex items-center justify-center rounded-lg text-primary shrink-0 size-12 font-bold text-lg"
                                    style={{ backgroundColor: project.color ? `${project.color}30` : '#e0e7ff', color: project.color }}
                                >
                                    {project.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col justify-center flex-grow">
                                    <div className="flex items-center gap-2">
                                        <p className="text-slate-900 dark:text-slate-50 text-base font-semibold leading-normal line-clamp-1">{project.name}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold whitespace-nowrap
                                            ${project.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                              project.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                                              project.status === 'Archived' ? 'bg-gray-100 text-gray-600' :
                                              'bg-blue-100 text-blue-700'}`}
                                        >
                                            {statuses.find(s => s.value === project.status)?.label || project.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal line-clamp-2">
                                        {project.value.toLocaleString()} {currencyCode} | {project.area.toFixed(0)} m² | {project.address}
                                    </p>
                                    {project.startDate && project.endDate && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            {project.startDate} - {project.endDate}
                                        </p>
                                    )}
                                </div>
                                <div className="shrink-0 group relative hidden sm:block">
                                    <button className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary flex size-8 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Projects;