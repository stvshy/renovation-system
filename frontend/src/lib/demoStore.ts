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

const DEMO_CLIENTS_EN: Client[] = [
    {
        id: 'demo-client-1',
        user_id: 'demo-user',
        firstName: 'Emily',
        lastName: 'Carter',
        email: 'emily.carter@example.com',
        phone: '+1 206 555 0147',
        address: '128 Pine Street',
        city: 'Seattle',
        zipCode: '98101',
    },
    {
        id: 'demo-client-2',
        user_id: 'demo-user',
        firstName: 'Daniel',
        lastName: 'Brooks',
        email: 'daniel.brooks@example.com',
        phone: '+1 512 555 0182',
        address: '450 Congress Avenue',
        city: 'Austin',
        zipCode: '78701',
    },
    {
        id: 'demo-client-3',
        user_id: 'demo-user',
        firstName: 'Olivia',
        lastName: 'Reed',
        email: 'olivia.reed@example.com',
        phone: '+1 312 555 0199',
        address: '77 Wacker Drive',
        city: 'Chicago',
        zipCode: '60601',
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
    {
        id: 'demo-project-4',
        user_id: 'demo-user',
        name: 'Remont kuchni i jadalni - Żoliborz',
        clientName: 'Anna Kowalska',
        clientId: 'demo-client-1',
        address: 'ul. Mickiewicza 21, Warszawa',
        status: 'In Progress',
        value: 21300,
        area: 38,
        startDate: '2026-02-15',
        endDate: '2026-05-05',
        color: '#FF8A65',
    },
    {
        id: 'demo-project-5',
        user_id: 'demo-user',
        name: 'Remont biura - Praga Południe',
        clientName: 'Marek Nowak',
        clientId: 'demo-client-2',
        address: 'ul. Grochowska 120, Warszawa',
        status: 'Planned',
        value: 32700,
        area: 74,
        startDate: '2026-05-25',
        endDate: '2026-06-25',
        color: '#7986CB',
    },
    {
        id: 'demo-project-6',
        user_id: 'demo-user',
        name: 'Remont łazienki i pralni - Gdańsk',
        clientName: 'Katarzyna Wiśniewska',
        clientId: 'demo-client-3',
        address: 'ul. Chmielna 56, Gdańsk',
        status: 'Planned',
        value: 11900,
        area: 14,
        startDate: '2026-07-02',
        endDate: '2026-07-24',
        color: '#4DB6AC',
    },
];

const DEMO_PROJECTS_EN: Project[] = [
    {
        id: 'demo-project-1',
        user_id: 'demo-user',
        name: 'Apartment Renovation - Downtown Seattle',
        clientName: 'Emily Carter',
        clientId: 'demo-client-1',
        address: '128 Pine Street, Seattle',
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
        name: 'Bathroom Renovation - Central Austin',
        clientName: 'Daniel Brooks',
        clientId: 'demo-client-2',
        address: '450 Congress Avenue, Austin',
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
        name: 'Living Room & Kitchen Renovation',
        clientName: 'Olivia Reed',
        clientId: 'demo-client-3',
        address: '77 Wacker Drive, Chicago',
        status: 'Completed',
        value: 14200,
        area: 42,
        startDate: '2025-11-01',
        endDate: '2026-01-15',
        color: '#98D8C8',
    },
    {
        id: 'demo-project-4',
        user_id: 'demo-user',
        name: 'Kitchen & Dining Renovation - Capitol Hill',
        clientName: 'Emily Carter',
        clientId: 'demo-client-1',
        address: '182 Broadway E, Seattle',
        status: 'In Progress',
        value: 21300,
        area: 38,
        startDate: '2026-02-15',
        endDate: '2026-05-05',
        color: '#FF8A65',
    },
    {
        id: 'demo-project-5',
        user_id: 'demo-user',
        name: 'Office Renovation - South Congress',
        clientName: 'Daniel Brooks',
        clientId: 'demo-client-2',
        address: '118 S Congress Ave, Austin',
        status: 'Planned',
        value: 32700,
        area: 74,
        startDate: '2026-05-25',
        endDate: '2026-06-25',
        color: '#7986CB',
    },
    {
        id: 'demo-project-6',
        user_id: 'demo-user',
        name: 'Laundry & Bathroom Upgrade - West Loop',
        clientName: 'Olivia Reed',
        clientId: 'demo-client-3',
        address: '955 W Madison St, Chicago',
        status: 'Planned',
        value: 11900,
        area: 14,
        startDate: '2026-07-02',
        endDate: '2026-07-24',
        color: '#4DB6AC',
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

const DEMO_INVENTORY_EN: InventoryItem[] = [
    { id: 'demo-inv-1', user_id: 'demo-user', name: 'White Latex Paint (Standard)', quantity: 80, unit: 'l', pricePerUnit: 60, category: 'Malowanie', minLevel: 20 },
    { id: 'demo-inv-2', user_id: 'demo-user', name: 'AC5 Oak Sonoma Panels', quantity: 150, unit: 'm²', pricePerUnit: 85, category: 'Podłogi', minLevel: 30 },
    { id: 'demo-inv-3', user_id: 'demo-user', name: 'Deep Penetrating Primer', quantity: 40, unit: 'l', pricePerUnit: 25, category: 'Malowanie', minLevel: 10 },
    { id: 'demo-inv-4', user_id: 'demo-user', name: 'C2 Tile Adhesive', quantity: 18, unit: 'kg', pricePerUnit: 35, category: 'Glazurnictwo', minLevel: 5 },
    { id: 'demo-inv-5', user_id: 'demo-user', name: 'Double White Socket', quantity: 60, unit: 'szt', pricePerUnit: 22, category: 'Elektryka', minLevel: 15 },
    { id: 'demo-inv-6', user_id: 'demo-user', name: 'White MDF Baseboard 240cm', quantity: 75, unit: 'mb', pricePerUnit: 35, category: 'Podłogi', minLevel: 20 },
    { id: 'demo-inv-7', user_id: 'demo-user', name: 'Ready Finish Filler', quantity: 120, unit: 'kg', pricePerUnit: 5, category: 'Malowanie', minLevel: 30 },
    { id: 'demo-inv-8', user_id: 'demo-user', name: 'Light Concrete Tile 60x60', quantity: 45, unit: 'm²', pricePerUnit: 85, category: 'Glazurnictwo', minLevel: 10 },
    { id: 'demo-inv-9', user_id: 'demo-user', name: 'White Interior Door', quantity: 4, unit: 'szt', pricePerUnit: 450, category: 'Stolarka', minLevel: 2 },
    { id: 'demo-inv-10', user_id: 'demo-user', name: 'Fast-Setting Screed 25kg', quantity: 15, unit: 'szt', pricePerUnit: 62, category: 'Podłogi', minLevel: 5 },
];

// ---------- Module-level state ----------

let _isDemoMode = false;
let _projects: Project[] = [];
let _clients: Client[] = [];
let _inventory: InventoryItem[] = [];
let _services: ServiceTemplate[] = [];

const pad2 = (num: number): string => num.toString().padStart(2, '0');

const toISODate = (date: Date): string => {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const applyDynamicDemoDates = (projects: Project[]): Project[] => {
    const now = new Date();
    const baseInProgressStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseInProgressEnd = addDays(baseInProgressStart, 88);

    // Partial overlap with main in-progress project.
    const overlapInProgressStart = new Date(now.getFullYear(), now.getMonth(), 12);
    const overlapInProgressEnd = addDays(overlapInProgressStart, 74);

    const firstPlannedStart = addDays(baseInProgressStart, 31);
    const firstPlannedEnd = addDays(firstPlannedStart, 24);

    // Planned project starting shortly after the previous planned one.
    const secondPlannedStart = addDays(firstPlannedEnd, 7);
    const secondPlannedEnd = addDays(secondPlannedStart, 21);

    const completedStart = addDays(baseInProgressStart, -112);
    const completedEnd = addDays(baseInProgressStart, -18);

    const schedule: Record<string, { startDate: string; endDate: string }> = {
        'demo-project-1': { startDate: toISODate(baseInProgressStart), endDate: toISODate(baseInProgressEnd) },
        'demo-project-4': { startDate: toISODate(overlapInProgressStart), endDate: toISODate(overlapInProgressEnd) },
        'demo-project-2': { startDate: toISODate(firstPlannedStart), endDate: toISODate(firstPlannedEnd) },
        'demo-project-5': { startDate: toISODate(secondPlannedStart), endDate: toISODate(secondPlannedEnd) },
        'demo-project-6': { startDate: toISODate(addDays(secondPlannedStart, 10)), endDate: toISODate(addDays(secondPlannedEnd, 12)) },
        'demo-project-3': { startDate: toISODate(completedStart), endDate: toISODate(completedEnd) },
    };

    return projects.map((p) => {
        const dynamic = schedule[p.id];
        if (!dynamic) return { ...p };
        return {
            ...p,
            startDate: dynamic.startDate,
            endDate: dynamic.endDate,
        };
    });
};

const attachClientSnapshots = (projects: Project[], clients: Client[]): Project[] => {
    return projects.map((project) => {
        const client = clients.find((entry) => entry.id === project.clientId);
        return {
            ...project,
            clientName: client ? `${client.firstName} ${client.lastName}` : project.clientName,
            address: client ? `${client.address}, ${client.city}` : project.address,
            clientData: client ? { ...client } : project.clientData,
        };
    });
};

// ---------- Lifecycle ----------

export function enterDemoMode(language: 'pl' | 'en' = 'pl'): void {
    _isDemoMode = true;
    _clients = (language === 'en' ? DEMO_CLIENTS_EN : DEMO_CLIENTS_DEFAULT).map(c => ({ ...c }));
    _projects = attachClientSnapshots(
        applyDynamicDemoDates(language === 'en' ? DEMO_PROJECTS_EN : DEMO_PROJECTS_DEFAULT),
        _clients
    );
    _inventory = (language === 'en' ? DEMO_INVENTORY_EN : DEMO_INVENTORY_DEFAULT).map(i => ({ ...i }));
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
