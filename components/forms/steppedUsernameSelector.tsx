import { useState } from 'react';
import StepWizard, { StepWizardChildProps, StepWizardProps } from 'react-step-wizard';
import { useUsernameValidation } from '../../hooks/useUsernameValidation';
import UsernameField from './usernameField';

interface SteppedUsernameSelectorProps {
  username: string;
  setUsername: (username: string) => void;
  onUsernameConfirmed: () => void;
  children: React.ReactNode; // The rest of the form (email, password, etc.)
  className?: string;
  usernameFieldProps?: {
    className?: string;
    labelClassName?: string;
  };
}

export default function SteppedUsernameSelector({
  username,
  setUsername,
  onUsernameConfirmed,
  children,
  className = 'w-full',
  usernameFieldProps = {}
}: SteppedUsernameSelectorProps) {
  const [wizard, setWizard] = useState<StepWizardProps>();

  const {
    isValidUsername,
    usernameExists,
    isExistsLoading,
    handleUsernameChange
  } = useUsernameValidation();

  const handleContinue = () => {
    (wizard as StepWizardChildProps)?.nextStep();
    onUsernameConfirmed();
  };

  return (
    <StepWizard className={className} instance={setWizard}>
      {/* Step 1: Username Selection */}
      <div className='flex flex-col gap-6'>
        <UsernameField
          value={username}
          onChange={(e) => handleUsernameChange(e, setUsername)}
          isValid={isValidUsername}
          exists={usernameExists}
          isLoading={isExistsLoading}
          required
          {...usernameFieldProps}
        />
        <button
          className='bg-blue-500 enabled:hover:bg-blue-600 text-white w-full font-medium py-2 px-3 rounded disabled:opacity-50'
          disabled={isExistsLoading || !isValidUsername || usernameExists}
          onClick={handleContinue}
          type='button'
        >
          Continue
        </button>
      </div>
      
      {/* Step 2: Rest of the form with username confirmation */}
      <div className='flex flex-col gap-6'>
        <div className='flex gap-2'>
          <span>
            Welcome, <span className='font-bold'>{username}</span>
          </span>
          <button onClick={() => (wizard as StepWizardChildProps)?.previousStep()}>
            <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5 gray hover-color' viewBox='1 1 22 22' strokeWidth='1.5' stroke='currentColor' fill='none' strokeLinecap='round' strokeLinejoin='round'>
              <path stroke='none' d='M0 0h24v24H0z' fill='none' />
              <path d='M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4' />
              <path d='M13.5 6.5l4 4' />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </StepWizard>
  );
}
