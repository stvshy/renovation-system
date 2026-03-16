import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { deleteProject, getInventory, getProjectById, getProjects, saveClient, updateProject } from "../lib/storage";
import { AdditionalCost, Client, InventoryItem, Project, ProjectNote } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { useDemo } from "../context/DemoContext";
import {
    RenovationTask,
    Room,
    Surface,
    Opening,
    ConsumptionStrategy,
    WasteFactorStrategy,
    LinearStrategy,
    ItemCountStrategy,
    Material,
    SurfaceType,
} from "../lib/renovationLogic";
import ScrollableSelect from "../components/ScrollableSelect";
import { buildMaterialPlan } from "../lib/materialPlanning";

// Helper to rehydrate rooms (same as in OfferSummary)
const rehydrateRoom = (plainRoom: any): Room => {
    const room = new Room(plainRoom.name);

    if (plainRoom.surfaces && Array.isArray(plainRoom.surfaces)) {
        plainRoom.surfaces.forEach((s: any) => {
            const surface = new Surface(s.name, s.type, s.width, s.height, s.customArea);
            if (s.openings) {
                s.openings.forEach((o: any) => surface.addOpening(new Opening(o.width, o.height, o.type)));
            }
            room.addSurface(surface);
        });
    }

    if (plainRoom.tasks && Array.isArray(plainRoom.tasks)) {
        plainRoom.tasks.forEach((t: any) => {
            let strategy;
            if (t.strategyParams?.wastePercentage !== undefined && t.material?.unit === "mb") strategy = new LinearStrategy();
            else if (t.strategyParams?.wastePercentage !== undefined) strategy = new WasteFactorStrategy();
            else if (
                t.strategyParams?.itemCount !== undefined ||
                t.description.includes("Montaż") ||
                (t.inputDimension % 1 === 0 && t.inputDimension < 50 && t.material.unit === "szt")
            )
                strategy = new ItemCountStrategy();
            else strategy = new ConsumptionStrategy();

            // Rehydrate material with inventoryId and category
            const material = new Material(
                t.material.name,
                t.material.unitPrice,
                t.material.unit,
                t.material.defaultCoverage,
                t.material.inventoryId,
                t.material.category
            );

            const task = new RenovationTask(t.description, material, t.laborRate, strategy, t.strategyParams, t.inputDimension);
            room.addTask(task);
        });
    }
    return room;
};

const getAdditionalCostsFromClientData = (clientData: any): AdditionalCost[] => {
    const costs = clientData?.projectMeta?.additionalCosts;
    if (!Array.isArray(costs)) return [];

    const buildDeterministicAdditionalCostId = (entry: any, index: number) => {
        const createdAt = entry?.createdAt || "legacy";
        const note = entry?.note || "";
        const amount = Number(entry?.amount) || 0;
        return `legacy-${createdAt}-${amount}-${note}-${index}`;
    };

    return costs
        .filter((entry) => entry && typeof entry.amount === "number" && entry.amount >= 0)
        .map((entry, index) => ({
            id: entry.id || buildDeterministicAdditionalCostId(entry, index),
            amount: Number(entry.amount) || 0,
            note: entry.note || "",
            createdAt: entry.createdAt || new Date().toISOString(),
        }));
};

const withProjectMetaAdditionalCosts = (clientData: any, additionalCosts: AdditionalCost[]) => ({
    ...(clientData || {}),
    projectMeta: {
        ...(clientData?.projectMeta || {}),
        additionalCosts,
    },
});

const sumAdditionalCosts = (costs: AdditionalCost[]) => costs.reduce((sum, item) => sum + item.amount, 0);

