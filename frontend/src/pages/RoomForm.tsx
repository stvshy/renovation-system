import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Room, Surface, SurfaceType, Opening, OpeningType } from "../lib/renovationLogic";
import { useLanguage } from "../context/LanguageContext";
import ScrollableSelect from "../components/ScrollableSelect";

type Mode = "standard" | "custom";
type SurfaceDraft = { width: string; height: string; area: string };
type ConfirmAction = { type: "delete-room"; roomIndex: number } | { type: "switch-to-standard" } | null;

const NON_NEGATIVE_NUMBER_PATTERN = /^\d*(\.\d*)?$/;

const isNonNegativeNumberInput = (value: string) => value === "" || NON_NEGATIVE_NUMBER_PATTERN.test(value);

const toEditableNumberString = (value?: number) => {
    if (value === undefined || value === null || value === 0) return "";
    return String(value);
};

const createSurfaceDraft = (surface: Surface): SurfaceDraft => ({
    width: toEditableNumberString(surface.width),
    height: toEditableNumberString(surface.height),
    area: toEditableNumberString(surface.customArea),
});

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
    const { t } = useLanguage();

    const localizeSurfaceName = (name: string) => {
        if (name === "Podłoga") return t("Podłoga", "Floor");
        if (name === "Sufit") return t("Sufit", "Ceiling");
        if (name.startsWith("Ściana ")) return name.replace("Ściana", t("Ściana", "Wall"));
        if (name.startsWith("Nowa ")) return name.replace("Nowa", t("Nowa", "New"));
        return name;
    };

    const localizeSurfaceType = (type: SurfaceType) => {
        if (type === SurfaceType.WALL) return t("Ściana", "Wall");
        if (type === SurfaceType.FLOOR) return t("Podłoga", "Floor");
        return t("Sufit", "Ceiling");
    };

    // Retrieve passed data
    const existingRooms: any[] = location.state?.rooms || [];
    const clientData = location.state?.clientData;
    const projectDates = location.state?.projectDates;

    // State for Editing
    const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);

    // Basic Info
    const [roomName, setRoomName] = useState(`${t("Pokój", "Room")} ${existingRooms.length + 1}`);
    const [mode, setMode] = useState<Mode>("standard");

    // Standard Mode Dimensions
    const [length, setLength] = useState<string>("");
    const [width, setWidth] = useState<string>("");
    const [height, setHeight] = useState<string>("");

    // Surfaces State
    const [surfaces, setSurfaces] = useState<Surface[]>([]);
    const [surfaceDrafts, setSurfaceDrafts] = useState<SurfaceDraft[]>([]);

    // Opening Input State
    const [openingDims, setOpeningDims] = useState<{ w: string; h: string; type: OpeningType }>({ w: "", h: "", type: "okno" });
    const [activeSurfaceIndex, setActiveSurfaceIndex] = useState<number | null>(null);
    const [hoveredRoomIndex, setHoveredRoomIndex] = useState<number | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

    const setSurfacesWithDrafts = (nextSurfaces: Surface[]) => {
        setSurfaces(nextSurfaces);
        setSurfaceDrafts(nextSurfaces.map(createSurfaceDraft));
    };

    const resetRoomForm = (roomCount: number) => {
        setEditingRoomIndex(null);
        setRoomName(`${t("Pokój", "Room")} ${roomCount + 1}`);
        setMode("standard");
        setLength("");
        setWidth("");
        setHeight("");
        setSurfaces([]);
        setSurfaceDrafts([]);
        setOpeningDims({ w: "", h: "", type: "okno" });
        setActiveSurfaceIndex(null);
        setHoveredRoomIndex(null);
    };

    const handleDimensionChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        if (!isNonNegativeNumberInput(value)) return;
        setter(value);
    };

    const handleOpeningDimensionChange = (field: "w" | "h", value: string) => {
        if (!isNonNegativeNumberInput(value)) return;
        setOpeningDims((current) => ({ ...current, [field]: value }));
    };

    const handleModeChange = (nextMode: Mode) => {
        if (nextMode === mode) return;

        const hasExistingRoomData = surfaces.length > 0 || length !== "" || width !== "" || height !== "";

        if (mode === "custom" && nextMode === "standard" && hasExistingRoomData) {
            setConfirmAction({ type: "switch-to-standard" });
            return;
        }

        setMode(nextMode);
    };

    // Initial Generation for Standard Mode (Only if not editing or explicitly setting standard mode)
    useEffect(() => {
        if (mode !== "standard") return;

        const l = parseFloat(length) || 0;
        const w = parseFloat(width) || 0;
        const h = parseFloat(height) || 0;

        if (l > 0 && w > 0 && h > 0) {
            const nextSurfaces: Surface[] = [];
            nextSurfaces.push(new Surface("Podłoga", SurfaceType.FLOOR, l, w));
            nextSurfaces.push(new Surface("Sufit", SurfaceType.CEILING, l, w));
            nextSurfaces.push(new Surface("Ściana 1", SurfaceType.WALL, l, h));
            nextSurfaces.push(new Surface("Ściana 2", SurfaceType.WALL, l, h));
            nextSurfaces.push(new Surface("Ściana 3", SurfaceType.WALL, w, h));
            nextSurfaces.push(new Surface("Ściana 4", SurfaceType.WALL, w, h));

            setSurfacesWithDrafts(nextSurfaces);
        } else {
            setSurfacesWithDrafts([]);
        }
    }, [length, width, height, mode]);

    const handleAddSurface = (type: SurfaceType) => {
        const typeLabel = type === SurfaceType.WALL ? t("Ściana", "Wall") : type === SurfaceType.FLOOR ? t("Podłoga", "Floor") : t("Sufit", "Ceiling");
        setSurfacesWithDrafts([...surfaces, new Surface(`${t("Nowa", "New")} ${typeLabel}`, type, 0, 0)]);
    };

    const handleUpdateSurface = (index: number, field: "name" | "width" | "height" | "area", value: string) => {
        const updatedSurfaces = [...surfaces];
        const updatedDrafts = [...surfaceDrafts];
        const surface = updatedSurfaces[index];

        if (field === "name") surface.name = value;
        if (field === "width") {
            if (!isNonNegativeNumberInput(value)) return;
            updatedDrafts[index] = { ...updatedDrafts[index], width: value };
            surface.width = value === "" ? 0 : parseFloat(value);
        }
        if (field === "height") {
            if (!isNonNegativeNumberInput(value)) return;
            updatedDrafts[index] = { ...updatedDrafts[index], height: value };
            surface.height = value === "" ? 0 : parseFloat(value);
        }
        if (field === "area") {
            if (!isNonNegativeNumberInput(value)) return;
            updatedDrafts[index] = { ...updatedDrafts[index], area: value };
            const val = parseFloat(value);
            surface.customArea = value === "" || isNaN(val) ? undefined : val;
        }

        setSurfaces(updatedSurfaces);
        setSurfaceDrafts(updatedDrafts);
    };

    const handleRemoveSurface = (index: number) => {
        const updatedSurfaces = [...surfaces];
        updatedSurfaces.splice(index, 1);
        setSurfacesWithDrafts(updatedSurfaces);
        if (activeSurfaceIndex === index) setActiveSurfaceIndex(null);
        if (activeSurfaceIndex !== null && activeSurfaceIndex > index) setActiveSurfaceIndex(activeSurfaceIndex - 1);
    };

    const handleAddOpening = (surfaceIndex: number) => {
        const w = parseFloat(openingDims.w);
        const h = parseFloat(openingDims.h);

        if (w > 0 && h > 0) {
            const updatedSurfaces = [...surfaces];
            updatedSurfaces[surfaceIndex].addOpening(new Opening(w, h, openingDims.type));
            setSurfacesWithDrafts(updatedSurfaces);
            setOpeningDims({ w: "", h: "", type: "okno" });
        }
    };

    const handleRemoveOpening = (surfaceIndex: number, openingIndex: number) => {
        const updatedSurfaces = [...surfaces];
        updatedSurfaces[surfaceIndex].removeOpening(openingIndex);
        setSurfacesWithDrafts(updatedSurfaces);
    };

    // --- Edit Logic ---

    const handleEditRoom = (index: number) => {
        const roomData = existingRooms[index];
        setEditingRoomIndex(index);
        setRoomName(roomData.name);

        // Rehydrate surfaces to ensure methods like getNetArea exist
        const hydratedSurfaces = roomData.surfaces.map((s: any) => rehydrateSurface(s));
        setSurfacesWithDrafts(hydratedSurfaces);

        setMode("custom");
        setLength("");
        setWidth("");
        setHeight("");
        window.scrollTo(0, 0);
    };

    const handleCancelEdit = () => {
        resetRoomForm(existingRooms.length);
    };

    const handleConfirmSwitchToStandard = () => {
        setConfirmAction(null);
        setMode("standard");
        setLength("");
        setWidth("");
        setHeight("");
        setSurfaces([]);
        setSurfaceDrafts([]);
        setOpeningDims({ w: "", h: "", type: "okno" });
        setActiveSurfaceIndex(null);
    };

    const handleDeleteRoom = (roomIndex: number) => {
        const updatedRooms = existingRooms.filter((_, idx) => idx !== roomIndex);
        navigate("/projects/new/room", {
            state: {
                rooms: updatedRooms,
                clientData,
                projectDates,
            },
            replace: true,
        });

        resetRoomForm(updatedRooms.length);
        setConfirmAction(null);
    };

    // --- Save Logic ---

    const createRoomObject = () => {
        const room = new Room(roomName);
        surfaces.forEach((s) => room.addSurface(s));
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

        navigate("/projects/new/room", {
            state: {
                rooms: updatedRooms,
                clientData,
                projectDates,
            },
            replace: true,
        });

        resetRoomForm(updatedRooms.length);
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
        navigate("/projects/new/services", {
            state: {
                rooms: updatedRooms,
                clientData,
                projectDates,
            },
        });
    };

    const getTotalArea = (type: SurfaceType) => {
        return surfaces.filter((s) => s.type === type).reduce((sum, s) => sum + s.getNetArea(), 0);
    };

    return (
        <div className="px-3 sm:px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-4 sm:py-5">
            <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                {/* Header with Project Context */}
                <div className="flex flex-col gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <p className="text-text-dark dark:text-off-white text-2xl sm:text-3xl font-black leading-tight tracking-[-0.033em]">
                            {editingRoomIndex !== null ? t("Edycja Pokoju", "Edit Room") : t("Definicja Pokoju", "Room Definition")}
                        </p>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full w-fit">{t('Krok 2: Dodawanie pomieszczeń', 'Step 2: Adding rooms')}</span>
                    </div>
                    {clientData && (
                        <p className="text-sm text-gray-500">
                            {t("Projekt dla", "Project for")}:{" "}
                            <span className="font-semibold">
                                {clientData.firstName} {clientData.lastName}
                            </span>
                        </p>
                    )}

                    {/* List of Existing Rooms */}
                    {existingRooms.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t("Pokoje w projekcie", "Rooms in project")}:</p>
                            <div className="flex flex-wrap gap-2">
                                {existingRooms.map((r, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onMouseEnter={() => setHoveredRoomIndex(idx)}
                                        onMouseLeave={() => setHoveredRoomIndex((current) => (current === idx ? null : current))}
                                        onFocus={() => setHoveredRoomIndex(idx)}
                                        onBlur={() => setHoveredRoomIndex((current) => (current === idx ? null : current))}
                                        onClick={() => {
                                            if (editingRoomIndex === idx && hoveredRoomIndex === idx) {
                                                setConfirmAction({ type: "delete-room", roomIndex: idx });
                                                return;
                                            }

                                            handleEditRoom(idx);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border transition-all 
                                            ${
                                                editingRoomIndex === idx
                                                    ? hoveredRoomIndex === idx
                                                        ? "bg-red-500 text-white border-red-500 shadow-md"
                                                        : "bg-primary text-white border-primary shadow-md"
                                                    : "bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 hover:border-primary text-gray-700 dark:text-gray-200"
                                            }`}
                                        title={
                                            editingRoomIndex === idx
                                                ? hoveredRoomIndex === idx
                                                    ? t("Usuń ten pokój", "Delete this room")
                                                    : t("Edytowany pokój", "Currently edited room")
                                                : t("Edytuj pokój", "Edit room")
                                        }
                                    >
                                        <span className="material-symbols-outlined text-base">
                                            {editingRoomIndex === idx ? (hoveredRoomIndex === idx ? "delete" : "edit") : "check_circle"}
                                        </span>
                                        {r.name}
                                    </button>
                                ))}
                                {editingRoomIndex === null && (
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-slate-800 text-gray-400 border border-dashed border-gray-300">
                                        <span>{t("Nowy Pokój", "New room")}...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 1. Room Name & Mode */}
                <div className="p-4 flex flex-col gap-6">
                    <div className="flex flex-col">
                        <label className="text-text-dark dark:text-off-white text-base font-medium leading-normal pb-2">{t("Nazwa Pokoju", "Room Name")}</label>
                        <input
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="form-input w-full rounded-lg border border-neutral-gray/50 dark:border-neutral-gray/70 bg-off-white dark:bg-background-dark p-3"
                            placeholder={t("np. Salon, Sypialnia", "e.g. Living room, Bedroom")}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-stretch sm:self-start">
                        <button
                            type="button"
                            onClick={() => handleModeChange("standard")}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                mode === "standard"
                                    ? "bg-white dark:bg-slate-600 shadow-sm text-primary"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        >
                            {t("Standardowy (Prostokąt)", "Standard (Rectangle)")}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleModeChange("custom")}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                mode === "custom"
                                    ? "bg-white dark:bg-slate-600 shadow-sm text-primary"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        >
                            {t("Nieregularny (Własny)", "Irregular (Custom)")}
                        </button>
                    </div>
                </div>

                {/* 2. Dimensions Input (Standard Mode) */}
                {mode === "standard" && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mx-4 border border-slate-200 dark:border-slate-700 animate-fade-in">
                        <h2 className="text-lg font-bold text-dependable-blue dark:text-primary mb-4">{t("Wymiary całkowite", "Overall dimensions")}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className="flex flex-col">
                                <span className="mb-1 text-sm font-medium">{t("Długość (m)", "Length (m)")}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={length}
                                    onChange={(e) => handleDimensionChange(setLength, e.target.value)}
                                    className="form-input rounded-lg border-gray-300 dark:bg-slate-800 p-2"
                                />
                            </label>
                            <label className="flex flex-col">
                                <span className="mb-1 text-sm font-medium">{t("Szerokość (m)", "Width (m)")}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={width}
                                    onChange={(e) => handleDimensionChange(setWidth, e.target.value)}
                                    className="form-input rounded-lg border-gray-300 dark:bg-slate-800 p-2"
                                />
                            </label>
                            <label className="flex flex-col">
                                <span className="mb-1 text-sm font-medium">{t("Wysokość (m)", "Height (m)")}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={height}
                                    onChange={(e) => handleDimensionChange(setHeight, e.target.value)}
                                    className="form-input rounded-lg border-gray-300 dark:bg-slate-800 p-2"
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* 3. Surface List & Management */}
                <div className="p-4 mt-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <h2 className="text-xl font-bold text-dependable-blue dark:text-primary">{t("Lista Powierzchni", "Surface List")}</h2>
                        <div className="text-right text-sm text-gray-500">
                            <p>{t("Ściany", "Walls")}: {getTotalArea(SurfaceType.WALL).toFixed(2)} m²</p>
                            <p>{t("Podłoga", "Floor")}: {getTotalArea(SurfaceType.FLOOR).toFixed(2)} m²</p>
                        </div>
                    </div>

                    {mode === "custom" && (
                        <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
                            <button
                                onClick={() => handleAddSurface(SurfaceType.WALL)}
                                className="btn-secondary text-xs px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                            >
                                + {t("Ściana", "Wall")}
                            </button>
                            <button
                                onClick={() => handleAddSurface(SurfaceType.FLOOR)}
                                className="btn-secondary text-xs px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                            >
                                + {t("Podłoga", "Floor")}
                            </button>
                            <button
                                onClick={() => handleAddSurface(SurfaceType.CEILING)}
                                className="btn-secondary text-xs px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                            >
                                + {t("Sufit", "Ceiling")}
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {surfaces.map((surface, index) => (
                            <div
                                key={index}
                                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm relative group"
                            >
                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center w-full">
                                        <div className="md:col-span-3">
                                            {mode === "custom" ? (
                                                <input
                                                    value={surface.name}
                                                    onChange={(e) => handleUpdateSurface(index, "name", e.target.value)}
                                                    className="font-bold bg-transparent border-b border-dashed border-gray-300 w-full focus:outline-none focus:border-primary"
                                                />
                                            ) : (
                                                <span className="font-bold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-gray-400">
                                                        {surface.type === SurfaceType.WALL
                                                            ? "grid_view"
                                                            : surface.type === SurfaceType.FLOOR
                                                            ? "check_box_outline_blank"
                                                            : "roofing"}
                                                    </span>
                                                    {localizeSurfaceName(surface.name)}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400 block mt-1">{localizeSurfaceType(surface.type)}</span>
                                        </div>

                                        {/* Dimension Inputs - Revised Layout for Single Line */}
                                        <div className="md:col-span-7 flex flex-row items-center gap-2 md:gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
                                            <div className="flex items-center gap-1 shrink-0">
                                                <label className="text-xs text-gray-500 whitespace-nowrap">{t("Szer", "W")}: </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    disabled={mode === "standard"}
                                                    value={surfaceDrafts[index]?.width ?? ""}
                                                    onChange={(e) => handleUpdateSurface(index, "width", e.target.value)}
                                                    className="w-16 p-1 text-sm border rounded bg-gray-50 dark:bg-slate-900 disabled:opacity-60"
                                                />
                                                <span className="text-xs text-gray-500 whitespace-nowrap">m</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <label className="text-xs text-gray-500 whitespace-nowrap">{t("Wys/Dł", "H/L")}: </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    disabled={mode === "standard"}
                                                    value={surfaceDrafts[index]?.height ?? ""}
                                                    onChange={(e) => handleUpdateSurface(index, "height", e.target.value)}
                                                    className="w-16 p-1 text-sm border rounded bg-gray-50 dark:bg-slate-900 disabled:opacity-60"
                                                />
                                                <span className="text-xs text-gray-500 whitespace-nowrap">m</span>
                                            </div>
                                            {mode === "custom" && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <label className="text-xs text-primary font-bold whitespace-nowrap">{t("lub m²:", "or m²:")}</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        placeholder="Auto"
                                                        value={surfaceDrafts[index]?.area ?? ""}
                                                        onChange={(e) => handleUpdateSurface(index, "area", e.target.value)}
                                                        className="w-16 p-1 text-sm border border-primary/30 rounded bg-primary/5 dark:bg-slate-900"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="md:col-span-2 text-right whitespace-nowrap">
                                            <span className="font-bold text-lg text-primary">{surface.getNetArea().toFixed(2)} m²</span>
                                            {surface.openings.length > 0 && (
                                                <span className="text-xs text-red-400 block">
                                                    (-{surface.openings.reduce((a, b) => a + b.getArea(), 0).toFixed(2)})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {mode === "custom" && (
                                        <button onClick={() => handleRemoveSurface(index)} className="text-red-400 hover:text-red-600 px-2 shrink-0">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    )}
                                </div>

                                {/* Openings Section */}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex flex-wrap gap-2 items-center mb-2">
                                        <span className="text-xs font-semibold text-gray-500">{t("Otwory", "Openings")}:</span>
                                        {surface.openings.map((op, opIdx) => (
                                            <div
                                                key={opIdx}
                                                className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs px-2 py-1 rounded border border-red-100 dark:border-red-800"
                                            >
                                                <span>{op.type === "okno" ? "🪟" : "🚪"} {op.width}m x {op.height}m</span>
                                                <button onClick={() => handleRemoveOpening(index, opIdx)} className="hover:text-red-800 ml-1">
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {surface.openings.length === 0 && <span className="text-xs text-gray-400 italic">{t("Brak otworów", "No openings")}</span>}
                                    </div>

                                    {/* Add Opening Form - Improved Styling */}
                                    {activeSurfaceIndex === index ? (
                                        <div className="flex flex-wrap items-center gap-2 mt-2 bg-gray-50 dark:bg-gray-700 p-2 rounded animate-fade-in w-full sm:w-fit">
                                            <ScrollableSelect
                                                value={openingDims.type}
                                                onChange={(e) => setOpeningDims({ ...openingDims, type: e.target.value as OpeningType })}
                                                className="form-select text-xs px-2 py-1 h-8 rounded border-gray-300 dark:border-gray-600 dark:bg-slate-800 min-w-[90px]"
                                            >
                                                <option value="okno">{t("Okno", "Window")}</option>
                                                <option value="drzwi">{t("Drzwi", "Door")}</option>
                                            </ScrollableSelect>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder={t("Szer (m)", "W (m)")}
                                                value={openingDims.w}
                                                onChange={(e) => handleOpeningDimensionChange("w", e.target.value)}
                                                className="w-16 text-xs p-1 h-8 rounded border-gray-300 dark:border-gray-600 dark:bg-slate-800"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder={t("Wys (m)", "H (m)")}
                                                value={openingDims.h}
                                                onChange={(e) => handleOpeningDimensionChange("h", e.target.value)}
                                                className="w-16 text-xs p-1 h-8 rounded border-gray-300 dark:border-gray-600 dark:bg-slate-800"
                                            />
                                            <button
                                                onClick={() => handleAddOpening(index)}
                                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 h-8 rounded font-bold"
                                            >
                                                {t("Dodaj", "Add")}
                                            </button>
                                            <button onClick={() => setActiveSurfaceIndex(null)} className="text-gray-500 hover:text-gray-700 text-xs px-2">
                                                {t("Anuluj", "Cancel")}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setActiveSurfaceIndex(index)}
                                            className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors mt-2"
                                        >
                                            <span className="material-symbols-outlined text-base">add_circle</span>
                                            {t("Dodaj okno/drzwi", "Add window/door")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {surfaces.length === 0 && (
                        <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">
                                {t('Brak zdefiniowanych powierzchni.', 'No surfaces defined.')} {mode === "standard" ? t('Wprowadź wymiary powyżej.', 'Enter dimensions above.') : t('Dodaj ściany ręcznie.', 'Add walls manually.')}
                            </p>
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
                            {t('Anuluj edycje', 'Cancel editing')}
                        </button>
                    )}

                    <button
                        onClick={() => navigate("/projects")}
                        className="px-6 py-3 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-300 transition-colors md:mr-auto"
                    >
                        {t('Wyjdź', 'Exit')}
                    </button>

                    <button
                        onClick={handleSaveAndAddNext}
                        disabled={surfaces.length === 0}
                        className={`flex items-center gap-2 justify-center px-6 py-3 rounded-lg border-2 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-transparent ${
                            editingRoomIndex !== null ? "border-green-600 text-green-600 hover:bg-green-50" : "border-primary text-primary hover:bg-primary/5"
                        }`}
                    >
                        <span className="material-symbols-outlined">{editingRoomIndex !== null ? "save" : "add_circle"}</span>
                        {editingRoomIndex !== null ? t('Zapisz zmiany i dodaj kolejny', 'Save changes and add next') : t('Zapisz i dodaj kolejny pokój', 'Save and add another room')}
                    </button>

                    <button
                        onClick={handleSaveAndProceedToServices}
                        disabled={surfaces.length === 0}
                        className="flex items-center gap-2 justify-center px-6 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined">handyman</span>
                        {t('Zapisz i przejdź do usług', 'Save and proceed to services')}
                    </button>
                </div>

                {confirmAction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-800">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                        {confirmAction.type === "delete-room"
                                            ? t("Usunąć pokój?", "Delete room?")
                                            : t("Zmienić typ pokoju?", "Change room type?")}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                                        {confirmAction.type === "delete-room"
                                            ? t(
                                                  "Ten pokój zostanie usunięty z projektu. Tej operacji nie można cofnąć.",
                                                  "This room will be removed from the project. This action cannot be undone."
                                              )
                                            : t(
                                                  "Przełączenie na tryb standardowy usunie obecne niestandardowe powierzchnie i wymiary tego pokoju.",
                                                  "Switching to standard mode will remove the current custom surfaces and dimensions for this room."
                                              )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="px-6 py-5 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction(null)}
                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                                >
                                    {t("Anuluj", "Cancel")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirmAction.type === "delete-room") {
                                            handleDeleteRoom(confirmAction.roomIndex);
                                            return;
                                        }

                                        handleConfirmSwitchToStandard();
                                    }}
                                    className={`px-4 py-2 rounded-lg font-bold text-white ${
                                        confirmAction.type === "delete-room"
                                            ? "bg-red-600 hover:bg-red-700"
                                            : "bg-primary hover:bg-primary/90"
                                    }`}
                                >
                                    {confirmAction.type === "delete-room"
                                        ? t("Usuń pokój", "Delete room")
                                        : t("Zmień typ", "Change type")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomForm;
