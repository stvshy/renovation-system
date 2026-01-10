
// --- Enums & Types ---

export enum Unit {
    M2 = "m2",
    LM = "mb",
    PCS = "szt",
    LITER = "l",
    KG = "kg",
  }
  
  export enum SurfaceType {
    WALL = "Ściana",
    FLOOR = "Podłoga",
    CEILING = "Sufit",
  }
  
  export interface StrategyParams {
    wastePercentage?: number; // np. 10 dla 10%
    layers?: number; // liczba warstw farby
    coveragePerUnit?: number; // wydajność (np. 12 m2 z 1 litra)
    itemCount?: number; // dla gniazdek/drzwi
    consumptionPerUnit?: number; // zużycie na jednostkę powierzchni (np. kg/m2)
  }
  
  // --- Strategy Interface ---
  
  export interface ICalculationStrategy {
    calculateRequiredQuantity(baseDimension: number, params: StrategyParams): number;
  }
  
  export class StandardAreaStrategy implements ICalculationStrategy {
    calculateRequiredQuantity(area: number, _params: StrategyParams): number {
      return area;
    }
  }
  
  export class WasteFactorStrategy implements ICalculationStrategy {
    calculateRequiredQuantity(area: number, params: StrategyParams): number {
      const waste = params.wastePercentage || 0;
      return area * (1 + waste / 100);
    }
  }
  
  export class PaintStrategy implements ICalculationStrategy {
    calculateRequiredQuantity(area: number, params: StrategyParams): number {
      const layers = params.layers || 1;
      const coverage = params.coveragePerUnit || 10;
      return (area * layers) / coverage;
    }
  }
  
  export class LinearStrategy implements ICalculationStrategy {
    calculateRequiredQuantity(length: number, params: StrategyParams): number {
      const waste = params.wastePercentage || 5; 
      return length * (1 + waste / 100);
    }
  }
  
  export class ItemCountStrategy implements ICalculationStrategy {
    calculateRequiredQuantity(baseDimension: number, _params: StrategyParams): number {
      return baseDimension;
    }
  }
  
  export class ConsumptionStrategy implements ICalculationStrategy {
    calculateRequiredQuantity(area: number, params: StrategyParams): number {
      const consumption = params.consumptionPerUnit || 10;
      return area * consumption;
    }
  }
  
  // --- Core Classes ---
  
  export type OpeningType = 'okno' | 'drzwi';

  export class Opening {
    constructor(
        public width: number, 
        public height: number,
        public type: OpeningType = 'okno'
    ) {}
  
    getArea(): number {
      return this.width * this.height;
    }
  }
  
  export class Material {
    constructor(
      public name: string,
      public unitPrice: number, 
      public unit: Unit,
      public defaultCoverage?: number,
      public inventoryId?: string, // Link to inventory item
      public category?: string // Strict category link
    ) {}
  }
  
  export class Surface {
    public openings: Opening[] = [];
  
    constructor(
      public name: string,
      public type: SurfaceType,
      public width: number,
      public height: number,
      public customArea?: number // Optional manual area override
    ) {}
  
    addOpening(o: Opening): void {
      this.openings.push(o);
    }

    removeOpening(index: number): void {
        if (index >= 0 && index < this.openings.length) {
            this.openings.splice(index, 1);
        }
    }
  
    getNetArea(): number {
      // Use custom area if provided, otherwise calculate from dimensions
      const grossArea = this.customArea !== undefined ? this.customArea : (this.width * this.height);
      const openingsArea = this.openings.reduce((sum, o) => sum + o.getArea(), 0);
      return Math.max(0, grossArea - openingsArea);
    }
  
    getPerimeter(): number {
      return 2 * (this.width + this.height);
    }
  }
  
  export class RenovationTask {
    constructor(
      public description: string,
      public material: Material,
      public laborRate: number,
      public strategy: ICalculationStrategy,
      public strategyParams: StrategyParams,
      public inputDimension: number
    ) {}
  
    calculateMaterialQuantity(): number {
      if (this.material.defaultCoverage && !this.strategyParams.coveragePerUnit) {
        this.strategyParams.coveragePerUnit = this.material.defaultCoverage;
      }
      return this.strategy.calculateRequiredQuantity(this.inputDimension, this.strategyParams);
    }
  
    calculateMaterialCost(): number {
      return this.calculateMaterialQuantity() * this.material.unitPrice;
    }
  
    calculateLaborCost(): number {
      return this.inputDimension * this.laborRate;
    }
  
    calculateTotalCost(): number {
      return this.calculateMaterialCost() + this.calculateLaborCost();
    }
  }
  
  export class Room {
    public surfaces: Surface[] = [];
    public tasks: RenovationTask[] = [];
  
    constructor(public name: string) {}
  
    addSurface(s: Surface) {
      this.surfaces.push(s);
    }

    removeSurface(index: number) {
        if (index >= 0 && index < this.surfaces.length) {
            this.surfaces.splice(index, 1);
        }
    }
  
    addTask(t: RenovationTask) {
      this.tasks.push(t);
    }
  
    getTotalWallArea(): number {
      return this.surfaces.filter((s) => s.type === SurfaceType.WALL).reduce((sum, s) => sum + s.getNetArea(), 0);
    }
  
    getFloorArea(): number {
      return this.surfaces.filter((s) => s.type === SurfaceType.FLOOR).reduce((sum, s) => sum + s.getNetArea(), 0);
    }

    getCeilingArea(): number {
        return this.surfaces.filter((s) => s.type === SurfaceType.CEILING).reduce((sum, s) => sum + s.getNetArea(), 0);
    }
  
    getFloorPerimeter(): number {
      const floor = this.surfaces.find((s) => s.type === SurfaceType.FLOOR);
      return floor ? floor.getPerimeter() : 0;
    }
  
    calculateTotalRoomCost(): number {
      return this.tasks.reduce((sum, task) => sum + task.calculateTotalCost(), 0);
    }
  }
  
  export class Apartment {
    public rooms: Room[] = [];
  
    constructor(public name: string) {}
  
    addRoom(room: Room) {
      this.rooms.push(room);
    }
  
    calculateGrandTotal(): number {
      return this.rooms.reduce((sum, room) => sum + room.calculateTotalRoomCost(), 0);
    }
  }

  // --- CATALOG DEFINITIONS ---

  export interface MaterialDefinition {
    name: string;
    price: number;
    unit: Unit;
    defaultCoverage?: number; // e.g. 10m2/l
}

