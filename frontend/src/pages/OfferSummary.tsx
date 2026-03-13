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
import { saveProject, deductInventoryFromProject } from "../lib/storage";
import { Project } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { clearProjectCreationDirty, setProjectCreationDirty } from "../lib/projectCreationGuard";
import { clearCurrentProjectSnapshot, deleteProjectDraft, setCurrentProjectSnapshot } from "../lib/projectDrafts";

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

const OfferSummary: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();
    const [isSaving, setIsSaving] = useState(false);
    const draftSnapshot = location.state?.draftSnapshot;
    const draftId = location.state?.draftId || draftSnapshot?.id;

    const currencyCode = language === "en" ? "EUR" : "PLN";
    const localizeUnit = (unit: string) => language === "en" && unit === "szt" ? "pcs" : unit;

    // Data passed from previous steps
    const clientData = location.state?.clientData;
    const projectDates = location.state?.projectDates;

    // Process all rooms from state or fallback to demo
    const rooms: Room[] = useMemo(() => {
        let rawRooms: any[] = [];

        if (location.state?.rooms && Array.isArray(location.state.rooms)) {
            rawRooms = location.state.rooms;
        } else if (location.state?.room) {
            rawRooms = [location.state.room];
        } else {
            return [generateDemoBathroom(language)];
        }

        return rawRooms.map((raw) => rehydrateRoom(raw));
    }, [location.state]);

    useEffect(() => {
        setProjectCreationDirty(Boolean(clientData || projectDates || rooms.length > 0));
    }, [clientData, projectDates, rooms]);

    useEffect(() => {
        if (!clientData && !projectDates && rooms.length === 0) {
            clearCurrentProjectSnapshot();
            return;
        }

        setCurrentProjectSnapshot({
            id: draftId,
            currentStep: "offer",
            updatedAt: new Date().toISOString(),
            clientData,
            projectDates,
            rooms,
        });
    }, [clientData, draftId, projectDates, rooms]);

    const grandTotal = rooms.reduce((sum, room) => sum + room.calculateTotalRoomCost(), 0);
    const totalArea = rooms.reduce((sum, room) => sum + room.getFloorArea(), 0);

    const handleSubmitProject = async () => {
        if (!clientData || !projectDates) {
            alert(t("Brak danych klienta lub dat projektu. Nie można zapisać.", "Missing client data or project dates. Cannot save."));
            return;
        }
        setIsSaving(true);

        const newProject: Project = {
            id: crypto.randomUUID(),
            name: `${t('Remont', 'Renovation')}: ${clientData.lastName}`,
            clientName: `${clientData.firstName} ${clientData.lastName}`,
            clientId: clientData.id,
            address: `${clientData.address}, ${clientData.city}`,
            status: "Planned",
            value: grandTotal,
            area: totalArea,
            startDate: projectDates.startDate,
            endDate: projectDates.endDate,
            rooms: rooms, // Save the full structure
            clientData: clientData,
        };

        // 1. Save Project
        await saveProject(newProject);

        // 2. Deduct Materials from Inventory
        await deductInventoryFromProject(rooms);

        clearProjectCreationDirty();
        clearCurrentProjectSnapshot();
        if (draftId) deleteProjectDraft(draftId);

        setIsSaving(false);
        navigate("/projects");
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="px-2 sm:px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-4 sm:py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between gap-3 sm:gap-4 p-3 sm:p-4 sm:items-center">
                    <div>
                        <p className="text-[#0d141b] dark:text-white text-2xl sm:text-4xl font-black leading-tight tracking-[-0.033em] font-display">{t('Kosztorys Projektu', 'Project Estimate')}</p>
                        {clientData && (
                            <p className="text-sm text-gray-500 mt-1">
                                {t('Klient:', 'Client:')} {clientData.firstName} {clientData.lastName}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex w-full sm:w-auto min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors print:hidden"
                    >
                        <span className="truncate">{t('Drukuj / Pobierz PDF', 'Print / Download PDF')}</span>
                    </button>
                </div>

                {/* Grand Total Card */}
                <div className="p-3 sm:p-4 @container">
                    <div className="flex flex-col items-center justify-center rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white dark:bg-background-dark/50 p-5 sm:p-8 border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-normal leading-normal font-display text-center">{t('Szacowany koszt calkowity', 'Estimated total cost')}</p>
                        <p className="text-accent text-3xl sm:text-6xl font-black leading-tight tracking-[-0.033em] mt-2 font-display text-center break-words">{grandTotal.toFixed(2)} {currencyCode}</p>
                        <p className="text-sm text-gray-400 mt-2 text-center">{t('Robocizna + Materiały (Wszystkie pokoje)', 'Labor + Materials (All rooms)')}</p>
                        {projectDates && (
                            <p className="text-xs text-primary mt-4 font-bold bg-primary/10 px-3 py-1 rounded-full inline-flex flex-wrap items-center justify-center text-center">
                                {t('Realizacja:', 'Execution:')} {projectDates.startDate} — {projectDates.endDate}
                            </p>
                        )}
                    </div>
                </div>

                {/* Iterate over Rooms */}
                {rooms.map((room, roomIndex) => {
                    const roomTotal = room.calculateTotalRoomCost();

                    return (
                        <div key={roomIndex} className="mb-10 animate-fade-in break-inside-avoid">
                            <h2 className="text-[#0d141b] dark:text-white text-xl sm:text-[22px] font-bold leading-tight tracking-[-0.015em] px-3 sm:px-4 pb-3 pt-6 sm:pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display border-b border-gray-200 dark:border-gray-700 mx-2 sm:mx-4">
                                <span className="flex items-center gap-2 min-w-0">
                                    <span className="material-symbols-outlined">meeting_room</span>
                                    <span className="break-words">{room.name}</span>
                                </span>
                                <span className="text-lg text-primary">{roomTotal.toFixed(2)} {currencyCode}</span>
                            </h2>

                            {/* Mobile cards */}
                            <div className="sm:hidden mt-4 bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700 mx-2 overflow-hidden">
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
                                                        <p className="text-right text-green-600 dark:text-green-400">{materialCost.toFixed(2)} {currencyCode}</p>
                                                        <p>{t('Robocizna', 'Labor')}</p>
                                                        <p className="text-right text-blue-600 dark:text-blue-400">{laborCost.toFixed(2)} {currencyCode}</p>
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
                            <div className="hidden sm:block print:block mt-4 bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700 overflow-x-auto mx-2 sm:mx-4">
                                <table className="w-full min-w-[720px] text-sm text-left text-gray-500 dark:text-gray-400 font-display">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-3 sm:px-6 py-3">
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
                                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white break-words">
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
                                                    <td className="px-3 sm:px-6 py-4 text-right text-green-600 dark:text-green-400 whitespace-nowrap">{materialCost.toFixed(2)} {currencyCode}</td>
                                                    <td className="px-3 sm:px-6 py-4 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">{laborCost.toFixed(2)} {currencyCode}</td>
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

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap justify-end gap-3 sm:gap-4 p-4 mt-8 border-t border-gray-200 dark:border-gray-700 print:hidden">
                    <button
                        onClick={() =>
                            navigate("/projects/new/services", {
                                state: {
                                    rooms,
                                    clientData,
                                    projectDates,
                                    draftId,
                                },
                            })
                        }
                        className="flex w-full sm:w-auto min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        <span className="truncate">{t('Wróć do edycji usług', 'Back to services')}</span>
                    </button>
                    <button
                        onClick={handleSubmitProject}
                        disabled={isSaving}
                        className="flex w-full sm:w-auto min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <span className="truncate">{isSaving ? t('Zapisywanie...', 'Saving...') : t('Zatwierdz i Zapisz Projekt', 'Confirm and Save Project')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OfferSummary;
