import React from 'react';

const Calendar: React.FC = () => {
    // Basic calendar grid generation (static for MVP, would be dynamic with date-fns/dayjs)
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    
    return (
        <div className="px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                <div className="flex flex-wrap justify-between gap-4 p-4 items-center">
                    <p className="text-[#0d141b] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] font-display">Kalendarz</p>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <p className="text-[#0d141b] dark:text-white text-xl font-bold font-display w-48 text-center">Marzec 2024</p>
                        <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                    <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-primary/90 transition-colors">
                        <span className="truncate">Dodaj nowy projekt</span>
                    </button>
                </div>
                
                <div className="p-4">
                    <div className="bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-7 text-center font-bold text-gray-500 dark:text-gray-400 p-4 border-b border-gray-200 dark:border-gray-700 font-display">
                            <div>Pon</div><div>Wt</div><div>Śr</div><div>Czw</div><div>Pt</div><div>Sob</div><div>Ndz</div>
                        </div>
                        <div className="grid grid-cols-7 grid-rows-5 gap-px">
                            {/* Empty cells for previous month padding */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 h-32"></div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 h-32"></div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 h-32"></div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 h-32"></div>

                            {/* Days */}
                            {days.map(day => {
                                const isProject1 = day >= 15 && day <= 19;
                                const isProject2 = day >= 25 && day <= 29;
                                
                                return (
                                    <div key={day} className="border-t border-l border-gray-200 dark:border-gray-700 p-2 h-32 text-right font-display text-gray-700 dark:text-gray-300 relative group">
                                        <span className="z-10 relative">{day}</span>
                                        {isProject1 && (
                                            <div className={`absolute inset-0 bg-primary/20 dark:bg-primary/40 p-1 mt-6 flex flex-col justify-start text-left ${day===15 ? 'rounded-l-lg' : ''} ${day===19 ? 'rounded-r-lg' : ''}`}>
                                                {day === 15 && (
                                                    <div className="bg-primary text-white text-xs font-bold rounded p-1 truncate shadow-sm">
                                                        Remont ul. Główna
                                                    </div>
                                                )}
                                                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-background-dark text-white dark:bg-white dark:text-background-dark p-2 rounded text-xs z-50 shadow-lg">
                                                    <p className="font-bold">Remont ul. Główna 123</p>
                                                    <p>Klient: Jan Kowalski</p>
                                                </div>
                                            </div>
                                        )}
                                         {isProject2 && (
                                            <div className={`absolute inset-0 bg-accent/20 dark:bg-accent/40 p-1 mt-6 flex flex-col justify-start text-left ${day===25 ? 'rounded-l-lg' : ''} ${day===29 ? 'rounded-r-lg' : ''}`}>
                                                {day === 25 && (
                                                    <div className="bg-accent text-white text-xs font-bold rounded p-1 truncate shadow-sm">
                                                        Projekt Leśna
                                                    </div>
                                                )}
                                                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-background-dark text-white dark:bg-white dark:text-background-dark p-2 rounded text-xs z-50 shadow-lg">
                                                    <p className="font-bold">Projekt Leśna Oaza</p>
                                                    <p>Klient: Anna Nowak</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;