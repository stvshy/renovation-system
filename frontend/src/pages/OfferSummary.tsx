import React from 'react';
import { useNavigate } from 'react-router-dom';

const OfferSummary: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                {/* Page Heading */}
                <div className="flex flex-wrap justify-between gap-4 p-4">
                    <p className="text-[#0d141b] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72 font-display">Plan remontu: ul. Główna 123</p>
                    <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        <span className="truncate">Drukuj / Pobierz PDF</span>
                    </button>
                </div>

                {/* Total Cost Card */}
                <div className="p-4 @container">
                    <div className="flex flex-col items-center justify-center rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white dark:bg-background-dark/50 p-8 border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-normal leading-normal font-display">Szacowany koszt całkowity</p>
                        <p className="text-accent text-6xl font-black leading-tight tracking-[-0.033em] mt-2 font-display">12 500 zł</p>
                    </div>
                </div>

                {/* Project Details */}
                <h2 className="text-[#0d141b] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-8 flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">info</span>
                    Szczegóły projektu
                </h2>
                <div className="bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-[25%_1fr] gap-x-6 gap-y-4 md:gap-y-0">
                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-[25%_1fr] border-t border-t-gray-200 dark:border-t-gray-700 py-5 first:border-t-0">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal font-display">Klient</p>
                            <p className="text-[#0d141b] dark:text-white text-sm font-normal leading-normal font-display">Jan Kowalski</p>
                        </div>
                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-[25%_1fr] border-t border-t-gray-200 dark:border-t-gray-700 py-5">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal font-display">Adres projektu</p>
                            <p className="text-[#0d141b] dark:text-white text-sm font-normal leading-normal font-display">ul. Główna 123, Warszawa, Polska</p>
                        </div>
                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-[25%_1fr] border-t border-t-gray-200 dark:border-t-gray-700 py-5">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal font-display">Termin realizacji</p>
                            <p className="text-[#0d141b] dark:text-white text-sm font-normal leading-normal font-display">15.03.2024 do 25.03.2024</p>
                        </div>
                    </div>
                </div>

                {/* Scope of Work */}
                <h2 className="text-[#0d141b] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-8 flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">construction</span>
                    Zakres prac
                </h2>
                <div className="bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700">
                    <ul className="p-6 list-disc list-inside space-y-3">
                        <li className="text-[#0d141b] dark:text-white text-sm font-normal leading-normal font-display">Malowanie ścian i sufitów (Pokój 1)</li>
                        <li className="text-[#0d141b] dark:text-white text-sm font-normal leading-normal font-display">Układanie nowych paneli podłogowych (Pokój 1)</li>
                        <li className="text-[#0d141b] dark:text-white text-sm font-normal leading-normal font-display">Montaż listew przypodłogowych</li>
                    </ul>
                </div>

                {/* Materials List */}
                <h2 className="text-[#0d141b] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-8 flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">list_alt</span>
                    Lista materiałów
                </h2>
                <div className="bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 font-display">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Materiał</th>
                                <th scope="col" className="px-6 py-3">Ilość</th>
                                <th scope="col" className="px-6 py-3">Jednostka</th>
                                <th scope="col" className="px-6 py-3 text-right">Szacowany koszt</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-white dark:bg-background-dark/50 border-b dark:border-gray-700">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">Farba biała lateksowa</th>
                                <td className="px-6 py-4">20</td>
                                <td className="px-6 py-4">Litr</td>
                                <td className="px-6 py-4 text-right">800 zł</td>
                            </tr>
                            <tr className="bg-white dark:bg-background-dark/50 border-b dark:border-gray-700">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">Panele podłogowe Dąb Classic</th>
                                <td className="px-6 py-4">50</td>
                                <td className="px-6 py-4">m²</td>
                                <td className="px-6 py-4 text-right">3 500 zł</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr className="font-semibold text-gray-900 dark:text-white">
                                <th scope="row" colSpan={3} className="px-6 py-3 text-base text-right">Suma częściowa za materiały</th>
                                <td className="px-6 py-3 text-base text-right">4 300 zł</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Additional Notes */}
                <h2 className="text-[#0d141b] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-8 flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">sticky_note_2</span>
                    Dodatkowe uwagi
                </h2>
                <div className="bg-white dark:bg-background-dark/50 rounded-xl shadow-[0_0_4px_rgba(0,0,0,0.1)] p-6 border border-gray-200 dark:border-gray-700">
                    <p className="text-[#0d141b] dark:text-white text-sm font-normal leading-normal font-display">Klient prosi o szczególną uwagę przy zabezpieczeniu mebli.</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-end gap-4 p-4 mt-8">
                    <button onClick={() => navigate('/projects/new/room')} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-gray-700 text-[#0d141b] dark:text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        <span className="truncate">Wróć / Edytuj</span>
                    </button>
                    <button onClick={() => navigate('/projects')} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] font-display hover:bg-primary/90 transition-colors">
                        <span className="truncate">Zatwierdź plan</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OfferSummary;