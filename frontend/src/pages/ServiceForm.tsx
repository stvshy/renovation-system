import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Room, RenovationTask, Material, Unit, 
    ConsumptionStrategy, WasteFactorStrategy, LinearStrategy, ItemCountStrategy, 
    Surface, Opening, SurfaceType
} from '../lib/renovationLogic';
import { getInventory, saveInventoryItem, getServiceCatalog } from '../lib/storage';
import { InventoryItem } from '../types';

// Helper to rehydrate objects
const rehydrateRoom = (plainRoom: any): Room => {
    const room = new Room(plainRoom.name);
    if (plainRoom.surfaces && Array.isArray(plainRoom.surfaces)) {
        plainRoom.surfaces.forEach((s: any) => {
            // FIX: Pass s.customArea as the 5th argument to preserve manual area inputs
            const surface = new Surface(s.name, s.type, s.width, s.height, s.customArea);
            if (s.openings) {
                s.openings.forEach((o: any) => surface.addOpening(new Opening(o.width, o.height, o.type)));
            }
            room.addSurface(surface);
        });
    }
    if(plainRoom.tasks) {
        room.tasks = plainRoom.tasks.map((t: any) => {
            let strategy;
            if (t.strategyParams?.itemCount !== undefined || t.inputDimension % 1 === 0 && t.material.unit === 'szt') strategy = new ItemCountStrategy();
            else if (t.strategyParams?.wastePercentage !== undefined && t.material.unit === 'mb') strategy = new LinearStrategy();
            else if (t.strategyParams?.wastePercentage !== undefined) strategy = new WasteFactorStrategy();
            else strategy = new ConsumptionStrategy();

            // Rehydrate material with inventoryId and category if present
            const mat = t.material;
            const materialObj = new Material(mat.name, mat.unitPrice, mat.unit, mat.defaultCoverage, mat.inventoryId, mat.category);

            return new RenovationTask(t.description, materialObj, t.laborRate, strategy, t.strategyParams, t.inputDimension);
        });
    }
    return room;
};

const ServiceForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- State ---
    const [rooms, setRooms] = useState<Room[]>(() => {
        const rawRooms = location.state?.rooms || [];
        return rawRooms.map((r: any) => rehydrateRoom(r));
    });

    const clientData = location.state?.clientData;
    const projectDates = location.state?.projectDates;

    // Load Catalog from Storage
    const [serviceCatalog, setServiceCatalog] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    // Inventory Data
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const catalog = await getServiceCatalog();
            setServiceCatalog(catalog);
            setCategories(Array.from(new Set(catalog.map(s => s.category))));
            
            const inv = await getInventory();
            setInventory(inv);
        };
        loadData();
    }, []);

    const [activeRoomIndex, setActiveRoomIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('');
    
    // Selection State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>(''); 
    const [isAddingNewMaterial, setIsAddingNewMaterial] = useState(false);

    // New Material Form State
    const [newMatScope, setNewMatScope] = useState<'project' | 'inventory'>('project');
    const [customMatName, setCustomMatName] = useState('');
    const [customMatPrice, setCustomMatPrice] = useState('');
    const [customMatUnit, setCustomMatUnit] = useState<Unit>(Unit.M2);
    const [customMatCoverage, setCustomMatCoverage] = useState('');
    const [customMatInitialStock, setCustomMatInitialStock] = useState('');
    
    // Scope State
    const [scopeType, setScopeType] = useState<'global' | 'specific' | 'manual'>('global');
    const [specificSurfaceIndex, setSpecificSurfaceIndex] = useState<number>(0); 
    const [manualQuantity, setManualQuantity] = useState<string>('1');

    // Error State
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const activeRoom = rooms[activeRoomIndex];
    
    const categoryServices = useMemo(() => 
        serviceCatalog.filter(s => s.category === selectedCategory), 
    [selectedCategory, serviceCatalog]);
    
    const selectedTemplate = useMemo(() => 
        serviceCatalog.find(s => s.id === selectedTemplateId), 
    [selectedTemplateId, serviceCatalog]);

    // Filter Inventory based on selected Category
    const filteredInventory = useMemo(() => 
        inventory.filter(item => item.category === selectedCategory), 
    [inventory, selectedCategory]);

    // Set initial category
    useEffect(() => {
        if (categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0]);
        }
    }, [categories]);

    // Update Template Selection when Category changes
    useEffect(() => {
        if (categoryServices.length > 0) {
            setSelectedTemplateId(categoryServices[0].id);
        } else {
            setSelectedTemplateId('');
        }
    }, [selectedCategory, categoryServices]);

    // Reset Material State when Template Changes
    useEffect(() => {
        setIsAddingNewMaterial(false);
        setNewMatScope('project');
        setCustomMatName('');
        setCustomMatPrice('');
        setCustomMatInitialStock('');
        setErrorMessage(null); // Clear errors

        if (selectedTemplate) {
            setScopeType(selectedTemplate.suggestedScope === 'manual' ? 'manual' : 'global');
            setManualQuantity('1');
            
            // Suggest default unit for custom material if needed based on template defaults
            if (selectedTemplate.materials.length > 0) {
                setCustomMatUnit(selectedTemplate.materials[0].unit);
            }
        }
    }, [selectedTemplateId]);

    // Auto-select Material Logic - CRITICAL FIX
    // Whenever the filtered inventory list changes (category change) OR we switch back from adding new material,
    // we must update selectedMaterialId to a valid value from the current list.
    useEffect(() => {
        if (!isAddingNewMaterial) {
            if (filteredInventory.length > 0) {
                // If currently selected ID is NOT in the new list, pick the first one
                const currentStillValid = filteredInventory.some(i => i.id === selectedMaterialId);
                if (!currentStillValid) {
                    setSelectedMaterialId(filteredInventory[0].id);
                }
            } else {
                setSelectedMaterialId('');
            }
        }
    }, [filteredInventory, isAddingNewMaterial, selectedCategory]); // Added selectedCategory dep to ensure triggers on cat switch

    // Helpers
    const getCompatibleSurfaces = (): { surface: Surface, originalIndex: number }[] => {
        if (!activeRoom || !selectedTemplate) return [];
        
        let type: SurfaceType | null = null;
        if (selectedTemplate.suggestedScope === 'walls') type = SurfaceType.WALL;
        if (selectedTemplate.suggestedScope === 'floor' || selectedTemplate.suggestedScope === 'perimeter') type = SurfaceType.FLOOR;
        if (selectedTemplate.suggestedScope === 'ceiling') type = SurfaceType.CEILING;

        if (!type) return activeRoom.surfaces.map((s, i) => ({ surface: s, originalIndex: i }));

        return activeRoom.surfaces
            .map((s, i) => ({ surface: s, originalIndex: i }))
            .filter(item => item.surface.type === type);
    };

    const compatibleSurfaces = getCompatibleSurfaces();

    const calculateDimension = (): number => {
        if (!selectedTemplate) return 0;
        if (scopeType === 'manual') return parseFloat(manualQuantity) || 0;
        if (scopeType === 'specific') {
            const target = compatibleSurfaces[specificSurfaceIndex];
            if (!target) return 0;
            return selectedTemplate.suggestedScope === 'perimeter' ? target.surface.getPerimeter() : target.surface.getNetArea();
        }
        switch (selectedTemplate.suggestedScope) {
            case 'walls': return activeRoom.getTotalWallArea();
            case 'floor': return activeRoom.getFloorArea();
            case 'ceiling': return activeRoom.getCeilingArea();
            case 'perimeter': return activeRoom.getFloorPerimeter();
            default: return 0;
        }
    };

    const handleAddService = async () => {
        setErrorMessage(null); // Reset error

        if (!selectedTemplate || !activeRoom) return;
        
        // Resolve Material
        let material: Material;
        let coverageValue: number | undefined;

        if (isAddingNewMaterial) {
            if (!customMatName || !customMatPrice) {
                setErrorMessage("Proszę uzupełnić nazwę i cenę własnego materiału.");
                return;
            }

            let invId: string | undefined = undefined;

            // If saving to inventory, create the item first
            if (newMatScope === 'inventory') {
                const newItem: InventoryItem = {
                    id: crypto.randomUUID(),
                    name: customMatName,
                    pricePerUnit: parseFloat(customMatPrice),
                    unit: customMatUnit,
                    quantity: parseFloat(customMatInitialStock) || 0,
                    category: selectedCategory
                };
                await saveInventoryItem(newItem);
                const updatedInv = await getInventory(); // Refresh local inventory
                setInventory(updatedInv);
                invId = newItem.id;
            }

            material = new Material(
                customMatName, 
                parseFloat(customMatPrice), 
                customMatUnit, 
                undefined,
                invId, 
                selectedCategory 
            );
            coverageValue = customMatCoverage ? parseFloat(customMatCoverage) : undefined;
        } else {
            // Find selected item in Inventory
            // Fallback: If selectedMaterialId is empty but inventory has items, try picking the first one now
            let targetId = selectedMaterialId;
            if (!targetId && filteredInventory.length > 0) {
                targetId = filteredInventory[0].id;
            }

            const inventoryItem = filteredInventory.find(i => i.id === targetId);
            
            if (!inventoryItem) {
                setErrorMessage("Proszę wybrać materiał z magazynu lub dodać nowy.");
                return;
            }

            // Map Inventory Item to Material
            const u = Object.values(Unit).find(u => u === inventoryItem.unit) as Unit || Unit.PCS;

            material = new Material(
                inventoryItem.name, 
                inventoryItem.pricePerUnit, 
                u, 
                undefined, 
                inventoryItem.id, // Link Inventory ID
                selectedCategory
            ); 
            
            // Try to fallback to template default coverage if unit matches
            const templateMat = selectedTemplate.materials.find(m => m.unit === u);
            coverageValue = templateMat?.defaultCoverage;
        }

        const inputDim = calculateDimension();
        if (inputDim <= 0) {
            setErrorMessage("Wartość powierzchni/ilości musi być większa od 0.");
            return;
        }

        // Strategy & Params
        let strategy;
        const params: any = {};
        switch(selectedTemplate.defaultStrategy) {
            case 'consumption':
                strategy = new ConsumptionStrategy();
                if (coverageValue) {
                    params.consumptionPerUnit = 1 / coverageValue;
                } else {
                    params.consumptionPerUnit = selectedTemplate.defaultParam;
                }
                break;
            case 'waste':
            case 'linear':
                strategy = selectedTemplate.defaultStrategy === 'waste' ? new WasteFactorStrategy() : new LinearStrategy();
                params.wastePercentage = selectedTemplate.defaultParam;
                break;
            case 'item':
                strategy = new ItemCountStrategy();
                break;
            default:
                strategy = new ConsumptionStrategy();
        }

        // Construct Name
        let description = selectedTemplate.name;
        if (scopeType === 'specific') {
            const target = compatibleSurfaces[specificSurfaceIndex];
            if (target) description += ` (${target.surface.name})`;
        }

        const task = new RenovationTask(
            description,
            material,
            selectedTemplate.laborRate,
            strategy,
            params,
            inputDim
        );

        // --- VALIDATION: Check Stock if Inventory Item ---
        if (material.inventoryId) {
            // Re-fetch or use latest inventory state if we just added something
            // We already refreshed `inventory` state if added new item
            const invItem = inventory.find(i => i.id === material.inventoryId);
            
            if (invItem) {
                const requiredQty = task.calculateMaterialQuantity();
                if (invItem.quantity < requiredQty) {
                    // Show on-page error instead of alert
                    setErrorMessage(`Zbyt mała ilość w magazynie! Potrzebujesz: ${requiredQty.toFixed(2)} ${material.unit}, dostępne: ${invItem.quantity} ${invItem.unit}.`);
                    return; // STOP execution
                }
            }
        }

        const updatedRooms = [...rooms];
        updatedRooms[activeRoomIndex].addTask(task);
        setRooms(updatedRooms);
        setErrorMessage(null); // Success
        
        // Reset form
        if (isAddingNewMaterial) {
            setCustomMatName('');
            setCustomMatPrice('');
            setCustomMatCoverage('');
            setCustomMatInitialStock('');
            setIsAddingNewMaterial(false);
        }
    };

    const handleRemoveTask = (taskIndex: number) => {
        const updatedRooms = [...rooms];
        updatedRooms[activeRoomIndex].tasks.splice(taskIndex, 1);
        setRooms(updatedRooms);
    };

    const handleFinish = () => {
        navigate('/projects/new/offer', { 
            state: { 
                rooms: rooms,
                clientData,
                projectDates
            } 
        });
    };

    if (rooms.length === 0) return <div className="p-10 text-center">Brak danych pokoi.</div>;

    const currentDimension = calculateDimension();

    // Helper to display unit currently selected (for the quantity input label)
    const getCurrentUnit = () => {
        if (isAddingNewMaterial) return customMatUnit;
        const item = filteredInventory.find(i => i.id === selectedMaterialId);
        return item ? item.unit : '-';
    };

    return (
        <div className="px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col w-full max-w-[1200px] flex-1 gap-6">
                
                {/* Header */}
                <div className="flex flex-col gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex justify-between items-center">
                        <p className="text-text-dark dark:text-off-white text-3xl font-black leading-tight">Konfiguracja Prac</p>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">Krok 3 z 4</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT COLUMN: Configuration */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Room Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700">
                            {rooms.map((room, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveRoomIndex(idx)}
                                    className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap
                                        ${activeRoomIndex === idx 
                                            ? 'bg-primary text-white shadow-md' 
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                                >
                                    {room.name}
                                </button>
                            ))}
                        </div>

                        {/* Room Info Summary */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex flex-wrap gap-6 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
                             <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">grid_view</span>
                                <span>Ściany: <b>{activeRoom.getTotalWallArea().toFixed(2)} m²</b></span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">check_box_outline_blank</span>
                                <span>Podłoga: <b>{activeRoom.getFloorArea().toFixed(2)} m²</b></span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">roofing</span>
                                <span>Sufit: <b>{activeRoom.getCeilingArea().toFixed(2)} m²</b></span>
                             </div>
                        </div>

                        {/* Configurator Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined">settings_suggest</span>
                                Parametry usługi
                            </h3>
                            
                            {/* Categories */}
                            <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all
                                            ${selectedCategory === cat 
                                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Service Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Rodzaj prac</label>
                                <select 
                                    className="form-select w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary"
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                >
                                    {categoryServices.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Material Selection / Add Material */}
                            <div className="mb-6 space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Wybór materiału {isAddingNewMaterial ? '(Dodawanie)' : '(Magazyn)'}
                                    </label>
                                    <button 
                                        onClick={() => setIsAddingNewMaterial(!isAddingNewMaterial)}
                                        className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${isAddingNewMaterial ? 'bg-gray-200 text-gray-700' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                    >
                                        {isAddingNewMaterial ? 'Wróć do listy' : '+ Dodaj materiał'}
                                    </button>
                                </div>

                                {!isAddingNewMaterial ? (
                                    <>
                                        {filteredInventory.length === 0 ? (
                                            <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                                                <p className="text-sm text-slate-500">Brak materiałów w magazynie dla kategorii <b>{selectedCategory}</b>.</p>
                                                <button 
                                                    onClick={() => setIsAddingNewMaterial(true)}
                                                    className="text-primary font-bold text-sm hover:underline"
                                                >
                                                    Dodaj nowy materiał
                                                </button>
                                            </div>
                                        ) : (
                                            <select 
                                                className="form-select w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary"
                                                value={selectedMaterialId}
                                                onChange={(e) => setSelectedMaterialId(e.target.value)}
                                            >
                                                {filteredInventory.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} — {item.pricePerUnit.toFixed(2)} zł/{item.unit} (Stan: {item.quantity})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4 animate-fade-in">
                                        
                                        {/* Destination Switch */}
                                        <div className="flex p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 mb-2">
                                            <button 
                                                onClick={() => setNewMatScope('inventory')}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${newMatScope === 'inventory' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Dodaj do magazynu
                                            </button>
                                            <button 
                                                onClick={() => setNewMatScope('project')}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${newMatScope === 'project' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Tylko w projekcie
                                            </button>
                                        </div>

                                        <div>
                                            <input 
                                                type="text" 
                                                placeholder="Nazwa materiału" 
                                                value={customMatName}
                                                onChange={(e) => setCustomMatName(e.target.value)}
                                                className="form-input w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    placeholder="Cena" 
                                                    value={customMatPrice}
                                                    onChange={(e) => setCustomMatPrice(e.target.value)}
                                                    className="form-input w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm pr-12"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">zł</span>
                                            </div>
                                            <select 
                                                value={customMatUnit}
                                                onChange={(e) => setCustomMatUnit(e.target.value as Unit)}
                                                className="form-select w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                            >
                                                {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                        
                                        {newMatScope === 'inventory' && (
                                            <div>
                                                 <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Stan początkowy</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="Ilość w magazynie" 
                                                    value={customMatInitialStock}
                                                    onChange={(e) => setCustomMatInitialStock(e.target.value)}
                                                    className="form-input w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                                />
                                            </div>
                                        )}

                                        {selectedTemplate?.defaultStrategy === 'consumption' && (
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Wydajność (opcjonalnie)</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        placeholder="np. 10" 
                                                        value={customMatCoverage}
                                                        onChange={(e) => setCustomMatCoverage(e.target.value)}
                                                        className="form-input w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm pr-16"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">m² / {customMatUnit}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Scope & Quantity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Miejsce prac</label>
                                    <select 
                                        className="form-select w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary"
                                        value={scopeType === 'specific' ? `s-${specificSurfaceIndex}` : scopeType}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'global' || val === 'manual') setScopeType(val);
                                            else if (val.startsWith('s-')) {
                                                setScopeType('specific');
                                                setSpecificSurfaceIndex(parseInt(val.split('-')[1]));
                                            }
                                        }}
                                    >
                                        <option value="global">
                                            {selectedTemplate?.suggestedScope === 'walls' ? 'Wszystkie Ściany' :
                                             selectedTemplate?.suggestedScope === 'floor' ? 'Cała Podłoga' :
                                             selectedTemplate?.suggestedScope === 'ceiling' ? 'Cały Sufit' :
                                             selectedTemplate?.suggestedScope === 'perimeter' ? 'Cały Obwód' : 'Obszar domyślny'}
                                        </option>
                                        
                                        {compatibleSurfaces.length > 0 && (
                                            <optgroup label="Wybrana płaszczyzna">
                                                {compatibleSurfaces.map((item, idx) => (
                                                    <option key={idx} value={`s-${idx}`}>
                                                        {item.surface.name} ({item.surface.getNetArea().toFixed(2)} m²)
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        
                                        <option value="manual">Wartość niestandardowa</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        {scopeType === 'manual' ? 'Ilość robót' : 'Powierzchnia/Długość'}
                                    </label>
                                    <div className="flex items-center">
                                        <input 
                                            type="number"
                                            className="form-input w-full rounded-l-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary disabled:bg-slate-50 dark:disabled:bg-slate-900"
                                            value={scopeType === 'manual' ? manualQuantity : currentDimension.toFixed(2)}
                                            disabled={scopeType !== 'manual'}
                                            onChange={(e) => setManualQuantity(e.target.value)}
                                        />
                                        <span className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-xl text-sm font-bold text-slate-500">
                                            {getCurrentUnit()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Error Message Box */}
                            {errorMessage && (
                                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-fade-in">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 mt-0.5">error</span>
                                    <div>
                                        <p className="font-bold text-red-700 dark:text-red-300 text-sm">Nie można dodać usługi</p>
                                        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleAddService}
                                className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined">add_task</span>
                                Dodaj do kosztorysu pokoju
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Live Summary */}
                    <div className="lg:col-span-5 flex flex-col h-full min-h-[500px]">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg flex flex-col h-full max-h-[700px]">
                            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">receipt_long</span>
                                    {activeRoom.name}
                                </h3>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-xs text-slate-500">{activeRoom.tasks.length} pozycji w kosztorysie</p>
                                    <p className="text-xl font-black text-primary">{activeRoom.calculateTotalRoomCost().toFixed(2)} zł</p>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {activeRoom.tasks.length === 0 ? (
                                    <div className="text-center text-slate-400 py-20 flex flex-col items-center gap-3">
                                        <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800">playlist_add</span>
                                        <p className="text-sm">Lista zadań dla tego pokoju jest pusta.<br/>Użyj konfiguratora, aby dodać prace.</p>
                                    </div>
                                ) : (
                                    activeRoom.tasks.map((task, idx) => (
                                        <div key={idx} className="flex justify-between items-start p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl group border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{task.description}</p>
                                                <p className="text-xs text-slate-500 italic mt-0.5">{task.material.name}</p>
                                                <div className="flex gap-4 mt-2">
                                                    <span className="text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border dark:border-slate-600 text-slate-600 dark:text-slate-300">
                                                        Mat: {task.calculateMaterialCost().toFixed(2)} zł
                                                    </span>
                                                    <span className="text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border dark:border-slate-600 text-slate-600 dark:text-slate-300">
                                                        Rob: {task.calculateLaborCost().toFixed(2)} zł
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{task.calculateTotalCost().toFixed(2)} zł</p>
                                                <button 
                                                    onClick={() => handleRemoveTask(idx)}
                                                    className="mt-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    title="Usuń pozycję"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Navigation */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={() => navigate('/projects/new/room', { 
                            state: { 
                                rooms,
                                clientData,
                                projectDates
                            } 
                        })}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Edytuj Pokoje
                    </button>
                    
                    <button 
                        onClick={handleFinish}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined">assignment_turned_in</span>
                        Przejdź do Podsumowania
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceForm;