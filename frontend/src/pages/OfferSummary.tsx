import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    generateDemoBathroom,
    Room,
    RenovationTask,
    Material,
    Unit,
    ConsumptionStrategy,
    WasteFactorStrategy,
    LinearStrategy,
    ItemCountStrategy,
    StandardAreaStrategy,
    Surface,
    Opening,
} from "../lib/renovationLogic";
import { saveProject, deductInventoryFromProject, getInventory } from "../lib/storage";
import { AdditionalCost, InventoryItem, Project } from "../types";
import { useLanguage } from "../context/LanguageContext";
import EditWizardExitControl from "../components/EditWizardExitControl";
import { clearProjectCreationDirty, setProjectCreationDirty } from "../lib/projectCreationGuard";
import { clearCurrentProjectSnapshot, deleteProjectDraft, setCurrentProjectSnapshot } from "../lib/projectDrafts";
import { buildMaterialPlan } from "../lib/materialPlanning";
import { saveEditedProjectFromSnapshot } from "../lib/projectWizardSave";

// Helper to restore class methods if data was serialized via state
const rehydrateRoom = (plainRoom: any): Room => {
    const room = new Room(plainRoom.name);

    // Restore surfaces
    if (plainRoom.surfaces && Array.isArray(plainRoom.surfaces)) {
        plainRoom.surfaces.forEach((s: any) => {
            const surface = new Surface(s.name, s.type, s.width, s.height, s.customArea);
            // Restore openings
            if (s.openings && Array.isArray(s.openings)) {
                s.openings.forEach((o: any) => {
                    surface.addOpening(new Opening(o.width, o.height, o.type));
                });
            }
            room.addSurface(surface);
        });
    }

    // Restore existing tasks
    if (plainRoom.tasks && Array.isArray(plainRoom.tasks)) {
        plainRoom.tasks.forEach((t: any) => {
            let strategy;
            if (t.strategyParams?.wastePercentage !== undefined && t.material?.unit === "mb") {
                strategy = new LinearStrategy();
            } else if (t.strategyParams?.wastePercentage !== undefined) {
                strategy = new WasteFactorStrategy();
            } else if (
                t.strategyParams?.itemCount !== undefined ||
                t.description.includes("Montaż") ||
                (t.inputDimension % 1 === 0 && t.inputDimension < 50 && t.material.unit === "szt")
            ) {
                strategy = new ItemCountStrategy();
            } else {
                strategy = new ConsumptionStrategy();
            }

            const mat = t.material;
            // Restore Inventory ID link and Category
            const material = new Material(mat.name, mat.unitPrice, mat.unit, mat.defaultCoverage, mat.inventoryId, mat.category);

            const task = new RenovationTask(t.description, material, t.laborRate, strategy, t.strategyParams, t.inputDimension);
            room.addTask(task);
        });
    }

    return room;
};

const getAdditionalCostsFromSource = (clientData: any, editProjectMeta: any): AdditionalCost[] => {
    const fromClientData = clientData?.projectMeta?.additionalCosts;
    const fromMeta = editProjectMeta?.additionalCosts;
    const source = Array.isArray(fromClientData) ? fromClientData : Array.isArray(fromMeta) ? fromMeta : [];

    const buildDeterministicAdditionalCostId = (item: any, index: number) => {
        const createdAt = item?.createdAt || "legacy";
        const note = item?.note || "";
        const amount = Number(item?.amount) || 0;
        return `legacy-${createdAt}-${amount}-${note}-${index}`;
    };

    return source
        .filter((item) => item && typeof item.amount === "number" && item.amount >= 0)
        .map((item, index) => ({
            id: item.id || buildDeterministicAdditionalCostId(item, index),
            amount: Number(item.amount) || 0,
            note: item.note || "",
            createdAt: item.createdAt || new Date().toISOString(),
        }));
};

const sumAdditionalCosts = (costs: AdditionalCost[]) => costs.reduce((sum, item) => sum + item.amount, 0);

