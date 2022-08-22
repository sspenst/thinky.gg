import React from 'react';

export default function NotificationBase({ children }: {children: JSX.Element}): JSX.Element {
  return <div className="mt-2 p-3 border-slate-600 border rounded shadow flex flex-cols-3">
    {children }

  </div>;
}
