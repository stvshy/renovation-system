import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROJECTS } from '../constants';

const Projects: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="layout-content-container flex flex-col w-full max-w-4xl">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 pb-4 px-2">
                    <div className="flex items-center gap-3 text-slate-900 dark:text-slate-50">
                        <div className="size-8 text-primary">
                            <span className="material-symbols-outlined !text-4xl">home_work</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Projekty</h1>
                    </div>
                    <div className="flex flex-1 justify-end gap-2 sm:gap-4">
                        <label className="flex flex-col min-w-0 max-w-xs w-full sm:w-auto">
                            <div className="flex w-full flex-1 items-stretch rounded-lg h-10">
                                <div className="text-slate-500 dark:text-slate-400 flex border-none bg-slate-100 dark:bg-slate-800 items-center justify-center pl-3 rounded-l-lg border-r-0">
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none bg-slate-100 dark:bg-slate-800 h-full placeholder:text-slate-500 dark:placeholder:text-slate-400 px-3 text-base font-normal leading-normal" placeholder="Szukaj" />
                            </div>
                        </label>
                        <button 
                            onClick={() => navigate('/projects/new/client')}
                            className="flex min-w-[120px] items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-slate-50 text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-colors"
                        >
                            <span className="truncate">Nowy Projekt</span>
                        </button>
                    </div>
                </header>
                
                <div className="flex px-2 py-4">
                    <div className="flex h-10 flex-1 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                        <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-white dark:has-[:checked]:bg-slate-700 has-[:checked]:shadow-sm has-[:checked]:text-slate-900 dark:has-[:checked]:text-slate-50 text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal transition-all duration-200">
                            <span className="truncate">W trakcie realizacji</span>
                            <input defaultChecked className="invisible w-0" name="status-toggle" type="radio" value="In Progress" />
                        </label>
                        <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-white dark:has-[:checked]:bg-slate-700 has-[:checked]:shadow-sm has-[:checked]:text-slate-900 dark:has-[:checked]:text-slate-50 text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal transition-all duration-200">
                            <span className="truncate">Zarchiwizowane</span>
                            <input className="invisible w-0" name="status-toggle" type="radio" value="Archived" />
                        </label>
                    </div>
                </div>

                <div className="flex flex-col gap-4 px-2">
                    {MOCK_PROJECTS.map((project) => (
                        <div key={project.id} onClick={() => navigate('/projects/new/room')} className="cursor-pointer flex items-center gap-4 bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 size-12">
                                <span className="material-symbols-outlined">
                                    {project.name.toLowerCase().includes('malowanie') ? 'format_paint' : 
                                     project.name.toLowerCase().includes('kuchni') ? 'kitchen' : 'layers'}
                                </span>
                            </div>
                            <div className="flex flex-col justify-center flex-grow">
                                <p className="text-slate-900 dark:text-slate-50 text-base font-semibold leading-normal line-clamp-1">{project.name}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal line-clamp-2">
                                    {project.value.toLocaleString()} PLN | {project.area} m² | {project.address}
                                </p>
                            </div>
                            <div className="shrink-0 group relative">
                                <button className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary flex size-8 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                                    <span className="material-symbols-outlined">person</span>
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-focus-within:pointer-events-auto group-hover:pointer-events-auto z-10 border border-slate-100 dark:border-slate-700">
                                    <p className="font-semibold text-slate-900 dark:text-slate-50">{project.clientName}</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">+48 123 456 789</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Projects;