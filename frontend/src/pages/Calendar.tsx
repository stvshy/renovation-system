import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../lib/storage';
import { Project } from '../types';
import { useLanguage } from '../context/LanguageContext';

const Calendar: React.FC = () => {
    const navigate = useNavigate();
    const { language, t } = useLanguage();
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

    const monthNames = language === 'pl'
        ? ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"]
        : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = language === 'pl' ? ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Ndz'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
        <div className="flex flex-1 justify-center p-4 sm:p-6 md:p-8">
            <div className="layout-content-container flex flex-col w-full max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between gap-4 p-2 sm:p-0 sm:items-center mb-6">
                    <div className="flex items-center gap-3 text-slate-900 dark:text-slate-50">
                        <div className="size-8 mb-1 mr-1 text-primary -mt-1">
                            <span className="material-symbols-outlined !text-4xl">calendar_month</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">{t('Kalendarz', 'Calendar')}</h1>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <button onClick={handlePrevMonth} className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <p className="text-[#0d141b] dark:text-white text-base sm:text-xl font-bold font-display w-auto sm:w-48 text-center">
                            {monthNames[month]} {year}
                        </p>
                        <button onClick={handleNextMonth} className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                    <button
                        onClick={() => navigate('/projects/new/client')}
                        className="flex w-full sm:w-auto min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg mr-2">add</span>
                        <span className="truncate">{t('Dodaj nowy projekt', 'Add new project')}</span>
                    </button>
                </div>
                
                <div className="overflow-x-auto -mx-2 px-2 [touch-action:pan-x]" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="min-w-[560px] sm:min-w-[700px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                        {/* Header Row */}
                        <div className="grid grid-cols-7 text-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800">
                            {dayNames.map(day => (
                                <div key={day} className="py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-800 gap-px border-b border-gray-200 dark:border-gray-800">
                            
                            {/* Empty cells for previous month padding */}
                            {Array.from({ length: startDayOffset }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-white dark:bg-slate-900/50 min-h-[96px] sm:min-h-[120px]"></div>
                            ))}

                            {/* Days */}
                            {daysArray.map(day => {
                                const activeProjects = getActiveProjectsForDay(day);
                                const isToday = 
                                    day === new Date().getDate() && 
                                    month === new Date().getMonth() && 
                                    year === new Date().getFullYear();

                                return (
                                    <div key={day} className={`bg-white dark:bg-slate-900 min-h-[96px] sm:min-h-[120px] p-1.5 sm:p-2 flex flex-col relative group transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span 
                                                className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full 
                                                ${isToday 
                                                    ? 'bg-primary text-white' 
                                                    : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {day}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[72px] sm:max-h-[100px] custom-scrollbar">
                                            {activeProjects.map((proj, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/projects/${proj.id}`);
                                                    }}
                                                    className="px-1.5 sm:px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded shadow-sm border-l-4 truncate cursor-pointer hover:opacity-80 transition-opacity text-slate-800"
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
                                <div key={`empty-end-${i}`} className="bg-white dark:bg-slate-900/50 min-h-[96px] sm:min-h-[120px]"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;