import { ReportReason, ReportType } from '@root/pages/api/report';

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
