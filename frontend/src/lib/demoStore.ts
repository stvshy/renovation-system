import type { Project, Client, InventoryItem } from '../types';
import type { ServiceTemplate } from './renovationLogic';
import { DEFAULT_SERVICE_CATALOG } from './renovationLogic';

// ---------- Default snapshot (never mutated) ----------

const DEMO_CLIENTS_DEFAULT: Client[] = [
    {
        id: 'demo-client-1',
        user_id: 'demo-user',
        firstName: 'Anna',
        lastName: 'Kowalska',
        email: 'anna.kowalska@example.com',
        phone: '+48 601 234 567',
        address: 'ul. Piękna 12/3',
        city: 'Warszawa',
        zipCode: '00-549',
    },
    {
        id: 'demo-client-2',
        user_id: 'demo-user',
        firstName: 'Marek',
        lastName: 'Nowak',
        email: 'marek.nowak@example.com',
        phone: '+48 512 876 543',
        address: 'ul. Słoneczna 45',
        city: 'Kraków',
        zipCode: '30-001',
    },
    {
        id: 'demo-client-3',
        user_id: 'demo-user',
        firstName: 'Katarzyna',
        lastName: 'Wiśniewska',
        email: 'k.wisniewska@example.com',
        phone: '+48 789 456 123',
        address: 'ul. Różana 7',
        city: 'Wrocław',
        zipCode: '50-220',
    },
];

const DEMO_PROJECTS_DEFAULT: Project[] = [
    {
        id: 'demo-project-1',
        user_id: 'demo-user',
        name: 'Remont mieszkania – Mokotów',
        clientName: 'Anna Kowalska',
        clientId: 'demo-client-1',
        address: 'ul. Piękna 12/3, Warszawa',
        status: 'In Progress',
        value: 28500,
        area: 65,
        startDate: '2026-02-10',
        endDate: '2026-04-28',
        color: '#4ECDC4',
    },
    {
        id: 'demo-project-2',
        user_id: 'demo-user',
        name: 'Remont łazienki – Kraków',
        clientName: 'Marek Nowak',
        clientId: 'demo-client-2',
        address: 'ul. Słoneczna 45, Kraków',
        status: 'Planned',
        value: 9800,
        area: 8,
        startDate: '2026-05-01',
        endDate: '2026-05-20',
        color: '#45B7D1',
    },
    {
        id: 'demo-project-3',
        user_id: 'demo-user',
        name: 'Remont salonu i kuchni',
        clientName: 'Katarzyna Wiśniewska',
        clientId: 'demo-client-3',
        address: 'ul. Różana 7, Wrocław',
        status: 'Completed',
        value: 14200,
        area: 42,
        startDate: '2025-11-01',
        endDate: '2026-01-15',
        color: '#98D8C8',
    },
];

const DEMO_INVENTORY_DEFAULT: InventoryItem[] = [
    { id: 'demo-inv-1', user_id: 'demo-user', name: 'Farba Lateksowa Biała (Standard)', quantity: 80, unit: 'l', pricePerUnit: 60, category: 'Malowanie', minLevel: 20 },
    { id: 'demo-inv-2', user_id: 'demo-user', name: 'Panele AC5 Dąb Sonoma', quantity: 150, unit: 'm²', pricePerUnit: 85, category: 'Podłogi', minLevel: 30 },
    { id: 'demo-inv-3', user_id: 'demo-user', name: 'Grunt Głęboko Penetrujący', quantity: 40, unit: 'l', pricePerUnit: 25, category: 'Malowanie', minLevel: 10 },
    { id: 'demo-inv-4', user_id: 'demo-user', name: 'Klej do płytek C2', quantity: 18, unit: 'kg', pricePerUnit: 35, category: 'Glazurnictwo', minLevel: 5 },
    { id: 'demo-inv-5', user_id: 'demo-user', name: 'Gniazdko Podwójne Białe', quantity: 60, unit: 'szt', pricePerUnit: 22, category: 'Elektryka', minLevel: 15 },
    { id: 'demo-inv-6', user_id: 'demo-user', name: 'Listwa MDF Biała 240cm', quantity: 75, unit: 'mb', pricePerUnit: 35, category: 'Podłogi', minLevel: 20 },
    { id: 'demo-inv-7', user_id: 'demo-user', name: 'Gładź Finiszowa Gotowa', quantity: 120, unit: 'kg', pricePerUnit: 5, category: 'Malowanie', minLevel: 30 },
    { id: 'demo-inv-8', user_id: 'demo-user', name: 'Gres 60x60 Jasny Beton', quantity: 45, unit: 'm²', pricePerUnit: 85, category: 'Glazurnictwo', minLevel: 10 },
    { id: 'demo-inv-9', user_id: 'demo-user', name: 'Drzwi Wewnętrzne Białe', quantity: 4, unit: 'szt', pricePerUnit: 450, category: 'Stolarka', minLevel: 2 },
    { id: 'demo-inv-10', user_id: 'demo-user', name: 'Wylewka Szybkowiążąca 25kg', quantity: 15, unit: 'szt', pricePerUnit: 62, category: 'Podłogi', minLevel: 5 },
];

