import { createClient } from '@supabase/supabase-js';
import { Intervention, TechProfile } from '../types';

const supabaseUrl = 'https://pzfcjxjydgopeloxlacg.supabase.co';
const supabaseKey = 'sb_publishable_GWF5fDuA42RGLsNFCB63kg_S_B89gK7';

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- AUTHENTICATION ---
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.error('Error getting session:', error);
  return data.session;
}

export async function getUserProfile(userId: string): Promise<TechProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means 0 rows
    console.error('Error fetching profile:', error);
  }
  
  if (data) {
    return {
      name: data.name || '',
      title: data.title || '',
      department: data.department || '',
      centerName: data.center_name || ''
    };
  }
  return null;
}

export async function saveUserProfile(userId: string, profile: TechProfile) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: profile.name,
      title: profile.title,
      department: profile.department,
      center_name: profile.centerName,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error saving profile:', error);
    throw error;
  }
}

// --- INTERVENTIONS ---
export async function fetchInterventions(): Promise<Intervention[]> {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching interventions:', error);
    return [];
  }
  return data as Intervention[];
}

export async function saveIntervention(intervention: Intervention) {
  const { error } = await supabase
    .from('interventions')
    .upsert(intervention);

  if (error) {
    console.error('Error saving intervention:', error);
    throw error;
  }
}

export async function deleteIntervention(id: string) {
  const { error } = await supabase
    .from('interventions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting intervention:', error);
    throw error;
  }
}

export async function deleteMultipleInterventions(ids: string[]) {
  const { error } = await supabase
    .from('interventions')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting multiple interventions:', error);
    throw error;
  }
}

// Auto-cleanup
export async function checkAndCleanupInterventions(interventions: Intervention[], directoryHandle?: FileSystemDirectoryHandle | null): Promise<boolean> {
  const CLEANUP_THRESHOLD = 20;

  if (interventions.length >= CLEANUP_THRESHOLD) {
    try {
      const { generateAutoCleanupReportPDF } = await import('../utils/pdfGenerator');
      
      // Pass the directoryHandle so it can save locally if connected
      await generateAutoCleanupReportPDF(interventions.slice(0, CLEANUP_THRESHOLD), directoryHandle);

      const idsToDelete = interventions
        .slice(0, CLEANUP_THRESHOLD)
        .map(i => i.id)
        .filter(Boolean);

      if (idsToDelete.length > 0) {
        await deleteMultipleInterventions(idsToDelete);
      }

      return true;
    } catch (err) {
      console.error('Auto-cleanup failed:', err);
      return false;
    }
  }
  return false;
}

// --- EMPLOYEES ---
export interface Employee {
  id?: string;
  name: string;
  title: string;
  department: string;
  created_at?: string;
  user_id?: string;
}

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data as Employee[];
}

export async function saveEmployee(employee: Employee) {
  const { error } = await supabase
    .from('employees')
    .upsert(employee);

  if (error) {
    console.error('Error saving employee:', error);
    throw error;
  }
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}
