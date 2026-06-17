import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Search } from 'lucide-react';
import { Employee, fetchEmployees, saveEmployee, deleteEmployee } from '../lib/supabase';
import { DEPARTMENTS } from '../data/constants';

interface EmployeeDirectoryProps {
  theme: "light" | "dark";
}

export function EmployeeDirectory({ theme }: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const isDark = theme === 'dark';

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const data = await fetchEmployees();
    setEmployees(data);
    setLoading(false);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTitle.trim() || !newDepartment.trim()) return;

    try {
      const newEmp: Employee = {
        name: newName,
        title: newTitle,
        department: newDepartment
      };
      await saveEmployee(newEmp);
      
      setNewName("");
      setNewTitle("");
      setNewDepartment("");
      
      await loadEmployees();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout de l'employé.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
      try {
        await deleteEmployee(id);
        await loadEmployees();
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la suppression.");
      }
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`p-6 rounded-xl shadow-lg border ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-lg ${
          isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
        }`}>
          <Users size={24} />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Annuaire des Employés
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Gérez la liste des bénéficiaires pour l'auto-remplissage
          </p>
        </div>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAddEmployee} className={`mb-8 p-4 rounded-lg border ${
        isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Ajouter un nouvel employé
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nom complet</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${
                isDark 
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' 
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
              required
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Titre / Fonction</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Directeur"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${
                isDark 
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' 
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
              required
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Direction / Service</label>
            <input
              list="dept-list-settings"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="Sélectionner ou saisir..."
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${
                isDark 
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' 
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
              required
            />
            <datalist id="dept-list-settings">
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            Ajouter à l'annuaire
          </button>
        </div>
      </form>

      {/* Search and List */}
      <div className="mb-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un employé..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {loading ? (
          <div className={`p-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Chargement de l'annuaire...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className={`p-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Aucun employé trouvé.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'} text-xs uppercase font-medium`}>
                <tr>
                  <th className="px-4 py-3 border-b border-inherit">Nom complet</th>
                  <th className="px-4 py-3 border-b border-inherit">Titre / Fonction</th>
                  <th className="px-4 py-3 border-b border-inherit">Direction / Service</th>
                  <th className="px-4 py-3 border-b border-inherit text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className={`border-b border-inherit last:border-0 hover:${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {emp.name}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {emp.title}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {emp.department}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => emp.id && handleDelete(emp.id)}
                        className="p-2 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
