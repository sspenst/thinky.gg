import { TERMS_OF_SERVICE_URL } from '@root/constants/externalLinks';
import { ReportReason } from '@root/constants/ReportReason';
import { ReportType } from '@root/constants/ReportType';
import { PageContext } from '@root/contexts/pageContext';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '.';

interface ReportModalProps {
    targetId: string;
    reportType: ReportType;
    }

export default function ReportModal({ targetId, reportType }: ReportModalProps) {
  const { setModal, setPreventKeyDownEvent } = useContext(PageContext);
  const [reason, setReason] = useState('');
  const fileReport = async () => {
    const confirm = window.confirm('Are you sure you want to report this review?');

    if (!confirm) {
      return;
    }

    const res = await fetch('/api/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetId: targetId,
        reportReason: 'OTHER',
        reportType: reportType,
        message: reason,
      }),
    });
    const resp = await res.json();

    toast.dismiss();

    if (res.status !== 200) {
      toast.error(resp.error || 'Error reporting review');

      return;
    }

    toast.success('Review reported. Please allow some time for moderation!');
  };

  useEffect(() => {
    setPreventKeyDownEvent(true);

    return () => {
      setPreventKeyDownEvent(false);
    };
  }
  , [setPreventKeyDownEvent]);
  const reportReasons = {
    [ReportType.COMMENT]: [ReportReason.SPAM, ReportReason.HARASSMENT],
    [ReportType.LEVEL]: [ReportReason.SPAM, ReportReason.HARASSMENT],
    [ReportType.REVIEW]: [ReportReason.SPAM, ReportReason.HARASSMENT, ReportReason.REVIEW_BOMBING],
  };
  const reasonDisplayName = {
    [ReportReason.HARASSMENT]: 'Harassment',
    [ReportReason.OTHER]: 'Other',
    [ReportReason.REVIEW_BOMBING]: 'Review bombing',
    [ReportReason.SPAM]: 'Spam',
  };

  return (
    <Modal
      title='Report'
      isOpen={true}
      closeModal={() => {
        setPreventKeyDownEvent(false);
        setModal(null);
      }}
    >
      <div className='flex flex-col gap-4'>
        <label htmlFor='reason' className='text-sm'>Flag this {reportType.toLowerCase()} for violating the <Link className='underline' href={TERMS_OF_SERVICE_URL}>Thinky.gg terms</Link>.</label>
        <select
          id='reason'
          className='border border-color-3 rounded-md p-2'
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value='' disabled>
            Select a reason
          </option>
          {reportReasons[reportType].concat(ReportReason.OTHER).map((reason) => (
            <option key={reason} value={reason}>
              {reasonDisplayName[reason]}
            </option>
          ))}
        </select>
        <textarea
          id='reason'
          className='border border-color-3 rounded-md p-2'
          value={reason}
          placeholder='Please provide a reason for reporting this review.'
          onChange={e => setReason(e.target.value)}
        />
        <button
          className='bg-blue-500 enabled:hover:bg-blue-600 text-white w-full font-medium py-2 px-3 rounded disabled:opacity-50'
          onClick={fileReport}
        >
            File report
        </button>
      </div>
    </Modal>
  );
}
