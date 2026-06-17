import { createClient } from '@supabase/supabase-js';
import { Intervention } from '../types';

const supabaseUrl = 'https://pzfcjxjydgopeloxlacg.supabase.co';
const supabaseKey = 'sb_publishable_GWF5fDuA42RGLsNFCB63kg_S_B89gK7';

export const supabase = createClient(supabaseUrl, supabaseKey);

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

// Employees
export interface Employee {
  id?: string;
  name: string;
  title: string;
  department: string;
  created_at?: string;
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
