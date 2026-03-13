import { InventoryItem } from "../types";
import { Room } from "./renovationLogic";

export interface MaterialPlanWorkItem {
    roomName: string;
    taskName: string;
    quantity: number;
}

export interface MaterialPlanItem {
    key: string;
    materialName: string;
    unit: string;
    unitPrice: number;
    inventoryId?: string;
    required: number;
    available: number;
    toBuy: number;
    shortageCost: number;
    totalMaterialCost: number;
    workItems: MaterialPlanWorkItem[];
}

export interface MaterialPlanSummary {
    items: MaterialPlanItem[];
    totalRequiredQuantity: number;
    totalShortageQuantity: number;
    totalShortageCost: number;
    totalMaterialCost: number;
}

export const buildMaterialPlan = (rooms: Room[], inventory: InventoryItem[]): MaterialPlanSummary => {
    const bucket = new Map<string, Omit<MaterialPlanItem, "toBuy" | "shortageCost">>();

    rooms.forEach((room) => {
        room.tasks.forEach((task) => {
            const requiredQty = task.calculateMaterialQuantity();
            const inventoryMatch = task.material.inventoryId
                ? inventory.find((item) => item.id === task.material.inventoryId)
                : inventory.find((item) => item.name === task.material.name && item.unit === task.material.unit);
            const key = task.material.inventoryId || `${task.material.name}::${task.material.unit}::${task.material.unitPrice}`;

            const existing = bucket.get(key);
            if (!existing) {
                bucket.set(key, {
                    key,
                    materialName: task.material.name,
                    unit: task.material.unit,
                    unitPrice: task.material.unitPrice,
                    inventoryId: task.material.inventoryId,
                    required: requiredQty,
                    available: inventoryMatch?.quantity ?? 0,
                    totalMaterialCost: task.calculateMaterialCost(),
                    workItems: [{ roomName: room.name, taskName: task.description, quantity: requiredQty }],
                });
                return;
            }

            existing.required += requiredQty;
            existing.totalMaterialCost += task.calculateMaterialCost();
            existing.workItems.push({ roomName: room.name, taskName: task.description, quantity: requiredQty });
        });
    });

    const items = Array.from(bucket.values())
        .map((entry) => {
            const toBuy = Math.max(0, entry.required - entry.available);
            return {
                ...entry,
                toBuy,
                shortageCost: toBuy * entry.unitPrice,
            };
        })
        .sort((a, b) => b.toBuy - a.toBuy || b.shortageCost - a.shortageCost || a.materialName.localeCompare(b.materialName));

    return {
        items,
        totalRequiredQuantity: items.reduce((sum, item) => sum + item.required, 0),
        totalShortageQuantity: items.reduce((sum, item) => sum + item.toBuy, 0),
        totalShortageCost: items.reduce((sum, item) => sum + item.shortageCost, 0),
        totalMaterialCost: items.reduce((sum, item) => sum + item.totalMaterialCost, 0),
    };
};