import React, { useEffect, useState } from "react";
import { PackagePlus } from "lucide-react";
import { getInventory, saveInventoryItem, deleteInventoryItem } from "../lib/storage";
import { InventoryItem } from "../types";
import { Unit, CATEGORIES } from "../lib/renovationLogic";
import { useLanguage } from "../context/LanguageContext";
import ScrollableSelect from "../components/ScrollableSelect";
import { useDemo } from "../context/DemoContext";

const Inventory: React.FC = () => {
    const { t, language } = useLanguage();
    const { isDemoMode, demoRevision } = useDemo();

    const currencyCode = language === "en" ? "EUR" : "PLN";

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

    const localizeUnit = (unit: Unit | string) => {
        if (unit === Unit.PCS) return language === "en" ? "pcs" : "szt";
        if (unit === Unit.LM) return language === "en" ? "lm" : "mb";
        if (unit === Unit.M2) return "m2";
        if (unit === Unit.LITER) return "l";
        if (unit === Unit.KG) return "kg";
        return unit;
    };
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: "",
        quantity: 0,
        unit: Unit.PCS,
        pricePerUnit: 0,
        category: "",
    });

    useEffect(() => {
        const load = async () => {
            const data = await getInventory();
            setItems(data);
            setIsLoading(false);
        };
        load();
    }, [isDemoMode, demoRevision]);

    const openAddModal = () => {
        setEditingItem(null);
        setNewItem({ name: "", quantity: 0, unit: Unit.PCS, pricePerUnit: 0, category: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setNewItem({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t("Czy na pewno chcesz usunąć ten materiał?", "Are you sure you want to delete this material?"))) {
            await deleteInventoryItem(id);
            const data = await getInventory();
            setItems(data);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const itemToSave: InventoryItem = {
            id: editingItem ? editingItem.id : crypto.randomUUID(),
            name: newItem.name || "Unnamed",
            quantity: Number(newItem.quantity),
            unit: newItem.unit || Unit.PCS,
            pricePerUnit: Number(newItem.pricePerUnit),
            category: newItem.category || "Inne",
        };

        await saveInventoryItem(itemToSave);
        const data = await getInventory();
        setItems(data);
        setIsModalOpen(false);
    };

    const filteredItems = items.filter((i) => {
        const search = searchTerm.toLowerCase();
        return (i.name?.toLowerCase() || "").includes(search) || (i.category?.toLowerCase() || "").includes(search);
    });

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8 [scrollbar-gutter:stable]">
            <div className="max-w-7xl w-full mx-auto">
                <div className="flex items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center gap-3 -ml-[1.5px] sm:-ml-[1.5px] text-slate-900 dark:text-slate-50">
                        <div className="size-8 mb-1 mr-1 text-primary">
                            <span className="material-symbols-outlined !text-4xl">warehouse</span>
                        </div>
                        <h1 className="relative top-[2.3px] text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">{t('Magazyn', 'Inventory')}</h1>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="sm:hidden flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                        aria-label={t('Dodaj materiał', 'Add material')}
                    >
                        <PackagePlus size={18} strokeWidth={2.2} />
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                        <div className="flex-1 w-full">
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400">search</span>
                                </div>
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="form-input w-full pl-11 pr-4 py-3 h-11 sm:h-[47.3px] rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-[15px] sm:text-base placeholder:text-[15px] sm:placeholder:text-base focus:ring-primary focus:border-primary shadow-sm"
                                    placeholder={t('Wyszukaj materiał...', 'Search material...')}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                onClick={openAddModal}
                                className="hidden sm:flex w-full md:w-auto min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-xl h-[46.2px] px-5 bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                <PackagePlus size={18} strokeWidth={2.2} />
                                <span className="truncate">{t('Dodaj materiał', 'Add material')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('Nazwa materiału', 'Material name')}</th>
                                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('Kategoria', 'Category')}</th>
                                    <th className="hidden sm:table-cell px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 text-right">{t('Ilość', 'Quantity')}</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 text-right">
                                        {t('Cena jedn.', 'Unit price')}
                                    </th>
                                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 text-right">{t('Akcje', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center">
                                            {t('Ładowanie...', 'Loading...')}
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                            {t('Brak materiałów w magazynie.', 'No materials in inventory.')}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors last:border-0"
                                        >
                                            <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">{item.name}</td>
                                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">{localizeCategory(item.category || "")}</span>
                                            </td>
                                            <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-right font-mono">
                                                {item.quantity} {localizeUnit(item.unit)}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-right">
                                                {item.pricePerUnit.toFixed(2)} {currencyCode}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title={t('Edytuj', 'Edit')}
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        title={t('Usuń', 'Delete')}
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{editingItem ? t('Edytuj materiał', 'Edit Material') : t('Nowy materiał', 'New Material')}</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <label className="block">
                                <span className="text-xs font-bold text-gray-500 uppercase">{t('Nazwa materiału', 'Material name')}</span>
                                <input
                                    required
                                        className="form-input w-full rounded-xl dark:bg-slate-800 mt-1"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Ilość', 'Quantity')}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="form-input w-full rounded-xl dark:bg-slate-800 mt-1"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Jednostka', 'Unit')}</span>
                                    <ScrollableSelect
                                        className="form-select w-full rounded-xl dark:bg-slate-800 mt-1"
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as any })}
                                    >
                                        {Object.values(Unit).map((u) => (
                                            <option key={u} value={u}>
                                                {localizeUnit(u)}
                                            </option>
                                        ))}
                                    </ScrollableSelect>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Cena jedn.', 'Unit price')} ({currencyCode})</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="form-input w-full rounded-xl dark:bg-slate-800 mt-1"
                                        value={newItem.pricePerUnit}
                                        onChange={(e) => setNewItem({ ...newItem, pricePerUnit: parseFloat(e.target.value) })}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{t('Kategoria', 'Category')}</span>
                                    <ScrollableSelect
                                        className="form-select w-full rounded-xl dark:bg-slate-800 mt-1"
                                        value={newItem.category}
                                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                    >
                                        <option value="" disabled hidden>
                                            {t('Wybierz kategorię', 'Choose category')}
                                        </option>
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {localizeCategory(cat)}
                                            </option>
                                        ))}
                                    </ScrollableSelect>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                    {t('Anuluj', 'Cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="h-11 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90"
                                >
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

export default Inventory;
