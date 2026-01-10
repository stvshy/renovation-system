import { Room } from "./lib/renovationLogic";

export interface Client {
    id: string;
    user_id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
}

export interface InventoryItem {
    id: string;
    user_id?: string;
    name: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    category?: string;
    minLevel?: number; // Optional: for low stock warnings
}

export interface Project {
    id: string;
    user_id?: string;
    name: string;
    clientName: string;
    clientId: string;
    address: string;
    status: 'In Progress' | 'Archived' | 'Planned' | 'Completed';
    value: number;
    area: number;
    startDate?: string;
    endDate?: string;
    color?: string; // Hex code for calendar
    rooms?: Room[]; // Persisted room data for details view
    clientData?: any; // Snapshot of client data
}

export interface RoomDimensions {
    length: number;
    width: number;
    height: number;
}