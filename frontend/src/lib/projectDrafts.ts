export type ProjectWizardStep = "client" | "room" | "services" | "offer";

export type ProjectDraft = {
    id: string;
    currentStep: ProjectWizardStep;
    updatedAt: string;
    clientData?: any;
    projectDates?: {
        startDate?: string;
        endDate?: string;
    };
    rooms?: any[];
    clientForm?: {
        mode: "new" | "existing";
        selectedClientId: string;
        firstName: string;
        lastName: string;
        address: string;
        city: string;
        zipCode: string;
        phone: string;
        email: string;
        startDate: string;
        endDate: string;
    };
    roomForm?: {
        editingRoomIndex: number | null;
        roomName: string;
        mode: "standard" | "custom";
        length: string;
        width: string;
        height: string;
        surfaces: any[];
        surfaceDrafts: Array<{ width: string; height: string; area: string }>;
        openingDims: { w: string; h: string; type: string };
        activeSurfaceIndex: number | null;
    };
    serviceForm?: {
        activeRoomIndex: number;
        selectedCategory: string;
        selectedTemplateId: string;
        selectedMaterialId: string;
        isAddingNewMaterial: boolean;
        newMatScope: "project" | "inventory";
        customMatName: string;
        customMatPrice: string;
        customMatUnit: string;
        customMatCoverage: string;
        customMatInitialStock: string;
        scopeType: "global" | "specific" | "manual";
        specificSurfaceIndex: number;
        manualQuantity: string;
        strategyParam: string;
    };
};

import { supabase } from "./supabaseClient";
import { isDemoModeActive } from "./demoStore";

const PROJECT_DRAFTS_KEY = "projectDrafts";
const CURRENT_PROJECT_SNAPSHOT_KEY = "currentProjectSnapshot";
const CURRENT_PROJECT_BASELINE_KEY = "currentProjectBaseline";
const MISSING_DRAFTS_TABLE_CODE = "PGRST205";

let hasLoggedMissingDraftTable = false;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const readLocalStorage = (key: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
};

const writeLocalStorage = (key: string, value: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
};

const readSessionStorage = (key: string) => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(key);
};

const writeSessionStorage = (key: string, value: string) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(key, value);
};

const _getSupabaseUserId = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
};

const _isMissingDraftTableError = (error: any): boolean => {
    return error?.code === MISSING_DRAFTS_TABLE_CODE;
};

const _logDraftStorageFallback = () => {
    if (hasLoggedMissingDraftTable) return;
    hasLoggedMissingDraftTable = true;
    console.warn(
        "Supabase table 'project_drafts' is missing. Falling back to localStorage for drafts."
    );
};

// ---------------------------------------------------------------------------
// localStorage CRUD (demo mode)
// ---------------------------------------------------------------------------