export interface ServiceTemplate {
    id: string;
    user_id?: string;
    category: string;
    name: string;
    laborRate: number;
    defaultStrategy: 'consumption' | 'waste' | 'linear' | 'item';
    defaultParam: number; 
    suggestedScope: 'walls' | 'floor' | 'ceiling' | 'perimeter' | 'manual'; 
    materials: MaterialDefinition[];
}

export const DEFAULT_SERVICE_CATALOG: ServiceTemplate[] = [
    // --- MALOWANIE ---
    { 
        id: '550e8400-e29b-41d4-a716-446655440001', category: 'Malowanie', name: 'Gruntowanie', laborRate: 5, defaultStrategy: 'consumption', defaultParam: 0.1, suggestedScope: 'walls',
        materials: [
            { name: 'Grunt Uniwersalny (Standard)', price: 10, unit: Unit.LITER, defaultCoverage: 10 },
            { name: 'Grunt Głęboko Penetrujący (Premium)', price: 25, unit: Unit.LITER, defaultCoverage: 8 }
        ]
    },
    { 
        id: '550e8400-e29b-41d4-a716-446655440002', category: 'Malowanie', name: 'Malowanie (2 warstwy)', laborRate: 25, defaultStrategy: 'consumption', defaultParam: 0.15, suggestedScope: 'walls',
        materials: [
            { name: 'Farba Akrylowa (Ekonomiczna)', price: 30, unit: Unit.LITER, defaultCoverage: 12 },
            { name: 'Farba Lateksowa (Standard)', price: 60, unit: Unit.LITER, defaultCoverage: 12 },
            { name: 'Farba Ceramiczna (Premium)', price: 95, unit: Unit.LITER, defaultCoverage: 14 }
        ]
    },
    { 
        id: '550e8400-e29b-41d4-a716-446655440003', category: 'Malowanie', name: 'Gładź gipsowa (2x)', laborRate: 35, defaultStrategy: 'consumption', defaultParam: 1.5, suggestedScope: 'walls',
        materials: [
            { name: 'Gładź Startowa', price: 2.5, unit: Unit.KG, defaultCoverage: 1 },
            { name: 'Gładź Finiszowa (Gotowa)', price: 5, unit: Unit.KG, defaultCoverage: 1.5 }
        ]
    },
    
    // --- PODŁOGI ---
    { 
        id: '550e8400-e29b-41d4-a716-446655440004', category: 'Podłogi', name: 'Układanie paneli', laborRate: 35, defaultStrategy: 'waste', defaultParam: 5, suggestedScope: 'floor',
        materials: [
            { name: 'Panele AC4 8mm', price: 45, unit: Unit.M2 },
            { name: 'Panele AC5 10mm Wodoodporne', price: 85, unit: Unit.M2 },
            { name: 'Panele Winylowe LVT', price: 110, unit: Unit.M2 }
        ]
    },
    { 
        id: '550e8400-e29b-41d4-a716-446655440005', category: 'Podłogi', name: 'Listwy przypodłogowe', laborRate: 15, defaultStrategy: 'linear', defaultParam: 5, suggestedScope: 'perimeter',
        materials: [
            { name: 'Listwa PCV', price: 15, unit: Unit.LM },
            { name: 'Listwa MDF Biała', price: 35, unit: Unit.LM }
        ]
    },
    { 
        id: '550e8400-e29b-41d4-a716-446655440006', category: 'Podłogi', name: 'Wylewka samopoziomująca', laborRate: 25, defaultStrategy: 'consumption', defaultParam: 15, suggestedScope: 'floor',
        materials: [
            { name: 'Wylewka Szybkowiążąca', price: 2.5, unit: Unit.KG, defaultCoverage: 1.5 }
        ]
    },

    // --- SUFITY ---
    { 
        id: '550e8400-e29b-41d4-a716-446655440007', category: 'Sufity', name: 'Malowanie sufitu', laborRate: 20, defaultStrategy: 'consumption', defaultParam: 0.15, suggestedScope: 'ceiling',
        materials: [
            { name: 'Farba Sufitowa Antyrefleksyjna', price: 45, unit: Unit.LITER, defaultCoverage: 10 }
        ]
    },

    // --- ELEKTRYKA / INNE ---
    { 
        id: '550e8400-e29b-41d4-a716-446655440008', category: 'Elektryka', name: 'Montaż osprzętu', laborRate: 25, defaultStrategy: 'item', defaultParam: 1, suggestedScope: 'manual',
        materials: [
            { name: 'Gniazdko Pojedyncze Białe', price: 15, unit: Unit.PCS },
            { name: 'Gniazdko Podwójne Białe', price: 22, unit: Unit.PCS },
            { name: 'Włącznik Światła', price: 18, unit: Unit.PCS }
        ]
    },
    { 
        id: '550e8400-e29b-41d4-a716-446655440009', category: 'Stolarka', name: 'Montaż drzwi', laborRate: 250, defaultStrategy: 'item', defaultParam: 1, suggestedScope: 'manual',
        materials: [
            { name: 'Drzwi Wewnętrzne (Płyta)', price: 450, unit: Unit.PCS },
            { name: 'Drzwi Wewnętrzne (Drewno)', price: 1200, unit: Unit.PCS }
        ]
    },
    // --- GLAZURNICTWO ---
    { 
        id: '550e8400-e29b-41d4-a716-446655440010', category: 'Glazurnictwo', name: 'Układanie płytek', laborRate: 100, defaultStrategy: 'waste', defaultParam: 10, suggestedScope: 'walls',
        materials: [
            { name: 'Płytki Ceramiczne', price: 60, unit: Unit.M2 },
            { name: 'Gres', price: 85, unit: Unit.M2 }
        ]
    },
    { 
        id: '550e8400-e29b-41d4-a716-446655440011', category: 'Glazurnictwo', name: 'Fugowanie', laborRate: 20, defaultStrategy: 'consumption', defaultParam: 0.5, suggestedScope: 'walls',
        materials: [
            { name: 'Fuga Cementowa', price: 15, unit: Unit.KG, defaultCoverage: 4 },
            { name: 'Fuga Epoksydowa', price: 45, unit: Unit.KG, defaultCoverage: 3 }
        ]
    },
    // --- INNE (General) ---
    { 
        id: '550e8400-e29b-41d4-a716-446655440012', category: 'Inne', name: 'Prace ogólnobudowlane', laborRate: 50, defaultStrategy: 'item', defaultParam: 1, suggestedScope: 'manual',
        materials: [] 
    }
];

