import React, { useState, useEffect } from "react";
import { getServiceCatalog, saveServiceTemplate, deleteServiceTemplate } from "../lib/storage";
import { ServiceTemplate, Unit, CATEGORIES } from "../lib/renovationLogic";
import { useLanguage } from "../context/LanguageContext";

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

    const handleDelete = async (id: string) => {
        if (window.confirm(t("Czy na pewno chcesz usunąć ten rodzaj prac?", "Are you sure you want to delete this service type?"))) {
            await deleteServiceTemplate(id);
            const data = await getServiceCatalog();
            setServices(data);
        }
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
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl w-full mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">{t('Ustawienia', 'Settings')}</h1>
                        <p className="text-gray-500 mt-2">{t('Definiuj rodzaje prac i stawki robocizny.', 'Define service types and labor rates.')}</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined">add</span>
                        {t('Dodaj Rodzaj Prac', 'Add Service Type')}
                    </button>
                </div>

                <div className="space-y-8">
                    {Object.keys(groupedServices).map((category) => (
                        <div key={category} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                                {localizeCategory(category)}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedServices[category].map((service) => (
                                    <div
                                        key={service.id}
                                        className="p-4 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors relative group"
                                    >
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(service)}
                                                className="p-1 text-blue-600 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-blue-50"
                                            >
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-1 text-red-500 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-red-50"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white pr-10">{localizeServiceName(service.name)}</h3>
                                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in relative">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingItem ? t('Edytuj usługę', 'Edit Service') : t('Nowa usługa', 'New Service')}</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <label className="block">
                                <span className="text-xs font-bold text-gray-500 uppercase">{t('Nazwa usługi', 'Service name')}</span>
                                <input
                                    required
                                    className="form-input w-full rounded-lg dark:bg-slate-800 mt-1"
                                    value={newService.name}
                                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Kategoria', 'Category')}</span>
                                    <select
                                        className="form-select w-full rounded-lg dark:bg-slate-800 mt-1"
                                        value={newService.category}
                                        onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {localizeCategory(cat)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Stawka Robocizny', 'Labor Rate')}</span>
                                    <input
                                        type="number"
                                        required
                                        className="form-input w-full rounded-lg dark:bg-slate-800 mt-1"
                                        value={newService.laborRate}
                                        onChange={(e) => setNewService({ ...newService, laborRate: parseFloat(e.target.value) })}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block relative z-10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{t('Sposob liczenia', 'Calculation mode')}</span>
                                            <div className="group relative inline-flex items-center justify-center">
                                                <span className="material-symbols-outlined text-gray-400 text-[18px] cursor-help hover:text-primary transition-colors">
                                                    help
                                                </span>
                                                {/* Tooltip Positioned BELOW (top-full + mt-2) */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-4 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] pointer-events-none transform -translate-y-2 group-hover:translate-y-0">
                                                    <p className="font-bold mb-2 text-primary border-b border-gray-600 pb-2 text-sm">{t('Logika obliczen:', 'Calculation logic:')}</p>
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
                                        <select
                                            className="form-select w-full rounded-lg dark:bg-slate-800 mt-1"
                                            value={newService.defaultStrategy}
                                            onChange={(e) => setNewService({ ...newService, defaultStrategy: e.target.value as any })}
                                        >
                                            <option value="consumption">{t('Zużycie (m²/l)', 'Consumption (m²/l)')}</option>
                                            <option value="waste">{t('Odpad (%)', 'Waste (%)')}</option>
                                            <option value="linear">{t('Liniowy (mb)', 'Linear (lm)')}</option>
                                            <option value="item">{t('Na sztuki', 'Per item')}</option>
                                        </select>
                                    </label>
                                </div>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Domyślny zakres', 'Default scope')}</span>
                                    <select
                                        className="form-select w-full rounded-lg dark:bg-slate-800 mt-1"
                                        value={newService.suggestedScope}
                                        onChange={(e) => setNewService({ ...newService, suggestedScope: e.target.value as any })}
                                    >
                                        <option value="walls">{t('Ściany', 'Walls')}</option>
                                        <option value="floor">{t('Podłoga', 'Floor')}</option>
                                        <option value="ceiling">{t('Sufit', 'Ceiling')}</option>
                                        <option value="perimeter">{t('Obwód', 'Perimeter')}</option>
                                        <option value="manual">{t('Ręczny', 'Manual')}</option>
                                    </select>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                    {t('Anuluj', 'Cancel')}
                                </button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">
                                    {t('Zapisz', 'Save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
