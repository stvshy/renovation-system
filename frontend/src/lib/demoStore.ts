import type { Project, Client, InventoryItem } from '../types';
import type { ServiceTemplate } from './renovationLogic';
import {
    ConsumptionStrategy,
    DEFAULT_SERVICE_CATALOG,
    ItemCountStrategy,
    LinearStrategy,
    Material,
    Opening,
    RenovationTask,
    Room,
    Surface,
    WasteFactorStrategy,
} from './renovationLogic';

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
    { id: 'demo-inv-1', user_id: 'demo-user', name: 'Farba Lateksowa Biała (Standard)', quantity: 12, unit: 'l', pricePerUnit: 60, category: 'Malowanie', minLevel: 20 },
    { id: 'demo-inv-2', user_id: 'demo-user', name: 'Panele AC5 Dąb Sonoma', quantity: 150, unit: 'm²', pricePerUnit: 85, category: 'Podłogi', minLevel: 30 },
    { id: 'demo-inv-3', user_id: 'demo-user', name: 'Grunt Głęboko Penetrujący', quantity: 40, unit: 'l', pricePerUnit: 25, category: 'Malowanie', minLevel: 10 },
    { id: 'demo-inv-4', user_id: 'demo-user', name: 'Klej do płytek C2', quantity: 16, unit: 'kg', pricePerUnit: 35, category: 'Glazurnictwo', minLevel: 5 },
    { id: 'demo-inv-5', user_id: 'demo-user', name: 'Gniazdko Podwójne Białe', quantity: 60, unit: 'szt', pricePerUnit: 22, category: 'Elektryka', minLevel: 15 },
    { id: 'demo-inv-6', user_id: 'demo-user', name: 'Listwa MDF Biała 240cm', quantity: 20, unit: 'mb', pricePerUnit: 35, category: 'Podłogi', minLevel: 20 },
    { id: 'demo-inv-7', user_id: 'demo-user', name: 'Gładź Finiszowa Gotowa', quantity: 120, unit: 'kg', pricePerUnit: 5, category: 'Malowanie', minLevel: 30 },
    { id: 'demo-inv-8', user_id: 'demo-user', name: 'Gres 60x60 Jasny Beton', quantity: 45, unit: 'm²', pricePerUnit: 85, category: 'Glazurnictwo', minLevel: 10 },
    { id: 'demo-inv-9', user_id: 'demo-user', name: 'Drzwi Wewnętrzne Białe', quantity: 4, unit: 'szt', pricePerUnit: 450, category: 'Stolarka', minLevel: 2 },
    { id: 'demo-inv-10', user_id: 'demo-user', name: 'Wylewka Szybkowiążąca 25kg', quantity: 12, unit: 'szt', pricePerUnit: 62, category: 'Podłogi', minLevel: 5 },
];

const DEMO_INVENTORY_EN: InventoryItem[] = [
    { id: 'demo-inv-1', user_id: 'demo-user', name: 'White Latex Paint (Standard)', quantity: 12, unit: 'l', pricePerUnit: 60, category: 'Malowanie', minLevel: 20 },
    { id: 'demo-inv-2', user_id: 'demo-user', name: 'AC5 Oak Sonoma Panels', quantity: 150, unit: 'm²', pricePerUnit: 85, category: 'Podłogi', minLevel: 30 },
    { id: 'demo-inv-3', user_id: 'demo-user', name: 'Deep Penetrating Primer', quantity: 40, unit: 'l', pricePerUnit: 25, category: 'Malowanie', minLevel: 10 },
    { id: 'demo-inv-4', user_id: 'demo-user', name: 'C2 Tile Adhesive', quantity: 16, unit: 'kg', pricePerUnit: 35, category: 'Glazurnictwo', minLevel: 5 },
    { id: 'demo-inv-5', user_id: 'demo-user', name: 'Double White Socket', quantity: 60, unit: 'szt', pricePerUnit: 22, category: 'Elektryka', minLevel: 15 },
    { id: 'demo-inv-6', user_id: 'demo-user', name: 'White MDF Baseboard 240cm', quantity: 20, unit: 'mb', pricePerUnit: 35, category: 'Podłogi', minLevel: 20 },
    { id: 'demo-inv-7', user_id: 'demo-user', name: 'Ready Finish Filler', quantity: 120, unit: 'kg', pricePerUnit: 5, category: 'Malowanie', minLevel: 30 },
    { id: 'demo-inv-8', user_id: 'demo-user', name: 'Light Concrete Tile 60x60', quantity: 45, unit: 'm²', pricePerUnit: 85, category: 'Glazurnictwo', minLevel: 10 },
    { id: 'demo-inv-9', user_id: 'demo-user', name: 'White Interior Door', quantity: 4, unit: 'szt', pricePerUnit: 450, category: 'Stolarka', minLevel: 2 },
    { id: 'demo-inv-10', user_id: 'demo-user', name: 'Fast-Setting Screed 25kg', quantity: 12, unit: 'szt', pricePerUnit: 62, category: 'Podłogi', minLevel: 5 },
];

// ---------- Module-level state ----------

let _isDemoMode = false;
let _projects: Project[] = [];
let _clients: Client[] = [];
let _inventory: InventoryItem[] = [];
let _services: ServiceTemplate[] = [];

type DemoOpening = { width: number; height: number; type: 'okno' | 'drzwi' };
type DemoTask = {
    description: string;
    material: {
        name: string;
        unitPrice: number;
        unit: string;
        inventoryId?: string;
        category?: string;
    };
    laborRate: number;
    strategyParams: {
        wastePercentage?: number;
        itemCount?: number;
        consumptionPerUnit?: number;
    };
    inputDimension: number;
};

type DemoSurface = {
    name: string;
    type: string;
    width: number;
    height: number;
    openings: DemoOpening[];
};

type DemoRoom = {
    name: string;
    surfaces: DemoSurface[];
    tasks: DemoTask[];
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const rehydrateDemoRoom = (plainRoom: any): Room => {
    const room = new Room(plainRoom.name);

    if (plainRoom.surfaces && Array.isArray(plainRoom.surfaces)) {
        plainRoom.surfaces.forEach((surfaceRaw: any) => {
            const surface = new Surface(surfaceRaw.name, surfaceRaw.type, surfaceRaw.width, surfaceRaw.height, surfaceRaw.customArea);
            if (surfaceRaw.openings && Array.isArray(surfaceRaw.openings)) {
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

const calculateProjectTotalsFromRooms = (roomsRaw: any[] | undefined) => {
    if (!Array.isArray(roomsRaw) || roomsRaw.length === 0) {
        return { value: 0, area: 0 };
    }

    const rooms = roomsRaw.map((room) => rehydrateDemoRoom(room));
    return {
        value: rooms.reduce((sum, room) => sum + room.calculateTotalRoomCost(), 0),
        area: rooms.reduce((sum, room) => sum + room.getFloorArea(), 0),
    };
};

const createRectRoom = (
    name: string,
    length: number,
    width: number,
    height: number,
    wallOpenings: Record<number, DemoOpening[]> = {}
): DemoSurface[] => {
    const walls: DemoSurface[] = [
        { name: 'Ściana 1', type: 'Ściana', width: length, height, openings: wallOpenings[0] || [] },
        { name: 'Ściana 2', type: 'Ściana', width: length, height, openings: wallOpenings[1] || [] },
        { name: 'Ściana 3', type: 'Ściana', width, height, openings: wallOpenings[2] || [] },
        { name: 'Ściana 4', type: 'Ściana', width, height, openings: wallOpenings[3] || [] },
    ];

    return [
        { name: 'Podłoga', type: 'Podłoga', width: length, height: width, openings: [] },
        { name: 'Sufit', type: 'Sufit', width: length, height: width, openings: [] },
        ...walls,
    ];
};

const createRectRoomEn = (
    name: string,
    length: number,
    width: number,
    height: number,
    wallOpenings: Record<number, DemoOpening[]> = {}
): DemoSurface[] => {
    const walls: DemoSurface[] = [
        { name: 'Wall 1', type: 'Ściana', width: length, height, openings: wallOpenings[0] || [] },
        { name: 'Wall 2', type: 'Ściana', width: length, height, openings: wallOpenings[1] || [] },
        { name: 'Wall 3', type: 'Ściana', width, height, openings: wallOpenings[2] || [] },
        { name: 'Wall 4', type: 'Ściana', width, height, openings: wallOpenings[3] || [] },
    ];

    return [
        { name: 'Floor', type: 'Podłoga', width: length, height: width, openings: [] },
        { name: 'Ceiling', type: 'Sufit', width: length, height: width, openings: [] },
        ...walls,
    ];
};

const DEMO_PROJECT_ROOMS_PL: Record<string, DemoRoom[]> = {
    'demo-project-1': [
        {
            name: 'Salon',
            surfaces: createRectRoom('Salon', 6.4, 4.8, 2.7, {
                0: [{ width: 1.8, height: 1.4, type: 'okno' }],
                2: [{ width: 0.9, height: 2, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Gruntowanie',
                    material: { name: 'Grunt Głęboko Penetrujący', unitPrice: 25, unit: 'l', inventoryId: 'demo-inv-3', category: 'Malowanie' },
                    laborRate: 5,
                    strategyParams: { consumptionPerUnit: 0.1 },
                    inputDimension: 53,
                },
                {
                    description: 'Malowanie (2 warstwy)',
                    material: { name: 'Farba Lateksowa Biała (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.15 },
                    inputDimension: 53,
                },
                {
                    description: 'Układanie paneli',
                    material: { name: 'Panele AC5 Dąb Sonoma', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-2', category: 'Podłogi' },
                    laborRate: 35,
                    strategyParams: { wastePercentage: 6 },
                    inputDimension: 30.7,
                },
                {
                    description: 'Listwy przypodłogowe',
                    material: { name: 'Listwa MDF Biała 240cm', unitPrice: 35, unit: 'mb', inventoryId: 'demo-inv-6', category: 'Podłogi' },
                    laborRate: 15,
                    strategyParams: { wastePercentage: 5 },
                    inputDimension: 22.4,
                },
            ],
        },
        {
            name: 'Sypialnia',
            surfaces: createRectRoom('Sypialnia', 4.1, 3.9, 2.7, {
                1: [{ width: 1.4, height: 1.3, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Gładź gipsowa (2x)',
                    material: { name: 'Gładź Finiszowa Gotowa', unitPrice: 5, unit: 'kg', inventoryId: 'demo-inv-7', category: 'Malowanie' },
                    laborRate: 35,
                    strategyParams: { consumptionPerUnit: 1.3 },
                    inputDimension: 40.2,
                },
                {
                    description: 'Malowanie (2 warstwy)',
                    material: { name: 'Farba Lateksowa Biała (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.15 },
                    inputDimension: 40.2,
                },
                {
                    description: 'Montaż osprzętu',
                    material: { name: 'Gniazdko Podwójne Białe', unitPrice: 22, unit: 'szt', inventoryId: 'demo-inv-5', category: 'Elektryka' },
                    laborRate: 25,
                    strategyParams: { itemCount: 8 },
                    inputDimension: 8,
                },
            ],
        },
    ],
    'demo-project-2': [
        {
            name: 'Łazienka',
            surfaces: createRectRoom('Łazienka', 2.7, 2.1, 2.6, {
                2: [{ width: 0.8, height: 2, type: 'drzwi' }],
                3: [{ width: 0.9, height: 0.9, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Układanie płytek (Ściana)',
                    material: { name: 'Gres 60x60 Jasny Beton', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-8', category: 'Glazurnictwo' },
                    laborRate: 100,
                    strategyParams: { wastePercentage: 10 },
                    inputDimension: 21.5,
                },
                {
                    description: 'Klejenie płytek',
                    material: { name: 'Klej do płytek C2', unitPrice: 35, unit: 'kg', inventoryId: 'demo-inv-4', category: 'Glazurnictwo' },
                    laborRate: 28,
                    strategyParams: { consumptionPerUnit: 4.2 },
                    inputDimension: 27.2,
                },
                {
                    description: 'Montaż drzwi',
                    material: { name: 'Drzwi Wewnętrzne Białe', unitPrice: 450, unit: 'szt', inventoryId: 'demo-inv-9', category: 'Stolarka' },
                    laborRate: 250,
                    strategyParams: { itemCount: 1 },
                    inputDimension: 1,
                },
            ],
        },
    ],
    'demo-project-3': [
        {
            name: 'Salon + Kuchnia',
            surfaces: createRectRoom('Salon + Kuchnia', 7.2, 5.1, 2.7, {
                0: [{ width: 2.2, height: 1.5, type: 'okno' }],
                1: [{ width: 1.4, height: 1.3, type: 'okno' }],
                2: [{ width: 0.9, height: 2, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Malowanie (2 warstwy)',
                    material: { name: 'Farba Lateksowa Biała (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.14 },
                    inputDimension: 67,
                },
                {
                    description: 'Układanie paneli',
                    material: { name: 'Panele AC5 Dąb Sonoma', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-2', category: 'Podłogi' },
                    laborRate: 35,
                    strategyParams: { wastePercentage: 5 },
                    inputDimension: 36.7,
                },
                {
                    description: 'Listwy przypodłogowe',
                    material: { name: 'Listwa MDF Biała 240cm', unitPrice: 35, unit: 'mb', inventoryId: 'demo-inv-6', category: 'Podłogi' },
                    laborRate: 15,
                    strategyParams: { wastePercentage: 5 },
                    inputDimension: 24.6,
                },
            ],
        },
    ],
    'demo-project-4': [
        {
            name: 'Kuchnia',
            surfaces: createRectRoom('Kuchnia', 4.2, 3.4, 2.65, {
                1: [{ width: 1.2, height: 1.2, type: 'okno' }],
                2: [{ width: 0.9, height: 2, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Układanie płytek (Podłoga)',
                    material: { name: 'Gres 60x60 Jasny Beton', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-8', category: 'Glazurnictwo' },
                    laborRate: 100,
                    strategyParams: { wastePercentage: 9 },
                    inputDimension: 14.3,
                },
                {
                    description: 'Montaż osprzętu',
                    material: { name: 'Gniazdko Podwójne Białe', unitPrice: 22, unit: 'szt', inventoryId: 'demo-inv-5', category: 'Elektryka' },
                    laborRate: 25,
                    strategyParams: { itemCount: 6 },
                    inputDimension: 6,
                },
            ],
        },
        {
            name: 'Jadalnia',
            surfaces: createRectRoom('Jadalnia', 4.8, 3.1, 2.65, {
                0: [{ width: 1.5, height: 1.35, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Gładź gipsowa (2x)',
                    material: { name: 'Gładź Finiszowa Gotowa', unitPrice: 5, unit: 'kg', inventoryId: 'demo-inv-7', category: 'Malowanie' },
                    laborRate: 35,
                    strategyParams: { consumptionPerUnit: 1.4 },
                    inputDimension: 37.2,
                },
                {
                    description: 'Malowanie (2 warstwy)',
                    material: { name: 'Farba Lateksowa Biała (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.15 },
                    inputDimension: 37.2,
                },
            ],
        },
    ],
    'demo-project-5': [
        {
            name: 'Open Space',
            surfaces: createRectRoom('Open Space', 9.8, 6.4, 3, {
                0: [{ width: 2.4, height: 1.5, type: 'okno' }],
                1: [{ width: 2.4, height: 1.5, type: 'okno' }],
                2: [{ width: 1, height: 2.1, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Wylewka samopoziomująca',
                    material: { name: 'Wylewka Szybkowiążąca 25kg', unitPrice: 62, unit: 'szt', inventoryId: 'demo-inv-10', category: 'Podłogi' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.65 },
                    inputDimension: 62.7,
                },
                {
                    description: 'Montaż osprzętu',
                    material: { name: 'Gniazdko Podwójne Białe', unitPrice: 22, unit: 'szt', inventoryId: 'demo-inv-5', category: 'Elektryka' },
                    laborRate: 25,
                    strategyParams: { itemCount: 22 },
                    inputDimension: 22,
                },
            ],
        },
    ],
    'demo-project-6': [
        {
            name: 'Łazienka',
            surfaces: createRectRoom('Łazienka', 2.9, 2.2, 2.6, {
                2: [{ width: 0.8, height: 2, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Układanie płytek (Ściana)',
                    material: { name: 'Gres 60x60 Jasny Beton', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-8', category: 'Glazurnictwo' },
                    laborRate: 100,
                    strategyParams: { wastePercentage: 10 },
                    inputDimension: 20.6,
                },
                {
                    description: 'Klejenie płytek',
                    material: { name: 'Klej do płytek C2', unitPrice: 35, unit: 'kg', inventoryId: 'demo-inv-4', category: 'Glazurnictwo' },
                    laborRate: 28,
                    strategyParams: { consumptionPerUnit: 4.1 },
                    inputDimension: 26.9,
                },
            ],
        },
        {
            name: 'Pralnia',
            surfaces: createRectRoom('Pralnia', 2.1, 1.8, 2.6, {
                3: [{ width: 0.9, height: 2, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Malowanie (2 warstwy)',
                    material: { name: 'Farba Lateksowa Biała (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.14 },
                    inputDimension: 17.5,
                },
                {
                    description: 'Montaż osprzętu',
                    material: { name: 'Gniazdko Podwójne Białe', unitPrice: 22, unit: 'szt', inventoryId: 'demo-inv-5', category: 'Elektryka' },
                    laborRate: 25,
                    strategyParams: { itemCount: 4 },
                    inputDimension: 4,
                },
            ],
        },
    ],
};

const DEMO_PROJECT_ROOMS_EN: Record<string, DemoRoom[]> = {
    'demo-project-1': [
        {
            name: 'Living Room',
            surfaces: createRectRoomEn('Living Room', 6.4, 4.8, 2.7, {
                0: [{ width: 1.8, height: 1.4, type: 'okno' }],
                2: [{ width: 0.9, height: 2, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Priming',
                    material: { name: 'Deep Penetrating Primer', unitPrice: 25, unit: 'l', inventoryId: 'demo-inv-3', category: 'Malowanie' },
                    laborRate: 5,
                    strategyParams: { consumptionPerUnit: 0.1 },
                    inputDimension: 53,
                },
                {
                    description: 'Painting (2 coats)',
                    material: { name: 'White Latex Paint (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.15 },
                    inputDimension: 53,
                },
                {
                    description: 'Laminate floor installation',
                    material: { name: 'AC5 Oak Sonoma Panels', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-2', category: 'Podłogi' },
                    laborRate: 35,
                    strategyParams: { wastePercentage: 6 },
                    inputDimension: 30.7,
                },
            ],
        },
        {
            name: 'Bedroom',
            surfaces: createRectRoomEn('Bedroom', 4.1, 3.9, 2.7, {
                1: [{ width: 1.4, height: 1.3, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Gypsum skim coat (2x)',
                    material: { name: 'Ready Finish Filler', unitPrice: 5, unit: 'kg', inventoryId: 'demo-inv-7', category: 'Malowanie' },
                    laborRate: 35,
                    strategyParams: { consumptionPerUnit: 1.3 },
                    inputDimension: 40.2,
                },
                {
                    description: 'Painting (2 coats)',
                    material: { name: 'White Latex Paint (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.15 },
                    inputDimension: 40.2,
                },
            ],
        },
    ],
    'demo-project-2': [
        {
            name: 'Bathroom',
            surfaces: createRectRoomEn('Bathroom', 2.7, 2.1, 2.6, {
                2: [{ width: 0.8, height: 2, type: 'drzwi' }],
                3: [{ width: 0.9, height: 0.9, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Tile installation (Wall)',
                    material: { name: 'Light Concrete Tile 60x60', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-8', category: 'Glazurnictwo' },
                    laborRate: 100,
                    strategyParams: { wastePercentage: 10 },
                    inputDimension: 21.5,
                },
                {
                    description: 'Applying tile adhesive',
                    material: { name: 'C2 Tile Adhesive', unitPrice: 35, unit: 'kg', inventoryId: 'demo-inv-4', category: 'Glazurnictwo' },
                    laborRate: 28,
                    strategyParams: { consumptionPerUnit: 4.2 },
                    inputDimension: 27.2,
                },
            ],
        },
    ],
    'demo-project-3': [
        {
            name: 'Living Room + Kitchen',
            surfaces: createRectRoomEn('Living Room + Kitchen', 7.2, 5.1, 2.7, {
                0: [{ width: 2.2, height: 1.5, type: 'okno' }],
                1: [{ width: 1.4, height: 1.3, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Painting (2 coats)',
                    material: { name: 'White Latex Paint (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.14 },
                    inputDimension: 67,
                },
                {
                    description: 'Laminate floor installation',
                    material: { name: 'AC5 Oak Sonoma Panels', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-2', category: 'Podłogi' },
                    laborRate: 35,
                    strategyParams: { wastePercentage: 5 },
                    inputDimension: 36.7,
                },
            ],
        },
    ],
    'demo-project-4': [
        {
            name: 'Kitchen',
            surfaces: createRectRoomEn('Kitchen', 4.2, 3.4, 2.65, {
                1: [{ width: 1.2, height: 1.2, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Tile installation (Floor)',
                    material: { name: 'Light Concrete Tile 60x60', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-8', category: 'Glazurnictwo' },
                    laborRate: 100,
                    strategyParams: { wastePercentage: 9 },
                    inputDimension: 14.3,
                },
            ],
        },
        {
            name: 'Dining Room',
            surfaces: createRectRoomEn('Dining Room', 4.8, 3.1, 2.65, {
                0: [{ width: 1.5, height: 1.35, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Gypsum skim coat (2x)',
                    material: { name: 'Ready Finish Filler', unitPrice: 5, unit: 'kg', inventoryId: 'demo-inv-7', category: 'Malowanie' },
                    laborRate: 35,
                    strategyParams: { consumptionPerUnit: 1.4 },
                    inputDimension: 37.2,
                },
            ],
        },
    ],
    'demo-project-5': [
        {
            name: 'Open Space Office',
            surfaces: createRectRoomEn('Open Space Office', 9.8, 6.4, 3, {
                0: [{ width: 2.4, height: 1.5, type: 'okno' }],
                1: [{ width: 2.4, height: 1.5, type: 'okno' }],
            }),
            tasks: [
                {
                    description: 'Self-leveling screed',
                    material: { name: 'Fast-Setting Screed 25kg', unitPrice: 62, unit: 'szt', inventoryId: 'demo-inv-10', category: 'Podłogi' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.65 },
                    inputDimension: 62.7,
                },
            ],
        },
    ],
    'demo-project-6': [
        {
            name: 'Bathroom',
            surfaces: createRectRoomEn('Bathroom', 2.9, 2.2, 2.6, {
                2: [{ width: 0.8, height: 2, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Tile installation (Wall)',
                    material: { name: 'Light Concrete Tile 60x60', unitPrice: 85, unit: 'm²', inventoryId: 'demo-inv-8', category: 'Glazurnictwo' },
                    laborRate: 100,
                    strategyParams: { wastePercentage: 10 },
                    inputDimension: 20.6,
                },
                {
                    description: 'Applying tile adhesive',
                    material: { name: 'C2 Tile Adhesive', unitPrice: 35, unit: 'kg', inventoryId: 'demo-inv-4', category: 'Glazurnictwo' },
                    laborRate: 28,
                    strategyParams: { consumptionPerUnit: 4.1 },
                    inputDimension: 26.9,
                },
            ],
        },
        {
            name: 'Laundry',
            surfaces: createRectRoomEn('Laundry', 2.1, 1.8, 2.6, {
                3: [{ width: 0.9, height: 2, type: 'drzwi' }],
            }),
            tasks: [
                {
                    description: 'Painting (2 coats)',
                    material: { name: 'White Latex Paint (Standard)', unitPrice: 60, unit: 'l', inventoryId: 'demo-inv-1', category: 'Malowanie' },
                    laborRate: 25,
                    strategyParams: { consumptionPerUnit: 0.14 },
                    inputDimension: 17.5,
                },
            ],
        },
    ],
};

const attachRoomSnapshots = (projects: Project[], language: 'pl' | 'en'): Project[] => {
    const roomCatalog = language === 'en' ? DEMO_PROJECT_ROOMS_EN : DEMO_PROJECT_ROOMS_PL;
    return projects.map((project) => {
        const rooms = roomCatalog[project.id];
        const totals = rooms ? calculateProjectTotalsFromRooms(rooms) : null;
        return {
            ...project,
            rooms: rooms ? clone(rooms) : project.rooms,
            value: totals ? Number(totals.value.toFixed(2)) : project.value,
            area: totals ? Number(totals.area.toFixed(2)) : project.area,
        };
    });
};

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
    _projects = attachRoomSnapshots(
        attachClientSnapshots(
            applyDynamicDemoDates(language === 'en' ? DEMO_PROJECTS_EN : DEMO_PROJECTS_DEFAULT),
            _clients
        ),
        language
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

export const getDemoProjects = (): Project[] => _projects.map(p => clone(p));

export const getDemoProjectById = (id: string): Project | undefined => {
    const p = _projects.find(p => p.id === id);
    return p ? clone(p) : undefined;
};

export const saveDemoProject = (project: Project): void => {
    const idx = _projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
        _projects[idx] = clone(project);
    } else {
        _projects.push(clone(project));
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
