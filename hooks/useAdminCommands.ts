import { IAdminCommand } from '@root/components/admin/types';
import AdminCommand from '@root/constants/adminCommand';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import Router from 'next/router';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

export function useAdminCommands() {
  const [runningCommand, setRunningCommand] = useState(false);
  const [selectedLevelCommand, setSelectedLevelCommand] = useState<IAdminCommand>();
  const [selectedUserCommand, setSelectedUserCommand] = useState<IAdminCommand>();
  const [selectedGenericCommand, setSelectedGenericCommand] = useState<IAdminCommand>();

  const runCommandGeneric = useCallback(async () => {
    if (!selectedGenericCommand) {
      return;
    }

    if (selectedGenericCommand?.confirm && !window.confirm('Are you sure you want to proceed?')) return;

    setRunningCommand(true);
    toast.dismiss();
    toast.loading('Running command...');

    try {
      const resp = await fetch('/api/admin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: selectedGenericCommand.command,
        }),
      });

      const json = await resp.json();

      toast.dismiss();

      if (json.error) {
        toast.error(json.error);
      } else {
        toast.success('Command ran successfully');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Error executing command');
    } finally {
      setRunningCommand(false);
    }
  }, [selectedGenericCommand]);

  const runCommandUser = useCallback(async (selectedUser: User | null) => {
    if (!selectedUser || !selectedUserCommand) {
      return;
    }

    if (selectedUserCommand?.confirm && !window.confirm('Are you sure you want to proceed?')) return;

    setRunningCommand(true);
    toast.dismiss();
    toast.loading('Running command...');

    try {
      const resp = await fetch('/api/admin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: selectedUserCommand.command,
          targetId: selectedUser._id,
        }),
      });

      const json = await resp.json();

      toast.dismiss();

      if (json.error) {
        toast.error(json.error);
      } else {
        toast.success('Command ran successfully');

        // Return whether user was deleted for parent component to handle
        return selectedUserCommand.command === AdminCommand.DeleteUser;
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Error executing command');
    } finally {
      setRunningCommand(false);
    }

    return false;
  }, [selectedUserCommand]);

  const runCommandLevel = useCallback(async (selectedLevel: Level | null) => {
    if (!selectedLevel || !selectedLevelCommand) {
      return;
    }

    if (selectedLevelCommand?.confirm && !window.confirm('Are you sure you want to proceed?')) return;

    setRunningCommand(true);
    toast.dismiss();
    toast.loading('Running command...');

    try {
      const resp = await fetch('/api/admin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: selectedLevelCommand.command,
          targetId: selectedLevel._id,
        }),
      });

      const json = await resp.json();

      toast.dismiss();

      if (json.error) {
        toast.error(json.error);
      } else {
        toast.success('Command ran successfully');
      }

      Router.reload();
    } catch (error) {
      toast.dismiss();
      toast.error('Error executing command');
    } finally {
      setRunningCommand(false);
    }
  }, [selectedLevelCommand]);

  return {
    runningCommand,
    selectedLevelCommand,
    selectedUserCommand,
    selectedGenericCommand,
    setSelectedLevelCommand,
    setSelectedUserCommand,
    setSelectedGenericCommand,
    setRunningCommand,
    runCommandGeneric,
    runCommandUser,
    runCommandLevel,
  };
}