// ---------- Module-level state ----------

let _isDemoMode = false;
let _projects: Project[] = [];
let _clients: Client[] = [];
let _inventory: InventoryItem[] = [];
let _services: ServiceTemplate[] = [];

// ---------- Lifecycle ----------

export function enterDemoMode(): void {
    _isDemoMode = true;
    _projects = DEMO_PROJECTS_DEFAULT.map(p => ({ ...p }));
    _clients = DEMO_CLIENTS_DEFAULT.map(c => ({ ...c }));
    _inventory = DEMO_INVENTORY_DEFAULT.map(i => ({ ...i }));
    _services = DEFAULT_SERVICE_CATALOG.map(s => ({ ...s, materials: s.materials.map(m => ({ ...m })) }));
}

export function exitDemoMode(): void {
    _isDemoMode = false;
    _projects = [];
    _clients = [];
    _inventory = [];
    _services = [];
}

export const isDemoModeActive = (): boolean => _isDemoMode;

// ---------- Projects ----------

export const getDemoProjects = (): Project[] => _projects.map(p => ({ ...p }));

export const getDemoProjectById = (id: string): Project | undefined => {
    const p = _projects.find(p => p.id === id);
    return p ? { ...p } : undefined;
};

export const saveDemoProject = (project: Project): void => {
    const idx = _projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
        _projects[idx] = { ...project };
    } else {
        _projects.push({ ...project });
    }
};

export const updateDemoProject = (project: Project): void => saveDemoProject(project);

export const deleteDemoProject = (id: string): void => {
    _projects = _projects.filter(p => p.id !== id);
};

// ---------- Clients ----------

export const getDemoClients = (): Client[] => _clients.map(c => ({ ...c }));

export const getDemoClientById = (id: string): Client | undefined => {
    const c = _clients.find(c => c.id === id);
    return c ? { ...c } : undefined;
};

export const saveDemoClient = (client: Client): void => {
    const idx = _clients.findIndex(c => c.id === client.id);
    if (idx >= 0) {
        _clients[idx] = { ...client };
    } else {
        _clients.push({ ...client });
    }
};

export const deleteDemoClient = (id: string): void => {
    _clients = _clients.filter(c => c.id !== id);
};

// ---------- Inventory ----------

export const getDemoInventory = (): InventoryItem[] => _inventory.map(i => ({ ...i }));

export const saveDemoInventoryItem = (item: InventoryItem): void => {
    const idx = _inventory.findIndex(i => i.id === item.id);
    if (idx >= 0) {
        _inventory[idx] = { ...item };
    } else {
        _inventory.push({ ...item });
    }
};

export const deleteDemoInventoryItem = (id: string): void => {
    _inventory = _inventory.filter(i => i.id !== id);
};

// ---------- Services ----------

export const getDemoServiceCatalog = (): ServiceTemplate[] => _services.map(s => ({ ...s }));

export const saveDemoServiceTemplate = (template: ServiceTemplate): void => {
    const idx = _services.findIndex(s => s.id === template.id);
    if (idx >= 0) {
        _services[idx] = { ...template };
    } else {
        _services.push({ ...template });
    }
};

export const deleteDemoServiceTemplate = (id: string): void => {
    _services = _services.filter(s => s.id !== id);
};
