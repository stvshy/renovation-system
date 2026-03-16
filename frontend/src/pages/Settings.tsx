import React, { useState, useEffect } from "react";
import { Grid2x2Plus } from "lucide-react";
import { getServiceCatalog, saveServiceTemplate, deleteServiceTemplate } from "../lib/storage";
import { ServiceTemplate, Unit, CATEGORIES } from "../lib/renovationLogic";
import { useLanguage } from "../context/LanguageContext";
import ScrollableSelect from "../components/ScrollableSelect";

const Settings: React.FC = () => {
    const { t, language } = useLanguage();

    const currencyCode = language === "en" ? "EUR" : "zł";

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
        return language === "en" ? map[name] || name : name;
    };

    const localizeStrategy = (strategy: ServiceTemplate["defaultStrategy"]) => {
        if (strategy === "consumption") return t("Zużycie", "Consumption");
        if (strategy === "waste") return t("Odpad", "Waste");
        if (strategy === "linear") return t("Liniowy", "Linear");
        return t("Na sztuki", "Per item");
    };
    const [services, setServices] = useState<ServiceTemplate[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ServiceTemplate | null>(null);
    const [itemToDelete, setItemToDelete] = useState<ServiceTemplate | null>(null);

    // Form State
    const [newService, setNewService] = useState<Partial<ServiceTemplate>>({
        name: "",
        category: "Inne",
        laborRate: 50,
        defaultStrategy: "item",
        defaultParam: 1,
        suggestedScope: "manual",
        materials: [],
    });

    useEffect(() => {
        const load = async () => {
            const data = await getServiceCatalog();
            setServices(data);
        };
        load();
    }, []);

    const openAddModal = () => {
        setEditingItem(null);
        setNewService({
            name: "",
            category: "Inne",
            laborRate: 50,
            defaultStrategy: "consumption",
            defaultParam: 1,
            suggestedScope: "manual",
            materials: [],
        });
        setIsModalOpen(true);
    };

    const openEditModal = (item: ServiceTemplate) => {
        setEditingItem(item);
        setNewService({ ...item });
        setIsModalOpen(true);
    };

    const handleRequestDelete = (item: ServiceTemplate) => {
        setItemToDelete(item);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        await deleteServiceTemplate(itemToDelete.id);
        const data = await getServiceCatalog();
        setServices(data);
        setItemToDelete(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const templateToSave: ServiceTemplate = {
            id: editingItem ? editingItem.id : crypto.randomUUID(),
            name: newService.name || t("Nowa usługa", "New service"),
            category: newService.category || "Inne",
            laborRate: Number(newService.laborRate),
            defaultStrategy: newService.defaultStrategy as any,
            defaultParam: Number(newService.defaultParam),
            suggestedScope: newService.suggestedScope as any,
            materials: newService.materials || [],
        };

        await saveServiceTemplate(templateToSave);
        const data = await getServiceCatalog();
        setServices(data);
        setIsModalOpen(false);
    };

    // Group services by category for display
    const groupedServices = services.reduce((acc, service) => {
        const cat = service.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(service);
        return acc;
    }, {} as Record<string, ServiceTemplate[]>);

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8 [scrollbar-gutter:stable]">
            <div className="max-w-7xl w-full mx-auto">
                <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                        <div className="flex items-center gap-3 -ml-[4.5px] sm:-ml-[4.5px] text-slate-900 dark:text-slate-50">
                            <div className="size-8 mb-1 text-primary -mt-1">
                                <span className="material-symbols-outlined !text-4xl">settings</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">{t('Ustawienia', 'Settings')}</h1>
                        </div>
                        <p className="hidden sm:block text-gray-500 mt-2">{t('Definiuj rodzaje prac i stawki robocizny.', 'Define service types and labor rates.')}</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="sm:hidden flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                        aria-label={t('Dodaj Rodzaj Prac', 'Add Service Type')}
                    >
                        <Grid2x2Plus size={18} strokeWidth={2.2} />
                    </button>
                    <button
                        onClick={openAddModal}
                        className="hidden sm:flex w-full sm:w-auto min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-xl h-[46.2px] px-5 bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors"
                    >
                        <Grid2x2Plus size={18} strokeWidth={2.2} />
                        {t('Dodaj Rodzaj Prac', 'Add Service Type')}
                    </button>
                    <p className="w-full sm:hidden -mt-2 text-sm text-gray-500">{t('Definiuj rodzaje prac i stawki robocizny.', 'Define service types and labor rates.')}</p>
                </div>

                <div className="space-y-8">
                    {Object.keys(groupedServices).map((category) => (
                        <div key={category} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                            <h2 className="-mt-0.5 sm:mt-0 text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-2.5 sm:mb-4 border-b border-gray-100 dark:border-gray-700 pb-1.5 sm:pb-2">
                                {localizeCategory(category)}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedServices[category].map((service) => (
                                    <div
                                        key={service.id}
                                        className="p-4 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors relative group"
                                    >
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(service)}
                                                className="p-0.5 text-blue-600 bg-transparent rounded transition-colors hover:bg-blue-50/20 active:bg-blue-100/15 dark:hover:bg-blue-900/10 dark:active:bg-blue-900/15"
                                            >
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleRequestDelete(service)}
                                                className="p-0.5 text-red-500 bg-transparent rounded transition-colors hover:bg-red-50/20 active:bg-red-100/15 dark:hover:bg-red-900/10 dark:active:bg-red-900/15"
                                            >
                                                <span className="material-symbols-outlined text-[14.5px]">delete</span>
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white pr-10">{localizeServiceName(service.name)}</h3>
                                        <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                            <p className="flex justify-between">
                                                <span>{t('Robocizna:', 'Labor:')}</span>
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {service.laborRate} {currencyCode}/{service.defaultStrategy === "item" ? t("szt", "item") : "m²/lm"}
                                                </span>
                                            </p>
                                            <p className="flex justify-between">
                                                <span>{t('Strategia:', 'Strategy:')}</span>
                                                <span className="italic">{localizeStrategy(service.defaultStrategy)}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    {/* Removed overflow-hidden to allow tooltip to pop out */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in relative">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingItem ? t('Edytuj usługę', 'Edit Service') : t('Nowa usługa', 'New Service')}</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="px-6 pt-6 pb-4 space-y-4">
                            <label className="block">
                                <span className="text-xs font-bold text-gray-500 uppercase">{t('Nazwa usługi', 'Service name')}</span>
                                <input
                                    required
                                        className="form-input w-full rounded-xl dark:bg-slate-800 mt-1"
                                    value={newService.name}
                                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                />
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Kategoria', 'Category')}</span>
                                    <ScrollableSelect
                                        className="form-select w-full rounded-xl dark:bg-slate-800 mt-1"
                                        value={newService.category}
                                        onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {localizeCategory(cat)}
                                            </option>
                                        ))}
                                    </ScrollableSelect>
                                </label>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Stawka Robocizny', 'Labor Rate')}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="form-input w-full rounded-xl dark:bg-slate-800 mt-1"
                                        value={newService.laborRate}
                                        onChange={(e) => setNewService({ ...newService, laborRate: parseFloat(e.target.value) })}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block relative z-10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{t('Sposób liczenia', 'Calculation mode')}</span>
                                            <div className="group relative inline-flex items-center justify-center">
                                                <span className="material-symbols-outlined text-gray-400 text-[18px] cursor-help hover:text-primary transition-colors">
                                                    help
                                                </span>
                                                {/* Tooltip Positioned BELOW (top-full + mt-2) */}
                                                <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-4 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-[60] pointer-events-none">
                                                    <p className="font-bold mb-2 text-primary border-b border-gray-600 pb-2 text-sm">{t('Logika obliczeń:', 'Calculation logic:')}</p>
                                                    <ul className="space-y-3">
                                                        <li>
                                                            <span className="font-bold text-blue-300 block mb-0.5">{t('Zużycie (m²/l)', 'Consumption (m²/l)')}</span>
                                                            <span className="text-gray-300">{t('System dzieli powierzchnię przez wydajność.', 'The system divides area by coverage.')}</span>
                                                            <br />
                                                            <span className="text-gray-400 italic font-mono text-[10px]">{t('Wzór: Powierzchnia / Wydajność', 'Formula: Area / Coverage')}</span>
                                                        </li>
                                                        <li>
                                                            <span className="font-bold text-blue-300 block mb-0.5">{t('Odpad (%)', 'Waste (%)')}</span>
                                                            <span className="text-gray-300">{t('Dodaje % zapasu na docinki do powierzchni.', 'Adds an extra waste percentage to area.')}</span>
                                                            <br />
                                                            <span className="text-gray-400 italic font-mono text-[10px]">{t('Wzór: Powierzchnia * (1 + %)', 'Formula: Area * (1 + %)')}</span>
                                                        </li>
                                                        <li>
                                                            <span className="font-bold text-blue-300 block mb-0.5">{t('Liniowy (mb)', 'Linear (lm)')}</span>
                                                            <span className="text-gray-300">{t('Jak odpad, ale dla metrów bieżących (listwy).', 'Like waste mode, but for linear meters (baseboards).')}</span>
                                                        </li>
                                                        <li>
                                                            <span className="font-bold text-blue-300 block mb-0.5">{t('Na sztuki', 'Per item')}</span>
                                                            <span className="text-gray-300">{t('Proste zliczanie ilości.', 'Simple quantity counting.')}</span>
                                                        </li>
                                                    </ul>
                                                    {/* Arrow at the top of the tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <ScrollableSelect
                                            className="form-select w-full rounded-xl dark:bg-slate-800 mt-1"
                                            value={newService.defaultStrategy}
                                            onChange={(e) => setNewService({ ...newService, defaultStrategy: e.target.value as any })}
                                        >
                                            <option value="consumption">{t('Zużycie (m²/l)', 'Consumption (m²/l)')}</option>
                                            <option value="waste">{t('Odpad (%)', 'Waste (%)')}</option>
                                            <option value="linear">{t('Liniowy (mb)', 'Linear (lm)')}</option>
                                            <option value="item">{t('Na sztuki', 'Per item')}</option>
                                        </ScrollableSelect>
                                    </label>
                                </div>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Domyślny zakres', 'Default scope')}</span>
                                    <ScrollableSelect
                                        className="form-select w-full rounded-xl dark:bg-slate-800 mt-1"
                                        value={newService.suggestedScope}
                                        onChange={(e) => setNewService({ ...newService, suggestedScope: e.target.value as any })}
                                    >
                                        <option value="walls">{t('Ściany', 'Walls')}</option>
                                        <option value="floor">{t('Podłoga', 'Floor')}</option>
                                        <option value="ceiling">{t('Sufit', 'Ceiling')}</option>
                                        <option value="perimeter">{t('Obwód', 'Perimeter')}</option>
                                        <option value="manual">{t('Ręczny', 'Manual')}</option>
                                    </ScrollableSelect>
                                </label>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                    {t('Anuluj', 'Cancel')}
                                </button>
                                <button type="submit" className="h-12 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90">
                                    {t('Zapisz', 'Save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {itemToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                        <div className="px-5 pt-4 pb-3">
                            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                                {t('Usunąć ten rodzaj prac?', 'Delete this service type?')}
                            </h3>
                            <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-slate-400 leading-relaxed">
                                {t(
                                    'Ta pozycja zostanie trwale usunięta z ustawień. Tej operacji nie można cofnąć.',
                                    'This item will be permanently removed from settings. This action cannot be undone.'
                                )}
                            </p>
                        </div>
                        <div className="px-5 pt-1 pb-3 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setItemToDelete(null)}
                                className="h-11 px-4 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 font-semibold hover:bg-gray-100 dark:hover:bg-slate-800"
                            >
                                {t('Anuluj', 'Cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="h-11 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700"
                            >
                                {t('Usuń', 'Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
