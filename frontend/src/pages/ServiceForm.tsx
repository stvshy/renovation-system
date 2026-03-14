import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Room,
    RenovationTask,
    Material,
    Unit,
    ConsumptionStrategy,
    WasteFactorStrategy,
    LinearStrategy,
    ItemCountStrategy,
    Surface,
    Opening,
    SurfaceType,
} from "../lib/renovationLogic";
import { getInventory, saveInventoryItem, getServiceCatalog } from "../lib/storage";
import { AdditionalCost, InventoryItem } from "../types";
import { useLanguage } from "../context/LanguageContext";
import EditWizardExitControl from "../components/EditWizardExitControl";
import ScrollableSelect from "../components/ScrollableSelect";
import { clearProjectCreationDirty, setProjectCreationDirty } from "../lib/projectCreationGuard";
import { clearCurrentProjectSnapshot, setCurrentProjectSnapshot } from "../lib/projectDrafts";
import { buildMaterialPlan } from "../lib/materialPlanning";
import { saveEditedProjectFromSnapshot } from "../lib/projectWizardSave";

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
    if (plainRoom.tasks) {
        room.tasks = plainRoom.tasks.map((t: any) => {
            let strategy;
            if (t.strategyParams?.itemCount !== undefined || (t.inputDimension % 1 === 0 && t.material.unit === "szt")) strategy = new ItemCountStrategy();
            else if (t.strategyParams?.wastePercentage !== undefined && t.material.unit === "mb") strategy = new LinearStrategy();
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

const getAdditionalCostsFromSource = (clientData: any, editProjectMeta: any): AdditionalCost[] => {
    const fromClientData = clientData?.projectMeta?.additionalCosts;
    const fromMeta = editProjectMeta?.additionalCosts;
    const source = Array.isArray(fromClientData) ? fromClientData : Array.isArray(fromMeta) ? fromMeta : [];
    return source
        .filter((item) => item && typeof item.amount === "number" && item.amount >= 0)
        .map((item) => ({
            id: item.id || crypto.randomUUID(),
            amount: Number(item.amount) || 0,
            note: item.note || "",
            createdAt: item.createdAt || new Date().toISOString(),
        }));
};

const sumAdditionalCosts = (costs: AdditionalCost[]) => costs.reduce((sum, item) => sum + item.amount, 0);

const ServiceForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();
    const draftSnapshot = location.state?.draftSnapshot;
    const draftId = location.state?.draftId || draftSnapshot?.id;
    const editProjectId = location.state?.editProjectId;
    const editProjectMeta = location.state?.editProjectMeta;
    const draftServiceForm = draftSnapshot?.serviceForm;
    const restoreDraftRef = useRef(false);
    const skipTemplateResetRef = useRef(Boolean(draftServiceForm));
    const isEditMode = Boolean(editProjectId);

    const currencyCode = language === "en" ? "EUR" : "PLN";
    const currencySymbol = language === "en" ? "EUR" : "zł";
    const localizeUnit = (unit: string) => (language === "en" && unit === "szt" ? "pcs" : unit);

    const localizeCategory = (category: string) => {
        const map: Record<string, string> = {
            Malowanie: "Painting",
            Podłogi: "Flooring",
            Sufity: "Ceilings",
            Elektryka: "Electrical",
            Stolarka: "Carpentry",
            Glazurnictwo: "Tiling",
            Inne: "Other",
        };
        return language === "en" ? map[category] || category : category;
    };

    const localizeServiceName = (name: string) => {
        const map: Record<string, string> = {
            Gruntowanie: "Priming",
            "Malowanie (2 warstwy)": "Painting (2 coats)",
            "Gładź gipsowa (2x)": "Gypsum skim coat (2x)",
            "Układanie paneli": "Laminate floor installation",
            "Listwy przypodłogowe": "Baseboards",
            "Wylewka samopoziomująca": "Self-leveling screed",
            "Malowanie sufitu": "Ceiling painting",
            "Montaż osprzętu": "Fittings installation",
            "Montaż drzwi": "Door installation",
            "Układanie płytek": "Tile installation",
            Fugowanie: "Grouting",
            "Prace ogólnobudowlane": "General construction work",
        };
        if (language !== "en") return name;

        const direct = map[name];
        if (direct) return direct;

        const matchedKey = Object.keys(map).find((key) => name.startsWith(`${key} (`));
        if (!matchedKey) return name;

        const translatedPrefix = map[matchedKey];
        const suffix = name.slice(matchedKey.length);
        const translatedSuffix = suffix
            .replace("Ściana", "Wall")
            .replace("Podłoga", "Floor")
            .replace("Sufit", "Ceiling");
        return `${translatedPrefix}${translatedSuffix}`;
    };

    const localizeSurfaceName = (name: string) => {
        if (language !== "en") return name;
        if (name === "Podłoga") return "Floor";
        if (name === "Sufit") return "Ceiling";
        if (name.startsWith("Ściana ")) return name.replace("Ściana", "Wall");
        return name;
    };

    // --- State ---
    const [rooms, setRooms] = useState<Room[]>(() => {
        const rawRooms = location.state?.rooms || draftSnapshot?.rooms || [];
        return rawRooms.map((r: any) => rehydrateRoom(r));
    });

    const clientData = location.state?.clientData || draftSnapshot?.clientData;
    const projectDates = location.state?.projectDates || draftSnapshot?.projectDates;
    const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>(() => getAdditionalCostsFromSource(clientData, editProjectMeta));
    const [isAddAdditionalCostModalOpen, setIsAddAdditionalCostModalOpen] = useState(false);
    const [additionalCostAmount, setAdditionalCostAmount] = useState("");
    const [additionalCostNote, setAdditionalCostNote] = useState("");
    const [additionalCostError, setAdditionalCostError] = useState<string | null>(null);

    // Load Catalog from Storage
    const [serviceCatalog, setServiceCatalog] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    // Inventory Data
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const catalog = await getServiceCatalog();
            setServiceCatalog(catalog);
            setCategories(Array.from(new Set(catalog.map((s) => s.category))));

            const inv = await getInventory();
            setInventory(inv);
        };
        loadData();
    }, []);

    const [activeRoomIndex, setActiveRoomIndex] = useState(draftServiceForm?.activeRoomIndex ?? 0);
    const [selectedCategory, setSelectedCategory] = useState(draftServiceForm?.selectedCategory || "");

    // Selection State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(draftServiceForm?.selectedTemplateId || "");
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>(draftServiceForm?.selectedMaterialId || "");
    const [isAddingNewMaterial, setIsAddingNewMaterial] = useState(draftServiceForm?.isAddingNewMaterial || false);

    // New Material Form State
    const [newMatScope, setNewMatScope] = useState<"project" | "inventory">(draftServiceForm?.newMatScope || "project");
    const [customMatName, setCustomMatName] = useState(draftServiceForm?.customMatName || "");
    const [customMatPrice, setCustomMatPrice] = useState(draftServiceForm?.customMatPrice || "");
    const [customMatUnit, setCustomMatUnit] = useState<Unit>((draftServiceForm?.customMatUnit as Unit) || Unit.M2);
    const [customMatCoverage, setCustomMatCoverage] = useState(draftServiceForm?.customMatCoverage || "");
    const [customMatInitialStock, setCustomMatInitialStock] = useState(draftServiceForm?.customMatInitialStock || "");

    // Scope State
    const [scopeType, setScopeType] = useState<"global" | "specific" | "manual">(draftServiceForm?.scopeType || "global");
    const [specificSurfaceIndex, setSpecificSurfaceIndex] = useState<number>(draftServiceForm?.specificSurfaceIndex ?? 0);
    const [manualQuantity, setManualQuantity] = useState<string>(draftServiceForm?.manualQuantity || "1");

    // Strategy Parameter (Editable)
    const [strategyParam, setStrategyParam] = useState<string>(draftServiceForm?.strategyParam || "");

    // Error State
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const hasWizardData = Boolean(clientData || projectDates || rooms.length > 0);
    const additionalCostsTotal = useMemo(() => sumAdditionalCosts(additionalCosts), [additionalCosts]);
    const clientDataWithProjectMeta = useMemo(
        () => ({
            ...(clientData || {}),
            projectMeta: {
                ...(clientData?.projectMeta || {}),
                additionalCosts,
            },
        }),
        [additionalCosts, clientData]
    );
    const editProjectMetaWithAdditionalCosts = useMemo(
        () => ({
            ...(editProjectMeta || {}),
            additionalCosts,
        }),
        [additionalCosts, editProjectMeta]
    );

    useEffect(() => {
        if (rooms.length === 0) return;
        if (activeRoomIndex >= rooms.length) {
            setActiveRoomIndex(0);
        }
    }, [activeRoomIndex, rooms.length]);

    useEffect(() => {
        setProjectCreationDirty(hasWizardData);
    }, [hasWizardData]);

    useEffect(() => {
        if (!hasWizardData) {
            clearCurrentProjectSnapshot();
            return;
        }

        setCurrentProjectSnapshot({
            id: draftId,
            currentStep: "services",
            updatedAt: new Date().toISOString(),
            clientData: clientDataWithProjectMeta,
            projectDates,
            rooms,
            serviceForm: {
                activeRoomIndex,
                selectedCategory,
                selectedTemplateId,
                selectedMaterialId,
                isAddingNewMaterial,
                newMatScope,
                customMatName,
                customMatPrice,
                customMatUnit,
                customMatCoverage,
                customMatInitialStock,
                scopeType,
                specificSurfaceIndex,
                manualQuantity,
                strategyParam,
            },
        });
    }, [activeRoomIndex, clientDataWithProjectMeta, customMatCoverage, customMatInitialStock, customMatName, customMatPrice, customMatUnit, draftId, hasWizardData, isAddingNewMaterial, manualQuantity, newMatScope, projectDates, rooms, scopeType, selectedCategory, selectedMaterialId, selectedTemplateId, specificSurfaceIndex, strategyParam]);

    const activeRoom = rooms[Math.min(activeRoomIndex, Math.max(rooms.length - 1, 0))];
    const materialPlan = useMemo(() => buildMaterialPlan(rooms, inventory), [inventory, rooms]);
    const shoppingListItems = materialPlan.items.filter((item) => item.toBuy > 0);

    const categoryServices = useMemo(() => serviceCatalog.filter((s) => s.category === selectedCategory), [selectedCategory, serviceCatalog]);

    const selectedTemplate = useMemo(() => serviceCatalog.find((s) => s.id === selectedTemplateId), [selectedTemplateId, serviceCatalog]);

    // Filter Inventory based on selected Category
    const filteredInventory = useMemo(() => inventory.filter((item) => item.category === selectedCategory), [inventory, selectedCategory]);

    // Set initial category
    useEffect(() => {
        if (categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0]);
        }
    }, [categories]);

    // Update Template Selection when Category changes
    useEffect(() => {
        if (categoryServices.length === 0) {
            setSelectedTemplateId("");
            return;
        }

        const currentStillValid = categoryServices.some((service) => service.id === selectedTemplateId);
        if (!currentStillValid) {
            setSelectedTemplateId(categoryServices[0].id);
        }
    }, [categoryServices, selectedTemplateId]);

    // Reset Material State and Strategy Param when Template Changes
    useEffect(() => {
        if (skipTemplateResetRef.current) {
            skipTemplateResetRef.current = false;
            return;
        }

        setIsAddingNewMaterial(false);
        setNewMatScope("project");
        setCustomMatName("");
        setCustomMatPrice("");
        setCustomMatInitialStock("");
        setErrorMessage(null); // Clear errors

        if (selectedTemplate) {
            setScopeType(selectedTemplate.suggestedScope === "manual" ? "manual" : "global");
            setManualQuantity("1");

            // Suggest default unit for custom material if needed based on template defaults
            if (selectedTemplate.materials.length > 0) {
                setCustomMatUnit(selectedTemplate.materials[0].unit);
            }

            // Initialize strategy param with template default
            setStrategyParam(selectedTemplate.defaultParam.toString());
        }
    }, [selectedTemplateId]);

    useEffect(() => {
        if (!draftServiceForm || restoreDraftRef.current || serviceCatalog.length === 0) return;

        setActiveRoomIndex(draftServiceForm.activeRoomIndex ?? 0);
        setSelectedCategory(draftServiceForm.selectedCategory || "");
        setSelectedTemplateId(draftServiceForm.selectedTemplateId || "");
        setSelectedMaterialId(draftServiceForm.selectedMaterialId || "");
        setIsAddingNewMaterial(draftServiceForm.isAddingNewMaterial || false);
        setNewMatScope(draftServiceForm.newMatScope || "project");
        setCustomMatName(draftServiceForm.customMatName || "");
        setCustomMatPrice(draftServiceForm.customMatPrice || "");
        setCustomMatUnit((draftServiceForm.customMatUnit as Unit) || Unit.M2);
        setCustomMatCoverage(draftServiceForm.customMatCoverage || "");
        setCustomMatInitialStock(draftServiceForm.customMatInitialStock || "");
        setScopeType(draftServiceForm.scopeType || "global");
        setSpecificSurfaceIndex(draftServiceForm.specificSurfaceIndex ?? 0);
        setManualQuantity(draftServiceForm.manualQuantity || "1");
        setStrategyParam(draftServiceForm.strategyParam || "");
        restoreDraftRef.current = true;
    }, [draftServiceForm, serviceCatalog.length]);

    // Auto-select Material Logic - CRITICAL FIX
    // Whenever the filtered inventory list changes (category change) OR we switch back from adding new material,
    // we must update selectedMaterialId to a valid value from the current list.
    useEffect(() => {
        if (!isAddingNewMaterial) {
            if (filteredInventory.length > 0) {
                // If currently selected ID is NOT in the new list, pick the first one
                const currentStillValid = filteredInventory.some((i) => i.id === selectedMaterialId);
                let targetId = selectedMaterialId;
                if (!currentStillValid) {
                    targetId = filteredInventory[0].id;
                    setSelectedMaterialId(targetId);
                }

                // --- Update Strategy Param based on Material Coverage ---
                // If strategy is CONSUMPTION, we should prefer the material's specific coverage over the generic template default
                if (selectedTemplate?.defaultStrategy === "consumption") {
                    const item = filteredInventory.find((i) => i.id === targetId);
                    // Note: We don't have defaultCoverage in InventoryItem interface directly in this context
                    // unless we check where we saved it.
                    // In standard InventoryItem type, coverage isn't strictly typed, but let's assume if it matches template materials
                    const templateMat = selectedTemplate.materials.find((m) => m.name === item?.name);
                    if (templateMat && templateMat.defaultCoverage) {
                        setStrategyParam(templateMat.defaultCoverage.toString());
                    } else {
                        // Revert to template default if no specific material coverage found
                        setStrategyParam(selectedTemplate.defaultParam.toString());
                    }
                }
            } else {
                setSelectedMaterialId("");
            }
        }
    }, [filteredInventory, isAddingNewMaterial, selectedCategory, selectedTemplate]);

    // Helpers
    const getCompatibleSurfaces = (): { surface: Surface; originalIndex: number }[] => {
        if (!activeRoom || !selectedTemplate) return [];

        let type: SurfaceType | null = null;
        if (selectedTemplate.suggestedScope === "walls") type = SurfaceType.WALL;
        if (selectedTemplate.suggestedScope === "floor" || selectedTemplate.suggestedScope === "perimeter") type = SurfaceType.FLOOR;
        if (selectedTemplate.suggestedScope === "ceiling") type = SurfaceType.CEILING;

        if (!type) return activeRoom.surfaces.map((s, i) => ({ surface: s, originalIndex: i }));

        return activeRoom.surfaces.map((s, i) => ({ surface: s, originalIndex: i })).filter((item) => item.surface.type === type);
    };

    const compatibleSurfaces = getCompatibleSurfaces();

    const calculateDimension = (): number => {
        if (!selectedTemplate) return 0;
        if (scopeType === "manual") return parseFloat(manualQuantity) || 0;
        if (scopeType === "specific") {
            const target = compatibleSurfaces[specificSurfaceIndex];
            if (!target) return 0;
            return selectedTemplate.suggestedScope === "perimeter" ? target.surface.getPerimeter() : target.surface.getNetArea();
        }
        switch (selectedTemplate.suggestedScope) {
            case "walls":
                return activeRoom.getTotalWallArea();
            case "floor":
                return activeRoom.getFloorArea();
            case "ceiling":
                return activeRoom.getCeilingArea();
            case "perimeter":
                return activeRoom.getFloorPerimeter();
            default:
                return 0;
        }
    };

    const handleAddService = async () => {
        setErrorMessage(null); // Reset error

        if (!selectedTemplate || !activeRoom) return;

        // Resolve Material
        let material: Material;

        // Use user edited param instead of hidden calculation
        const userParam = parseFloat(strategyParam);
        if (isNaN(userParam) || userParam < 0) {
            setErrorMessage(t("Nieprawidłowy parametr (wydajność/odpad).", "Invalid parameter (coverage/waste)."));
            return;
        }

        if (isAddingNewMaterial) {
            if (!customMatName || !customMatPrice) {
                setErrorMessage(t("Proszę uzupełnić nazwę i cenę własnego materiału.", "Please enter custom material name and price."));
                return;
            }

            let invId: string | undefined = undefined;

            // If saving to inventory, create the item first
            if (newMatScope === "inventory") {
                const newItem: InventoryItem = {
                    id: crypto.randomUUID(),
                    name: customMatName,
                    pricePerUnit: parseFloat(customMatPrice),
                    unit: customMatUnit,
                    quantity: parseFloat(customMatInitialStock) || 0,
                    category: selectedCategory,
                };
                await saveInventoryItem(newItem);
                const updatedInv = await getInventory(); // Refresh local inventory
                setInventory(updatedInv);
                invId = newItem.id;
            }

            material = new Material(customMatName, parseFloat(customMatPrice), customMatUnit, undefined, invId, selectedCategory);
        } else {
            // Find selected item in Inventory
            // Fallback: If selectedMaterialId is empty but inventory has items, try picking the first one now
            let targetId = selectedMaterialId;
            if (!targetId && filteredInventory.length > 0) {
                targetId = filteredInventory[0].id;
            }

            const inventoryItem = filteredInventory.find((i) => i.id === targetId);

            if (!inventoryItem) {
                setErrorMessage(t("Proszę wybrać materiał z magazynu lub dodać nowy.", "Please select a material from inventory or add a new one."));
                return;
            }

            // Map Inventory Item to Material
            const u = (Object.values(Unit).find((u) => u === inventoryItem.unit) as Unit) || Unit.PCS;

            material = new Material(
                inventoryItem.name,
                inventoryItem.pricePerUnit,
                u,
                undefined,
                inventoryItem.id, // Link Inventory ID
                selectedCategory
            );
        }

        const inputDim = calculateDimension();
        if (inputDim <= 0) {
            setErrorMessage(t("Wartość powierzchni/ilości musi być większa od 0.", "Area/quantity value must be greater than 0."));
            return;
        }

        // Strategy & Params
        let strategy;
        const params: any = {};
        switch (selectedTemplate.defaultStrategy) {
            case "consumption":
                strategy = new ConsumptionStrategy();
                // User enters coverage (m2/L), logic needs consumption (L/m2) -> 1/coverage
                if (userParam > 0) {
                    params.consumptionPerUnit = 1 / userParam;
                } else {
                    params.consumptionPerUnit = 1; // Fallback to avoid division by zero
                }
                break;
            case "waste":
            case "linear":
                strategy = selectedTemplate.defaultStrategy === "waste" ? new WasteFactorStrategy() : new LinearStrategy();
                params.wastePercentage = userParam;
                break;
            case "item":
                strategy = new ItemCountStrategy();
                break;
            default:
                strategy = new ConsumptionStrategy();
        }

        // Construct Name
        let description = selectedTemplate.name;
        if (scopeType === "specific") {
            const target = compatibleSurfaces[specificSurfaceIndex];
            if (target) description += ` (${target.surface.name})`;
        }

        const task = new RenovationTask(description, material, selectedTemplate.laborRate, strategy, params, inputDim);

        const updatedRooms = [...rooms];
        updatedRooms[activeRoomIndex].addTask(task);
        setRooms(updatedRooms);
        setErrorMessage(null); // Success

        // Reset form
        if (isAddingNewMaterial) {
            setCustomMatName("");
            setCustomMatPrice("");
            setCustomMatCoverage("");
            setCustomMatInitialStock("");
            setIsAddingNewMaterial(false);
        }
    };

    const handleRemoveTask = (taskIndex: number) => {
        const updatedRooms = [...rooms];
        updatedRooms[activeRoomIndex].tasks.splice(taskIndex, 1);
        setRooms(updatedRooms);
    };

    const handleFinish = () => {
        navigate("/projects/new/offer", {
            state: {
                rooms: rooms,
                clientData: clientDataWithProjectMeta,
                projectDates,
                draftId,
                editProjectId,
                editProjectMeta: editProjectMetaWithAdditionalCosts,
            },
        });
    };

    const handleRemoveAdditionalCost = (costId: string) => {
        setAdditionalCosts((current) => current.filter((item) => item.id !== costId));
    };

    const handleOpenAddAdditionalCostModal = () => {
        setAdditionalCostError(null);
        setIsAddAdditionalCostModalOpen(true);
    };

    const handleCloseAddAdditionalCostModal = () => {
        setAdditionalCostError(null);
        setIsAddAdditionalCostModalOpen(false);
    };

    const handleAddAdditionalCost = () => {
        const amount = parseFloat(additionalCostAmount);
        const note = additionalCostNote.trim();

        if (isNaN(amount) || amount <= 0) {
            setAdditionalCostError(t('Podaj poprawną kwotę większą od 0.', 'Enter a valid amount greater than 0.'));
            return;
        }

        if (!note) {
            setAdditionalCostError(t('Dodaj krótki opis kosztu.', 'Add a short cost description.'));
            return;
        }

        setAdditionalCosts((current) => [
            ...current,
            {
                id: crypto.randomUUID(),
                amount,
                note,
                createdAt: new Date().toISOString(),
            },
        ]);

        setAdditionalCostAmount("");
        setAdditionalCostNote("");
        handleCloseAddAdditionalCostModal();
    };

    if (rooms.length === 0 || !activeRoom) {
        return (
            <div className="px-3 sm:px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-8">
                <div className="w-full max-w-[860px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-8 text-center">
                    <p className="text-xl font-black text-slate-800 dark:text-white">{t('Brak zapisanych pokoi', 'No saved rooms')}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t(
                            'Aby przejść do konfiguracji usług, najpierw dodaj co najmniej jeden pokój w kroku 2.',
                            'To continue with services configuration, add at least one room in step 2 first.'
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={() =>
                            navigate('/projects/new/room', {
                                state: {
                                    rooms,
                                    clientData: clientDataWithProjectMeta,
                                    projectDates,
                                    draftId,
                                    editProjectId,
                                    editProjectMeta: editProjectMetaWithAdditionalCosts,
                                },
                            })
                        }
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        {t('Wróć do kroku 2', 'Back to step 2')}
                    </button>
                </div>
            </div>
        );
    }

    const currentDimension = calculateDimension();

    // Helper to display unit for the scope input based on strategy
    const getInputDimensionUnit = () => {
        if (!selectedTemplate) return "-";
        switch (selectedTemplate.defaultStrategy) {
            case "consumption":
            case "waste":
                return Unit.M2;
            case "linear":
                return Unit.LM;
            case "item":
                return Unit.PCS;
            default:
                return "-";
        }
    };

    const handleExitWithoutSaving = () => {
        clearProjectCreationDirty();
        clearCurrentProjectSnapshot();
        navigate(editProjectId ? `/projects/${editProjectId}` : '/projects');
    };

    const handleSaveAndExit = async () => {
        if (editProjectId) {
            await saveEditedProjectFromSnapshot(editProjectId);
        }
        clearProjectCreationDirty();
        clearCurrentProjectSnapshot();
        navigate(editProjectId ? `/projects/${editProjectId}` : '/projects');
    };

    return (
        <div className="px-3 sm:px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-4 sm:py-5">
            <div className="layout-content-container flex flex-col w-full max-w-[1200px] flex-1 gap-6">
                {/* Header */}
                <div className="flex flex-col gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div>
                            <p className="text-text-dark dark:text-off-white text-2xl sm:text-3xl font-black leading-tight">{t('Konfiguracja Prac', 'Work Configuration')}</p>
                            <span className="mt-2 inline-flex bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider w-fit">{t('Krok 3 z 4', 'Step 3 of 4')}</span>
                        </div>
                        <EditWizardExitControl visible={isEditMode} onSaveAndExit={handleSaveAndExit} onExitWithoutSaving={handleExitWithoutSaving} />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() =>
                                navigate('/projects/new/client', {
                                    state: {
                                        clientData: clientDataWithProjectMeta,
                                        projectDates,
                                        rooms,
                                        draftId,
                                        editProjectId,
                                        editProjectMeta: editProjectMetaWithAdditionalCosts,
                                    },
                                })
                            }
                            className="text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {t('Krok 1', 'Step 1')}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                navigate('/projects/new/room', {
                                    state: {
                                        rooms,
                                        clientData: clientDataWithProjectMeta,
                                        projectDates,
                                        draftId,
                                        editProjectId,
                                        editProjectMeta: editProjectMetaWithAdditionalCosts,
                                    },
                                })
                            }
                            className="text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {t('Krok 2', 'Step 2')}
                        </button>
                        <button
                            type="button"
                            className="text-xs font-bold rounded-lg border border-primary bg-primary/10 px-2.5 py-1 text-primary"
                        >
                            {t('Krok 3', 'Step 3')}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                navigate('/projects/new/offer', {
                                    state: {
                                        rooms,
                                        clientData: clientDataWithProjectMeta,
                                        projectDates,
                                        draftId,
                                        editProjectId,
                                        editProjectMeta: editProjectMetaWithAdditionalCosts,
                                    },
                                })
                            }
                            className="text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            {t('Krok 4', 'Step 4')}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
                    {/* LEFT COLUMN: Configuration */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Room Tabs - Modified Style with Hidden Scrollbar */}
                        <div className="flex gap-2 overflow-x-auto items-end border-b border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {rooms.map((room, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveRoomIndex(idx)}
                                    className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap mb-[-1px] border-b-0
                                        ${
                                            activeRoomIndex === idx
                                                ? "bg-primary text-white border-2 border-primary"
                                                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 border border-transparent"
                                        }`}
                                >
                                    {room.name}
                                </button>
                            ))}
                        </div>

                        {/* Room Info Summary */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex flex-wrap gap-6 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">grid_view</span>
                                <span>
                                    {t("Ściany", "Walls")}: <b>{activeRoom.getTotalWallArea().toFixed(2)} m²</b>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">check_box_outline_blank</span>
                                <span>
                                    {t("Podłoga", "Floor")}: <b>{activeRoom.getFloorArea().toFixed(2)} m²</b>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">roofing</span>
                                <span>
                                    {t("Sufit", "Ceiling")}: <b>{activeRoom.getCeilingArea().toFixed(2)} m²</b>
                                </span>
                            </div>
                        </div>

                        {/* Configurator Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined">settings_suggest</span>
                                {t('Parametry usługi', 'Service parameters')}
                            </h3>

                            {/* Categories */}
                            <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all
                                            ${
                                                selectedCategory === cat
                                                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            }`}
                                    >
                                        {localizeCategory(cat)}
                                    </button>
                                ))}
                            </div>

                            {/* Service Selection */}
                            <div className="mb-5">
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('Rodzaj prac', 'Type of work')}</label>
                                <ScrollableSelect
                                    className="form-select w-full rounded-xl border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary"
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                >
                                    {categoryServices.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {localizeServiceName(s.name)}
                                        </option>
                                    ))}
                                </ScrollableSelect>

                                {selectedTemplate && (
                                    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-2.5 text-[11px] dark:border-blue-800 dark:bg-blue-900/10 animate-fade-in">
                                        <div className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base mt-0.5">info</span>
                                            <div>
                                                <p className="font-bold text-blue-700 dark:text-blue-300 mb-1">
                                                    {t("Strategia", "Strategy")}:{" "}
                                                    {selectedTemplate.defaultStrategy === "consumption"
                                                        ? t("Wydajność (Zużycie)", "Coverage (Consumption)")
                                                        : selectedTemplate.defaultStrategy === "waste"
                                                        ? t("Powierzchnia + Odpad", "Area + Waste")
                                                        : selectedTemplate.defaultStrategy === "linear"
                                                        ? t("Liniowa (mb)", "Linear (lm)")
                                                        : t("Na sztuki", "Per item")}
                                                </p>
                                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    {selectedTemplate.defaultStrategy === "consumption" &&
                                                        t(
                                                            `System obliczy ilość materiału dzieląc powierzchnię przez wydajność (np. m²/litr). Robocizna naliczana za m². Domyślna wydajność: ${selectedTemplate.defaultParam} jednostek/m².`,
                                                            `The system calculates required material by dividing area by coverage (for example m²/liter). Labor is charged per m². Default coverage: ${selectedTemplate.defaultParam} units/m².`
                                                        )}
                                                    {selectedTemplate.defaultStrategy === "waste" &&
                                                        t(
                                                            `System obliczy ilość materiału dodając ${selectedTemplate.defaultParam}% zapasu na docinki (odpad) do całkowitej powierzchni. Robocizna naliczana za m².`,
                                                            `The system calculates required material by adding ${selectedTemplate.defaultParam}% extra waste allowance to the total area. Labor is charged per m².`
                                                        )}
                                                    {selectedTemplate.defaultStrategy === "linear" &&
                                                        t(
                                                            `Obliczenia dla elementów liniowych (np. listwy). Dodaje ${selectedTemplate.defaultParam}% zapasu do długości obwodu. Robocizna za mb.`,
                                                            `Calculations for linear elements (for example skirting). Adds ${selectedTemplate.defaultParam}% allowance to perimeter length. Labor is charged per lm.`
                                                        )}
                                                    {selectedTemplate.defaultStrategy === "item" &&
                                                        t(
                                                            `Proste mnożenie: Ilość sztuk × Cena. Robocizna naliczana od sztuki (punktu).`,
                                                            `Simple multiplication: Quantity × Price. Labor is charged per item.`
                                                        )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Strategy Parameter Editing */}
                            {selectedTemplate && selectedTemplate.defaultStrategy !== "item" && (
                                <div className="mb-5 animate-fade-in">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                        {selectedTemplate.defaultStrategy === "consumption" ? t("Wydajność materiału", "Material coverage") : t("Naddatek materiałowy", "Material waste allowance")}
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            className="form-input w-full rounded-l-xl border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary"
                                            value={strategyParam}
                                            onChange={(e) => setStrategyParam(e.target.value)}
                                        />
                                        <span className="min-w-[56px] rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 text-center dark:border-slate-700 dark:bg-slate-800">
                                            {selectedTemplate.defaultStrategy === "consumption" ? t("m²/jedn", "m²/unit") : "%"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Material Selection / Add Material */}
                            <div className="mb-5 space-y-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                        {t('Wybór materiału', 'Material selection')} {isAddingNewMaterial ? t('(Dodawanie)', '(Adding)') : t('(Magazyn)', '(Inventory)')}
                                    </label>
                                    <button
                                        onClick={() => setIsAddingNewMaterial(!isAddingNewMaterial)}
                                        className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                                            isAddingNewMaterial ? "bg-gray-200 text-gray-700" : "bg-primary/10 text-primary hover:bg-primary/20"
                                        }`}
                                    >
                                        {isAddingNewMaterial ? t('Wróć do listy', 'Back to list') : t('+ Dodaj materiał', '+ Add material')}
                                    </button>
                                </div>

                                {!isAddingNewMaterial ? (
                                    <>
                                        {filteredInventory.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
                                                <p className="text-[13px] leading-5 text-slate-500 dark:text-slate-300">
                                                    {t('Brak materiałów w magazynie dla kategorii', 'No inventory materials for category')} <b>{localizeCategory(selectedCategory)}</b>.
                                                </p>
                                            </div>
                                        ) : (
                                            <ScrollableSelect
                                                className="form-select w-full rounded-xl border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary"
                                                value={selectedMaterialId}
                                                onChange={(e) => setSelectedMaterialId(e.target.value)}
                                            >
                                                {filteredInventory.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} — {item.pricePerUnit.toFixed(2)} {currencyCode}/{localizeUnit(item.unit)} ({t('Stan', 'Stock')}: {item.quantity})
                                                    </option>
                                                ))}
                                            </ScrollableSelect>
                                        )}
                                    </>
                                ) : (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30 space-y-3 animate-fade-in">
                                        {/* Destination Switch */}
                                        <div className="mb-1 flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                                            <button
                                                onClick={() => setNewMatScope("inventory")}
                                                className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition-colors ${
                                                    newMatScope === "inventory" ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                                                }`}
                                            >
                                                {t('Dodaj do magazynu', 'Add to inventory')}
                                            </button>
                                            <button
                                                onClick={() => setNewMatScope("project")}
                                                className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition-colors ${
                                                    newMatScope === "project" ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                                                }`}
                                            >
                                                {t('Tylko w projekcie', 'Project only')}
                                            </button>
                                        </div>

                                        <div>
                                            <input
                                                type="text"
                                                placeholder={t('Nazwa materiału', 'Material name')}
                                                value={customMatName}
                                                onChange={(e) => setCustomMatName(e.target.value)}
                                                className="form-input w-full rounded-lg border-slate-200 text-sm dark:bg-slate-800"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder={t('Cena', 'Price')}
                                                    value={customMatPrice}
                                                    onChange={(e) => setCustomMatPrice(e.target.value)}
                                                    className="form-input w-full rounded-lg border-slate-200 pr-12 text-sm dark:bg-slate-800"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{currencySymbol}</span>
                                            </div>
                                            <ScrollableSelect
                                                value={customMatUnit}
                                                onChange={(e) => setCustomMatUnit(e.target.value as Unit)}
                                                className="form-select w-full rounded-lg border-slate-200 text-sm dark:bg-slate-800"
                                            >
                                                {Object.values(Unit).map((u) => (
                                                    <option key={u} value={u}>
                                                        {localizeUnit(u)}
                                                    </option>
                                                ))}
                                            </ScrollableSelect>
                                        </div>

                                        {newMatScope === "inventory" && (
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t('Stan początkowy', 'Initial stock')}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder={t('Ilość w magazynie', 'Quantity in inventory')}
                                                    value={customMatInitialStock}
                                                    onChange={(e) => setCustomMatInitialStock(e.target.value)}
                                                    className="form-input w-full rounded-lg border-slate-200 text-sm dark:bg-slate-800"
                                                />
                                            </div>
                                        )}

                                        {selectedTemplate?.defaultStrategy === "consumption" && (
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t('Wydajność (opcjonalnie)', 'Coverage (optional)')}</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder={t('np. 10', 'e.g. 10')}
                                                        value={customMatCoverage}
                                                        onChange={(e) => setCustomMatCoverage(e.target.value)}
                                                        className="form-input w-full rounded-lg border-slate-200 pr-16 text-sm dark:bg-slate-800"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                                                        m² / {localizeUnit(customMatUnit)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Scope & Quantity */}
                            <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{t('Miejsce prac', 'Work area')}</label>
                                    <ScrollableSelect
                                        className="form-select w-full rounded-xl border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary"
                                        value={scopeType === "specific" ? `s-${specificSurfaceIndex}` : scopeType}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "global" || val === "manual") setScopeType(val);
                                            else if (val.startsWith("s-")) {
                                                setScopeType("specific");
                                                setSpecificSurfaceIndex(parseInt(val.split("-")[1]));
                                            }
                                        }}
                                    >
                                        <option value="global">
                                            {selectedTemplate?.suggestedScope === "walls"
                                                ? t('Wszystkie Ściany', 'All walls')
                                                : selectedTemplate?.suggestedScope === "floor"
                                                ? t('Cała Podłoga', 'Entire floor')
                                                : selectedTemplate?.suggestedScope === "ceiling"
                                                ? t('Cały Sufit', 'Entire ceiling')
                                                : selectedTemplate?.suggestedScope === "perimeter"
                                                ? t('Cały Obwód', 'Entire perimeter')
                                                : t('Obszar domyślny', 'Default area')}
                                        </option>

                                        {compatibleSurfaces.length > 0 && (
                                            <optgroup label={t('Wybrana płaszczyzna', 'Selected surface')}>
                                                {compatibleSurfaces.map((item, idx) => (
                                                    <option key={idx} value={`s-${idx}`}>
                                                        {localizeSurfaceName(item.surface.name)} ({item.surface.getNetArea().toFixed(2)} m²)
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}

                                        <option value="manual">{t('Wartość niestandardowa', 'Custom value')}</option>
                                    </ScrollableSelect>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                        {scopeType === "manual" ? t('Ilość robót', 'Work quantity') : t('Powierzchnia/Długość', 'Area/Length')}
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            className="form-input w-full rounded-l-xl border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800 focus:ring-primary focus:border-primary disabled:bg-slate-50 dark:disabled:bg-slate-900"
                                            value={scopeType === "manual" ? manualQuantity : currentDimension.toFixed(2)}
                                            disabled={scopeType !== "manual"}
                                            onChange={(e) => setManualQuantity(e.target.value)}
                                        />
                                        <span className="rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                                            {localizeUnit(getInputDimensionUnit())}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Error Message Box */}
                            {errorMessage && (
                                <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20 animate-fade-in">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 mt-0.5">error</span>
                                    <div>
                                        <p className="text-xs font-bold text-red-700 dark:text-red-300">{t('Nie można dodać usługi', 'Cannot add service')}</p>
                                        <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleAddService}
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_task</span>
                                {t('Dodaj do kosztorysu pokoju', 'Add to room estimate')}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Live Summary */}
                    <div className="lg:col-span-5 flex flex-col gap-4 min-h-[500px]">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg flex flex-col min-h-[320px] max-h-[700px]">
                            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">receipt_long</span>
                                    {activeRoom.name}
                                </h3>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-xs text-slate-500">{activeRoom.tasks.length} {t('pozycji w kosztorysie', 'items in estimate')}</p>
                                    <p className="text-xl font-black text-primary">{activeRoom.calculateTotalRoomCost().toFixed(2)} {currencyCode}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {activeRoom.tasks.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-400">
                                        <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800">playlist_add</span>
                                        <p className="text-[13px] leading-5 text-slate-500 dark:text-slate-300">
                                            {t('Lista zadań dla tego pokoju jest pusta.', 'Task list for this room is empty.')}
                                            <br />
                                            {t('Uzyj konfiguratora, aby dodac prace.', 'Use the configurator to add work items.')}
                                        </p>
                                    </div>
                                ) : (
                                    activeRoom.tasks.map((task, idx) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between items-start p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl group border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{localizeServiceName(task.description)}</p>
                                                <p className="text-xs text-slate-500 italic mt-0.5">{task.material.name}</p>
                                                <div className="flex gap-4 mt-2">
                                                    <span className="text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border dark:border-slate-600 text-slate-600 dark:text-slate-300">
                                                        {t('Mat:', 'Mat:')} {task.calculateMaterialCost().toFixed(2)} {currencyCode}
                                                    </span>
                                                    <span className="text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border dark:border-slate-600 text-slate-600 dark:text-slate-300">
                                                        {t('Rob:', 'Lab:')} {task.calculateLaborCost().toFixed(2)} {currencyCode}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{task.calculateTotalCost().toFixed(2)} {currencyCode}</p>
                                                <button
                                                    onClick={() => handleRemoveTask(idx)}
                                                    className="mt-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    title={t('Usuń pozycję', 'Remove item')}
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-900/10">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">shopping_cart</span>
                                            {t('Lista zakupów projektu', 'Project shopping list')}
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {t(
                                                'Materiały, których brakuje w magazynie.',
                                                'Materials needed but not in stock.'
                                            )}
                                        </p>
                                    </div>
                                    {!(shoppingListItems.length === 0 && additionalCosts.length === 0) && (
                                        <div className="text-right shrink-0">
                                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('Koszt zakupów', 'Purchase cost')}</p>
                                            <p className="text-lg font-black text-red-600 dark:text-red-400">
                                                {shoppingListItems.length === 0 ? '-' : `${materialPlan.totalShortageCost.toFixed(2)} ${currencyCode}`}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {t('Liczba sztuk: ', 'Items: ')}{shoppingListItems.length === 0 ? '-' : shoppingListItems.length}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar">
                                {shoppingListItems.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-center text-[13px] leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                                        {t('Wszystkie materiały są pokryte stanem magazynowym.', 'All material demand is currently covered by inventory.')}
                                    </div>
                                ) : (
                                    shoppingListItems.map((item) => (
                                        <div key={item.key} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{item.materialName}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {t('Potrzebne', 'Required')}: {item.required.toFixed(2)} {localizeUnit(item.unit)}, {t('Magazyn', 'In stock')}: {item.available.toFixed(2)} {localizeUnit(item.unit)}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-black text-amber-700 dark:text-amber-300">{item.toBuy.toFixed(2)} {localizeUnit(item.unit)}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.shortageCost.toFixed(2)} {currencyCode}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-900/10">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">request_quote</span>
                                                {t('Koszty dodatkowe', 'Additional costs')}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={handleOpenAddAdditionalCostModal}
                                                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/60 transition-colors"
                                                title={t('Dodaj koszt dodatkowy', 'Add additional cost')}
                                            >
                                                <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {t('Niestandardowe koszty w ramach projektu.', 'Custom costs related to the project.')}
                                        </p>
                                    </div>
                                    {!(shoppingListItems.length === 0 && additionalCosts.length === 0) && (
                                        <div className="text-right shrink-0">
                                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('Suma', 'Total')}</p>
                                            <p className={`text-lg font-black ${additionalCostsTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {additionalCosts.length === 0 ? '-' : `${additionalCostsTotal.toFixed(2)} ${currencyCode}`}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('Pozycje: ', 'Items: ')}{additionalCosts.length === 0 ? '-' : additionalCosts.length} </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar">
                                {additionalCosts.length === 0 ? (
                                    <div className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-center text-[13px] leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                                        {t('Brak kosztów dodatkowych.', 'No additional costs yet.')}
                                    </div>
                                ) : (
                                    additionalCosts.map((cost) => (
                                        <div key={cost.id} className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-900/10 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white break-words">{cost.note}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{new Date(cost.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right shrink-0 self-center flex items-center gap-2">
                                                    <p className="text-sm font-black text-red-600 dark:text-red-400">+{cost.amount.toFixed(2)} {currencyCode}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAdditionalCost(cost.id)}
                                                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                                        title={t('Usuń koszt', 'Remove cost')}
                                                    >
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isAddAdditionalCostModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleCloseAddAdditionalCostModal}>
                        <div
                            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-5 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">{t('Dodaj koszt dodatkowy', 'Add additional cost')}</h3>
                                <button
                                    type="button"
                                    onClick={handleCloseAddAdditionalCostModal}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold uppercase text-slate-500">{t('Kwota', 'Amount')}</span>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={additionalCostAmount}
                                        onChange={(e) => setAdditionalCostAmount(e.target.value)}
                                        className="form-input w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 pr-16"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400">{currencyCode}</span>
                                </div>
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-bold uppercase text-slate-500">{t('Notatka', 'Note')}</span>
                                <textarea
                                    value={additionalCostNote}
                                    onChange={(e) => setAdditionalCostNote(e.target.value)}
                                    className="form-textarea w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 min-h-[96px]"
                                />
                            </label>

                            {additionalCostError && (
                                <p className="text-sm text-red-600 dark:text-red-400">{additionalCostError}</p>
                            )}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleCloseAddAdditionalCostModal}
                                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                                >
                                    {t('Anuluj', 'Cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddAdditionalCost}
                                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
                                >
                                    {t('Dodaj', 'Add')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Navigation */}
                {isEditMode ? (
                    <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() =>
                                navigate("/projects/new/room", {
                                    state: {
                                        rooms,
                                        clientData: clientDataWithProjectMeta,
                                        projectDates,
                                        draftId,
                                        editProjectId,
                                        editProjectMeta: editProjectMetaWithAdditionalCosts,
                                    },
                                })
                            }
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            {t('Pokoje', 'Rooms')}
                        </button>

                        <button
                            onClick={handleFinish}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all"
                        >
                            {t('Podsumowanie', 'Summary')}
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() =>
                                navigate("/projects/new/room", {
                                    state: {
                                        rooms,
                                        clientData: clientDataWithProjectMeta,
                                        projectDates,
                                        draftId,
                                        editProjectId,
                                        editProjectMeta: editProjectMetaWithAdditionalCosts,
                                    },
                                })
                            }
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            {t('Edytuj Pokoje', 'Edit Rooms')}
                        </button>

                        <button
                            onClick={handleFinish}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all"
                        >
                            <span className="material-symbols-outlined">assignment_turned_in</span>
                            {t('Przejdź do podsumowania', 'Go to Summary')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceForm;
