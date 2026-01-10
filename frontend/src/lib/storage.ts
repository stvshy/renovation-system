import { supabase } from "./supabaseClient";
import { Project, Client, InventoryItem } from "../types";
import { Room, ServiceTemplate, DEFAULT_SERVICE_CATALOG } from "./renovationLogic";

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
};

// --- PROJECTS ---

export const getProjects = async (): Promise<Project[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error reading projects from Supabase", error.message || error);
    return [];
  }
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return undefined;

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error("Error fetching project by ID", error.message || error);
        return undefined;
    }
};

export const saveProject = async (project: Project): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    if (!project.color) {
        // Simple random color generator if missing
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
        project.color = colors[Math.floor(Math.random() * colors.length)];
    }

    // Attach user_id to the project object
    const projectWithUser = { ...project, user_id: userId };

    const { error } = await supabase.from('projects').upsert(projectWithUser);
    if (error) throw error;
  } catch (error: any) {
    console.error("Error saving project to Supabase", error.message || error);
    alert("Błąd zapisu projektu do bazy danych: " + (error.message || "Nieznany błąd"));
  }
};

export const updateProject = async (updatedProject: Project): Promise<void> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");

        // Ensure we only update if user_id matches
        const { error } = await supabase
            .from('projects')
            .update(updatedProject)
            .eq('id', updatedProject.id)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error: any) {
        console.error("Error updating project", error.message || error);
    }
};

// --- CLIENTS ---

export const getClients = async (): Promise<Client[]> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    } catch (error: any) {
        console.error("Error reading clients", error.message || error);
        return [];
    }
};

export const getClientById = async (id: string): Promise<Client | undefined> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return undefined;

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error("Error fetching client by ID", error.message || error);
        return undefined;
    }
};

export const saveClient = async (client: Client): Promise<void> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");

        const clientWithUser = { ...client, user_id: userId };

        const { error } = await supabase.from('clients').upsert(clientWithUser);
        if (error) throw error;
    } catch (error: any) {
        console.error("Error saving client", error.message || error);
        alert("Błąd zapisu klienta: " + (error.message || "Zobacz konsolę"));
    }
};

// --- INVENTORY ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    } catch (error: any) {
        console.error("Error reading inventory:", error.message || error);
        return [];
    }
};

export const saveInventoryItem = async (item: InventoryItem): Promise<void> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");

        const itemWithUser = { ...item, user_id: userId };

        const { error } = await supabase.from('inventory').upsert(itemWithUser);
        if (error) throw error;
    } catch (error: any) {
        console.error("Error saving inventory item", error.message || error);
    }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");

        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error: any) {
        console.error("Error deleting inventory item", error.message || error);
    }
};

/**
 * Deducts quantities from inventory based on project tasks.
 */
export const deductInventoryFromProject = async (rooms: Room[]) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");

        // getInventory is already filtered by user
        const inventory = await getInventory();
        
        // Map updates needed
        const inventoryMap = new Map(inventory.map(i => [i.id, i]));
        let hasChanges = false;

        rooms.forEach(room => {
            room.tasks.forEach(task => {
                if (task.material.inventoryId) {
                    const item = inventoryMap.get(task.material.inventoryId);
                    if (item) {
                        const usedQty = task.calculateMaterialQuantity();
                        item.quantity = Math.max(0, item.quantity - usedQty);
                        hasChanges = true;
                    }
                }
            });
        });

        if (hasChanges) {
            // Push updates to Supabase
            // We need to ensure we send the user_id with the updates
            const updatedItems = Array.from(inventoryMap.values()).map(item => ({
                ...item,
                user_id: userId
            }));
            
            const { error } = await supabase.from('inventory').upsert(updatedItems);
            if (error) throw error;
        }
    } catch (error: any) {
        console.error("Error deducting inventory", error.message || error);
    }
};

// --- SERVICES / SETTINGS ---

export const getServiceCatalog = async (): Promise<ServiceTemplate[]> => {
    try {
        const userId = await getCurrentUserId();
        
        // Always start with hardcoded defaults
        const defaults = [...DEFAULT_SERVICE_CATALOG];

        if (!userId) return defaults;

        // Fetch user's custom services (and overrides of defaults) from DB
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('user_id', userId);
        
        if (error) throw error;
        
        const userServices = data || [];

        // 1. Map user services by ID for fast lookup
        const userServiceMap = new Map(userServices.map(s => [s.id, s]));

        // 2. Prepare the result list
        const resultCatalog: ServiceTemplate[] = [];

        // 3. Add Defaults (checking for overrides)
        defaults.forEach(def => {
            if (userServiceMap.has(def.id)) {
                // User has modified this default template, use the DB version
                resultCatalog.push(userServiceMap.get(def.id)!);
                // Remove from map so we don't add it again as a "custom" item later
                userServiceMap.delete(def.id);
            } else {
                // User hasn't touched this, use the hardcoded default
                resultCatalog.push(def);
            }
        });

        // 4. Add remaining user services (purely custom new items)
        userServiceMap.forEach(service => {
            resultCatalog.push(service);
        });

        return resultCatalog;
    } catch (error: any) {
        console.error("Error reading services", error.message || error);
        return DEFAULT_SERVICE_CATALOG;
    }
};

export const saveServiceTemplate = async (template: ServiceTemplate): Promise<void> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");

        const templateWithUser = { ...template, user_id: userId };

        const { error } = await supabase.from('services').upsert(templateWithUser);
        if (error) throw error;
    } catch (error: any) {
        console.error("Error saving service template", error.message || error);
    }
};

export const deleteServiceTemplate = async (id: string): Promise<void> => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error("User not authenticated");

        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error: any) {
        console.error("Error deleting service template", error.message || error);
    }
};