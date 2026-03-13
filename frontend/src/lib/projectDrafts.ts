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

const PROJECT_DRAFTS_KEY = "projectDrafts";
const CURRENT_PROJECT_SNAPSHOT_KEY = "currentProjectSnapshot";

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

export const getProjectDrafts = (): ProjectDraft[] => {
    try {
        const raw = readLocalStorage(PROJECT_DRAFTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const getProjectDraftById = (id: string) => getProjectDrafts().find((draft) => draft.id === id);

export const saveProjectDraft = (draft: ProjectDraft) => {
    const drafts = getProjectDrafts();
    const nextDraft = { ...draft, updatedAt: new Date().toISOString() };
    const nextDrafts = drafts.filter((item) => item.id !== nextDraft.id);
    nextDrafts.push(nextDraft);
    writeLocalStorage(PROJECT_DRAFTS_KEY, JSON.stringify(nextDrafts));
    return nextDraft;
};

export const deleteProjectDraft = (id: string) => {
    const nextDrafts = getProjectDrafts().filter((draft) => draft.id !== id);
    writeLocalStorage(PROJECT_DRAFTS_KEY, JSON.stringify(nextDrafts));
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

export const setCurrentProjectSnapshot = (snapshot: ProjectDraft) => {
    writeSessionStorage(
        CURRENT_PROJECT_SNAPSHOT_KEY,
        JSON.stringify({
            ...snapshot,
            updatedAt: new Date().toISOString(),
        })
    );
};

export const clearCurrentProjectSnapshot = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(CURRENT_PROJECT_SNAPSHOT_KEY);
};

export const saveCurrentProjectDraft = () => {
    const snapshot = getCurrentProjectSnapshot();
    if (!snapshot) return null;

    const draft = saveProjectDraft({
        ...snapshot,
        id: snapshot.id || crypto.randomUUID(),
    });

    setCurrentProjectSnapshot(draft);
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

const isEmptyClientForm = (form?: ProjectDraft["clientForm"]) => {
    if (!form) return true;
    return (
        form.selectedClientId === "" &&
        form.firstName.trim() === "" &&
        form.lastName.trim() === "" &&
        form.address.trim() === "" &&
        form.city.trim() === "" &&
        form.zipCode.trim() === "" &&
        form.phone.trim() === "" &&
        form.email.trim() === "" &&
        form.startDate === "" &&
        form.endDate === ""
    );
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

const isPristineServiceForm = (form?: ProjectDraft["serviceForm"]) => {
    if (!form) return true;
    return (
        form.selectedCategory === "" &&
        form.selectedTemplateId === "" &&
        form.selectedMaterialId === "" &&
        form.isAddingNewMaterial === false &&
        form.newMatScope === "project" &&
        form.customMatName === "" &&
        form.customMatPrice === "" &&
        form.customMatCoverage === "" &&
        form.customMatInitialStock === "" &&
        form.scopeType === "global" &&
        form.specificSurfaceIndex === 0 &&
        form.manualQuantity === "1" &&
        form.strategyParam === ""
    );
};

const buildComparableDraft = (draft: ProjectDraft, step: ProjectWizardStep) => {
    const normalized = normalizeDraftForCompare(draft);
    if (!normalized) return null;

    const base = {
        id: normalized.id,
        clientData: normalized.clientData,
        projectDates: normalized.projectDates,
        rooms: normalized.rooms,
    } as any;

    if (step === "client") {
        if (!isEmptyClientForm(normalized.clientForm)) {
            base.clientForm = normalized.clientForm;
        }
    }

    if (step === "room") {
        if (!isPristineRoomForm(normalized.roomForm)) {
            base.roomForm = normalized.roomForm;
        }
    }

    if (step === "services") {
        if (!isPristineServiceForm(normalized.serviceForm)) {
            base.serviceForm = normalized.serviceForm;
        }
    }

    return base;
};

export const hasUnsavedProjectChanges = () => {
    const snapshot = getCurrentProjectSnapshot();
    if (!snapshot) return false;

    // New wizard (without saved draft ID) is always treated as unsaved work.
    if (!snapshot.id) return true;

    const storedDraft = getProjectDraftById(snapshot.id);
    if (!storedDraft) return true;

    const comparableSnapshot = buildComparableDraft(snapshot, snapshot.currentStep);
    const comparableStored = buildComparableDraft(storedDraft, snapshot.currentStep);

    return JSON.stringify(comparableSnapshot) !== JSON.stringify(comparableStored);
};