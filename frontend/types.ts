export interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
}

export interface Material {
    id: string;
    name: string;
    unit: string;
    pricePerUnit: number;
    quantity: number;
    category?: string;
}

export interface Project {
    id: string;
    name: string;
    clientName: string;
    clientId: string;
    address: string;
    status: 'In Progress' | 'Archived' | 'Planned';
    value: number;
    area: number;
    startDate?: string;
    endDate?: string;
}

export interface RoomDimensions {
    length: number;
    width: number;
    height: number;
}

export interface Wall {
    id: string;
    name: string;
    area: number;
    windows: { id: string; width: number; height: number }[];
}

export interface Room {
    id: string;
    name: string;
    dimensions: RoomDimensions;
    walls: Wall[];
    floorArea: number;
    ceilingArea: number;
    totalPaintArea: number;
}