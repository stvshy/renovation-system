import React, { useState, useEffect } from 'react';
import { getServiceCatalog, saveServiceTemplate, deleteServiceTemplate } from '../lib/storage';
import { ServiceTemplate, Unit, CATEGORIES } from '../lib/renovationLogic';

const Settings: React.FC = () => {
    const [services, setServices] = useState<ServiceTemplate[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ServiceTemplate | null>(null);

    // Form State
    const [newService, setNewService] = useState<Partial<ServiceTemplate>>({
        name: '', 
        category: 'Inne', 
        laborRate: 50,
        defaultStrategy: 'item',
        defaultParam: 1,
        suggestedScope: 'manual',
        materials: []
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
            name: '', 
            category: 'Inne', 
            laborRate: 50,
            defaultStrategy: 'consumption',
            defaultParam: 1,
            suggestedScope: 'manual',
            materials: []
        });
        setIsModalOpen(true);
    };

    const openEditModal = (item: ServiceTemplate) => {
        setEditingItem(item);
        setNewService({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Czy na pewno chcesz usunąć ten rodzaj prac?")) {
            await deleteServiceTemplate(id);
            const data = await getServiceCatalog();
            setServices(data);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const templateToSave: ServiceTemplate = {
            id: editingItem ? editingItem.id : crypto.randomUUID(),
            name: newService.name || 'Nowa usługa',
            category: newService.category || 'Inne',
            laborRate: Number(newService.laborRate),
            defaultStrategy: newService.defaultStrategy as any,
            defaultParam: Number(newService.defaultParam),
            suggestedScope: newService.suggestedScope as any,
            materials: newService.materials || []
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
                        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Ustawienia</h1>
                        <p className="text-gray-500 mt-2">Definiuj rodzaje prac i stawki robocizny.</p>
                    </div>
                    <button 
                        onClick={openAddModal}
                        className="flex min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Dodaj Rodzaj Prac
                    </button>
                </div>

                <div className="space-y-8">
                    {Object.keys(groupedServices).map(category => (
                        <div key={category} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                                <span className="material-symbols-outlined text-primary">category</span>
                                {category}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedServices[category].map(service => (
                                    <div key={service.id} className="p-4 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors relative group">
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditModal(service)} className="p-1 text-blue-600 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-blue-50">
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(service.id)} className="p-1 text-red-500 bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-red-50">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white pr-10">{service.name}</h3>
                                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                            <p className="flex justify-between">
                                                <span>Robocizna:</span>
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">{service.laborRate} zł/{service.defaultStrategy === 'item' ? 'szt' : 'm²/mb'}</span>
                                            </p>
                                            <p className="flex justify-between">
                                                <span>Strategia:</span>
                                                <span className="italic">{service.defaultStrategy}</span>
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingItem ? 'Edytuj Usługę' : 'Nowa Usługa'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <label className="block">
                                <span className="text-xs font-bold text-gray-500 uppercase">Nazwa usługi</span>
                                <input required className="form-input w-full rounded-lg dark:bg-slate-800 mt-1" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} />
                            </label>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Kategoria</span>
                                    <select 
                                        className="form-select w-full rounded-lg dark:bg-slate-800 mt-1" 
                                        value={newService.category} 
                                        onChange={e => setNewService({...newService, category: e.target.value})}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Stawka Robocizny</span>
                                    <input type="number" required className="form-input w-full rounded-lg dark:bg-slate-800 mt-1" value={newService.laborRate} onChange={e => setNewService({...newService, laborRate: parseFloat(e.target.value)})} />
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Sposób liczenia</span>
                                    <select className="form-select w-full rounded-lg dark:bg-slate-800 mt-1" value={newService.defaultStrategy} onChange={e => setNewService({...newService, defaultStrategy: e.target.value as any})}>
                                        <option value="consumption">Zużycie (m²/l)</option>
                                        <option value="waste">Odpad (%)</option>
                                        <option value="linear">Liniowy (mb)</option>
                                        <option value="item">Na sztuki</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Domyślny Zakres</span>
                                    <select className="form-select w-full rounded-lg dark:bg-slate-800 mt-1" value={newService.suggestedScope} onChange={e => setNewService({...newService, suggestedScope: e.target.value as any})}>
                                        <option value="walls">Ściany</option>
                                        <option value="floor">Podłoga</option>
                                        <option value="ceiling">Sufit</option>
                                        <option value="perimeter">Obwód</option>
                                        <option value="manual">Ręczny</option>
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

export default Settings;