import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RoomForm: React.FC = () => {
    const navigate = useNavigate();
    
    // State for measurements
    const [length, setLength] = useState<string>('');
    const [width, setWidth] = useState<string>('');
    const [height, setHeight] = useState<string>('');
    
    const [calculatedArea, setCalculatedArea] = useState<{
        floor: number;
        walls: number;
        ceiling: number;
    }>({ floor: 0, walls: 0, ceiling: 0 });

    useEffect(() => {
        const l = parseFloat(length) || 0;
        const w = parseFloat(width) || 0;
        const h = parseFloat(height) || 0;

        const floor = l * w;
        const ceiling = floor;
        const walls = (2 * l * h) + (2 * w * h);

        setCalculatedArea({ floor, walls, ceiling });
    }, [length, width, height]);

    return (
        <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                <div className="flex flex-wrap justify-between gap-3 p-4">
                    <p className="text-text-dark dark:text-off-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Dodaj nowy pokój</p>
                </div>
                
                <div className="p-4">
                    <h2 className="text-xl font-bold text-dependable-blue dark:text-primary mb-4">Wymiary pomieszczenia</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex flex-col flex-1">
                            <p className="text-text-dark dark:text-off-white text-base font-medium leading-normal pb-2">Długość (m)</p>
                            <input 
                                type="number"
                                value={length}
                                onChange={(e) => setLength(e.target.value)}
                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-dark dark:text-off-white dark:placeholder:text-neutral-gray focus:outline-0 focus:ring-0 border border-neutral-gray/50 dark:border-neutral-gray/70 bg-off-white dark:bg-background-dark focus:border-dependable-blue dark:focus:border-primary h-14 placeholder:text-neutral-gray p-[15px] text-base font-normal leading-normal" 
                                placeholder="Wprowadź długość" 
                            />
                        </label>
                        <label className="flex flex-col flex-1">
                            <p className="text-text-dark dark:text-off-white text-base font-medium leading-normal pb-2">Szerokość (m)</p>
                            <input 
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(e.target.value)}
                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-dark dark:text-off-white dark:placeholder:text-neutral-gray focus:outline-0 focus:ring-0 border border-neutral-gray/50 dark:border-neutral-gray/70 bg-off-white dark:bg-background-dark focus:border-dependable-blue dark:focus:border-primary h-14 placeholder:text-neutral-gray p-[15px] text-base font-normal leading-normal" 
                                placeholder="Wprowadź szerokość" 
                            />
                        </label>
                        <label className="flex flex-col flex-1">
                            <p className="text-text-dark dark:text-off-white text-base font-medium leading-normal pb-2">Wysokość (m)</p>
                            <input 
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-dark dark:text-off-white dark:placeholder:text-neutral-gray focus:outline-0 focus:ring-0 border border-neutral-gray/50 dark:border-neutral-gray/70 bg-off-white dark:bg-background-dark focus:border-dependable-blue dark:focus:border-primary h-14 placeholder:text-neutral-gray p-[15px] text-base font-normal leading-normal" 
                                placeholder="Wprowadź wysokość" 
                            />
                        </label>
                    </div>
                </div>

                <div className="p-4 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-dependable-blue dark:text-primary">Powierzchnie</h2>
                        <p className="text-text-dark dark:text-off-white text-base font-medium leading-normal">Całkowita powierzchnia ścian: <span className="font-bold">{calculatedArea.walls.toFixed(2)} m²</span></p>
                    </div>
                    
                    <div className="flex flex-col border border-neutral-gray/50 dark:border-neutral-gray/70 rounded-lg">
                        <details className="flex flex-col group" open>
                            <summary className="flex cursor-pointer items-center justify-between gap-6 p-4 bg-off-white/50 dark:bg-background-dark/50 rounded-t-lg select-none">
                                <p className="text-text-dark dark:text-off-white text-lg font-medium leading-normal">Ściany</p>
                                <span className="material-symbols-outlined text-text-dark dark:text-off-white group-open:rotate-180 transition-transform">expand_more</span>
                            </summary>
                            <div className="p-4 border-t border-neutral-gray/50 dark:border-neutral-gray/70">
                                <div className="space-y-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="p-4 border border-neutral-gray/30 dark:border-neutral-gray/60 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-semibold text-text-dark dark:text-off-white">Ściana {i}</h3>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-neutral-gray text-sm">Powierzchnia: {(calculatedArea.walls / 4).toFixed(2)} m²</p>
                                                    <button className="text-vibrant-orange hover:underline text-sm font-bold flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-base">edit</span>
                                                        Edytuj
                                                    </button>
                                                </div>
                                            </div>
                                            <button className="flex items-center gap-2 text-vibrant-orange hover:underline text-sm font-bold">
                                                <span className="material-symbols-outlined text-base">add_box</span>
                                                Dodaj okno/drzwi
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </details>
                        
                        <details className="flex flex-col group">
                            <summary className="flex cursor-pointer items-center justify-between gap-6 p-4 bg-off-white/50 dark:bg-background-dark/50 border-t border-neutral-gray/50 dark:border-neutral-gray/70 select-none">
                                <p className="text-text-dark dark:text-off-white text-lg font-medium leading-normal">Podłoga</p>
                                <span className="material-symbols-outlined text-text-dark dark:text-off-white group-open:rotate-180 transition-transform">expand_more</span>
                            </summary>
                            <div className="p-4 border-t border-neutral-gray/50 dark:border-neutral-gray/70">
                                <p className="text-neutral-gray dark:text-neutral-gray/90 text-base font-normal leading-normal">Powierzchnia podłogi: <span className="font-semibold text-text-dark dark:text-off-white">{calculatedArea.floor.toFixed(2)} m²</span></p>
                                <div className="mt-4">
                                     <button className="flex items-center gap-2 text-vibrant-orange hover:underline text-sm font-bold">
                                        <span className="material-symbols-outlined text-base">layers</span>
                                        Wybierz materiał (np. Panele)
                                    </button>
                                </div>
                            </div>
                        </details>

                        <details className="flex flex-col group">
                            <summary className="flex cursor-pointer items-center justify-between gap-6 p-4 bg-off-white/50 dark:bg-background-dark/50 border-t border-neutral-gray/50 dark:border-neutral-gray/70 rounded-b-lg select-none">
                                <p className="text-text-dark dark:text-off-white text-lg font-medium leading-normal">Sufit</p>
                                <span className="material-symbols-outlined text-text-dark dark:text-off-white group-open:rotate-180 transition-transform">expand_more</span>
                            </summary>
                            <div className="p-4 border-t border-neutral-gray/50 dark:border-neutral-gray/70">
                                <p className="text-neutral-gray dark:text-neutral-gray/90 text-base font-normal leading-normal">Powierzchnia sufitu: <span className="font-semibold text-text-dark dark:text-off-white">{calculatedArea.ceiling.toFixed(2)} m²</span></p>
                            </div>
                        </details>
                    </div>
                </div>

                <div className="flex px-4 py-8 justify-center">
                    <button 
                        onClick={() => navigate('/projects/new/offer')}
                        className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 flex-1 bg-dependable-blue dark:bg-primary text-off-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-dependable-blue/90 dark:hover:bg-primary/90 transition-colors"
                    >
                        <span className="truncate">Dodaj pokój i przejdź do Oferty</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomForm;