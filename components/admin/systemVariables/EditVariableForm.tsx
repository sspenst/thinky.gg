import React, { useState } from 'react';
import { SystemVariable } from '../types';

interface EditVariableFormProps {
  variable: SystemVariable;
  onSave: (id: string, key: string, value: string) => void;
  onCancel: () => void;
}

export default function EditVariableForm({ variable, onSave, onCancel }: EditVariableFormProps) {
  const [key, setKey] = useState(variable.key);
  const [value, setValue] = useState(variable.value);

  return (
    <div className='space-y-4'>
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Key</label>
        <input
          type='text'
          className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
          value={key}
          onChange={(e) => setKey(e.target.value)}
          maxLength={50}
        />
      </div>
      <div>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Value</label>
        <textarea
          className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
        />
      </div>
      <div className='flex gap-2'>
        <button
          onClick={() => onSave(variable._id, key, value)}
          disabled={!key || !value}
          className='px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors'
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className='px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium text-sm transition-colors'
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
