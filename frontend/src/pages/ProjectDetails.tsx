import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProjectById, updateProject } from "../lib/storage";
import { Project } from "../types";
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
} from "../lib/renovationLogic";
import ScrollableSelect from "../components/ScrollableSelect";

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

const ProjectDetails: React.FC = () => {
    const { t, language } = useLanguage();
    const { isDemoMode, demoRevision } = useDemo();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [hydratedRooms, setHydratedRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    // Payment Edit State
    const [isEditingPaid, setIsEditingPaid] = useState(false);
    const [paidInput, setPaidInput] = useState("");

    useEffect(() => {
        const load = async () => {
            if (id) {
                const foundProject = await getProjectById(id);
                if (foundProject) {
                    setProject(foundProject);
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

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="layout-content-container flex flex-col w-full max-w-6xl gap-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <div className="min-w-0 w-full">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white break-words">{project.name}</h1>
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

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
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

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Client Info */}
                    <button
                        type="button"
                        onClick={() => project.clientId && navigate(`/clients/${project.clientId}`)}
                        disabled={!project.clientId}
                        className="flex h-full flex-col items-start justify-start bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-left transition-all hover:shadow-md hover:border-primary/30 disabled:cursor-default disabled:hover:shadow-sm disabled:hover:border-gray-100 dark:disabled:hover:border-gray-700"
                    >
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">person</span>
                            {t('Dane Klienta', 'Client Details')}
                        </h3>
                        {project.clientData ? (
                            <div className="space-y-2">
                                <p className="font-bold text-lg text-gray-800 dark:text-white">{project.clientName}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{project.clientData.phone}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{project.clientData.email}</p>
                                <p className="text-sm text-gray-500 italic mt-2">{project.address}</p>
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('Brak szczegółowych danych klienta', 'No detailed client data')}</p>
                        )}
                    </button>

                    {/* Timeline */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">schedule</span>
                            {t('Termin Realizacji', 'Project Timeline')}
                        </h3>
                        <div className="flex flex-col justify-center h-full pb-6">
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
                                    className="h-full bg-yellow-100 dark:bg-yellow-800 transition-all"
                                    style={{ width: `${remainingPercent}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">{t('Koniec', 'End')}</span>
                                <span className="font-bold text-gray-800 dark:text-white">{project.endDate || "-"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Finances */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">attach_money</span>
                                {t('Finanse', 'Finances')}
                            </h3>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">{t('Wartosc calkowita', 'Total value')}</p>
                                <p className="text-3xl font-black text-primary">{project.value.toLocaleString()} {currencyCode}</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">{t('Powierzchnia:', 'Area:')}</span>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{project.area.toFixed(0)} m²</span>
                            </div>

                            <div className="flex justify-between items-center h-8">
                                <span className="text-xs text-gray-500">{t('Oplacono:', 'Paid:')}</span>
                                {isEditingPaid ? (
                                    <div className="flex items-center gap-1 animate-fade-in">
                                        <input
                                            type="number"
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
                                    <span className="text-xs text-gray-400">{t('Pozostalo:', 'Remaining:')}</span>
                                    <span className="text-xs font-bold text-orange-500">{remainingAmount.toLocaleString()} {currencyCode}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rooms Breakdown */}
                <div className="mt-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('Zakres Prac', 'Scope of Work')}</h2>
                    {hydratedRooms.length === 0 ? (
                        <div className="p-10 text-center bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                            {t('Brak szczegółowych danych o pokojach dla tego projektu.', 'No detailed room data for this project.')}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {hydratedRooms.map((room, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">meeting_room</span>
                                            {room.name}
                                        </h3>
                                        <span className="text-sm font-mono font-bold text-gray-600 dark:text-gray-300">
                                            {room.calculateTotalRoomCost().toFixed(2)} {currencyCode}
                                        </span>
                                    </div>
                                    <div className="p-0 overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 dark:bg-gray-800 dark:text-gray-400">
                                                <tr>
                                                    <th className="px-6 py-2">{t('Zadanie', 'Task')}</th>
                                                    <th className="px-6 py-2">{t('Materiał', 'Material')}</th>
                                                    <th className="px-6 py-2 text-right">{t('Koszt', 'Cost')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {room.tasks.map((task, tIdx) => (
                                                    <tr
                                                        key={tIdx}
                                                        className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                                    >
                                                        <td className="px-6 py-3 font-medium text-gray-900 dark:text-white min-w-[180px]">{task.description}</td>
                                                        <td className="px-6 py-3 min-w-[140px]">{task.material.name}</td>
                                                        <td className="px-6 py-3 text-right">{task.calculateTotalCost().toFixed(2)} {currencyCode}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetails;
