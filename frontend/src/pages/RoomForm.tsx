import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Room, Surface, SurfaceType, Opening, OpeningType } from '../lib/renovationLogic';

type Mode = 'standard' | 'custom';

// Helper to rehydrate surface objects (restore methods) from serialized state
const rehydrateSurface = (s: any): Surface => {
    // Note: rehydrate using the new 5th parameter for customArea
    const surface = new Surface(s.name, s.type, s.width, s.height, s.customArea);
    if (s.openings && Array.isArray(s.openings)) {
        s.openings.forEach((o: any) => {
            surface.addOpening(new Opening(o.width, o.height, o.type));
        });
    }
    return surface;
};

const RoomForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Retrieve passed data
    const existingRooms: any[] = location.state?.rooms || [];
    const clientData = location.state?.clientData;
    const projectDates = location.state?.projectDates;

    // State for Editing
    const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);

    // Basic Info
    const [roomName, setRoomName] = useState(`Pokój ${existingRooms.length + 1}`);
    const [mode, setMode] = useState<Mode>('standard');

    // Standard Mode Dimensions
    const [length, setLength] = useState<string>('');
    const [width, setWidth] = useState<string>('');
    const [height, setHeight] = useState<string>('');

    // Surfaces State
    const [surfaces, setSurfaces] = useState<Surface[]>([]);

    // Opening Input State
    const [openingDims, setOpeningDims] = useState<{w: string, h: string, type: OpeningType}>({ w: '', h: '', type: 'okno' });
    const [activeSurfaceIndex, setActiveSurfaceIndex] = useState<number | null>(null);

    // Initial Generation for Standard Mode (Only if not editing or explicitly setting standard mode)
    useEffect(() => {
        if (mode === 'standard' && editingRoomIndex === null) {
            const l = parseFloat(length) || 0;
            const w = parseFloat(width) || 0;
            const h = parseFloat(height) || 0;

            if (l > 0 && w > 0 && h > 0) {
                const newSurfaces: Surface[] = [];
                newSurfaces.push(new Surface("Podłoga", SurfaceType.FLOOR, l, w));
                newSurfaces.push(new Surface("Sufit", SurfaceType.CEILING, l, w));
                newSurfaces.push(new Surface("Ściana 1", SurfaceType.WALL, l, h));
                newSurfaces.push(new Surface("Ściana 2", SurfaceType.WALL, l, h));
                newSurfaces.push(new Surface("Ściana 3", SurfaceType.WALL, w, h));
                newSurfaces.push(new Surface("Ściana 4", SurfaceType.WALL, w, h));
                
                setSurfaces(newSurfaces);
            }
        }
    }, [length, width, height, mode, editingRoomIndex]);

    const handleAddSurface = (type: SurfaceType) => {
        setSurfaces([...surfaces, new Surface(`Nowa ${type}`, type, 0, 0)]);
    };

    const handleUpdateSurface = (index: number, field: 'name' | 'width' | 'height' | 'area', value: string) => {
        const updatedSurfaces = [...surfaces];
        const surface = updatedSurfaces[index];
        
        if (field === 'name') surface.name = value;
        if (field === 'width') surface.width = parseFloat(value) || 0;
        if (field === 'height') surface.height = parseFloat(value) || 0;
        if (field === 'area') {
            const val = parseFloat(value);
            surface.customArea = isNaN(val) ? undefined : val;
        }
        
        setSurfaces(updatedSurfaces);
    };

    const handleRemoveSurface = (index: number) => {
        const updatedSurfaces = [...surfaces];
        updatedSurfaces.splice(index, 1);
        setSurfaces(updatedSurfaces);
    };

    const handleAddOpening = (surfaceIndex: number) => {
        const w = parseFloat(openingDims.w);
        const h = parseFloat(openingDims.h);
        
        if (w > 0 && h > 0) {
            const updatedSurfaces = [...surfaces];
            updatedSurfaces[surfaceIndex].addOpening(new Opening(w, h, openingDims.type));
            setSurfaces(updatedSurfaces);
            setOpeningDims({ w: '', h: '', type: 'okno' });
        }
    };

    const handleRemoveOpening = (surfaceIndex: number, openingIndex: number) => {
        const updatedSurfaces = [...surfaces];
        updatedSurfaces[surfaceIndex].removeOpening(openingIndex);
        setSurfaces(updatedSurfaces);
    };

    // --- Edit Logic ---

    const handleEditRoom = (index: number) => {
        const roomData = existingRooms[index];
        setEditingRoomIndex(index);
        setRoomName(roomData.name);
        
        // Rehydrate surfaces to ensure methods like getNetArea exist
        const hydratedSurfaces = roomData.surfaces.map((s: any) => rehydrateSurface(s));
        setSurfaces(hydratedSurfaces);

        setMode('custom');
        setLength('');
        setWidth('');
        setHeight('');
        window.scrollTo(0, 0);
    };

    const handleCancelEdit = () => {
        setEditingRoomIndex(null);
        setRoomName(`Pokój ${existingRooms.length + 1}`);
        setSurfaces([]);
        setMode('standard');
        setLength('');
        setWidth('');
        setHeight('');
    };

    // --- Save Logic ---

    const createRoomObject = () => {
        const room = new Room(roomName);
        surfaces.forEach(s => room.addSurface(s));
        return room;
    };

    const handleSaveAndAddNext = () => {
        const newRoom = createRoomObject();
        const updatedRooms = [...existingRooms];
        
        if (editingRoomIndex !== null) {
            updatedRooms[editingRoomIndex] = newRoom;
        } else {
            updatedRooms.push(newRoom);
        }
        
        navigate('/projects/new/room', { 
            state: { 
                rooms: updatedRooms,
                clientData,
                projectDates
            }, 
            replace: true 
        });
        
        setEditingRoomIndex(null);
        setRoomName(`Pokój ${updatedRooms.length + 1}`);
        setLength('');
        setWidth('');
        setHeight('');
        setSurfaces([]);
        setMode('standard');
        window.scrollTo(0, 0);
    };

    const handleSaveAndProceedToServices = () => {
        const newRoom = createRoomObject();
        const updatedRooms = [...existingRooms];
        
        if (editingRoomIndex !== null) {
            updatedRooms[editingRoomIndex] = newRoom;
        } else {
            updatedRooms.push(newRoom);
        }

        // Navigate to ServiceForm instead of OfferSummary, passing all context
        navigate('/projects/new/services', { 
            state: { 
                rooms: updatedRooms,
                clientData,
                projectDates
            } 
        });
    };

    const getTotalArea = (type: SurfaceType) => {
        return surfaces
            .filter(s => s.type === type)
            .reduce((sum, s) => sum + s.getNetArea(), 0);
    };

    return (
        <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                
                {/* Header with Project Context */}
                <div className="flex flex-col gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                         <p className="text-text-dark dark:text-off-white text-3xl font-black leading-tight tracking-[-0.033em]">
                            {editingRoomIndex !== null ? 'Edycja Pokoju' : 'Definicja Pokoju'}
                        </p>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                            Krok 2: Dodawanie pomieszczeń
                        </span>
                    </div>
                    {clientData && (
                        <p className="text-sm text-gray-500">
                            Projekt dla: <span className="font-semibold">{clientData.firstName} {clientData.lastName}</span>
                        </p>
                    )}
                    
                    {/* List of Existing Rooms */}
                    {existingRooms.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pokoje w projekcie:</p>
                            <div className="flex flex-wrap gap-2">
                                {existingRooms.map((r, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => handleEditRoom(idx)}
                                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border transition-all 
                                            ${editingRoomIndex === idx 
                                                ? 'bg-primary text-white border-primary shadow-md' 
                                                : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 hover:border-primary text-gray-700 dark:text-gray-200'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-base">
                                            {editingRoomIndex === idx ? 'edit' : 'check_circle'}
                                        </span>
                                        {r.name}
                                    </button>
                                ))}
                                {editingRoomIndex === null && (
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-slate-800 text-gray-400 border border-dashed border-gray-300">
                                        <span>Nowy Pokój...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* 1. Room Name & Mode */}
                <div className="p-4 flex flex-col gap-6">
                    <div className="flex flex-col">
                         <label className="text-text-dark dark:text-off-white text-base font-medium leading-normal pb-2">Nazwa Pokoju</label>
                         <input 
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="form-input w-full rounded-lg border border-neutral-gray/50 dark:border-neutral-gray/70 bg-off-white dark:bg-background-dark p-3"
                            placeholder="np. Salon, Sypialnia"
                        />
                    </div>
                    
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
                        <button 
                            onClick={() => setMode('standard')}
                            disabled={editingRoomIndex !== null}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'standard' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} ${editingRoomIndex !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={editingRoomIndex !== null ? "Podczas edycji dostępny jest tylko tryb nieregularny" : ""}
                        >
                            Standardowy (Prostokąt)
                        </button>
                        <button 
                            onClick={() => setMode('custom')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'custom' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} ${editingRoomIndex !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Nieregularny (Własny)
                        </button>
                    </div>
                </div>

                {/* 2. Dimensions Input (Standard Mode) */}
                {mode === 'standard' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mx-4 border border-slate-200 dark:border-slate-700 animate-fade-in">
                        <h2 className="text-lg font-bold text-dependable-blue dark:text-primary mb-4">Wymiary całkowite</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className="flex flex-col">
                                <span className="mb-1 text-sm font-medium">Długość (m)</span>
                                <input type="number" value={length} onChange={(e) => setLength(e.target.value)} className="form-input rounded-lg border-gray-300 dark:bg-slate-800 p-2" />
                            </label>
                            <label className="flex flex-col">
                                <span className="mb-1 text-sm font-medium">Szerokość (m)</span>
                                <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="form-input rounded-lg border-gray-300 dark:bg-slate-800 p-2" />
                            </label>
                            <label className="flex flex-col">
                                <span className="mb-1 text-sm font-medium">Wysokość (m)</span>
                                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="form-input rounded-lg border-gray-300 dark:bg-slate-800 p-2" />
                            </label>
                        </div>
                    </div>
                )}

                {/* 3. Surface List & Management */}
                <div className="p-4 mt-4 space-y-4">
                    <div className="flex justify-between items-end border-b border-gray-200 dark:border-gray-700 pb-2">
                        <h2 className="text-xl font-bold text-dependable-blue dark:text-primary">Lista Powierzchni</h2>
                        <div className="text-right text-sm text-gray-500">
                            <p>Ściany: {getTotalArea(SurfaceType.WALL).toFixed(2)} m²</p>
                            <p>Podłoga: {getTotalArea(SurfaceType.FLOOR).toFixed(2)} m²</p>
                        </div>
                    </div>

                    {mode === 'custom' && (
                        <div className="flex gap-2 mb-4 animate-fade-in">
                            <button onClick={() => handleAddSurface(SurfaceType.WALL)} className="btn-secondary text-xs px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">+ Ściana</button>
                            <button onClick={() => handleAddSurface(SurfaceType.FLOOR)} className="btn-secondary text-xs px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">+ Podłoga</button>
                            <button onClick={() => handleAddSurface(SurfaceType.CEILING)} className="btn-secondary text-xs px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">+ Sufit</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {surfaces.map((surface, index) => (
                            <div key={index} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm relative group">
                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center w-full">
                                        <div className="md:col-span-3">
                                            {mode === 'custom' ? (
                                                <input 
                                                    value={surface.name} 
                                                    onChange={(e) => handleUpdateSurface(index, 'name', e.target.value)} 
                                                    className="font-bold bg-transparent border-b border-dashed border-gray-300 w-full focus:outline-none focus:border-primary"
                                                />
                                            ) : (
                                                <span className="font-bold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-gray-400">
                                                        {surface.type === SurfaceType.WALL ? 'grid_view' : surface.type === SurfaceType.FLOOR ? 'check_box_outline_blank' : 'roofing'}
                                                    </span>
                                                    {surface.name}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400 block mt-1">{surface.type}</span>
                                        </div>
                                        
                                        {/* Dimension Inputs */}
                                        <div className="md:col-span-6 flex flex-wrap gap-x-4 gap-y-2">
                                             <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-500">Szer:</label>
                                                <input 
                                                    type="number" 
                                                    disabled={mode === 'standard'}
                                                    value={surface.width || ''} 
                                                    onChange={(e) => handleUpdateSurface(index, 'width', e.target.value)}
                                                    className="w-16 p-1 text-sm border rounded bg-gray-50 dark:bg-slate-900 disabled:opacity-60"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-500">Wys/Dł:</label>
                                                <input 
                                                    type="number" 
                                                    disabled={mode === 'standard'}
                                                    value={surface.height || ''} 
                                                    onChange={(e) => handleUpdateSurface(index, 'height', e.target.value)}
                                                    className="w-16 p-1 text-sm border rounded bg-gray-50 dark:bg-slate-900 disabled:opacity-60"
                                                />
                                            </div>
                                            {mode === 'custom' && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-primary font-bold">LUB Powierzchnia:</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Auto"
                                                        value={surface.customArea || ''} 
                                                        onChange={(e) => handleUpdateSurface(index, 'area', e.target.value)}
                                                        className="w-16 p-1 text-sm border border-primary/30 rounded bg-primary/5 dark:bg-slate-900"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="md:col-span-3 text-right">
                                            <span className="font-bold text-lg text-primary">{surface.getNetArea().toFixed(2)} m²</span>
                                            {surface.openings.length > 0 && <span className="text-xs text-red-400 block">(-{surface.openings.reduce((a, b) => a + b.getArea(), 0).toFixed(2)} m² otworów)</span>}
                                        </div>
                                    </div>

                                    {mode === 'custom' && (
                                        <button onClick={() => handleRemoveSurface(index)} className="text-red-400 hover:text-red-600 px-2">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    )}
                                </div>

                                {/* Openings Section */}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex flex-wrap gap-2 items-center mb-2">
                                        <span className="text-xs font-semibold text-gray-500">Otwory:</span>
                                        {surface.openings.map((op, opIdx) => (
                                            <div key={opIdx} className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs px-2 py-1 rounded border border-red-100 dark:border-red-800">
                                                <span>{op.type === 'okno' ? '🪟' : '🚪'} {op.width}x{op.height}m</span>
                                                <button onClick={() => handleRemoveOpening(index, opIdx)} className="hover:text-red-800 ml-1">×</button>
                                            </div>
                                        ))}
                                        {surface.openings.length === 0 && <span className="text-xs text-gray-400 italic">Brak otworów</span>}
                                    </div>

                                    {/* Add Opening Form - Improved Styling */}
                                    {activeSurfaceIndex === index ? (
                                        <div className="flex flex-wrap items-center gap-2 mt-2 bg-gray-50 dark:bg-gray-700 p-2 rounded animate-fade-in w-fit">
                                            <select 
                                                value={openingDims.type} 
                                                onChange={(e) => setOpeningDims({...openingDims, type: e.target.value as OpeningType})}
                                                className="text-xs p-1 h-8 rounded border-gray-300"
                                            >
                                                <option value="okno">Okno</option>
                                                <option value="drzwi">Drzwi</option>
                                            </select>
                                            <input 
                                                type="number" placeholder="Szer" 
                                                value={openingDims.w} 
                                                onChange={(e) => setOpeningDims({...openingDims, w: e.target.value})}
                                                className="w-16 text-xs p-1 h-8 rounded border-gray-300"
                                            />
                                            <input 
                                                type="number" placeholder="Wys" 
                                                value={openingDims.h} 
                                                onChange={(e) => setOpeningDims({...openingDims, h: e.target.value})}
                                                className="w-16 text-xs p-1 h-8 rounded border-gray-300"
                                            />
                                            <button onClick={() => handleAddOpening(index)} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 h-8 rounded font-bold">Dodaj</button>
                                            <button onClick={() => setActiveSurfaceIndex(null)} className="text-gray-500 hover:text-gray-700 text-xs px-2">Anuluj</button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setActiveSurfaceIndex(index)}
                                            className="text-xs font-medium text-primary hover:underline flex items-center gap-1 mt-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">add</span>
                                            Dodaj okno/drzwi
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {surfaces.length === 0 && (
                        <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">Brak zdefiniowanych powierzchni. {mode === 'standard' ? 'Wprowadź wymiary powyżej.' : 'Dodaj ściany ręcznie.'}</p>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col md:flex-row px-4 py-8 justify-end gap-4">
                     {editingRoomIndex !== null && (
                         <button 
                            onClick={handleCancelEdit}
                            className="px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            Anuluj edycję
                        </button>
                     )}

                    <button 
                        onClick={() => navigate('/projects')}
                        className="px-6 py-3 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-300 transition-colors"
                    >
                        Wyjdź
                    </button>
                    
                    <button 
                        onClick={handleSaveAndAddNext}
                        disabled={surfaces.length === 0}
                        className={`flex items-center gap-2 justify-center px-6 py-3 rounded-lg border-2 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-transparent ${
                            editingRoomIndex !== null 
                            ? 'border-green-600 text-green-600 hover:bg-green-50' 
                            : 'border-primary text-primary hover:bg-primary/5'
                        }`}
                    >
                        <span className="material-symbols-outlined">
                            {editingRoomIndex !== null ? 'save' : 'add_circle'}
                        </span>
                        {editingRoomIndex !== null ? 'Zapisz zmiany i dodaj kolejny' : 'Zapisz i dodaj kolejny pokój'}
                    </button>

                    <button 
                        onClick={handleSaveAndProceedToServices}
                        disabled={surfaces.length === 0}
                        className="flex items-center gap-2 justify-center px-6 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined">handyman</span>
                        {editingRoomIndex !== null ? 'Zapisz i przejdź do usług' : 'Zapisz i przejdź do usług'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomForm;