import React from 'react';
import { SystemVariable } from '../types';
import EditVariableForm from './EditVariableForm';

interface SystemVariablesListProps {
  variables: SystemVariable[];
  searchTerm: string;
  editingVariable: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, key: string, value: string) => void;
  onCancelEdit: () => void;
  formatDate: (date: string | number) => string;
  getTimeAgo: (timestamp: number) => string;
}

export default function SystemVariablesList({
  variables,
  searchTerm,
  editingVariable,
  onEdit,
  onDelete,
  onSave,
  onCancelEdit,
  formatDate,
  getTimeAgo
}: SystemVariablesListProps) {
  const filteredVariables = variables.filter(variable =>
    variable.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variable.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (variables.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
        No system variables found. Click &quot;Add Variable&quot; to create one.
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {filteredVariables.map((variable) => (
        <div
          key={variable._id}
          className='p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700'
        >
          <div className='flex items-start justify-between'>
            <div className='flex-1 min-w-0'>
              {editingVariable === variable._id ? (
                <EditVariableForm
                  variable={variable}
                  onSave={onSave}
                  onCancel={onCancelEdit}
                />
              ) : (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>Key:</span>
                    <span className='font-mono text-gray-900 dark:text-gray-100'>{variable.key}</span>
                  </div>
                  <div className='flex items-start gap-2'>
                    <span className='text-sm font-medium text-gray-600 dark:text-gray-400 mt-1'>Value:</span>
                    <pre className='flex-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-2 rounded border border-gray-300 dark:border-gray-600 whitespace-pre-wrap'>
                      {variable.value}
                    </pre>
                  </div>
                  <div className='flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400'>
                    <span>Created: {formatDate(variable.createdAt)}</span>
                    <span>Updated: {formatDate(variable.updatedAt)} ({getTimeAgo(new Date(variable.updatedAt).getTime() / 1000)})</span>
                  </div>
                </div>
              )}
            </div>
            {editingVariable !== variable._id && (
              <div className='flex items-center gap-2 ml-4'>
                <button
                  onClick={() => onEdit(variable._id)}
                  className='px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(variable._id)}
                  className='px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors'
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
