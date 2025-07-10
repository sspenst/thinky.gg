import { SystemVariable } from '@root/components/admin/types';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

export function useSystemVariables() {
  const [systemVariables, setSystemVariables] = useState<SystemVariable[]>([]);
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  const [newVariable, setNewVariable] = useState({ key: '', value: '' });
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchSystemVariables = useCallback(async () => {
    setLoadingVariables(true);

    try {
      const response = await fetch('/api/admin/config', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        setSystemVariables(data);
      } else {
        console.error('Failed to fetch system variables');
        toast.error('Failed to fetch system variables');
      }
    } catch (error) {
      console.error('Error fetching system variables:', error);
      toast.error('Error fetching system variables');
    } finally {
      setLoadingVariables(false);
    }
  }, []);

  const createSystemVariable = useCallback(async (key: string, value: string) => {
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      if (response.ok) {
        const data = await response.json();

        setSystemVariables(prev => [data, ...prev]);
        setNewVariable({ key: '', value: '' });
        setShowNewForm(false);
        toast.success('System variable created successfully');
      } else {
        const errorData = await response.json();

        toast.error(errorData.error || 'Failed to create system variable');
      }
    } catch (error) {
      console.error('Error creating system variable:', error);
      toast.error('Error creating system variable');
    }
  }, []);

  const updateSystemVariable = useCallback(async (id: string, key: string, value: string) => {
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, key, value }),
      });

      if (response.ok) {
        const data = await response.json();

        setSystemVariables(prev => prev.map(variable =>
          variable._id === id ? data : variable
        ));
        setEditingVariable(null);
        toast.success('System variable updated successfully');
      } else {
        const errorData = await response.json();

        toast.error(errorData.error || 'Failed to update system variable');
      }
    } catch (error) {
      console.error('Error updating system variable:', error);
      toast.error('Error updating system variable');
    }
  }, []);

  const deleteSystemVariable = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this system variable?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/config', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setSystemVariables(prev => prev.filter(variable => variable._id !== id));
        toast.success('System variable deleted successfully');
      } else {
        const errorData = await response.json();

        toast.error(errorData.error || 'Failed to delete system variable');
      }
    } catch (error) {
      console.error('Error deleting system variable:', error);
      toast.error('Error deleting system variable');
    }
  }, []);

  const handleShowNewForm = useCallback(() => {
    setShowNewForm(!showNewForm);

    if (showNewForm) {
      setNewVariable({ key: '', value: '' });
    }
  }, [showNewForm]);

  return {
    systemVariables,
    loadingVariables,
    searchTerm,
    editingVariable,
    newVariable,
    showNewForm,
    setSearchTerm,
    setEditingVariable,
    setNewVariable,
    fetchSystemVariables,
    createSystemVariable,
    updateSystemVariable,
    deleteSystemVariable,
    handleShowNewForm,
  };
}