const OfferSummary: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();
    const [isSaving, setIsSaving] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isEditingProjectName, setIsEditingProjectName] = useState(false);
    const [projectNameInput, setProjectNameInput] = useState("");
    const draftSnapshot = location.state?.draftSnapshot;
    const draftId = location.state?.draftId || draftSnapshot?.id;
    const editProjectId = location.state?.editProjectId;
    const editProjectMeta = location.state?.editProjectMeta;
    const autoPrint = Boolean(location.state?.autoPrint);
    const isEditMode = Boolean(editProjectId);

    const currencyCode = language === "en" ? "EUR" : "PLN";
    const localizeUnit = (unit: string) => language === "en" && unit === "szt" ? "pcs" : unit;

    // Data passed from previous steps
    const clientData = location.state?.clientData || draftSnapshot?.clientData;
    const projectDates = location.state?.projectDates || draftSnapshot?.projectDates;
    const additionalCosts = useMemo(() => getAdditionalCostsFromSource(clientData, editProjectMeta), [clientData, editProjectMeta]);
    const additionalCostsTotal = useMemo(() => sumAdditionalCosts(additionalCosts), [additionalCosts]);
    const baseProjectName = editProjectMeta?.name || `${t('Remont', 'Renovation')}: ${clientData?.lastName || "-"}`;
    const effectiveProjectName = (projectNameInput || baseProjectName).trim();
    const clientDataWithProjectMeta = useMemo(
        () => ({
            ...(clientData || {}),
            projectMeta: {
                ...(clientData?.projectMeta || {}),
                additionalCosts,
            },
        }),
        [additionalCosts, clientData]
    );
    const editProjectMetaWithAdditionalCosts = useMemo(
        () => ({
            ...(editProjectMeta || {}),
            name: effectiveProjectName,
            additionalCosts,
        }),
        [additionalCosts, editProjectMeta, effectiveProjectName]
    );

    // Process all rooms from state or fallback to demo
    const rooms: Room[] = useMemo(() => {
        let rawRooms: any[] = [];

        if (location.state?.rooms && Array.isArray(location.state.rooms)) {
            rawRooms = location.state.rooms;
        } else if (draftSnapshot?.rooms && Array.isArray(draftSnapshot.rooms)) {
            rawRooms = draftSnapshot.rooms;
        } else if (location.state?.room) {
            rawRooms = [location.state.room];
        } else {
            return [generateDemoBathroom(language)];
        }

        return rawRooms.map((raw) => rehydrateRoom(raw));
    }, [draftSnapshot?.rooms, language, location.state]);

    useEffect(() => {
        setProjectCreationDirty(Boolean(clientDataWithProjectMeta || projectDates || rooms.length > 0));
    }, [clientDataWithProjectMeta, projectDates, rooms]);

    useEffect(() => {
        if (!clientData && !projectDates && rooms.length === 0) {
            clearCurrentProjectSnapshot();
            return;
        }

        setCurrentProjectSnapshot({
            id: draftId,
            editProjectId: editProjectId || undefined,
            currentStep: "offer",
            updatedAt: new Date().toISOString(),
            clientData: clientDataWithProjectMeta,
            projectDates,
            rooms,
        });
    }, [clientDataWithProjectMeta, draftId, projectDates, rooms]);

    useEffect(() => {
        setProjectNameInput(baseProjectName);
    }, [baseProjectName]);

    useEffect(() => {
        const loadInventory = async () => {
            const inventoryItems = await getInventory();
            setInventory(inventoryItems);
        };

        loadInventory();
    }, []);

    useEffect(() => {
        if (!autoPrint) return;
        const timer = window.setTimeout(() => window.print(), 150);
        return () => window.clearTimeout(timer);
    }, [autoPrint]);

    const grandTotal = rooms.reduce((sum, room) => sum + room.calculateTotalRoomCost(), 0);
    const finalProjectTotal = grandTotal + additionalCostsTotal;
    const totalArea = rooms.reduce((sum, room) => sum + room.getFloorArea(), 0);
    const materialPlan = useMemo(() => buildMaterialPlan(rooms, inventory), [inventory, rooms]);
    const shoppingListItems = materialPlan.items.filter((item) => item.toBuy > 0);

    const handleSubmitProject = async () => {
        if (!clientData || !projectDates) {
            alert(t("Brak danych klienta lub dat projektu. Nie można zapisać.", "Missing client data or project dates. Cannot save."));
            return;
        }
        setIsSaving(true);

        const isEditingExistingProject = Boolean(editProjectId);

        const newProject: Project = {
            id: editProjectId || crypto.randomUUID(),
            name: effectiveProjectName,
            clientName: `${clientData.firstName} ${clientData.lastName}`,
            clientId: clientData.id,
            address: `${clientData.address}, ${clientData.city}`,
            status: editProjectMeta?.status || "Planned",
            value: finalProjectTotal,
            area: totalArea,
            startDate: projectDates.startDate,
            endDate: projectDates.endDate,
            color: editProjectMeta?.color,
            rooms: rooms, // Save the full structure
            clientData: clientDataWithProjectMeta,
            paidAmount: editProjectMeta?.paidAmount,
            user_id: editProjectMeta?.user_id,
        };

        // 1. Save Project
        await saveProject(newProject);

        // Inventory deduction happens only on new project creation.
        if (!isEditingExistingProject) {
            await deductInventoryFromProject(rooms);
        }

        clearProjectCreationDirty();
        clearCurrentProjectSnapshot();
        if (draftId) await deleteProjectDraft(draftId);

        setIsSaving(false);
        navigate("/projects");
    };

    const handlePrint = () => {
        window.print();
    };

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

    return (
        <div className="offer-summary-page px-3 sm:px-4 md:px-10 lg:px-20 print:px-4 flex flex-1 justify-center py-4 sm:py-5 print:py-0 print:block print:overflow-visible print:bg-white">
            <div className="layout-content-container flex flex-col max-w-[1280px] print:max-w-none w-full flex-1 print:block print:overflow-visible print:bg-white">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between gap-3 sm:gap-4 p-2 sm:p-4 sm:items-center">
                    <div>
                        <p className="text-[#0d141b] dark:text-white text-[28px] sm:text-[34px] font-black leading-tight tracking-[-0.033em] font-display">{t('Kosztorys Projektu', 'Project Estimate')}</p>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{effectiveProjectName}</p>
                            <button
                                type="button"
                                onClick={() => setIsEditingProjectName((prev) => !prev)}
                                className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 print:hidden"
                                title={t('Edytuj nazwę projektu', 'Edit project name')}
                            >
                                <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                        </div>
                        {isEditingProjectName && (
                            <div className="mt-2 max-w-md">
                                <input
                                    type="text"
                                    value={projectNameInput}
                                    onChange={(e) => setProjectNameInput(e.target.value)}
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 text-sm"
                                />
                            </div>
                        )}
                        {clientData && (
                            <p className="text-sm text-gray-500 mt-1">
                                {t('Klient:', 'Client:')} <span className="font-semibold text-gray-700 dark:text-slate-200">{clientData.firstName} {clientData.lastName}</span>
                            </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() =>
                                    navigate('/projects/new/client', {
                                        state: {
                                            clientData: clientDataWithProjectMeta,
                                            projectDates,
                                            rooms,
                                            draftId,
                                            editProjectId,
                                            editProjectMeta: editProjectMetaWithAdditionalCosts,
                                        },
                                    })
                                }
                                className="text-[11px] sm:text-[11.9px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 sm:px-[10.3px] py-1 sm:py-[4.4px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 print:hidden"
                            >
                                {t('Krok 1', 'Step 1')}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate('/projects/new/room', {
                                        state: {
                                            rooms,
                                            clientData: clientDataWithProjectMeta,
                                            projectDates,
                                            draftId,
                                            editProjectId,
                                            editProjectMeta: editProjectMetaWithAdditionalCosts,
                                        },
                                    })
                                }
                                className="text-[11px] sm:text-[11.9px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 sm:px-[10.3px] py-1 sm:py-[4.4px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 print:hidden"
                            >
                                {t('Krok 2', 'Step 2')}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate('/projects/new/services', {
                                        state: {
                                            rooms,
                                            clientData: clientDataWithProjectMeta,
                                            projectDates,
                                            draftId,
                                            editProjectId,
                                            editProjectMeta: editProjectMetaWithAdditionalCosts,
                                        },
                                    })
                                }
                                className="text-[11px] sm:text-[11.9px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 sm:px-[10.3px] py-1 sm:py-[4.4px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 print:hidden"
                            >
                                {t('Krok 3', 'Step 3')}
                            </button>
                            <button
                                type="button"
                                className="text-[11px] sm:text-[11.9px] font-bold rounded-lg border border-primary bg-white dark:bg-slate-900 px-2.5 sm:px-[10.3px] py-1 sm:py-[4.4px] text-primary print:hidden"
                            >
                                {t('Krok 4', 'Step 4')}
                            </button>
                        </div>
                    </div>
                    <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2 print:hidden">
                        <EditWizardExitControl visible={isEditMode} onSaveAndExit={handleSaveAndExit} onExitWithoutSaving={handleExitWithoutSaving} />
                        <button
                            onClick={handlePrint}
                            className="flex w-full sm:w-auto min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            <span className="truncate">{t('Drukuj / Pobierz PDF', 'Print / Download PDF')}</span>
                        </button>
                    </div>
                </div>

                {/* Grand Total Card */}
                <div className="px-0 sm:px-4 py-3 sm:py-4 @container print:break-inside-avoid">
                    <div className="print-total-card mx-2 sm:mx-0 flex flex-col items-center justify-center rounded-xl shadow-[0_4px_20px_rgba(17,115,212,0.18)] bg-gradient-to-r from-sky-500 to-dependable-blue p-5 sm:p-8 print:bg-white print:shadow-none print:border print:border-gray-200">
                        <p className="text-white/80 text-sm sm:text-lg font-normal leading-normal font-display text-center print:text-gray-600">{t('Szacowany koszt całkowity', 'Estimated total cost')}</p>
                        <p className="text-white text-[28px] sm:text-6xl font-black leading-tight tracking-[0.03em] mt-2 font-display text-center break-words print-total-amount print:text-primary">{finalProjectTotal.toFixed(2)} {currencyCode}</p>
                        <p className="text-white/70 text-sm mt-2 text-center print:text-gray-500">{t('Robocizna + Materiały + Koszty dodatkowe', 'Labor + Materials + Additional costs')}</p>
                        {projectDates && (
                            <p className="text-xs text-white mt-4 font-bold bg-white/20 px-3 py-1 rounded-full inline-flex flex-wrap items-center justify-center text-center print:bg-primary/10 print:text-primary">
                                {t('Realizacja:', 'Execution:')} {projectDates.startDate} — {projectDates.endDate}
                            </p>
                        )}
                    </div>
                </div>

                <div className="hidden px-3 sm:px-4 mt-2">
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-background-dark/50 shadow-[0_0_10px_rgba(0,0,0,0.08)] overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-black text-[#0d141b] dark:text-white">{t('Lista zakupów', 'Shopping list')}</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t(
                                        'Cały koszt materiałów jest już wliczony w kosztorys. Tu pokazujemy tylko to, czego brakuje w magazynie.',
                                        'The full material cost is already included in the estimate. This section only shows what is missing from inventory.'
                                    )}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-x-12 gap-y-3 sm:gap-x-16 sm:gap-y-5 text-sm">
                                <div>
                                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{t('Pozycje', 'Items')}</p>
                                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">{shoppingListItems.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{t('', 'Purchase cosKoszt zakupówt')}</p>
                                    <p className="text-xl font-black text-red-600 dark:text-red-400">{materialPlan.totalShortageCost.toFixed(2)} {currencyCode}</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm text-left text-gray-600 dark:text-gray-300">
                                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">{t('Materiał', 'Material')}</th>
                                        <th className="px-4 py-3 text-right">{t('Potrzebne', 'Required')}</th>
                                        <th className="px-4 py-3 text-right">{t('W magazynie', 'In stock')}</th>
                                        <th className="px-4 py-3 text-right">{t('Do dokupienia', 'To buy')}</th>
                                        <th className="px-4 py-3 text-right">{t('Koszt zakupu', 'Purchase cost')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shoppingListItems.map((item) => (
                                        <tr key={item.key} className="border-t border-gray-100 dark:border-gray-700">
                                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{item.materialName}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap text-gray-900 dark:text-white">{item.required.toFixed(2)} {localizeUnit(item.unit)}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">{item.available.toFixed(2)} {localizeUnit(item.unit)}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap text-amber-700 dark:text-amber-300 font-bold">{item.toBuy.toFixed(2)} {localizeUnit(item.unit)}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap text-red-600 dark:text-red-400 font-bold">{item.shortageCost.toFixed(2)} {currencyCode}</td>
                                        </tr>
                                    ))}
                                    {shoppingListItems.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-emerald-700 dark:text-emerald-300">
                                                {t('Na ten moment magazyn pokrywa wszystkie materiały z projektu.', 'At the moment inventory covers all materials required by this project.')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Iterate over Rooms */}
                {rooms.map((room, roomIndex) => {
                    const roomTotal = room.calculateTotalRoomCost();

                    return (
                        <div key={roomIndex} className="mt-6 animate-fade-in print:break-inside-avoid print:mt-6">
                            <h2 className="text-[#0d141b] dark:text-white text-xl sm:text-[22px] font-bold leading-tight tracking-[-0.015em] px-3 sm:px-4 pb-3 pt-6 sm:pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display border-b border-gray-200 dark:border-gray-700 mx-2 sm:mx-4">
                                <span className="flex items-center gap-2 min-w-0">
                                    <span className="material-symbols-outlined">meeting_room</span>
                                    <span className="break-words">{room.name}</span>
                                </span>
                                <span className="text-lg text-primary">{roomTotal.toFixed(2)} {currencyCode}</span>
                            </h2>

                            {/* Mobile cards */}
                            <div className="sm:hidden print:hidden mt-4 bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700 mx-2 overflow-hidden">
                                {room.tasks.length > 0 ? (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {room.tasks.map((task: RenovationTask, index: number) => {
                                            const materialCost = task.calculateMaterialCost();
                                            const laborCost = task.calculateLaborCost();
                                            const totalTaskCost = task.calculateTotalCost();
                                            const quantity = task.calculateMaterialQuantity();

                                            return (
                                                <div key={index} className="p-4">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{task.description}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words">
                                                        {task.material.name}
                                                        {task.material.inventoryId && (
                                                            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1 rounded print:hidden">{t('Magazyn', 'Inventory')}</span>
                                                        )}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs text-gray-600 dark:text-gray-300">
                                                        <p>{t('Ilość', 'Quantity')}</p>
                                                        <p className="text-right">{quantity.toFixed(2)} {localizeUnit(task.material.unit)}</p>
                                                        <p>{t('Koszt Mat.', 'Material Cost')}</p>
                                                        <p className="text-right text-amber-600 dark:text-amber-400">{materialCost.toFixed(2)} {currencyCode}</p>
                                                        <p>{t('Robocizna', 'Labor')}</p>
                                                        <p className="text-right text-green-600 dark:text-green-400">{laborCost.toFixed(2)} {currencyCode}</p>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{t('Razem', 'Total')}</p>
                                                        <p className="text-right font-semibold text-gray-900 dark:text-white">{totalTaskCost.toFixed(2)} {currencyCode}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                                        {t('Brak zdefiniowanych zadań dla tego pokoju.', 'No tasks defined for this room.')}
                                    </div>
                                )}
                            </div>

                           {/* Detailed table for tablet/desktop + print */}
                            <div className="hidden sm:block print:block mt-4 bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700 overflow-x-auto print:overflow-visible mx-2 sm:mx-4 print:mx-0 print:shadow-none">
                                <table className="w-full min-w-[720px] print:min-w-0 print:table-fixed text-sm text-left text-gray-500 dark:text-gray-400 font-display">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th
                                                scope="col"
                                                className={`px-3 sm:px-6 py-3 ${language === 'en' ? 'print:w-[19%]' : ''}`}
                                            >
                                                {t('Opis Zadania', 'Task Description')}
                                            </th>
                                            <th scope="col" className="px-3 sm:px-6 py-3">
                                                {t('Materiał', 'Material')}
                                            </th>
                                            <th scope="col" className="px-3 sm:px-6 py-3 text-right">
                                                {t('Ilość', 'Quantity')}
                                            </th>
                                            <th scope="col" className="px-3 sm:px-6 py-3 text-right">
                                                {t('Koszt Mat.', 'Material Cost')}
                                            </th>
                                            <th scope="col" className="px-3 sm:px-6 py-3 text-right">
                                                {t('Robocizna', 'Labor')}
                                            </th>
                                            <th scope="col" className="px-3 sm:px-6 py-3 text-right">
                                                {t('Razem', 'Total')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {room.tasks.map((task: RenovationTask, index: number) => {
                                            const materialCost = task.calculateMaterialCost();
                                            const laborCost = task.calculateLaborCost();
                                            const totalTaskCost = task.calculateTotalCost();
                                            const quantity = task.calculateMaterialQuantity();

                                            return (
                                                <tr
                                                    key={index}
                                                    className="bg-white dark:bg-background-dark/50 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                >
                                                    <td
                                                        className={`px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white break-words ${language === 'en' ? 'print:w-[28%]' : ''}`}
                                                    >
                                                        {task.description}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 break-words">
                                                        {task.material.name}
                                                        {task.material.inventoryId && (
                                                            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1 rounded print:hidden">{t('Magazyn', 'Inventory')}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 text-right whitespace-nowrap">
                                                        {quantity.toFixed(2)} {localizeUnit(task.material.unit)}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 text-right text-amber-600 dark:text-amber-400 print:text-black whitespace-nowrap">{materialCost.toFixed(2)} {currencyCode}</td>
                                                    <td className="px-3 sm:px-6 py-4 text-right text-green-600 dark:text-green-400 print:text-black whitespace-nowrap">{laborCost.toFixed(2)} {currencyCode}</td>
                                                    <td className="px-3 sm:px-6 py-4 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                        {totalTaskCost.toFixed(2)} {currencyCode}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {room.tasks.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-gray-500">
                                                    {t('Brak zdefiniowanych zadań dla tego pokoju.', 'No tasks defined for this room.')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}

                <div className={`px-2 sm:px-4 mt-14 ${additionalCostsTotal <= 0 ? 'print:hidden' : ''} print:break-inside-avoid print:mt-6 print:px-0`}>
                    <div className={`rounded-xl bg-white dark:bg-background-dark/50 overflow-hidden print:shadow-none print:border print:border-gray-300 ${additionalCosts.length === 0 ? 'border border-slate-200 dark:border-slate-700 shadow-[0_0_10px_rgba(0,0,0,0.08)]' : 'border border-rose-200 dark:border-rose-800 shadow-[0_0_10px_rgba(0,0,0,0.08)]'}`}>
                        <div className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:bg-white print:border-b print:border-gray-200 ${additionalCosts.length === 0 ? 'bg-white dark:bg-background-dark/50' : 'border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-900/10'}`}>
                            <div>
                                <h2 className="text-lg font-bold text-[#0d141b] dark:text-white print:text-black">
                                    {t('Koszty dodatkowe', 'Additional costs')}
                                    <span className="hidden sm:inline print:inline">
                                        {" "}
                                        <span className="font-medium">(</span>
                                        <span
                                            className={
                                                additionalCosts.length === 0
                                                    ? "text-gray-600 dark:text-gray-300 print:text-black"
                                                    : "text-amber-600 dark:text-amber-400 print:text-black"
                                            }
                                        >
                                            {additionalCosts.length}
                                        </span>
                                        <span className="font-medium">)</span>
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {additionalCosts.length === 0
                                        ? t('Brak niestandardowych kosztów w ramach projektu.', 'No custom project costs.')
                                        : t('Niestandardowe koszty w ramach projektu. Są już wliczone w koszt całkowity.', 'Custom project costs. They are already included in the total cost.')
                                    }
                                </p>
                            </div>
                            <div className="w-full sm:w-auto sm:ml-auto grid grid-cols-2 sm:grid-cols-1 gap-x-3 text-sm">
                                <div className="text-left sm:hidden">
                                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{t('Pozycje', 'Items')}</p>
                                    <p
                                        className={`font-bold ${
                                            additionalCosts.length === 0
                                                ? 'text-[16.5px] text-gray-600 dark:text-gray-300'
                                                : 'text-[16.5px] text-amber-600 dark:text-amber-400'
                                        }`}
                                    >
                                        {additionalCosts.length === 0 ? '–' : additionalCosts.length}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="sm:hidden print:hidden text-[11px] uppercase text-gray-500 dark:text-gray-400">{t('Suma', 'Total')}</p>
                                    <p
                                        className={`font-bold ${
                                            additionalCosts.length === 0
                                                ? 'text-[16.5px] sm:text-sm text-gray-600 dark:text-gray-300'
                                                : 'text-[16.5px] sm:text-lg text-red-600 dark:text-red-400'
                                        } print:text-lg print:text-primary`}
                                    >
                                        {additionalCosts.length === 0 ? '–' : `+${additionalCostsTotal.toFixed(2)} ${currencyCode}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {additionalCosts.length > 0 && (
                            <div className="p-4 space-y-3">
                                {additionalCosts.map((cost) => (
                                    <div key={cost.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 print:border-gray-300 print:bg-white">
                                        <div className="flex flex-col gap-1 sm:hidden">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white break-words leading-tight print:text-black">
                                                {cost.note}
                                            </p>
                                            <div className="flex items-baseline justify-between gap-2 mt-0.5">
                                                <p className="text-xs leading-tight text-slate-500 dark:text-slate-400 print:text-black">
                                                    {new Date(cost.createdAt).toLocaleDateString(language === "en" ? "en-US" : "pl-PL")}
                                                </p>
                                                <p className="text-sm font-bold text-red-600 dark:text-red-400 leading-tight whitespace-nowrap print:text-black">
                                                    +{cost.amount.toFixed(2)} {currencyCode}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="hidden sm:flex items-start justify-between gap-3">
                                            <div className="space-y-1.5">
                                                <p className="font-bold text-sm text-slate-900 dark:text-white break-words print:text-black">{cost.note}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black">{new Date(cost.createdAt).toLocaleDateString(language === "en" ? "en-US" : "pl-PL")}</p>
                                            </div>
                                            <p className="text-sm font-bold text-red-600 dark:text-red-400 whitespace-nowrap print:text-black">+{cost.amount.toFixed(2)} {currencyCode}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`px-2 sm:px-4 mt-14 print:hidden ${shoppingListItems.length === 0 ? 'print:hidden' : ''} print:break-inside-avoid print:mt-6`}>
                    <div className={`rounded-xl bg-white dark:bg-background-dark/50 overflow-hidden print:shadow-none ${shoppingListItems.length === 0 ? 'border border-slate-200 dark:border-slate-700 shadow-[0_0_10px_rgba(0,0,0,0.08)]' : 'border border-amber-200 dark:border-amber-800 shadow-[0_0_10px_rgba(0,0,0,0.08)]'}`}>
                        <div className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${shoppingListItems.length === 0 ? 'bg-white dark:bg-background-dark/50' : 'border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/10'}`}>
                            <div>
                                <h2 className="text-lg font-bold text-[#0d141b] dark:text-white">
                                    {t('Lista zakupów', 'Shopping list')}
                                    <span className="hidden sm:inline">
                                        {" "}
                                        <span className="font-medium">(</span>
                                        <span
                                            className={
                                                shoppingListItems.length === 0
                                                    ? "text-gray-600 dark:text-gray-300"
                                                    : "text-amber-600 dark:text-amber-400"
                                            }
                                        >
                                            {shoppingListItems.length}
                                        </span>
                                        <span className="font-medium">)</span>
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {shoppingListItems.length === 0
                                        ? t('Magazyn pokrywa wszystkie materiały z projektu.', 'Inventory covers all materials for this project.')
                                        : t('Tych materiałów brakuje w magazynie. Ich koszt jest już wliczony w koszt całkowity.', 'These materials are missing from inventory. Their cost is already included in the total cost.')
                                    }
                                </p>
                            </div>
                            <div className="w-full sm:w-auto sm:ml-auto grid grid-cols-2 sm:grid-cols-1 gap-x-3 text-sm">
                                <div className="text-left sm:hidden">
                                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{t('Pozycje', 'Items')}</p>
                                    <p
                                        className={`font-bold ${
                                            shoppingListItems.length === 0
                                                ? 'text-[16.5px] text-gray-600 dark:text-gray-300'
                                                : 'text-[16.5px] text-amber-600 dark:text-amber-400'
                                        }`}
                                    >
                                        {shoppingListItems.length === 0 ? '–' : shoppingListItems.length}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="sm:hidden text-[11px] uppercase text-gray-500 dark:text-gray-400">{t('Do kupienia', 'To buy')}</p>
                                    <p
                                        className={`font-bold ${
                                            shoppingListItems.length === 0
                                                ? 'text-[16.5px] sm:text-sm text-gray-600 dark:text-gray-300'
                                                : 'text-[16.5px] sm:text-lg text-red-600 dark:text-red-400'
                                        }`}
                                    >
                                        {shoppingListItems.length === 0 ? '–' : `${materialPlan.totalShortageCost.toFixed(2)} ${currencyCode}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {shoppingListItems.length > 0 && (
                        <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full min-w-0 sm:min-w-[720px] print:min-w-0 text-xs sm:text-sm text-left text-gray-600 dark:text-gray-300">
                                <thead className="text-[10px] sm:text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3">{t('Materiał', 'Material')}</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">{t('Potrzebne', 'Required')}</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">{t('W magazynie', 'In stock')}</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">{t('Do dokupienia', 'To buy')}</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">{t('Koszt zakupu', 'Purchase cost')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shoppingListItems.map((item) => (
                                        <tr key={item.key} className="border-t border-gray-100 dark:border-gray-700">
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-gray-900 dark:text-white break-words">{item.materialName}</td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap text-gray-900 dark:text-white">{item.required.toFixed(2)} {localizeUnit(item.unit)}</td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap">{item.available.toFixed(2)} {localizeUnit(item.unit)}</td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap text-amber-700 dark:text-amber-300 font-bold">{item.toBuy.toFixed(2)} {localizeUnit(item.unit)}</td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right whitespace-nowrap text-red-600 dark:text-red-400 font-bold">{item.shortageCost.toFixed(2)} {currencyCode}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-row sm:flex-row sm:flex-wrap items-center justify-between sm:justify-between gap-3 sm:gap-4 px-2 sm:px-4 py-3 sm:py-4 mt-6 sm:mt-8 border-t border-gray-200 dark:border-gray-700 print:hidden">
                    <button
                        onClick={() =>
                            navigate("/projects/new/services", {
                                state: {
                                    rooms,
                                    clientData: clientDataWithProjectMeta,
                                    projectDates,
                                    draftId,
                                    editProjectId,
                                    editProjectMeta: editProjectMetaWithAdditionalCosts,
                                },
                            })
                        }
                        className="flex w-auto sm:w-auto min-w-0 sm:min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-[41.6px] sm:h-[45.6px] px-3 sm:px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <span className="truncate">{t('Wróć do edycji usług', 'Back to services')}</span>
                    </button>
                    <div className="sm:ml-auto">
                        <button
                            onClick={handleSubmitProject}
                            disabled={isSaving}
                            className="flex w-auto sm:w-auto min-w-0 sm:min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-[41.6px] sm:h-[45.6px] px-3 sm:px-4 bg-primary text-white text-xs sm:text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <span className="truncate">
                                {isSaving ? (
                                    t('Zapisywanie...', 'Saving...')
                                ) : (
                                    <>
                                        <span className="sm:hidden">{t('Zatwierdź i Zapisz', 'Confirm & Save')}</span>
                                        <span className="hidden sm:inline">{t('Zatwierdz i Zapisz Projekt', 'Confirm and Save Project')}</span>
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfferSummary;
