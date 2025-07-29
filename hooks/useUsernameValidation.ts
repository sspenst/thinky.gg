import { useCallback, useRef, useState } from 'react';
import { debounce } from 'throttle-debounce';

export function useUsernameValidation() {
  const [isValidUsername, setIsValidUsername] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [isExistsLoading, setIsExistsLoading] = useState(false);

  const checkUsername = useCallback(async (username: string) => {
    const res = await fetch(`/api/user/exists?name=${username}`);
    const resObj = await res.json();

    setIsExistsLoading(false);
    setUsernameExists(resObj.exists);
  }, []);

  const debouncedCheckUsername = useRef(
    debounce(500, checkUsername)
  ).current;

  const validateUsername = useCallback((newUserName: string) => {
    let valid = true;

    if (newUserName.length < 3 || newUserName.length > 50 || !newUserName.match(/^[a-zA-Z0-9][-a-zA-Z0-9_.]*$/)) {
      valid = false;
    }

    setIsValidUsername(valid);

    if (!valid) {
      setIsExistsLoading(false);
      return;
    }

    setIsExistsLoading(true);
    debouncedCheckUsername(newUserName);
  }, [debouncedCheckUsername]);

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, setValue: (value: string) => void) => {
    const newUserName = e.target.value;
    setValue(newUserName);
    validateUsername(newUserName);
  }, [validateUsername]);

  return {
    isValidUsername,
    usernameExists,
    isExistsLoading,
    validateUsername,
    handleUsernameChange
  };
}