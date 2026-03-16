import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../lib/storage';
import { Project } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useDemo } from '../context/DemoContext';
import { deleteProjectDraft, getProjectDrafts, getProjectWizardRoute, ProjectDraft } from '../lib/projectDrafts';

type ProjectListItem =
    | { kind: 'project'; project: Project }
    | { kind: 'draft'; draft: ProjectDraft };

const Projects: React.FC = () => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { isDemoMode, demoRevision } = useDemo();
    const [projects, setProjects] = useState<Project[]>([]);
    const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [isLoading, setIsLoading] = useState(true);
    const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

    const currencyCode = language === 'en' ? 'EUR' : 'PLN';

    useEffect(() => {
        const load = async () => {
            const data = await getProjects();
            setProjects(data);
            setDrafts(await getProjectDrafts());
            setIsLoading(false);
        };
        load();
    }, [isDemoMode, demoRevision]);

    const parseProjectDate = (value?: string) => {
        if (!value) return Number.MAX_SAFE_INTEGER;
        const timestamp = new Date(`${value}T00:00:00`).getTime();
        return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
    };

    const statusPriority: Record<Project['status'], number> = {
        'In Progress': 0,
        Planned: 1,
        Completed: 2,
        Archived: 3,
    };

    const sortProjects = (items: Project[]) =>
        [...items].sort((left, right) => {
            const priorityDiff = statusPriority[left.status] - statusPriority[right.status];
            if (priorityDiff !== 0) return priorityDiff;

            const startDiff = parseProjectDate(left.startDate) - parseProjectDate(right.startDate);
            if (startDiff !== 0) return startDiff;

            return left.name.localeCompare(right.name);
        });

    const filteredProjects = statusFilter === 'All'
        ? sortProjects(projects)
        : sortProjects(projects.filter(p => p.status === statusFilter));

    const sortedDrafts = [...drafts].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

    const visibleItems: ProjectListItem[] = [
        ...filteredProjects.map((project) => ({ kind: 'project' as const, project })),
        ...(statusFilter === 'All' ? sortedDrafts.map((draft) => ({ kind: 'draft' as const, draft })) : []),
    ];

    const getDraftTitle = (draft: ProjectDraft) => {
        const fullName = [draft.clientData?.firstName, draft.clientData?.lastName].filter(Boolean).join(' ').trim();
        if (fullName) return `${t('Wersja robocza', 'Draft')}: ${fullName}`;
        return t('Wersja robocza projektu', 'Project draft');
    };

    const getDraftSubtitle = (draft: ProjectDraft) => {
        const address = [draft.clientData?.address, draft.clientData?.city].filter(Boolean).join(', ');
        const updatedAt = new Date(draft.updatedAt);
        const updatedLabel = Number.isNaN(updatedAt.getTime()) ? draft.updatedAt : updatedAt.toLocaleString(language === 'en' ? 'en-US' : 'pl-PL');
        return `${t('Krok', 'Step')}: ${
            draft.currentStep === 'client'
                ? t('Dane klienta', 'Client details')
                : draft.currentStep === 'room'
                ? t('Pomieszczenia', 'Rooms')
                : draft.currentStep === 'services'
                ? t('Usługi', 'Services')
                : t('Podsumowanie', 'Summary')
        }${address ? ` | ${address}` : ''} | ${t('Zapisano', 'Saved')}: ${updatedLabel}`;
    };

    const handleDraftResume = (draft: ProjectDraft) => {
        navigate(getProjectWizardRoute(draft.currentStep), {
            state: {
                draftId: draft.id,
                draftSnapshot: draft,
            },
        });
    };

    const handleDraftDelete = (draftId: string) => {
        setDraftToDelete(draftId);
    };

    const handleConfirmDraftDelete = async () => {
        if (!draftToDelete) return;
        try {
            await deleteProjectDraft(draftToDelete);
            setDrafts((prev) => prev.filter((draft) => draft.id !== draftToDelete));
            setDraftToDelete(null);
        } catch (error) {
            console.error("Deleting draft failed:", error);
        }
    };

    const statuses = [
        { label: t('Wszystkie', 'All'), value: 'All' },
        { label: t('Planowane', 'Planned'), value: 'Planned' },
        { label: t('W trakcie', 'In Progress'), value: 'In Progress' },
        { label: t('Zakończone', 'Completed'), value: 'Completed' },
        { label: t('Archiwum', 'Archive'), value: 'Archived' }
    ];

    return (
        <>
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8 [scrollbar-gutter:stable]">
            <div className="flex flex-col w-full max-w-7xl mx-auto">
                <header className="flex flex-wrap items-center justify-between gap-4 mb-4 sm:mb-6 px-2">
                    <div className="flex items-center text-slate-900 dark:text-slate-50">
                        <div className="size-8 mr-3 mt-1 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[34px] leading-none">folder</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">{t('Projekty', 'Projects')}</h1>
                    </div>
                    <button
                        onClick={() => navigate('/projects/new/client')}
                        className="flex w-full sm:w-auto min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-xl h-[46.2px] px-5 bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span className="truncate">{t('Nowy Projekt', 'New Project')}</span>
                    </button>
                </header>
                
                {/* Status Tabs */}
                <div className="flex justify-center py-2 -mx-1 mb-2">
                    <div className="w-full overflow-x-auto rounded-xl">
                    <div className="inline-flex min-w-max h-10 items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mx-auto">
                        {statuses.map((status) => (
                            <label key={status.value} className="flex cursor-pointer h-full items-center justify-center rounded-lg px-[11px] sm:px-4 has-[:checked]:bg-white dark:has-[:checked]:bg-slate-700 has-[:checked]:shadow-sm has-[:checked]:text-slate-900 dark:has-[:checked]:text-slate-50 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium leading-normal transition-all duration-200 whitespace-nowrap">
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

                <div className="flex flex-col gap-4 -mx-[1px]">
                    {isLoading ? (
                        <div className="text-center py-10">{t('Ładowanie projektów...', 'Loading projects...')}</div>
                    ) : visibleItems.length === 0 ? (
                         <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-slate-500 text-base mb-2">{t('Brak projektów w tej kategorii', 'No projects in this category')}</p>
                            {statusFilter === 'All' && (
                                <button onClick={() => navigate('/projects/new/client')} className="text-primary text-sm font-bold hover:underline">{t('Utwórz pierwszy projekt', 'Create your first project')}</button>
                            )}
                         </div>
                    ) : (
                        visibleItems.map((item) => {
                            if (item.kind === 'draft') {
                                const { draft } = item;
                                const draftTitle = getDraftTitle(draft);
                                return (
                                    <div
                                        key={draft.id}
                                        onClick={() => handleDraftResume(draft)}
                                        className="cursor-pointer flex items-center gap-4 bg-slate-100/75 dark:bg-slate-800/35 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-dashed border-slate-300 dark:border-slate-700 opacity-85"
                                    >
                                        <div className="flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-300 shrink-0 size-12 font-bold text-lg bg-slate-200 dark:bg-slate-700/70">
                                            <span className="material-symbols-outlined">draft</span>
                                        </div>
                                        <div className="flex flex-col justify-center flex-grow min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-slate-800 dark:text-slate-100 text-base font-semibold leading-normal line-clamp-1">{draftTitle}</p>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold whitespace-nowrap bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                    {t('Roboczy', 'Draft')}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal line-clamp-2">
                                                {getDraftSubtitle(draft)}
                                            </p>
                                        </div>
                                        <div className="shrink-0 group relative hidden sm:flex items-center gap-1">
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleDraftDelete(draft.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 flex size-8 items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors mt-[0.2px]"
                                                title={t('Usuń wersję roboczą', 'Delete draft')}
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                            <button className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary flex size-8 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                                                <span className="material-symbols-outlined">edit</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            const { project } = item;
                            return (
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
                            );
                        })
                    )}
                </div>
            </div>
        </div>

        {draftToDelete &&
            createPortal(
                <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-[26rem] sm:max-w-2xl rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                        <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-gray-100 dark:border-slate-800">
                            <h3 className="text-[18px] sm:text-[24px] font-black text-gray-900 dark:text-white leading-tight">
                                {t('Usunąć wersję roboczą?', 'Delete draft?')}
                            </h3>
                            <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-slate-400 leading-relaxed">
                                {t(
                                    'Ta wersja robocza zostanie trwale usunięta z listy projektów. Tej operacji nie można cofnąć.',
                                    'This draft will be permanently removed from the project list. This action cannot be undone.'
                                )}
                            </p>
                        </div>

                        <div className="px-5 sm:px-7 py-5 sm:py-6 flex items-center justify-between gap-3 sm:gap-4">
                            <button
                                type="button"
                                onClick={() => setDraftToDelete(null)}
                                className="h-12 px-3 sm:px-4 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-sm sm:text-base font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 sm:gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">arrow_back</span>
                                <span className="sm:hidden">{t('Wróć', 'Back')}</span>
                                <span className="hidden sm:inline">{t('Anuluj', 'Cancel')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmDraftDelete}
                                className="h-12 px-3 sm:px-4 rounded-xl font-semibold text-sm sm:text-base text-white bg-red-600 hover:bg-red-700 inline-flex items-center gap-1.5 sm:gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">delete</span>
                                <span className="sm:hidden">{t('Usuń', 'Delete')}</span>
                                <span className="hidden sm:inline">{t('Usuń wersję roboczą', 'Delete draft')}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default Projects;