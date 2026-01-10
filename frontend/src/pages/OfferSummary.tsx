import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    generateDemoBathroom, Room, RenovationTask, Material, Unit, 
    ConsumptionStrategy, WasteFactorStrategy, LinearStrategy, ItemCountStrategy, StandardAreaStrategy,
    Surface, Opening 
} from '../lib/renovationLogic';
import { saveProject, deductInventoryFromProject } from '../lib/storage';
import { Project } from '../types';

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
            if (t.strategyParams?.wastePercentage !== undefined && t.material?.unit === 'mb') {
                 strategy = new LinearStrategy();
            } else if (t.strategyParams?.wastePercentage !== undefined) {
                 strategy = new WasteFactorStrategy();
            } else if (t.strategyParams?.itemCount !== undefined || t.description.includes('Montaż') || t.inputDimension % 1 === 0 && t.inputDimension < 50 && t.material.unit === 'szt') {
                 strategy = new ItemCountStrategy();
            } else {
                 strategy = new ConsumptionStrategy();
            }

            const mat = t.material;
            // Restore Inventory ID link and Category
            const material = new Material(mat.name, mat.unitPrice, mat.unit, mat.defaultCoverage, mat.inventoryId, mat.category);
            
            const task = new RenovationTask(
                t.description,
                material,
                t.laborRate,
                strategy,
                t.strategyParams,
                t.inputDimension
            );
            room.addTask(task);
        });
    }

    return room;
};

const OfferSummary: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSaving, setIsSaving] = useState(false);

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
            return [generateDemoBathroom()];
        }

        return rawRooms.map(raw => rehydrateRoom(raw));
    }, [location.state]);

    const grandTotal = rooms.reduce((sum, room) => sum + room.calculateTotalRoomCost(), 0);
    const totalArea = rooms.reduce((sum, room) => sum + room.getFloorArea(), 0);

    const handleSubmitProject = async () => {
        if (!clientData || !projectDates) {
            alert("Brak danych klienta lub dat projektu. Nie można zapisać.");
            return;
        }
        setIsSaving(true);

        const newProject: Project = {
            id: crypto.randomUUID(),
            name: `Remont: ${clientData.lastName}`,
            clientName: `${clientData.firstName} ${clientData.lastName}`,
            clientId: clientData.id, 
            address: `${clientData.address}, ${clientData.city}`,
            status: 'Planned',
            value: grandTotal,
            area: totalArea,
            startDate: projectDates.startDate,
            endDate: projectDates.endDate,
            rooms: rooms, // Save the full structure
            clientData: clientData
        };

        // 1. Save Project
        await saveProject(newProject);
        
        // 2. Deduct Materials from Inventory
        await deductInventoryFromProject(rooms);

        setIsSaving(false);
        navigate('/projects');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                
                {/* Header */}
                <div className="flex flex-wrap justify-between gap-4 p-4 items-center">
                    <div>
                        <p className="text-[#0d141b] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] font-display">
                            Kosztorys Projektu
                        </p>
                        {clientData && (
                             <p className="text-sm text-gray-500 mt-1">Klient: {clientData.firstName} {clientData.lastName}</p>
                        )}
                    </div>
                    <button 
                        onClick={handlePrint}
                        className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors print:hidden"
                    >
                        <span className="truncate">Drukuj / Pobierz PDF</span>
                    </button>
                </div>

                {/* Grand Total Card */}
                <div className="p-4 @container">
                    <div className="flex flex-col items-center justify-center rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white dark:bg-background-dark/50 p-8 border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-normal leading-normal font-display">Szacowany koszt całkowity</p>
                        <p className="text-accent text-6xl font-black leading-tight tracking-[-0.033em] mt-2 font-display">
                            {grandTotal.toFixed(2)} zł
                        </p>
                        <p className="text-sm text-gray-400 mt-2">Robocizna + Materiały (Wszystkie pokoje)</p>
                        {projectDates && (
                            <p className="text-xs text-primary mt-4 font-bold bg-primary/10 px-3 py-1 rounded-full">
                                Realizacja: {projectDates.startDate} — {projectDates.endDate}
                            </p>
                        )}
                    </div>
                </div>

                {/* Iterate over Rooms */}
                {rooms.map((room, roomIndex) => {
                    const roomTotal = room.calculateTotalRoomCost();
                    
                    return (
                        <div key={roomIndex} className="mb-10 animate-fade-in break-inside-avoid">
                            <h2 className="text-[#0d141b] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-8 flex items-center justify-between font-display border-b border-gray-200 dark:border-gray-700 mx-4">
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">meeting_room</span>
                                    {room.name}
                                </span>
                                <span className="text-lg text-primary">{roomTotal.toFixed(2)} zł</span>
                            </h2>
                            
                            {/* Detailed Table for Room */}
                            <div className="mt-4 bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700 overflow-x-auto mx-4">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 font-display">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Opis Zadania</th>
                                            <th scope="col" className="px-6 py-3">Materiał</th>
                                            <th scope="col" className="px-6 py-3 text-right">Ilość</th>
                                            <th scope="col" className="px-6 py-3 text-right">Koszt Mat.</th>
                                            <th scope="col" className="px-6 py-3 text-right">Robocizna</th>
                                            <th scope="col" className="px-6 py-3 text-right">Razem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {room.tasks.map((task: RenovationTask, index: number) => {
                                            const materialCost = task.calculateMaterialCost();
                                            const laborCost = task.calculateLaborCost();
                                            const totalTaskCost = task.calculateTotalCost();
                                            const quantity = task.calculateMaterialQuantity();

                                            return (
                                                <tr key={index} className="bg-white dark:bg-background-dark/50 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                        {task.description}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {task.material.name}
                                                        {task.material.inventoryId && (
                                                            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1 rounded print:hidden">Magazyn</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {quantity.toFixed(2)} {task.material.unit}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">
                                                        {materialCost.toFixed(2)} zł
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-blue-600 dark:text-blue-400">
                                                        {laborCost.toFixed(2)} zł
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                                        {totalTaskCost.toFixed(2)} zł
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {room.tasks.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    Brak zdefiniowanych zadań dla tego pokoju.
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
                <div className="flex flex-wrap justify-end gap-4 p-4 mt-8 border-t border-gray-200 dark:border-gray-700 print:hidden">
                    <button 
                        onClick={() => navigate('/projects/new/services', { 
                            state: { 
                                rooms,
                                clientData,
                                projectDates
                            } 
                        })} 
                        className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        <span className="truncate">Wróć do edycji usług</span>
                    </button>
                    <button 
                        onClick={handleSubmitProject}
                        disabled={isSaving}
                        className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <span className="truncate">{isSaving ? "Zapisywanie..." : "Zatwierdź i Zapisz Projekt"}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OfferSummary;