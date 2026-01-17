import { supabase } from './supabase'
import type { DatabaseApp as _DatabaseApp, DatabaseScreen, UserWorkspaceDB as _UserWorkspaceDB } from './supabase'

// Database service functions for Supabase operations

export interface AppWithScreens {
  id: string
  name: string
  user_id: string
  start_screen_id: string | null
  created_at: string
  updated_at: string
  mock_data: string | null
  screens: DatabaseScreen[]
}

export interface WorkspaceData {
  apps: AppWithScreens[]
  activeAppId: string | null
  activeScreenId: string | null
}

// Get user's workspace (apps and screens)
export async function getUserWorkspace(userId: string): Promise<WorkspaceData> {
  try {
    // 1. Get apps first (without embedded screens to avoid ambiguity)
    const { data: apps, error: appsError } = await supabase
      .from('apps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (appsError) throw appsError

    // 2. Get all screens for these apps
    const appIds = (apps || []).map(a => a.id);
    let allScreens: DatabaseScreen[] = [];

    if (appIds.length > 0) {
      const { data: screens, error: screensError } = await supabase
        .from('screens')
        .select('*')
        .in('app_id', appIds)
        .order('created_at', { ascending: true }); // Optional ordering

      if (screensError) throw screensError;
      allScreens = screens || [];
    }

    // 3. Get workspace settings
    const { data: workspace, error: workspaceError } = await supabase
      .from('user_workspaces')
      .select('*')
      .eq('user_id', userId)
      .single()

    // ... (workspace creation logic remains checks below) ...

    let activeAppId = null
    let activeScreenId = null

    if (workspaceError && workspaceError.code === 'PGRST116') {
      // No workspace found, create one
      const { data: _newWorkspace, error: createError } = await supabase
        .from('user_workspaces')
        .insert({
          user_id: userId,
          active_app_id: null,
          active_screen_id: null
        })
        .select()
        .single()

      if (createError) throw createError
    } else if (!workspaceError) {
      activeAppId = workspace?.active_app_id || null
      activeScreenId = workspace?.active_screen_id || null
    }

    // 4. Merge apps and screens
    const mergedApps = (apps || []).map(app => ({
      id: app.id,
      name: app.name,
      user_id: app.user_id,
      created_at: app.created_at,
      updated_at: app.updated_at,
      mock_data: app.mock_data,
      screens: allScreens.filter(s => s.app_id === app.id),
      start_screen_id: app.start_screen_id
    }));

    return {
      apps: mergedApps,
      activeAppId,
      activeScreenId
    }
  } catch (error) {
    console.error('Error fetching workspace:', error)
    return {
      apps: [],
      activeAppId: null,
      activeScreenId: null
    }
  }
}

// Create new app
export async function createApp(userId: string, name: string, defaultYaml: string): Promise<AppWithScreens | null> {
  try {
    // Create the app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert({
        name,
        user_id: userId
      })
      .select()
      .single()

    if (appError) throw appError

    // Create default screen
    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .insert({
        name: 'Screen 1',
        yaml: defaultYaml,
        app_id: app.id
      })
      .select()
      .single()

    if (screenError) throw screenError

    // Set as start screen
    await supabase
      .from('apps')
      .update({ start_screen_id: screen.id })
      .eq('id', app.id)

    return {
      ...app,
      start_screen_id: screen.id,
      screens: [screen],
      mock_data: app.mock_data
    }
  } catch (error) {
    console.error('Error creating app:', error)
    return null
  }
}

// Create new screen
export async function createScreen(appId: string, name: string, defaultYaml: string): Promise<DatabaseScreen | null> {
  try {
    const { data, error } = await supabase
      .from('screens')
      .insert({
        name,
        yaml: defaultYaml,
        app_id: appId
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating screen:', error)
    return null
  }
}

// Update app name
export async function updateAppName(appId: string, name: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('apps')
      .update({ name })
      .eq('id', appId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating app name:', error)
    return false
  }
}

// Update screen name
export async function updateScreenName(screenId: string, name: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('screens')
      .update({ name })
      .eq('id', screenId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating screen name:', error)
    return false
  }
}

// Update screen YAML
export async function updateScreenYaml(screenId: string, yaml: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('screens')
      .update({ yaml })
      .eq('id', screenId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating screen YAML:', error)
    return false
  }
}

// Delete app (will cascade delete screens)
export async function deleteApp(appId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('apps')
      .delete()
      .eq('id', appId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting app:', error)
    return false
  }
}

// Delete screen
export async function deleteScreen(screenId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('screens')
      .delete()
      .eq('id', screenId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting screen:', error)
    return false
  }
}

// Update workspace active app/screen
export async function updateWorkspaceActive(userId: string, activeAppId: string | null, activeScreenId: string | null): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_workspaces')
      .update({
        active_app_id: activeAppId,
        active_screen_id: activeScreenId
      })
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating workspace active state:', error)
    return false
  }
}

// Update app start screen
export async function updateAppStartScreen(appId: string, screenId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('apps')
      .update({ start_screen_id: screenId })
      .eq('id', appId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating app start screen:', error)
    return false
  }
}

// --- Image Operations ---

export interface AppImage {
  id: string;
  name: string;
  url: string;
}

// Fetch all images for an app
export async function getAppImages(appId: string): Promise<AppImage[]> {
  try {
    const { data, error } = await supabase
      .from('app_images')
      .select('*')
      .eq('app_id', appId);

    if (error) throw error;

    return (data || []).map(img => ({
      id: img.id,
      name: img.name,
      url: img.public_url
    }));
  } catch (error) {
    console.error('Error fetching app images:', error);
    return [];
  }
}

// Upload a new image to an app
export async function uploadAppImage(appId: string, name: string, file: File): Promise<AppImage | null> {
  try {
    // Enforce limit of 10 images
    const existingImages = await getAppImages(appId);
    if (existingImages.length >= 10) {
      throw new Error('Maximum limit of 10 images reached for this app.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${appId}/${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('app-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('app-images')
      .getPublicUrl(filePath);

    // 3. Save to Database
    const { data, error: dbError } = await supabase
      .from('app_images')
      .insert({
        app_id: appId,
        name: name,
        storage_path: filePath,
        public_url: publicUrl
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return {
      id: data.id,
      name: data.name,
      url: data.public_url
    };
  } catch (error) {
    console.error('Error uploading app image:', error);
    alert(error instanceof Error ? error.message : 'Failed to upload image');
    return null;
  }
}

// Delete an image
export async function deleteAppImage(imageId: string): Promise<boolean> {
  try {
    // 1. Get image info
    const { data: img, error: getError } = await supabase
      .from('app_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (getError) throw getError;

    // 2. Delete from Storage
    const { error: storageError } = await supabase.storage
      .from('app-images')
      .remove([img.storage_path]);

    if (storageError) throw storageError;

    // 3. Delete from Database
    const { error: dbError } = await supabase
      .from('app_images')
      .delete()
      .eq('id', imageId);

    if (dbError) throw dbError;

    return true;
  } catch (error) {
    console.error('Error deleting app image:', error);
    return false;
  }
}

// Update app mock data
export async function updateAppMockData(appId: string, mockData: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('apps')
      .update({ mock_data: mockData })
      .eq('id', appId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating app mock data:', error)
    return false
  }
}
