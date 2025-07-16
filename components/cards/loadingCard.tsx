import LoadingSpinner from '../page/loadingSpinner';

export default function LoadingCard() {
  return (
    <div className='pb-3 rounded-lg flex flex-col items-start gap-2 w-64 max-w-full h-fit p-1'>
      <div
        className='border-2 border-color-2 rounded-md w-full'
        style={{
          aspectRatio: '40 / 21',
        }}
      />
      <div className='h-16 p-0.5'>
        <LoadingSpinner />
      </div>
    </div>
  );
}
