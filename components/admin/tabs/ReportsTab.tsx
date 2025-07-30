import FormattedUser from '@root/components/formatted/formattedUser';
import { ReportReason } from '@root/constants/ReportReason';
import { ReportStatus } from '@root/constants/ReportStatus';
import { AlertTriangle, CheckCircle, Clock, ExternalLink, Flag, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface ReportUser {
  _id: string;
  name: string;
}

interface Report {
  _id: string;
  reporter: ReportUser;
  reportedUser: ReportUser;
  reportedEntity: string;
  reportedEntityModel: 'Level' | 'Comment' | 'Review';
  reasonType: ReportReason;
  message: string;
  status: ReportStatus;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
  entityDetails?: {
    name?: string;
    slug?: string;
    text?: string;
    score?: number;
    target?: string;
  };
  reportedUserTotalReports: number;
}

interface ReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface ReportsTabProps {
  formatDate: (date: string | number) => string;
  getTimeAgo: (timestamp: number) => string;
}

export default function ReportsTab({ formatDate, getTimeAgo }: ReportsTabProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0
  });
  const [closingReport, setClosingReport] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchReports = useCallback(async (page = 1, status?: ReportStatus) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`/api/admin/reports?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data: ReportsResponse = await response.json();

        setReports(data.reports);
        setPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          totalCount: data.pagination.totalCount
        });
      } else {
        console.error('Failed to fetch reports');
        toast.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error fetching reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const filterStatus = statusFilter === 'ALL' ? undefined : statusFilter as ReportStatus;

    fetchReports(1, filterStatus);
  }, [fetchReports, statusFilter]);

  const handleCloseReport = async (reportId: string) => {
    if (!closeReason.trim()) {
      toast.error('Please provide a reason for closing the report');

      return;
    }

    setClosingReport(reportId);

    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reportId,
          statusReason: closeReason.trim()
        }),
      });

      if (response.ok) {
        toast.success('Report closed successfully');
        setSelectedReport(null);
        setCloseReason('');
        // Refresh the current page
        const filterStatus = statusFilter === 'ALL' ? undefined : statusFilter as ReportStatus;

        fetchReports(pagination.page, filterStatus);
      } else {
        const errorData = await response.json();

        toast.error(errorData.error || 'Failed to close report');
      }
    } catch (error) {
      console.error('Error closing report:', error);
      toast.error('Error closing report');
    } finally {
      setClosingReport(null);
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
    case ReportStatus.OPEN:
      return <AlertTriangle className='w-4 h-4 text-red-500' />;
    case ReportStatus.REVIEWING:
      return <Clock className='w-4 h-4 text-yellow-500' />;
    case ReportStatus.CLOSED:
      return <CheckCircle className='w-4 h-4 text-green-500' />;
    default:
      return <Flag className='w-4 h-4 text-gray-500' />;
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
    case ReportStatus.OPEN:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case ReportStatus.REVIEWING:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case ReportStatus.CLOSED:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getEntityLink = (report: Report) => {
    const { reportedEntityModel, entityDetails } = report;

    if (!entityDetails) return null;

    switch (reportedEntityModel) {
    case 'Level':
      return entityDetails.slug ? `/level/${entityDetails.slug}` : null;
    case 'Comment':
      return entityDetails.target ? `/profile/${entityDetails.target}` : null;
    case 'Review':
      return null; // Reviews are viewed on level pages, but we don't have level info here
    default:
      return null;
    }
  };

  return (
    <div className='space-y-6'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <Flag className='w-6 h-6 text-orange-500' />
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Reports Management</h2>
          </div>
          {/* Status Filter */}
          <select
            className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500'
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value='ALL'>All Reports</option>
            <option value={ReportStatus.OPEN}>Open</option>
            <option value={ReportStatus.REVIEWING}>Reviewing</option>
            <option value={ReportStatus.CLOSED}>Closed</option>
          </select>
        </div>
        {/* Reports List */}
        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500' />
            <span className='ml-3 text-gray-600 dark:text-gray-400'>Loading reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
            No reports found
          </div>
        ) : (
          <div className='space-y-4'>
            {reports.map((report) => (
              <div
                key={report._id}
                className='border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
              >
                <div className='flex items-start justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-2'>
                      {getStatusIcon(report.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      <span className='text-sm text-gray-500 dark:text-gray-400'>
                        {formatDate(new Date(report.createdAt).getTime() / 1000)}
                      </span>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-3'>
                      <div>
                        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Reporter: </span>
                        <FormattedUser id='admin-reports' user={report.reporter as any} size={16} />
                      </div>
                      <div>
                        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Reported User: </span>
                        <FormattedUser id='admin-reports' user={report.reportedUser as any} size={16} />
                        <span className='ml-2 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded'>
                          {report.reportedUserTotalReports} reports total
                        </span>
                      </div>
                    </div>
                    <div className='mb-3'>
                      <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Type: </span>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>{report.reportedEntityModel}</span>
                      {report.entityDetails && (
                        <>
                          <span className='mx-2 text-gray-400'>•</span>
                          <span className='text-sm text-gray-600 dark:text-gray-400'>
                            {report.entityDetails.name ||
                             (report.entityDetails.text && report.entityDetails.text.length > 50
                               ? report.entityDetails.text.substring(0, 50) + '...'
                               : report.entityDetails.text) ||
                             'Content'}
                          </span>
                          {getEntityLink(report) && (
                            <a
                              href={getEntityLink(report)!}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='ml-2 text-blue-500 hover:text-blue-600'
                            >
                              <ExternalLink className='w-4 h-4 inline' />
                            </a>
                          )}
                        </>
                      )}
                    </div>
                    <div className='mb-3'>
                      <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Reason: </span>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>{report.reasonType}</span>
                    </div>
                    {report.message && (
                      <div className='mb-3'>
                        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Message: </span>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>{report.message}</span>
                      </div>
                    )}
                    {report.status === ReportStatus.CLOSED && report.statusReason && (
                      <div className='mb-3'>
                        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Resolution: </span>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>{report.statusReason}</span>
                      </div>
                    )}
                  </div>
                  {report.status !== ReportStatus.CLOSED && (
                    <button
                      onClick={() => setSelectedReport(report)}
                      className='px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors'
                    >
                      Close Report
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className='flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-600'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total reports)
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => {
                  const filterStatus = statusFilter === 'ALL' ? undefined : statusFilter as ReportStatus;

                  fetchReports(pagination.page - 1, filterStatus);
                }}
                disabled={pagination.page <= 1}
                className='px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Previous
              </button>
              <button
                onClick={() => {
                  const filterStatus = statusFilter === 'ALL' ? undefined : statusFilter as ReportStatus;

                  fetchReports(pagination.page + 1, filterStatus);
                }}
                disabled={pagination.page >= pagination.totalPages}
                className='px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Close Report Modal */}
      {selectedReport && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Close Report</h3>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setCloseReason('');
                }}
                className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              >
                <X className='w-6 h-6' />
              </button>
            </div>
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Resolution Reason
              </label>
              <textarea
                className='w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500'
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Explain the resolution (e.g., 'resolved - content removed', 'no action needed - not a violation', etc.)"
                rows={3}
                maxLength={500}
              />
              <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {closeReason.length}/500 characters
              </div>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => handleCloseReport(selectedReport._id)}
                disabled={!closeReason.trim() || closingReport === selectedReport._id}
                className='flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors'
              >
                {closingReport === selectedReport._id ? 'Closing...' : 'Close Report'}
              </button>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setCloseReason('');
                }}
                className='px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
