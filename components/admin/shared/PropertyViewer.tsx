import React from 'react';

interface PropertyViewerProps {
  title: string;
  obj: any;
}

export default function PropertyViewer({ title, obj }: PropertyViewerProps) {
  if (!obj) return null;

  return (
    <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
      <h3 className='font-semibold text-gray-800 dark:text-gray-200 mb-3'>{title} Properties</h3>
      <div className='space-y-2'>
        {Object.keys(obj).sort().map((key) => {
          let value = obj[key];

          if (typeof value === 'object') {
            value = JSON.stringify(value, null, 2);
          }

          return (
            <div key={key} className='flex items-start gap-2'>
              <label className='font-mono text-sm font-medium text-gray-600 dark:text-gray-400 min-w-0 flex-shrink-0'>
                {key}:
              </label>
              <div className='flex-1 min-w-0'>
                <textarea
                  className='w-full text-sm font-mono bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 resize-none text-gray-900 dark:text-gray-100'
                  onClick={(e) => {
                    (e.target as HTMLTextAreaElement).select();
                    navigator.clipboard.writeText(value);
                  }}
                  readOnly
                  value={value}
                  rows={typeof obj[key] === 'object' ? Math.min(JSON.stringify(obj[key], null, 2).split('\n').length, 8) : 1}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
