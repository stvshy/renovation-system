import React from 'react';
import { MOCK_MATERIALS } from '../constants';

const Inventory: React.FC = () => {
    return (
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl w-full mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Magazyn</h1>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <label className="flex flex-col min-w-40 h-12 w-full">
                                <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                                    <div className="text-gray-500 dark:text-gray-400 flex border-none bg-background-light dark:bg-gray-700 items-center justify-center pl-4 rounded-l-lg border-r-0">
                                        <span className="material-symbols-outlined">search</span>
                                    </div>
                                    <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-background-light dark:bg-gray-700 h-full placeholder:text-gray-500 dark:placeholder:text-gray-400 px-4 pl-2 text-base font-normal" placeholder="Wyszukaj materiał..." />
                                </div>
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button className="flex min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors">
                                <span className="material-symbols-outlined">add</span>
                                <span className="truncate">Dodaj materiał</span>
                            </button>
                            <button className="flex min-w-[84px] items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-bold tracking-wide hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                <span className="material-symbols-outlined">assessment</span>
                                <span className="truncate">Generuj raport</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Nazwa materiału</th>
                                    <th className="hidden sm:table-cell px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Ilość</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Koszt jednostkowy</th>
                                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_MATERIALS.map((material) => (
                                    <tr key={material.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">{material.name}</td>
                                        <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{material.quantity} {material.unit}</td>
                                        <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{material.pricePerUnit} PLN/{material.unit}</td>
                                        <td className="px-4 py-4 text-sm text-right">
                                            <button className="font-medium text-primary hover:text-primary/80">Edytuj</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 mt-4">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Previous</button>
                            <button className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Next</button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700 dark:text-gray-400">
                                    Pokazuje <span className="font-medium">1</span> do <span className="font-medium">5</span> z <span className="font-medium">23</span> wyników
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0">
                                        <span className="sr-only">Previous</span>
                                        <span className="material-symbols-outlined h-5 w-5">chevron_left</span>
                                    </button>
                                    <button className="relative z-10 inline-flex items-center bg-primary px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">1</button>
                                    <button className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0">2</button>
                                    <button className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0">3</button>
                                    <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0">
                                        <span className="sr-only">Next</span>
                                        <span className="material-symbols-outlined h-5 w-5">chevron_right</span>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Inventory;