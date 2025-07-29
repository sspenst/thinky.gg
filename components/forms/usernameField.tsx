import LoadingSpinner from '../page/loadingSpinner';

interface UsernameFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isValid: boolean;
  exists: boolean;
  isLoading: boolean;
  className?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  labelClassName?: string;
}

export default function UsernameField({
  value,
  onChange,
  isValid,
  exists,
  isLoading,
  className = 'w-full',
  id = 'username',
  label = 'Username',
  placeholder = 'Username',
  required = false,
  labelClassName = 'text-sm font-medium'
}: UsernameFieldProps) {

  return (
    <div>
      <div className='flex justify-between gap-2 flex-wrap mb-2'>
        <label className={labelClassName} htmlFor={id}>
          {label}
        </label>
        {value.length >= 3 && (
          <div className='flex items-center text-sm gap-2'>
            {isLoading ? (
              <LoadingSpinner size={20} />
            ) : isValid && !exists ? (
              <div className='text-sm text-green-600 dark:text-green-400'>
                Username is available
              </div>
            ) : (
              <div className='text-red-500 text-sm'>
                {!isValid ? 'Username is not valid' : 'Username is not available'}
              </div>
            )}
          </div>
        )}
      </div>
      <input
        required={required}
        onChange={onChange}
        value={value}
        className={className}
        id={id}
        type='text'
        placeholder={placeholder}
      />
    </div>
  );
}