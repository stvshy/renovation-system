import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../lib/storage';
import { Project } from '../types';

const Calendar: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const load = async () => {
            const data = await getProjects();
            setProjects(data);
        };
        load();
    }, []);

    // Calendar logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
    // Adjust for Monday start (0=Mon, 6=Sun)
    const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Helper to check if a project is active on a given day
    const getActiveProjectsForDay = (day: number) => {
        const checkDate = new Date(year, month, day);
        checkDate.setHours(12, 0, 0, 0); // Avoid timezone edges

        return projects.filter(p => {
            if (!p.startDate || !p.endDate) return false;
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            // Reset times for pure date comparison
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            
            return checkDate >= start && checkDate <= end;
        });
    };

    return (
        <div className="px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                <div className="flex flex-wrap justify-between gap-4 p-4 items-center">
                    <p className="text-[#0d141b] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] font-display">Kalendarz</p>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <p className="text-[#0d141b] dark:text-white text-xl font-bold font-display w-48 text-center">
                            {monthNames[month]} {year}
                        </p>
                        <button onClick={handleNextMonth} className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                    <button 
                        onClick={() => navigate('/projects/new/client')}
                        className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-primary/90 transition-colors"
                    >
                        <span className="truncate">Dodaj nowy projekt</span>
                    </button>
                </div>
                
                <div className="p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                        {/* Header Row */}
                        <div className="grid grid-cols-7 text-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800">
                            {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'].map(day => (
                                <div key={day} className="py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-800 gap-px border-b border-gray-200 dark:border-gray-800">
                            
                            {/* Empty cells for previous month padding */}
                            {Array.from({ length: startDayOffset }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-white dark:bg-slate-900/50 min-h-[120px]"></div>
                            ))}

                            {/* Days */}
                            {daysArray.map(day => {
                                const activeProjects = getActiveProjectsForDay(day);
                                const isToday = 
                                    day === new Date().getDate() && 
                                    month === new Date().getMonth() && 
                                    year === new Date().getFullYear();

                                return (
                                    <div key={day} className={`bg-white dark:bg-slate-900 min-h-[120px] p-2 flex flex-col relative group transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span 
                                                className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full 
                                                ${isToday 
                                                    ? 'bg-primary text-white' 
                                                    : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {day}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                            {activeProjects.map((proj, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/projects/${proj.id}`);
                                                    }}
                                                    className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border-l-4 truncate cursor-pointer hover:opacity-80 transition-opacity text-slate-800"
                                                    style={{ 
                                                        backgroundColor: proj.color ? `${proj.color}40` : '#e2e8f0', // 25% opacity
                                                        borderLeftColor: proj.color || '#94a3b8',
                                                        color: '#1e293b'
                                                    }}
                                                    title={`${proj.name} - ${proj.clientName}`}
                                                >
                                                    {proj.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Fill remaining cells to complete the row if necessary (optional) */}
                            {Array.from({ length: (7 - (startDayOffset + daysInMonth) % 7) % 7 }).map((_, i) => (
                                <div key={`empty-end-${i}`} className="bg-white dark:bg-slate-900/50 min-h-[120px]"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;