export const CATEGORIES = Array.from(new Set(DEFAULT_SERVICE_CATALOG.map(s => s.category)));


  // === Demo Data Generation ===
  export const generateDemoBathroom = (): Room => {
    // Note: Demo materials now include category (last param)
    const tynkGipsowy = new Material("Tynk Gipsowy Maszynowy (Knauf MP75)", 1.2, Unit.KG, undefined, undefined, 'Malowanie');
    const gladzSzpachlowa = new Material("Gładź Finiszowa (Worek)", 3.5, Unit.KG, undefined, undefined, 'Malowanie'); 
    const wylewkaSamopoziom = new Material("Wylewka Samopoziomująca", 2.0, Unit.KG, undefined, undefined, 'Podłogi');
    const klejDoPlytek = new Material("Klej do płytek elastyczny", 2.5, Unit.KG, undefined, undefined, 'Glazurnictwo');
    const plytkiGresowe = new Material("Gres Szary 60x60", 85.0, Unit.M2, undefined, undefined, 'Glazurnictwo');
    const plytaGK = new Material("Płyta G-K Wodoodporna", 25.0, Unit.M2, undefined, undefined, 'Sufity');
    const parapet = new Material("Parapet Konglomerat", 200.0, Unit.LM, undefined, undefined, 'Stolarka');

    const lazienka = new Room("Łazienka (Demo)");
    
    const podlogaLazienka = new Surface("Podłoga", SurfaceType.FLOOR, 3, 2);
    lazienka.addSurface(podlogaLazienka);

    const scianyLazienka = [
        new Surface("Ściana A", SurfaceType.WALL, 3, 2.5), 
        new Surface("Ściana B", SurfaceType.WALL, 3, 2.5), 
        new Surface("Ściana C", SurfaceType.WALL, 2, 2.5), 
        new Surface("Ściana D", SurfaceType.WALL, 2, 2.5)
    ];
    scianyLazienka[2].addOpening(new Opening(0.8, 2.0, 'drzwi'));

    scianyLazienka.forEach((s) => lazienka.addSurface(s));

    const areaSciany = lazienka.getTotalWallArea();
    const areaPodloga = lazienka.getFloorArea();

    lazienka.addTask(new RenovationTask("Tynkowanie ścian", tynkGipsowy, 45.0, new ConsumptionStrategy(), { consumptionPerUnit: 10 }, areaSciany));
    lazienka.addTask(new RenovationTask("Wylewka samopoziomująca", wylewkaSamopoziom, 30.0, new ConsumptionStrategy(), { consumptionPerUnit: 15 }, areaPodloga));
    lazienka.addTask(new RenovationTask("Sufit podwieszany", plytaGK, 120.0, new WasteFactorStrategy(), { wastePercentage: 15 }, areaPodloga));
    lazienka.addTask(new RenovationTask("Szpachlowanie sufitu", gladzSzpachlowa, 35.0, new ConsumptionStrategy(), { consumptionPerUnit: 1.5 }, areaPodloga));
    lazienka.addTask(new RenovationTask("Klejenie płytek", klejDoPlytek, 0.0, new ConsumptionStrategy(), { consumptionPerUnit: 4 }, areaSciany + areaPodloga));
    lazienka.addTask(new RenovationTask("Układanie gresu", plytkiGresowe, 100.0, new WasteFactorStrategy(), { wastePercentage: 10 }, areaSciany + areaPodloga));
    lazienka.addTask(new RenovationTask("Montaż parapetu", parapet, 50.0, new LinearStrategy(), { wastePercentage: 0 }, 1.5));

    return lazienka;
  }