const _getDraftsLocal = (): ProjectDraft[] => {
    try {
        const raw = readLocalStorage(PROJECT_DRAFTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const _getDraftByIdLocal = (id: string): ProjectDraft | undefined =>
    _getDraftsLocal().find((d) => d.id === id);

const _saveDraftLocal = (draft: ProjectDraft): ProjectDraft => {
    const all = _getDraftsLocal();
    const next = { ...draft, updatedAt: new Date().toISOString() };
    writeLocalStorage(PROJECT_DRAFTS_KEY, JSON.stringify([...all.filter((d) => d.id !== next.id), next]));
    return next;
};

const _deleteDraftLocal = (id: string): void => {
    writeLocalStorage(PROJECT_DRAFTS_KEY, JSON.stringify(_getDraftsLocal().filter((d) => d.id !== id)));
};

// ---------------------------------------------------------------------------
// Supabase CRUD (authenticated mode)
// ---------------------------------------------------------------------------

/** Maps a Supabase row back to a ProjectDraft */
const _rowToDraft = (row: any): ProjectDraft => ({
    id: row.id,
    currentStep: row.current_step as ProjectWizardStep,
    updatedAt: row.updated_at,
    ...row.draft_data,
});

/** Builds the Supabase upsert payload from a draft */
const _draftToRow = (draft: ProjectDraft, userId: string) => ({
    id: draft.id,
    user_id: userId,
    current_step: draft.currentStep,
    updated_at: new Date().toISOString(),
    draft_data: {
        clientData: draft.clientData,
        projectDates: draft.projectDates,
        rooms: draft.rooms,
        clientForm: draft.clientForm,
        roomForm: draft.roomForm,
        serviceForm: draft.serviceForm,
    },
});

const _getDraftsSupabase = async (): Promise<ProjectDraft[]> => {
    try {
        const userId = await _getSupabaseUserId();
        if (!userId) return [];
        const { data, error } = await supabase
            .from("project_drafts")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map(_rowToDraft);
    } catch (err: any) {
        if (_isMissingDraftTableError(err)) {
            _logDraftStorageFallback();
            return _getDraftsLocal();
        }
        console.error("Error loading drafts from Supabase:", err.message ?? err);
        return [];
    }
};

const _getDraftByIdSupabase = async (id: string): Promise<ProjectDraft | undefined> => {
    try {
        const userId = await _getSupabaseUserId();
        if (!userId) return undefined;
        const { data, error } = await supabase
            .from("project_drafts")
            .select("*")
            .eq("id", id)
            .eq("user_id", userId)
            .single();
        if (error) throw error;
        return _rowToDraft(data);
    } catch (err: any) {
        if (_isMissingDraftTableError(err)) {
            _logDraftStorageFallback();
            return _getDraftByIdLocal(id);
        }
        return undefined;
    }
};

const _saveDraftSupabase = async (draft: ProjectDraft): Promise<ProjectDraft> => {
    const userId = await _getSupabaseUserId();
    if (!userId) throw new Error("User not authenticated");
    const { data, error } = await supabase
        .from("project_drafts")
        .upsert(_draftToRow(draft, userId))
        .select()
        .single();
    if (error) throw error;
    return _rowToDraft(data);
};

const _deleteDraftSupabase = async (id: string): Promise<void> => {
    const userId = await _getSupabaseUserId();
    if (!userId) return;
    const { error } = await supabase
        .from("project_drafts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
    if (error) throw error;
};

// ---------------------------------------------------------------------------
// Public async API  (branches on demo mode)
// ---------------------------------------------------------------------------

export const getProjectDrafts = async (): Promise<ProjectDraft[]> => {
    if (isDemoModeActive()) return _getDraftsLocal();
    return _getDraftsSupabase();
};

export const getProjectDraftById = async (id: string): Promise<ProjectDraft | undefined> => {
    if (isDemoModeActive()) return _getDraftByIdLocal(id);
    return _getDraftByIdSupabase(id);
};

export const saveProjectDraft = async (draft: ProjectDraft): Promise<ProjectDraft> => {
    if (isDemoModeActive()) return _saveDraftLocal(draft);
    try {
        return await _saveDraftSupabase(draft);
    } catch (error: any) {
        if (_isMissingDraftTableError(error)) {
            _logDraftStorageFallback();
            return _saveDraftLocal(draft);
        }
        throw error;
    }
};

export const deleteProjectDraft = async (id: string): Promise<void> => {
    if (isDemoModeActive()) { _deleteDraftLocal(id); return; }
    try {
        await _deleteDraftSupabase(id);
    } catch (error: any) {
        if (_isMissingDraftTableError(error)) {
            _logDraftStorageFallback();
            _deleteDraftLocal(id);
            return;
        }
        throw error;
    }
};

export const getCurrentProjectSnapshot = (): ProjectDraft | null => {
    try {
        const raw = readSessionStorage(CURRENT_PROJECT_SNAPSHOT_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const getCurrentProjectBaseline = (): ProjectDraft | null => {
    try {
        const raw = readSessionStorage(CURRENT_PROJECT_BASELINE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const setCurrentProjectBaseline = (snapshot: ProjectDraft) => {
    writeSessionStorage(
        CURRENT_PROJECT_BASELINE_KEY,
        JSON.stringify({
            ...snapshot,
            updatedAt: new Date().toISOString(),
        })
    );
};

export const setCurrentProjectSnapshot = (snapshot: ProjectDraft) => {
    const nextSnapshot = {
        ...snapshot,
        updatedAt: new Date().toISOString(),
    };

    writeSessionStorage(
        CURRENT_PROJECT_SNAPSHOT_KEY,
        JSON.stringify(nextSnapshot)
    );

    // Keep a stable baseline for the currently edited draft, so navigation guards
    // do not depend on repeated remote fetches and serialization differences.
    if (nextSnapshot.id) {
        const baseline = getCurrentProjectBaseline();
        if (!baseline || baseline.id !== nextSnapshot.id) {
            setCurrentProjectBaseline(nextSnapshot);
        }
    }
};

export const clearCurrentProjectSnapshot = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(CURRENT_PROJECT_SNAPSHOT_KEY);
    window.sessionStorage.removeItem(CURRENT_PROJECT_BASELINE_KEY);
};

export const saveCurrentProjectDraft = async (): Promise<ProjectDraft | null> => {
    const snapshot = getCurrentProjectSnapshot();
    if (!snapshot) return null;

    const draft = await saveProjectDraft({
        ...snapshot,
        id: snapshot.id || crypto.randomUUID(),
    });

    setCurrentProjectSnapshot(draft);
    setCurrentProjectBaseline(draft);
    return draft;
};

export const getProjectWizardRoute = (step: ProjectWizardStep) => {
    switch (step) {
        case "client":
            return "/projects/new/client";
        case "room":
            return "/projects/new/room";
        case "services":
            return "/projects/new/services";
        case "offer":
            return "/projects/new/offer";
        default:
            return "/projects/new/client";
    }
};

const normalizeDraftForCompare = (draft: ProjectDraft | null) => {
    if (!draft) return null;
    const { updatedAt, ...rest } = draft;
    return rest;
};

const normalizeRoomsForCompare = (rooms: any[] | undefined) => {
    if (!Array.isArray(rooms)) return rooms;

    return rooms.map((room) => ({
        name: room?.name,
        surfaces: Array.isArray(room?.surfaces)
            ? room.surfaces.map((surface: any) => ({
                  name: surface?.name,
                  type: surface?.type,
                  width: surface?.width,
                  height: surface?.height,
                  customArea: surface?.customArea,
                  openings: Array.isArray(surface?.openings)
                      ? surface.openings.map((opening: any) => ({
                            width: opening?.width,
                            height: opening?.height,
                            type: opening?.type,
                        }))
                      : [],
              }))
            : [],
        tasks: Array.isArray(room?.tasks)
            ? room.tasks.map((task: any) => ({
                  description: task?.description,
                  material: task?.material
                      ? {
                            name: task.material.name,
                            unitPrice: task.material.unitPrice,
                            unit: task.material.unit,
                            defaultCoverage: task.material.defaultCoverage,
                            inventoryId: task.material.inventoryId,
                            category: task.material.category,
                        }
                      : undefined,
                  laborRate: task?.laborRate,
                  strategyParams: task?.strategyParams,
                  inputDimension: task?.inputDimension,
              }))
            : [],
    }));
};

const isPristineRoomForm = (form?: ProjectDraft["roomForm"]) => {
    if (!form) return true;
    return (
        form.editingRoomIndex === null &&
        form.mode === "standard" &&
        form.length === "" &&
        form.width === "" &&
        form.height === "" &&
        form.surfaces.length === 0 &&
        form.surfaceDrafts.length === 0 &&
        form.openingDims.w === "" &&
        form.openingDims.h === "" &&
        form.activeSurfaceIndex === null
    );
};

const createComparableSurfaceDraft = (surface: any) => ({
    width: surface?.width && Number(surface.width) !== 0 ? String(surface.width) : "",
    height: surface?.height && Number(surface.height) !== 0 ? String(surface.height) : "",
    area: surface?.customArea !== undefined && surface?.customArea !== null && Number(surface.customArea) !== 0 ? String(surface.customArea) : "",
});

const isAutoHydratedRoomForm = (form: ProjectDraft["roomForm"] | undefined, rooms: any[] | undefined) => {
    if (!form) return false;
    if (!Array.isArray(rooms)) return false;
    if (form.editingRoomIndex === null) return false;

    const sourceRoom = rooms[form.editingRoomIndex];
    if (!sourceRoom) return false;

    const sourceSurfaces = Array.isArray(sourceRoom.surfaces) ? sourceRoom.surfaces : [];
    const sourceSurfaceDrafts = sourceSurfaces.map(createComparableSurfaceDraft);

    return (
        form.mode === "custom" &&
        form.length === "" &&
        form.width === "" &&
        form.height === "" &&
        form.openingDims.w === "" &&
        form.openingDims.h === "" &&
        form.openingDims.type === "okno" &&
        form.activeSurfaceIndex === null &&
        form.roomName === sourceRoom.name &&
        JSON.stringify(form.surfaces) === JSON.stringify(sourceSurfaces) &&
        JSON.stringify(form.surfaceDrafts) === JSON.stringify(sourceSurfaceDrafts)
    );
};

const buildComparableDraft = (draft: ProjectDraft, step: ProjectWizardStep) => {
    const normalized = normalizeDraftForCompare(draft);
    if (!normalized) return null;

    const base = {
        id: normalized.id,
        clientData: normalized.clientData,
        projectDates: normalized.projectDates,
        rooms: normalizeRoomsForCompare(normalized.rooms),
    } as any;

    // Client form fields are UI state only; persisted changes are reflected in clientData/projectDates.

    if (step === "room") {
        if (!isPristineRoomForm(normalized.roomForm) && !isAutoHydratedRoomForm(normalized.roomForm, normalized.rooms)) {
            base.roomForm = normalized.roomForm;
        }
    }

    // Service form fields are UI state only; persisted changes are reflected in rooms.

    return base;
};

export const hasUnsavedProjectChanges = async (): Promise<boolean> => {
    const snapshot = getCurrentProjectSnapshot();
    if (!snapshot) return false;

    // New wizard (without saved draft ID) is always treated as unsaved work.
    if (!snapshot.id) return true;

    const baseline = getCurrentProjectBaseline();
    if (baseline && baseline.id === snapshot.id) {
        const comparableSnapshot = buildComparableDraft(snapshot, snapshot.currentStep);
        const comparableBaseline = buildComparableDraft(baseline, snapshot.currentStep);
        return JSON.stringify(comparableSnapshot) !== JSON.stringify(comparableBaseline);
    }

    const storedDraft = await getProjectDraftById(snapshot.id);
    if (!storedDraft) return true;

    const comparableSnapshot = buildComparableDraft(snapshot, snapshot.currentStep);
    const comparableStored = buildComparableDraft(storedDraft, snapshot.currentStep);

    return JSON.stringify(comparableSnapshot) !== JSON.stringify(comparableStored);
};