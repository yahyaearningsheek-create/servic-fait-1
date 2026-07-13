/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TaskItem {
  id: string;
  description: string;
  category: "Matériel" | "Logiciel" | "Réseau" | "Sécurité" | "Optimisation" | "Autre";
  status: "completed" | "pending";
}

export interface Intervention {
  id: string;
  refNumber: string; // e.g., CNIPLC-2026-0001
  date: string; // YYYY-MM-DD
  clientName: string; // Nom du demandeur / Directeur
  clientTitle: string; // Titre/Poste (ex: Directeur Cabinet)
  clientDepartment: string; // Direction / Service (ex: RH)
  techName: string; // Nom de l'informaticien
  techTitle: string; // Titre de l'informaticien
  deviceType: string; // ex: PC Bureau, PC Portable, Imprimante, Switch
  deviceBrand: string; // ex: Dell, HP, Lenovo
  deviceInventory: string; // Numéro d'inventaire
  rawNotes: string; // Notes brutes saisies à la volée
  professionalSummary: string; // Formulation améliorée de l'IA
  tasks: TaskItem[]; // Liste de tâches précises
  status: "termine" | "en_cours";
  signatureDate?: string;
  durationMinutes: number; // Durée de l'intervention
  quickNotes?: string; // Notes rapides optionnelles (détails contextuels / observations)
  photos?: DevicePhoto[]; // Photos d'intervention avec descriptions
  batchId?: string; // Grouping ID for multi-beneficiary batch saves (links related interventions)
  created_at: string;
}

export interface DevicePhoto {
  id: string;
  url: string; // Base64 data URI structure for offline persistence
  taskDescription: string; // Action / Tâche accomplie liée à cette image
}

export interface TechProfile {
  name: string;
  title: string;
  department: string;
  centerName: string; // e.g., CNIPLC
}

export interface Statistics {
  totalInterventions: number;
  completedInterventions: number;
  inProgressInterventions: number;
  totalDurationMinutes: number;
  interventionsByDepartment: { [dept: string]: number };
  interventionsByCategory: { [cat: string]: number };
  interventionsByWeek: { week: string; count: number }[];
}
