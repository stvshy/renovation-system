import { getProjectById, updateProject } from './storage';
import { AdditionalCost, Project } from '../types';
import {
    ConsumptionStrategy,
    ItemCountStrategy,
    LinearStrategy,
    Material,
    Opening,
    RenovationTask,
    Room,
    Surface,
    WasteFactorStrategy,
} from './renovationLogic';
import { getCurrentProjectSnapshot } from './projectDrafts';

const rehydrateRoom = (plainRoom: any): Room => {
    const room = new Room(plainRoom.name);

    if (plainRoom.surfaces && Array.isArray(plainRoom.surfaces)) {
        plainRoom.surfaces.forEach((surfaceRaw: any) => {
            const surface = new Surface(surfaceRaw.name, surfaceRaw.type, surfaceRaw.width, surfaceRaw.height, surfaceRaw.customArea);
            if (surfaceRaw.openings) {
                surfaceRaw.openings.forEach((openingRaw: any) => {
                    surface.addOpening(new Opening(openingRaw.width, openingRaw.height, openingRaw.type));
                });
            }
            room.addSurface(surface);
        });
    }

    if (plainRoom.tasks && Array.isArray(plainRoom.tasks)) {
        plainRoom.tasks.forEach((taskRaw: any) => {
            let strategy;
            if (taskRaw.strategyParams?.wastePercentage !== undefined && taskRaw.material?.unit === 'mb') strategy = new LinearStrategy();
            else if (taskRaw.strategyParams?.wastePercentage !== undefined) strategy = new WasteFactorStrategy();
            else if (
                taskRaw.strategyParams?.itemCount !== undefined ||
                taskRaw.description.includes('Montaż') ||
                (taskRaw.inputDimension % 1 === 0 && taskRaw.inputDimension < 50 && taskRaw.material.unit === 'szt')
            )
                strategy = new ItemCountStrategy();
            else strategy = new ConsumptionStrategy();

            const material = new Material(
                taskRaw.material.name,
                taskRaw.material.unitPrice,
                taskRaw.material.unit,
                taskRaw.material.defaultCoverage,
                taskRaw.material.inventoryId,
                taskRaw.material.category
            );

            const task = new RenovationTask(
                taskRaw.description,
                material,
                taskRaw.laborRate,
                strategy,
                taskRaw.strategyParams,
                taskRaw.inputDimension
            );
            room.addTask(task);
        });
    }

    return room;
};

const calculateProjectTotals = (roomsRaw: any[] | undefined) => {
    if (!Array.isArray(roomsRaw) || roomsRaw.length === 0) {
        return { value: 0, area: 0 };
    }

    const rooms = roomsRaw.map((room) => rehydrateRoom(room));
    return {
        value: rooms.reduce((sum, room) => sum + room.calculateTotalRoomCost(), 0),
        area: rooms.reduce((sum, room) => sum + room.getFloorArea(), 0),
    };
};

const getAdditionalCostsFromClientData = (clientData: any): AdditionalCost[] => {
    const costs = clientData?.projectMeta?.additionalCosts;
    if (!Array.isArray(costs)) return [];
    return costs
        .filter((item) => item && typeof item.amount === 'number' && item.amount >= 0)
        .map((item) => ({
            id: item.id || crypto.randomUUID(),
            amount: Number(item.amount) || 0,
            note: item.note || '',
            createdAt: item.createdAt || new Date().toISOString(),
        }));
};

const sumAdditionalCosts = (costs: AdditionalCost[]) => costs.reduce((sum, item) => sum + item.amount, 0);

export const saveEditedProjectFromSnapshot = async (editProjectId: string) => {
    const snapshot = getCurrentProjectSnapshot();
    if (!snapshot) return false;

    const existingProject = await getProjectById(editProjectId);
    if (!existingProject) throw new Error('Edited project not found');

    const isRoomsStep = snapshot.currentStep === 'room' || snapshot.currentStep === 'services' || snapshot.currentStep === 'offer';
    const nextClientData = snapshot.clientData || existingProject.clientData;
    const additionalCosts = getAdditionalCostsFromClientData(nextClientData);
    const additionalCostsTotal = sumAdditionalCosts(additionalCosts);
    const nextRooms = isRoomsStep && snapshot.rooms ? snapshot.rooms : existingProject.rooms;
    const totals = isRoomsStep ? calculateProjectTotals(nextRooms as any[] | undefined) : null;

    const updatedProject: Project = {
        ...existingProject,
        clientData: nextClientData || existingProject.clientData,
        clientId: nextClientData?.id || existingProject.clientId,
        clientName: nextClientData
            ? `${nextClientData.firstName || ''} ${nextClientData.lastName || ''}`.trim() || existingProject.clientName
            : existingProject.clientName,
        address:
            nextClientData?.address && nextClientData?.city
                ? `${nextClientData.address}, ${nextClientData.city}`
                : existingProject.address,
        startDate: snapshot.projectDates?.startDate || existingProject.startDate,
        endDate: snapshot.projectDates?.endDate || existingProject.endDate,
        rooms: nextRooms,
        value: totals
            ? (totals.value > 0 ? totals.value + additionalCostsTotal : existingProject.value)
            : existingProject.value,
        area: totals ? (totals.area > 0 ? totals.area : existingProject.area) : existingProject.area,
    };

    await updateProject(updatedProject);
    return true;
};