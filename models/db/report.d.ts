import { ReportReason } from '@root/pages/api/report/ReportReason';
import { ReportType } from '@root/constants/ReportType';

interface Report {
    createdAt: Date;
    updatedAt: Date;
    reporter: User;
    reportedUser: User;
    reportedEntity: Collection | Level | Comment | Review;
    reportedEntityModel: ReportType;
    entityType: ReportEntityType;
    reasonType: ReportReason;
    message: string;
    status: ReportStatus;
    statusReason: string;
}
