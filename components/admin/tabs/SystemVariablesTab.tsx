import { Database } from 'lucide-react';
import SystemVariablesList from '../systemVariables/SystemVariablesList';
import { SystemVariable } from '../types';

interface SystemVariablesTabProps {
  systemVariables: SystemVariable[];
  loadingVariables: boolean;
  searchTerm: string;
  editingVariable: string | null;
  showNewForm: boolean;
  newVariable: { key: string; value: string };
  onSearchChange: (searchTerm: string) => void;
  onShowNewForm: () => void;
  onNewVariableChange: (variable: { key: string; value: string }) => void;
  onCreateVariable: (key: string, value: string) => void;
  onUpdateVariable: (id: string, key: string, value: string) => void;
  onDeleteVariable: (id: string) => void;
  onEditVariable: (id: string) => void;
  onCancelEdit: () => void;
  formatDate: (date: string | number) => string;
  getTimeAgo: (timestamp: number) => string;
}

export default function SystemVariablesTab({
  systemVariables,
  loadingVariables,
  searchTerm,
  editingVariable,
  showNewForm,
  newVariable,
  onSearchChange,
  onShowNewForm,
  onNewVariableChange,
  onCreateVariable,
  onUpdateVariable,
  onDeleteVariable,
  onEditVariable,
  onCancelEdit,
  formatDate,
  getTimeAgo
}: SystemVariablesTabProps) {
  return (
    <div className='space-y-8'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <Database className='w-6 h-6 text-indigo-500' />
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>System Variables</h2>
          </div>
          <button
            onClick={onShowNewForm}
            className='inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm transition-colors'
          >
            {showNewForm ? 'Cancel' : 'Add Variable'}
          </button>
        </div>
        
        {/* Search */}
        <div className='mb-6'>
          <input
            type='text'
            placeholder='Search variables...'
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        {/* New Variable Form */}
        {showNewForm && (
          <div className='mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700'>
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>Add New Variable</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Key</label>
                <input
                  type='text'
                  placeholder='Enter variable key...'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  value={newVariable.key}
                  onChange={(e) => onNewVariableChange({ ...newVariable, key: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Value</label>
                <textarea
                  placeholder='Enter variable value...'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  value={newVariable.value}
                  onChange={(e) => onNewVariableChange({ ...newVariable, value: e.target.value })}
                  rows={3}
                />
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => onCreateVariable(newVariable.key, newVariable.value)}
                  disabled={!newVariable.key || !newVariable.value}
                  className='px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors'
                >
                  Create
                </button>
                <button
                  onClick={onShowNewForm}
                  className='px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium text-sm transition-colors'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Variables List */}
        {loadingVariables ? (
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500' />
            <span className='ml-3 text-gray-600 dark:text-gray-400'>Loading variables...</span>
          </div>
        ) : (
          <SystemVariablesList
            variables={systemVariables}
            searchTerm={searchTerm}
            editingVariable={editingVariable}
            onEdit={onEditVariable}
            onDelete={onDeleteVariable}
            onSave={onUpdateVariable}
            onCancelEdit={onCancelEdit}
            formatDate={formatDate}
            getTimeAgo={getTimeAgo}
          />
        )}
      </div>
    </div>
  );
}
