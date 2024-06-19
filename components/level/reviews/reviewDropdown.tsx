import { Menu, Transition } from '@headlessui/react';
import ReportModal from '@root/components/modal/reportModal';
import { ReportType } from '@root/constants/ReportType';
import { AppContext } from '@root/contexts/appContext';
import { LevelContext } from '@root/contexts/levelContext';
import { PageContext } from '@root/contexts/pageContext';
import isCurator from '@root/helpers/isCurator';
import isGuest from '@root/helpers/isGuest';
import Review from '@root/models/db/review';
import classNames from 'classnames';
import React, { Fragment, useContext, useState } from 'react';
import toast from 'react-hot-toast';
import DeleteReviewModal from '../../modal/deleteReviewModal';

interface ReviewDropdownProps {
  review: Review
  inModal?: boolean;
  onEditClick: () => void;
  userId: string;
}

export default function ReviewDropdown({ inModal, onEditClick, userId, review }: ReviewDropdownProps) {
  const { setModal } = useContext(PageContext);
  const [isDeleteReviewOpen, setIsDeleteReviewOpen] = useState(false);
  const levelContext = useContext(LevelContext);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { user } = useContext(AppContext);

  const canEdit = userId === user?._id.toString() || isCurator(user);
  const isNotAuthor = user?._id.toString() !== userId;

  if (!user || isGuest(user)) {
    return null;
  }

  const modal = <ReportModal targetId={review._id.toString()} reportType={ReportType.REVIEW} />;
  const reportReview = async () => {
    setModal(modal);
  };

  return (<>
    <Menu as='div' className='relative'>
      <Menu.Button className='flex items-center' id='dropdownMenuBtn' aria-label='dropdown menu'>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6 hover:opacity-100 opacity-50'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
        </svg>
      </Menu.Button>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-100'
        enterFrom='transform opacity-0 scale-95'
        enterTo='transform opacity-100 scale-100'
        leave='transition ease-in duration-75'
        leaveFrom='transform opacity-100 scale-100'
        leaveTo='transform opacity-0 scale-95'
      >
        <Menu.Items className='absolute right-0 m-1 w-fit origin-top-right rounded-[10px] shadow-lg border z-20 bg-1 border-color-3'>
          <div className='px-1 py-1'>
            <Menu.Item>
              {({ active }) => (
                <div
                  className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3 text-yellow-500')}
                  onClick={() => {
                    reportReview();
                  }}
                  style={{
                    backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                  }}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-exclamation-triangle' viewBox='0 0 16 16'>
                    <path d='M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z' />
                    <path d='M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z' />
                  </svg>
                  Report
                </div>
              )}
            </Menu.Item>
            {canEdit && <Menu.Item>
              {({ active }) => (
                <div
                  className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': isNotAuthor })}
                  onClick={() => onEditClick()}
                  style={{
                    backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                  }}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125' />
                  </svg>
                  Edit
                </div>
              )}
            </Menu.Item>
            }
            { canEdit && <Menu.Item>
              {({ active }) => (
                <div
                  className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': isNotAuthor })}
                  onClick={() => {
                    setIsDeleteReviewOpen(true);

                    if (!inModal) {
                      setPreventKeyDownEvent(true);
                    }
                  }}
                  style={{
                    backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                  }}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0' />
                  </svg>
                  Delete
                </div>
              )}
            </Menu.Item>
            }
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
    <DeleteReviewModal
      closeModal={() => {
        setIsDeleteReviewOpen(false);
        levelContext?.mutateReviews();

        if (!inModal) {
          setPreventKeyDownEvent(false);
        }
      }}
      isOpen={isDeleteReviewOpen}
      userId={userId}
    />
  </>);
}