const getProjectNotes = (project: Project | null): ProjectNote[] => {
    if (!Array.isArray(project?.notes)) return [];
    return project.notes
        .filter((entry) => entry && typeof entry.content === "string")
        .map((entry) => ({
            id: entry.id || crypto.randomUUID(),
            content: entry.content.trim(),
            createdAt: entry.createdAt || new Date().toISOString(),
        }))
        .filter((entry) => entry.content.length > 0)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const ProjectDetails: React.FC = () => {
    const { t, language } = useLanguage();
    const { isDemoMode, demoRevision } = useDemo();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [hydratedRooms, setHydratedRooms] = useState<Room[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [clientProjectCount, setClientProjectCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Payment Edit State
    const [isEditingPaid, setIsEditingPaid] = useState(false);
    const [paidInput, setPaidInput] = useState("");
    const [isEditingNameModalOpen, setIsEditingNameModalOpen] = useState(false);
    const [projectNameInput, setProjectNameInput] = useState("");
    const [isEditingClientModalOpen, setIsEditingClientModalOpen] = useState(false);
    const [clientEditForm, setClientEditForm] = useState<Partial<Client>>({});
    const [isEditingTimelineModalOpen, setIsEditingTimelineModalOpen] = useState(false);
    const [timelineForm, setTimelineForm] = useState<{ startDate: string; endDate: string }>({ startDate: "", endDate: "" });
    const [isAddingExtraCostModalOpen, setIsAddingExtraCostModalOpen] = useState(false);
    const [extraCostForm, setExtraCostForm] = useState<{ amount: string; note: string }>({ amount: "", note: "" });
    const [isAdditionalCostsPanelOpen, setIsAdditionalCostsPanelOpen] = useState(false);
    const [additionalCostEdits, setAdditionalCostEdits] = useState<Record<string, { amount: string; note: string }>>({});
    const [newProjectNoteInput, setNewProjectNoteInput] = useState("");
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteContent, setEditingNoteContent] = useState("");
    const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (id) {
                const [foundProject, inventoryItems, allProjects] = await Promise.all([getProjectById(id), getInventory(), getProjects()]);
                if (foundProject) {
                    setProject(foundProject);
                    setInventory(inventoryItems);
                    const projectCount = allProjects.filter((entry) => {
                        if (foundProject.clientId && entry.clientId === foundProject.clientId) return true;
                        if (foundProject.clientData?.email && entry.clientData?.email === foundProject.clientData.email) return true;
                        return false;
                    }).length;
                    setClientProjectCount(projectCount);
                    if (foundProject.rooms) {
                        setHydratedRooms(foundProject.rooms.map((r) => rehydrateRoom(r)));
                    }
                } else {
                    navigate("/projects");
                }
            }
            setLoading(false);
        };
        load();
    }, [id, navigate, isDemoMode, demoRevision]);

    useEffect(() => {
        if (!isEditingNameModalOpen || !project) return;
        setProjectNameInput(project.name || "");
    }, [isEditingNameModalOpen, project]);

    useEffect(() => {
        if (!isEditingClientModalOpen || !project?.clientData) return;
        setClientEditForm({ ...project.clientData });
    }, [isEditingClientModalOpen, project?.clientData]);

    useEffect(() => {
        if (!isEditingTimelineModalOpen || !project) return;
        setTimelineForm({
            startDate: project.startDate || "",
            endDate: project.endDate || "",
        });
    }, [isEditingTimelineModalOpen, project]);

    const handleStatusChange = async (newStatus: Project["status"]) => {
        if (project) {
            const updated = { ...project, status: newStatus };
            await updateProject(updated);
            setProject(updated);
        }
    };

    const handleEditPaidClick = () => {
        if (project) {
            setPaidInput((project.paidAmount || 0).toString());
            setIsEditingPaid(true);
        }
    };

    const handleSavePaidAmount = async () => {
        if (project) {
            const amount = parseFloat(paidInput);
            if (!isNaN(amount) && amount >= 0) {
                const updated = { ...project, paidAmount: amount };
                await updateProject(updated);
                setProject(updated);
                setIsEditingPaid(false);
            }
        }
    };

    const unitLabel = (unit: string) => (language === "en" && unit === "szt" ? "pcs" : unit);

    const additionalCosts = useMemo(() => getAdditionalCostsFromClientData(project?.clientData), [project?.clientData]);
    const additionalCostsTotal = useMemo(() => sumAdditionalCosts(additionalCosts), [additionalCosts]);
    const projectNotes = useMemo(() => getProjectNotes(project), [project]);

    useEffect(() => {
        if (!isAdditionalCostsPanelOpen) return;
        const initialEdits: Record<string, { amount: string; note: string }> = {};
        additionalCosts.forEach((cost) => {
            initialEdits[cost.id] = {
                amount: String(cost.amount),
                note: cost.note,
            };
        });
        setAdditionalCostEdits(initialEdits);
    }, [additionalCosts, isAdditionalCostsPanelOpen]);

    const materialPlan = buildMaterialPlan(hydratedRooms, inventory);
    const materialSummary = materialPlan.items;
    const totalShoppingCost = materialPlan.totalShortageCost;

    const editSessionDraftId = useMemo(() => {
        if (!project?.id) return "";
        return `edit-${project.id}-${Date.now()}`;
    }, [project?.id]);

    if (loading) return <div>{t('Ładowanie...', 'Loading...')}</div>;
    if (!project) return <div>{t('Projekt nie znaleziony.', 'Project not found.')}</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Planned":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
            case "In Progress":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
            case "Completed":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            case "Archived":
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const paidAmount = project.paidAmount || 0;
    const remainingAmount = project.value - paidAmount;
    const currencyCode = language === "en" ? "EUR" : "PLN";

    const baseWizardState = {
        draftId: editSessionDraftId,
        clientData: project.clientData,
        projectDates: {
            startDate: project.startDate || "",
            endDate: project.endDate || "",
        },
        rooms: project.rooms || [],
        editProjectId: project.id,
        editProjectMeta: {
            id: project.id,
            name: project.name,
            status: project.status,
            color: project.color,
            paidAmount: project.paidAmount,
            user_id: project.user_id,
            additionalCosts,
        },
    };

    const saveProjectUpdate = async (updatedProject: Project) => {
        await updateProject(updatedProject);
        setProject(updatedProject);
        if (updatedProject.rooms) {
            setHydratedRooms(updatedProject.rooms.map((room) => rehydrateRoom(room)));
        }
    };

    const handleSaveProjectName = async () => {
        if (!project) return;
        const nextName = projectNameInput.trim();
        if (!nextName) return;

        const updated = { ...project, name: nextName };
        await saveProjectUpdate(updated);
        setIsEditingNameModalOpen(false);
    };

    const handleSaveClientDetails = async () => {
        if (!project || !project.clientId) return;

        const updatedClient: Client = {
            id: project.clientId,
            firstName: (clientEditForm.firstName || "").trim(),
            lastName: (clientEditForm.lastName || "").trim(),
            email: (clientEditForm.email || "").trim(),
            phone: (clientEditForm.phone || "").trim(),
            address: (clientEditForm.address || "").trim(),
            city: (clientEditForm.city || "").trim(),
            zipCode: (clientEditForm.zipCode || "").trim(),
            user_id: project.user_id,
        };

        await saveClient(updatedClient);

        const nextClientData = withProjectMetaAdditionalCosts(updatedClient, additionalCosts);
        const updatedProject: Project = {
            ...project,
            clientName: `${updatedClient.firstName} ${updatedClient.lastName}`.trim(),
            address: `${updatedClient.address}, ${updatedClient.city}`,
            clientData: nextClientData,
        };

        await saveProjectUpdate(updatedProject);
        setIsEditingClientModalOpen(false);
    };

    const handleSaveTimeline = async () => {
        if (!project) return;
        if (!timelineForm.startDate || !timelineForm.endDate) return;
        if (new Date(timelineForm.endDate) < new Date(timelineForm.startDate)) return;

        const updatedProject: Project = {
            ...project,
            startDate: timelineForm.startDate,
            endDate: timelineForm.endDate,
        };

        await saveProjectUpdate(updatedProject);
        setIsEditingTimelineModalOpen(false);
    };

    const handleAddAdditionalCost = async () => {
        if (!project) return;
        const amount = parseFloat(extraCostForm.amount);
        const note = extraCostForm.note.trim();
        if (isNaN(amount) || amount <= 0 || !note) return;

        const nextAdditionalCosts: AdditionalCost[] = [
            ...additionalCosts,
            {
                id: crypto.randomUUID(),
                amount,
                note,
                createdAt: new Date().toISOString(),
            },
        ];

        const nextClientData = withProjectMetaAdditionalCosts(project.clientData, nextAdditionalCosts);
        const updatedProject: Project = {
            ...project,
            value: project.value + amount,
            clientData: nextClientData,
        };

        await saveProjectUpdate(updatedProject);
        setExtraCostForm({ amount: "", note: "" });
        setIsAddingExtraCostModalOpen(false);
    };

    const handleSaveEditedAdditionalCost = async (costId: string) => {
        if (!project) return;

        const draft = additionalCostEdits[costId];
        if (!draft) return;

        const amount = parseFloat(draft.amount);
        const note = draft.note.trim();
        if (isNaN(amount) || amount <= 0 || !note) return;

        const nextAdditionalCosts = additionalCosts.map((cost) => (cost.id === costId ? { ...cost, amount, note } : cost));
        const baseProjectValue = project.value - additionalCostsTotal;
        const nextTotal = sumAdditionalCosts(nextAdditionalCosts);
        const nextClientData = withProjectMetaAdditionalCosts(project.clientData, nextAdditionalCosts);

        const updatedProject: Project = {
            ...project,
            value: baseProjectValue + nextTotal,
            clientData: nextClientData,
        };

        await saveProjectUpdate(updatedProject);
    };

    const handleDeleteAdditionalCost = async (costId: string) => {
        if (!project) return;

        const nextAdditionalCosts = additionalCosts.filter((cost) => cost.id !== costId);
        const baseProjectValue = project.value - additionalCostsTotal;
        const nextTotal = sumAdditionalCosts(nextAdditionalCosts);
        const nextClientData = withProjectMetaAdditionalCosts(project.clientData, nextAdditionalCosts);

        const updatedProject: Project = {
            ...project,
            value: baseProjectValue + nextTotal,
            clientData: nextClientData,
        };

        await saveProjectUpdate(updatedProject);
    };

    const handleDeleteProject = async () => {
        if (!project) return;
        await deleteProject(project.id);
        setIsDeleteProjectModalOpen(false);
        navigate("/projects");
    };

    const handleAddProjectNote = async () => {
        if (!project) return;
        const content = newProjectNoteInput.trim();
        if (!content) return;

        const nextNotes: ProjectNote[] = [
            {
                id: crypto.randomUUID(),
                content,
                createdAt: new Date().toISOString(),
            },
            ...projectNotes,
        ];

        await saveProjectUpdate({
            ...project,
            notes: nextNotes,
        });
        setNewProjectNoteInput("");
    };

    const handleDeleteProjectNote = async (noteId: string) => {
        if (!project) return;

        const nextNotes = projectNotes.filter((note) => note.id !== noteId);
        await saveProjectUpdate({
            ...project,
            notes: nextNotes,
        });
    };

    const handleStartEditProjectNote = (note: ProjectNote) => {
        setEditingNoteId(note.id);
        setEditingNoteContent(note.content);
    };

    const handleCancelEditProjectNote = () => {
        setEditingNoteId(null);
        setEditingNoteContent("");
    };

    const handleSaveEditedProjectNote = async (noteId: string) => {
        if (!project) return;
        const content = editingNoteContent.trim();
        if (!content) return;

        const nextNotes = projectNotes.map((note) => (note.id === noteId ? { ...note, content } : note));
        await saveProjectUpdate({
            ...project,
            notes: nextNotes,
        });

        setEditingNoteId(null);
        setEditingNoteContent("");
    };

    const handleEditClientStep = () => {
        const draftSnapshot = {
            id: editSessionDraftId,
            currentStep: "client",
            updatedAt: new Date().toISOString(),
            clientData: project.clientData,
            projectDates: {
                startDate: project.startDate || "",
                endDate: project.endDate || "",
            },
            clientForm: {
                mode: project.clientId ? "existing" : "new",
                selectedClientId: project.clientId || "",
                firstName: project.clientData?.firstName || "",
                lastName: project.clientData?.lastName || "",
                address: project.clientData?.address || "",
                city: project.clientData?.city || "",
                zipCode: project.clientData?.zipCode || "",
                phone: project.clientData?.phone || "",
                email: project.clientData?.email || "",
                startDate: project.startDate || "",
                endDate: project.endDate || "",
            },
        };

        navigate("/projects/new/client", {
            state: {
                draftSnapshot,
                draftId: editSessionDraftId,
                preSelectedClientId: project.clientId,
                rooms: project.rooms || [],
                editProjectId: project.id,
                editProjectMeta: baseWizardState.editProjectMeta,
            },
        });
    };

    const handleEditRoomsStep = () => {
        navigate("/projects/new/room", {
            state: {
                ...baseWizardState,
                draftSnapshot: {
                    id: editSessionDraftId,
                    currentStep: "room",
                    updatedAt: new Date().toISOString(),
                    clientData: project.clientData,
                    projectDates: baseWizardState.projectDates,
                    rooms: project.rooms || [],
                },
            },
        });
    };

    const handleEditServicesStep = () => {
        navigate("/projects/new/services", {
            state: {
                ...baseWizardState,
                draftSnapshot: {
                    id: editSessionDraftId,
                    currentStep: "services",
                    updatedAt: new Date().toISOString(),
                    clientData: project.clientData,
                    projectDates: baseWizardState.projectDates,
                    rooms: project.rooms || [],
                },
            },
        });
    };

    const handlePrintProjectSummary = () => {
        navigate("/projects/new/offer", {
            state: {
                ...baseWizardState,
                autoPrint: true,
                draftSnapshot: {
                    id: editSessionDraftId,
                    currentStep: "offer",
                    updatedAt: new Date().toISOString(),
                    clientData: project.clientData,
                    projectDates: baseWizardState.projectDates,
                    rooms: project.rooms || [],
                },
            },
        });
    };

    const parseProjectDate = (value?: string) => {
        if (!value) return null;
        const parsed = new Date(`${value}T00:00:00`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const startDate = parseProjectDate(project.startDate);
    const endDate = parseProjectDate(project.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let elapsedPercent = 0;
    let remainingPercent = 0;

    if (project.status === "Completed") {
        elapsedPercent = 100;
    } else if (startDate && endDate && endDate >= startDate) {
        const totalDuration = Math.max(1, endDate.getTime() - startDate.getTime());

        if (project.status === "Planned" || today < startDate) {
            remainingPercent = 100;
        } else if (today >= endDate) {
            elapsedPercent = 100;
        } else {
            const elapsedDuration = Math.max(0, today.getTime() - startDate.getTime());
            elapsedPercent = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
            remainingPercent = Math.max(0, 100 - elapsedPercent);
        }
    }

    const dayMs = 24 * 60 * 60 * 1000;
    let timelineInfoText = "";
    let timelineInfoClass = "text-slate-600 dark:text-slate-300";
    let timelineInfoIcon = "schedule";

    if (project.status === "Completed") {
        timelineInfoText = t("Projekt zakończony", "Project completed");
        timelineInfoClass = "text-emerald-600 dark:text-emerald-400";
        timelineInfoIcon = "check_circle";
    } else if (project.status === "Planned" && startDate) {
        const daysToStart = Math.ceil((startDate.getTime() - today.getTime()) / dayMs);
        if (daysToStart > 0) {
            timelineInfoText = t(`Do rozpoczęcia: ${daysToStart} dni`, `Starts in ${daysToStart} days`);
        } else if (daysToStart === 0) {
            timelineInfoText = t("Start: dzisiaj", "Start: today");
        } else {
            timelineInfoText = t("Planowany start minął", "Planned start has passed");
        }
        timelineInfoClass = "text-blue-600 dark:text-blue-400";
        timelineInfoIcon = "event_upcoming";
    } else if (project.status === "In Progress" && endDate) {
        const daysToEnd = Math.ceil((endDate.getTime() - today.getTime()) / dayMs);
        if (daysToEnd > 0) {
            timelineInfoText = t(`Do końca: ${daysToEnd} dni`, `${daysToEnd} days left`);
            timelineInfoClass = "text-amber-500 dark:text-amber-400";
            timelineInfoIcon = "timer";
        } else if (daysToEnd === 0) {
            timelineInfoText = t("Koniec: dzisiaj", "Ends today");
            timelineInfoClass = "text-amber-500 dark:text-amber-400";
            timelineInfoIcon = "timer";
        } else {
            timelineInfoText = t(`Po terminie o ${Math.abs(daysToEnd)} dni`, `${Math.abs(daysToEnd)} days overdue`);
            timelineInfoClass = "text-red-600 dark:text-red-400";
            timelineInfoIcon = "warning";
        }
    }

    const formatNoteDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString(language === "en" ? "en-US" : "pl-PL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="layout-content-container flex flex-col w-full max-w-7xl gap-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <div className="min-w-0 w-full">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white break-words">{project.name}</h1>
                            <button
                                type="button"
                                onClick={() => setIsEditingNameModalOpen(true)}
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800"
                                title={t("Edytuj nazwę projektu", "Edit project name")}
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(project.status)}`}>
                                {project.status === "In Progress"
                                    ? t('W trakcie', 'In Progress')
                                    : project.status === "Planned"
                                    ? t('Planowany', 'Planned')
                                    : project.status === "Completed"
                                    ? t('Zakończony', 'Completed')
                                    : project.status}
                            </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-start sm:items-center gap-2 break-words">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {project.address}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={handlePrintProjectSummary}
                            className="inline-flex items-center justify-center w-full sm:w-10 h-10 rounded-lg text-gray-500 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                            title={t('Drukuj podsumowanie projektu', 'Print project summary')}
                            aria-label={t('Drukuj podsumowanie projektu', 'Print project summary')}
                        >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                        </button>
                        <ScrollableSelect
                            value={project.status}
                            onChange={(e) => handleStatusChange(e.target.value as any)}
                            className="form-select w-full sm:w-auto rounded-lg border-gray-300 dark:border-gray-700 dark:bg-slate-800 text-sm py-2 pl-3 pr-8"
                        >
                            <option value="Planned">{t('Planowany', 'Planned')}</option>
                            <option value="In Progress">{t('W trakcie', 'In Progress')}</option>
                            <option value="Completed">{t('Zakończony', 'Completed')}</option>
                            <option value="Archived">{t('Zarchiwizowany', 'Archived')}</option>
                        </ScrollableSelect>
                        <button
                            onClick={() => navigate("/calendar")}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-bold text-sm transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">calendar_month</span>
                            {t('Kalendarz', 'Calendar')}
                        </button>
                    </div>
                </div>

                {/* Step Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-semibold text-blue-500">{t("Krok 1", "Step 1")}</p>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("Dane klienta i terminy", "Client and timeline")}</h3>
                                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                                    {project.clientName} | {project.startDate || "-"} - {project.endDate || "-"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleEditClientStep}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-1.5 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-900/30"
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                                {t("Edytuj", "Edit")}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-slate-900 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-semibold text-green-600 dark:text-green-400">{t("Krok 2", "Step 2")}</p>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("Zakres i pomieszczenia", "Scope and rooms")}</h3>
                                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                                    {t("Liczba pomieszczeń", "Rooms")}: {hydratedRooms.length}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleEditRoomsStep}
                                className="inline-flex items-center gap-1 rounded-lg border border-green-300 dark:border-green-700 px-3 py-1.5 text-sm font-bold text-green-700 dark:text-green-400 hover:bg-green-100/60 dark:hover:bg-green-900/30"
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                                {t("Edytuj", "Edit")}
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide font-semibold text-amber-500">{t("Krok 3", "Step 3")}</p>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("Usługi i materiały", "Services and materials")}</h3>
                                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                                    {t("Pozycje materiałowe", "Material lines")}: {materialSummary.length}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleEditServicesStep}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-sm font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/30"
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                                {t("Edytuj", "Edit")}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Client Info */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">person</span>
                                {t('Dane Klienta', 'Client Details')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsEditingClientModalOpen(true)}
                                className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
                                title={t("Edytuj dane klienta", "Edit client details")}
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                        </div>
                        {project.clientData ? (
                            <div className="flex-1 flex items-center">
                                <button
                                    type="button"
                                    onClick={() => project.clientId && navigate(`/clients/${project.clientId}`)}
                                    disabled={!project.clientId}
                                    className="w-full text-left rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40 disabled:cursor-default"
                                >
                                    <div className="flex flex-col justify-center space-y-2">
                                        <p className="font-bold text-lg text-gray-800 dark:text-white">{project.clientName}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{project.clientData.phone}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{project.clientData.email}</p>
                                        <p className="text-sm text-gray-500 italic mt-2">{project.address}</p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center">
                                <p className="text-gray-500">{t('Brak szczegółowych danych klienta', 'No detailed client data')}</p>
                            </div>
                        )}
                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-[14px] text-gray-500 dark:text-slate-400">
                                {t("Przypisane projekty", "Assigned projects")}: <span className="font-bold text-gray-700 dark:text-slate-200">{clientProjectCount}</span>
                            </p>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">schedule</span>
                                {t('Termin Realizacji', 'Project Timeline')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsEditingTimelineModalOpen(true)}
                                className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
                                title={t("Edytuj terminy", "Edit timeline")}
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-500">{t('Start', 'Start')}</span>
                                <span className="font-bold text-gray-800 dark:text-white">{project.startDate || "-"}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-2 overflow-hidden flex">
                                <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${elapsedPercent}%` }}
                                ></div>
                                <div
                                    className={`h-full transition-all ${project.status === 'Planned' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}
                                    style={{ width: `${remainingPercent}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">{t('Koniec', 'End')}</span>
                                <span className="font-bold text-gray-800 dark:text-white">{project.endDate || "-"}</span>
                            </div>
                        </div>
                        {timelineInfoText && (
                            <div className="mt-auto translate-y-1 pt-4 border-t border-gray-100 dark:border-slate-700">
                                <p className={`text-[14px] font-bold inline-flex items-center gap-1.5 ${timelineInfoClass}`}>
                                    <span className="material-symbols-outlined text-base">{timelineInfoIcon}</span>
                                    {timelineInfoText}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Finances */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">attach_money</span>
                                    {t('Finanse', 'Finances')}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingExtraCostModalOpen(true)}
                                    className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
                                    title={t("Dodaj koszt dodatkowy", "Add additional cost")}
                                >
                                    <span className="material-symbols-outlined text-base">add</span>
                                </button>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">{t('Wartość całkowita', 'Total value')}</p>
                                <p className="text-3xl font-black text-primary">{project.value.toLocaleString()} {currencyCode}</p>
                            </div>
                            {additionalCosts.length > 0 && (
                                <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-amber-200/70 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-900/10 px-2.5 py-1.5">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                        {t("Koszty dodatkowe", "Additional costs")}: +{additionalCostsTotal.toFixed(2)} {currencyCode}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsAdditionalCostsPanelOpen(true)}
                                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
                                    >
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        {t("Podgląd", "Preview")}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">{t('Powierzchnia:', 'Area:')}</span>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{project.area.toFixed(0)} m²</span>
                            </div>

                            <div className="flex justify-between items-center h-8">
                                <span className="text-xs text-gray-500">{t('Opłacono:', 'Paid:')}</span>
                                {isEditingPaid ? (
                                    <div className="flex items-center gap-1 animate-fade-in">
                                        <input
                                            type="number"
                                            min="0"
                                            value={paidInput}
                                            onChange={(e) => setPaidInput(e.target.value)}
                                            className="w-20 py-0 px-1 text-xs h-6 rounded border-gray-300 dark:bg-slate-900 dark:border-gray-600 focus:border-primary focus:ring-0"
                                        />
                                        <button onClick={handleSavePaidAmount} className="text-green-600 hover:text-green-700 dark:text-green-400">
                                            <span className="material-symbols-outlined text-lg">check</span>
                                        </button>
                                        <button onClick={() => setIsEditingPaid(false)} className="text-red-500 hover:text-red-600">
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={handleEditPaidClick}>
                                        <span className="text-xs text-green-600 dark:text-green-400 font-bold">{paidAmount.toLocaleString()} {currencyCode}</span>
                                        <span className="material-symbols-outlined text-[14px] text-gray-300 group-hover:text-primary transition-colors">
                                            edit
                                        </span>
                                    </div>
                                )}
                            </div>

                            {remainingAmount > 0 && (
                                <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-100 dark:border-gray-700">
                                    <span className="text-xs text-gray-400">{t('Pozostało:', 'Remaining:')}</span>
                                    <span className="text-xs font-bold text-amber-500 dark:text-amber-400">{remainingAmount.toLocaleString()} {currencyCode}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rooms Breakdown */}
                <div className="mt-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('Zakres Prac i Ustalenia', 'Scope of Work and Agreements')}</h2>
                        <button
                            type="button"
                            onClick={handleEditRoomsStep}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                            <span className="material-symbols-outlined text-base">edit</span>
                            {t("Edytuj", "Edit")}
                        </button>
                    </div>
                    {hydratedRooms.length === 0 ? (
                        <div className="p-10 text-center bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                            {t('Brak szczegółowych danych o pokojach dla tego projektu.', 'No detailed room data for this project.')}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {hydratedRooms.map((room, idx) => {
                                const wallSurfaces = room.surfaces.filter((surface) => surface.type === SurfaceType.WALL);
                                const floorSurface = room.surfaces.find((surface) => surface.type === SurfaceType.FLOOR);
                                const ceilingSurface = room.surfaces.find((surface) => surface.type === SurfaceType.CEILING);

                                return (
                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-2">
                                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">meeting_room</span>
                                                {room.name}
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                                    {t("Pow.", "Area")}: {room.getFloorArea().toFixed(2)} m²
                                                </span>
                                                <span className="text-sm font-mono font-bold text-primary">
                                                    {room.calculateTotalRoomCost().toFixed(2)} {currencyCode}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 p-5">
                                            <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-4 bg-gray-50/60 dark:bg-slate-900/30">
                                                <h4 className="text-sm uppercase tracking-wide text-gray-500 dark:text-slate-400 font-bold mb-3">
                                                    {t("Wymiary i powierzchnie", "Dimensions and surfaces")}
                                                </h4>
                                                <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                                                    <p>
                                                        {t("Podłoga", "Floor")}: {floorSurface ? `${floorSurface.width} x ${floorSurface.height} m` : "-"}
                                                    </p>
                                                    <p>
                                                        {t("Sufit", "Ceiling")}: {ceilingSurface ? `${ceilingSurface.width} x ${ceilingSurface.height} m` : "-"}
                                                    </p>
                                                    {wallSurfaces.map((surface, wallIndex) => (
                                                        <p key={`${surface.name}-${wallIndex}`}>
                                                            {surface.name}: {surface.width} x {surface.height} m
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-4 bg-gray-50/60 dark:bg-slate-900/30">
                                                <h4 className="text-sm uppercase tracking-wide text-gray-500 dark:text-slate-400 font-bold mb-3">
                                                    {t("Otwory i powierzchnie dodatkowe", "Openings and additional surfaces")}
                                                </h4>
                                                <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                                                    {room.surfaces.some((surface) => surface.openings.length > 0) ? (
                                                        room.surfaces.map((surface) =>
                                                            surface.openings.map((opening, openingIndex) => (
                                                                <p key={`${surface.name}-${openingIndex}`}>
                                                                    {surface.name}: {opening.type === "okno" ? t("Okno", "Window") : t("Drzwi", "Door")} {opening.width} x {opening.height} m
                                                                </p>
                                                            ))
                                                        )
                                                    ) : (
                                                        <p className="text-gray-500 dark:text-slate-400">{t("Brak zdefiniowanych otworów", "No openings defined")}</p>
                                                    )}
                                                    <p className="pt-2 border-t border-dashed border-gray-200 dark:border-slate-700 font-semibold">
                                                        {t("Łączna powierzchnia ścian netto", "Total net wall area")}: {room.getTotalWallArea().toFixed(2)} m²
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-0 overflow-x-auto border-t border-gray-100 dark:border-slate-700">
                                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 dark:bg-gray-800 dark:text-gray-400">
                                                    <tr>
                                                        <th className="px-6 py-2">{t('Praca', 'Work item')}</th>
                                                        <th className="px-6 py-2">{t('Materiał', 'Material')}</th>
                                                        <th className="px-6 py-2 text-right">{t('Ilość', 'Quantity')}</th>
                                                        <th className="px-6 py-2 text-right">{t('Koszt', 'Cost')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {room.tasks.map((task, tIdx) => (
                                                        <tr
                                                            key={tIdx}
                                                            className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                                        >
                                                            <td className="px-6 py-3 font-medium text-gray-900 dark:text-white min-w-[220px]">{task.description}</td>
                                                            <td className="px-6 py-3 min-w-[190px]">{task.material.name}</td>
                                                            <td className="px-6 py-3 text-right whitespace-nowrap">
                                                                {task.calculateMaterialQuantity().toFixed(2)} {unitLabel(task.material.unit)}
                                                            </td>
                                                            <td className="px-6 py-3 text-right whitespace-nowrap">{task.calculateTotalCost().toFixed(2)} {currencyCode}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Materials and Inventory Dashboard */}
                <div className="mt-2">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('Materiały i Magazyn', 'Materials and inventory')}</h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => navigate("/inventory")}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                            >
                                <span className="material-symbols-outlined text-base">warehouse</span>
                                {t("Magazyn", "Inventory")}
                            </button>
                            <button
                                type="button"
                                onClick={handleEditServicesStep}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                                {t("Edytuj", "Edit")}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{t("Pozycje materiałowe", "Material lines")}</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{materialSummary.length}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{t("Materiały do dokupienia", "Items to buy")}</p>
                            <p className="text-2xl font-black text-[rgb(245,159,11)] dark:text-amber-400 mt-1">
                                {materialSummary.filter((item) => item.toBuy > 0).length}
                            </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{t("Łączny koszt zakupu", "Total purchase cost")}</p>
                            <p className={`text-2xl font-black mt-1 ${totalShoppingCost > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {totalShoppingCost.toFixed(2)} {currencyCode}
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <table className="w-full min-w-[900px] text-sm text-left text-gray-600 dark:text-slate-300">
                            <thead className="text-xs uppercase bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3">{t("Materiał", "Material")}</th>
                                    <th className="px-4 py-3">{t("Do jakich prac", "Used for")}</th>
                                    <th className="px-4 py-3 text-right">{t("Potrzebne", "Required")}</th>
                                    <th className="px-4 py-3 text-right">{t("W magazynie", "In stock")}</th>
                                    <th className="px-4 py-3 text-right">{t("Do dokupienia", "To buy")}</th>
                                    <th className="px-4 py-3 text-right">{t("Koszt zakupu", "Purchase cost")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materialSummary.map((material) => (
                                    <tr key={`${material.materialName}-${material.unit}`} className="border-t border-gray-100 dark:border-slate-800 align-top">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-900 dark:text-white">{material.materialName}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">{unitLabel(material.unit)}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                {material.workItems.map((workItem, index) => (
                                                    <p key={`${workItem.roomName}-${index}`} className="text-xs">
                                                        <span className="font-semibold">{workItem.roomName}</span>: {workItem.taskName}
                                                    </p>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">
                                            {material.required.toFixed(2)} {unitLabel(material.unit)}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {material.available.toFixed(2)} {unitLabel(material.unit)}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap font-bold">
                                            <span className={material.toBuy > 0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-500"}>
                                                {material.toBuy.toFixed(2)} {unitLabel(material.unit)}
                                            </span>
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right whitespace-nowrap font-bold ${
                                                material.shortageCost > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                                            }`}
                                        >
                                            {material.shortageCost.toFixed(2)} {currencyCode}
                                        </td>
                                    </tr>
                                ))}
                                {materialSummary.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                                            {t("Brak pozycji materiałowych dla tego projektu.", "No material rows for this project.")}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("Notatki projektowe", "Project notes")}</h2>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                            {t("Liczba notatek", "Total notes")}: {projectNotes.length}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <label className="flex flex-col gap-1">
                            <textarea
                                value={newProjectNoteInput}
                                onChange={(e) => setNewProjectNoteInput(e.target.value)}
                                placeholder={t(
                                    "Wpisz treść notatki.",
                                    "Type your content here."
                                )}
                                className="form-textarea w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-900 min-h-[96px]"
                            />
                        </label>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleAddProjectNote}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                            >
                                <span className="material-symbols-outlined text-base">note_add</span>
                                {t("Dodaj notatkę", "Add note")}
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        {projectNotes.length === 0 && (
                            <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-600 p-4 text-sm text-gray-500 dark:text-slate-400 text-center">
                                {t("Brak notatek dla tego projektu.", "No notes for this project yet.")}
                            </div>
                        )}

                        {projectNotes.map((note) => (
                            <article key={note.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        {editingNoteId === note.id ? (
                                            <textarea
                                                value={editingNoteContent}
                                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                                className="form-textarea w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-900 min-h-[96px]"
                                            />
                                        ) : (
                                            <p className="text-sm text-gray-800 dark:text-slate-100 whitespace-pre-wrap">{note.content}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {editingNoteId === note.id ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveEditedProjectNote(note.id)}
                                                    className="inline-flex items-center justify-center rounded-md p-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                                    title={t("Zapisz notatkę", "Save note")}
                                                >
                                                    <span className="material-symbols-outlined text-base">check</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEditProjectNote}
                                                    className="inline-flex items-center justify-center rounded-md p-1 text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                                    title={t("Anuluj edycję", "Cancel editing")}
                                                >
                                                    <span className="material-symbols-outlined text-base">close</span>
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleStartEditProjectNote(note)}
                                                className="inline-flex items-center justify-center rounded-md p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                title={t("Edytuj notatkę", "Edit note")}
                                            >
                                                <span className="material-symbols-outlined text-base">edit</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteProjectNote(note.id)}
                                            className="inline-flex items-center justify-center rounded-md p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                            title={t("Usuń notatkę", "Delete note")}
                                        >
                                            <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{formatNoteDate(note.createdAt)}</p>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setIsDeleteProjectModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                    >
                        <span className="material-symbols-outlined text-base">delete</span>
                        {t("Usuń projekt", "Delete project")}
                    </button>
                </div>
            </div>

            {isEditingNameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl p-5 space-y-4">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">{t("Edytuj nazwę projektu", "Edit project name")}</h3>
                        <input
                            type="text"
                            value={projectNameInput}
                            onChange={(e) => setProjectNameInput(e.target.value)}
                            className="form-input w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsEditingNameModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-sm font-semibold"
                            >
                                {t("Anuluj", "Cancel")}
                            </button>
                            <button type="button" onClick={handleSaveProjectName} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
                                {t("Zapisz", "Save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditingClientModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t('Edytuj Klienta', 'Edit Client')}</h2>
                            <button
                                onClick={() => setIsEditingClientModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Imię', 'First name')}</span>
                                    <input className="form-input rounded-lg dark:bg-slate-800" value={clientEditForm.firstName || ""} onChange={(e) => setClientEditForm((prev) => ({ ...prev, firstName: e.target.value }))} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Nazwisko', 'Last name')}</span>
                                    <input className="form-input rounded-lg dark:bg-slate-800" value={clientEditForm.lastName || ""} onChange={(e) => setClientEditForm((prev) => ({ ...prev, lastName: e.target.value }))} />
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Telefon', 'Phone')}</span>
                                    <input className="form-input rounded-lg dark:bg-slate-800" type="tel" value={clientEditForm.phone || ""} onChange={(e) => setClientEditForm((prev) => ({ ...prev, phone: e.target.value }))} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Email</span>
                                    <input className="form-input rounded-lg dark:bg-slate-800" type="email" value={clientEditForm.email || ""} onChange={(e) => setClientEditForm((prev) => ({ ...prev, email: e.target.value }))} />
                                </label>
                            </div>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500 uppercase">{t('Ulica i numer', 'Street and number')}</span>
                                <input className="form-input rounded-lg dark:bg-slate-800" value={clientEditForm.address || ""} onChange={(e) => setClientEditForm((prev) => ({ ...prev, address: e.target.value }))} />
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Miasto', 'City')}</span>
                                    <input className="form-input rounded-lg dark:bg-slate-800" value={clientEditForm.city || ""} onChange={(e) => setClientEditForm((prev) => ({ ...prev, city: e.target.value }))} />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Kod pocztowy', 'Postal code')}</span>
                                    <input className="form-input rounded-lg dark:bg-slate-800" value={clientEditForm.zipCode || ""} onChange={(e) => setClientEditForm((prev) => ({ ...prev, zipCode: e.target.value }))} />
                                </label>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsEditingClientModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700">
                                    {t('Anuluj', 'Cancel')}
                                </button>
                                <button type="button" onClick={handleSaveClientDetails} className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">
                                    {t('Zapisz Zmiany', 'Save Changes')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isEditingTimelineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl p-5 space-y-4">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">{t("Edytuj terminy", "Edit timeline")}</h3>
                        <div className="space-y-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500 uppercase">{t("Data rozpoczęcia", "Start date")}</span>
                                <input
                                    type="date"
                                    value={timelineForm.startDate}
                                    onChange={(e) => setTimelineForm((prev) => ({ ...prev, startDate: e.target.value }))}
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500 uppercase">{t("Data zakończenia", "End date")}</span>
                                <input
                                    type="date"
                                    value={timelineForm.endDate}
                                    onChange={(e) => setTimelineForm((prev) => ({ ...prev, endDate: e.target.value }))}
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800"
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsEditingTimelineModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-sm font-semibold">
                                {t("Anuluj", "Cancel")}
                            </button>
                            <button type="button" onClick={handleSaveTimeline} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
                                {t("Zapisz", "Save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAddingExtraCostModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl p-5 space-y-4">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">{t("Dodaj koszt dodatkowy", "Add additional cost")}</h3>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase">{t("Kwota", "Amount")}</span>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    value={extraCostForm.amount}
                                    onChange={(e) => setExtraCostForm((prev) => ({ ...prev, amount: e.target.value }))}
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 pr-16"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-slate-400">{currencyCode}</span>
                            </div>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase">{t("Notatka", "Note")}</span>
                            <textarea
                                value={extraCostForm.note}
                                onChange={(e) => setExtraCostForm((prev) => ({ ...prev, note: e.target.value }))}
                                className="form-textarea w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 min-h-[96px]"
                            />
                        </label>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAddingExtraCostModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-sm font-semibold">
                                {t("Anuluj", "Cancel")}
                            </button>
                            <button type="button" onClick={handleAddAdditionalCost} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
                                {t("Dodaj", "Add")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAdditionalCostsPanelOpen && (
                <div className="fixed inset-0 z-[10051] bg-black/40" onClick={() => setIsAdditionalCostsPanelOpen(false)}>
                    <aside
                        className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 shadow-2xl p-5 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">{t("Koszty dodatkowe", "Additional costs")}</h3>
                            <button
                                type="button"
                                onClick={() => setIsAdditionalCostsPanelOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-slate-300 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                            {t("Suma kosztów dodatkowych", "Additional costs total")}: <span className="font-bold text-red-600 dark:text-red-400">+{additionalCostsTotal.toFixed(2)} {currencyCode}</span>
                        </p>

                        <div className="space-y-4">
                            {additionalCosts.length === 0 && (
                                <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-900/10 p-4 text-sm text-emerald-700 dark:text-emerald-300 text-center">
                                    {t("Brak kosztów dodatkowych.", "No additional costs yet.")}
                                </div>
                            )}

                            {additionalCosts.map((cost) => {
                                const edit = additionalCostEdits[cost.id] || { amount: String(cost.amount), note: cost.note };
                                return (
                                    <div key={cost.id} className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
                                        <label className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{t("Kwota", "Amount")}</span>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={edit.amount}
                                                    onChange={(e) =>
                                                        setAdditionalCostEdits((prev) => ({
                                                            ...prev,
                                                            [cost.id]: { ...edit, amount: e.target.value },
                                                        }))
                                                    }
                                                    className="form-input w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 pr-14"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-slate-400">{currencyCode}</span>
                                            </div>
                                        </label>

                                        <label className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{t("Notatka", "Note")}</span>
                                            <textarea
                                                value={edit.note}
                                                onChange={(e) =>
                                                    setAdditionalCostEdits((prev) => ({
                                                        ...prev,
                                                        [cost.id]: { ...edit, note: e.target.value },
                                                    }))
                                                }
                                                className="form-textarea w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 min-h-[90px]"
                                            />
                                        </label>

                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAdditionalCost(cost.id)}
                                                className="px-3 py-1.5 rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                {t("Usuń", "Delete")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSaveEditedAdditionalCost(cost.id)}
                                                className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold"
                                            >
                                                {t("Zapisz", "Save")}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                </div>
            )}

            {isDeleteProjectModalOpen && (
                <div className="fixed inset-0 z-[10052] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">{t("Usunąć projekt?", "Delete project?")}</h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                                {t(
                                    "Ta operacja jest nieodwracalna. Projekt zniknie z listy projektów i kalendarza.",
                                    "This action cannot be undone. The project will be removed from the project list and calendar."
                                )}
                            </p>
                        </div>
                        <div className="px-5 py-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsDeleteProjectModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-200"
                            >
                                {t("Anuluj", "Cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteProject}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                            >
                                {t("Usuń", "Delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetails;
