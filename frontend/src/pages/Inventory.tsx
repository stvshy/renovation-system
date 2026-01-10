import React, { useEffect, useState } from 'react';
import { getInventory, saveInventoryItem, deleteInventoryItem } from '../lib/storage';
import { InventoryItem } from '../types';
import { Unit, CATEGORIES } from '../lib/renovationLogic';

const Inventory: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: '', quantity: 0, unit: Unit.PCS, pricePerUnit: 0, category: CATEGORIES[0] || 'Inne'
    });

    useEffect(() => {
        const load = async () => {
            const data = await getInventory();
            setItems(data);
            setIsLoading(false);
        };
        load();
    }, []);

    const openAddModal = () => {
        setEditingItem(null);
        setNewItem({ name: '', quantity: 0, unit: Unit.PCS, pricePerUnit: 0, category: CATEGORIES[0] || 'Inne' });
        setIsModalOpen(true);
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setNewItem({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Czy na pewno chcesz usunąć ten materiał?")) {
            await deleteInventoryItem(id);
            const data = await getInventory();
            setItems(data);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const itemToSave: InventoryItem = {
            id: editingItem ? editingItem.id : crypto.randomUUID(),
            name: newItem.name || 'Unnamed',
            quantity: Number(newItem.quantity),
            unit: newItem.unit || Unit.PCS,
            pricePerUnit: Number(newItem.pricePerUnit),
            category: newItem.category || 'Inne'
        };

        await saveInventoryItem(itemToSave);
        const data = await getInventory();
        setItems(data);
        setIsModalOpen(false);
    };

    const filteredItems = items.filter(i => {
        const search = searchTerm.toLowerCase();
        return (
            (i.name?.toLowerCase() || '').includes(search) || 
            (i.category?.toLowerCase() || '').includes(search)
        );
    });

    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl w-full mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Magazyn</h1>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <label className="flex flex-col min-w-40 h-12 w-full">
                                <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-gray-300 dark:border-gray-600 overflow-hidden">
                                    <div className="text-gray-500 dark:text-gray-400 flex bg-gray-50 dark:bg-gray-700 items-center justify-center pl-4 border-r border-gray-300 dark:border-gray-600">
                                        <span className="material-symbols-outlined">search</span>
                                    </div>
                                    <input 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex w-full min-w-0 flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-0 px-4 placeholder:text-gray-500 dark:placeholder:text-gray-400" 
                                        placeholder="Wyszukaj materiał..." 
                                    />
                                </div>
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={openAddModal}
                                className="flex min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors"
                            >
                                <span className="material-symbols-outlined">add</span>
                                <span className="truncate">Dodaj materiał</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Nazwa materiału</th>
                                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Kategoria</th>
                                    <th className="hidden sm:table-cell px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 text-right">Ilość</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 text-right">Cena jedn.</th>
                                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center">Ładowanie...</td></tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Brak materiałów w magazynie.</td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors last:border-0">
                                            <td className="px-4 py-4 text-sm font-bold text-gray-900 dark:text-white">{item.name}</td>
                                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">{item.category}</span>
                                            </td>
                                            <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-right font-mono">
                                                {item.quantity} {item.unit}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-right">
                                                {item.pricePerUnit.toFixed(2)} zł
                                            </td>
                                            <td className="px-4 py-4 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEditModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edytuj">
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors" title="Usuń">
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingItem ? 'Edytuj Materiał' : 'Nowy Materiał'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <label className="block">
                                <span className="text-xs font-bold text-gray-500 uppercase">Nazwa materiału</span>
                                <input required className="form-input w-full rounded-lg dark:bg-slate-800 mt-1" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                            </label>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Ilość</span>
                                    <input type="number" required className="form-input w-full rounded-lg dark:bg-slate-800 mt-1" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Jednostka</span>
                                    <select className="form-select w-full rounded-lg dark:bg-slate-800 mt-1" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value as any})}>
                                        {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Cena jedn. (zł)</span>
                                    <input type="number" step="0.01" required className="form-input w-full rounded-lg dark:bg-slate-800 mt-1" value={newItem.pricePerUnit} onChange={e => setNewItem({...newItem, pricePerUnit: parseFloat(e.target.value)})} />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Kategoria</span>
                                    <select 
                                        className="form-select w-full rounded-lg dark:bg-slate-800 mt-1" 
                                        value={newItem.category} 
                                        onChange={e => setNewItem({...newItem, category: e.target.value})}
                                    >
                                        <option value="">Wybierz kategorię</option>
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="Inne">Inne</option>
                                    </select>
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700">Anuluj</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">Zapisz</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;