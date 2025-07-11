import { Types } from 'mongoose';

interface TrashCan {
  _id: Types.ObjectId;

  // Original record data
  originalDocument: any; // The complete original document
  originalId: Types.ObjectId; // The original _id of the deleted document

  // Metadata for recovery
  originalCollection: string; // Name of the collection the record came from
  originalField: string; // The field that had the orphaned reference
  orphanedUserId: Types.ObjectId; // The user ID that was orphaned

  // Deletion metadata
  deletedAt: Date;
  deletedBy: 'orphan-check' | 'admin' | 'user' | 'system'; // Who/what initiated the deletion
  reason: string; // Human-readable reason for deletion

  // Optional metadata
  notes?: string; // Additional notes about the deletion
  canRestore: boolean; // Whether this record is safe to restore

  // Tracking
  createdAt: Date;
  updatedAt: Date;
}

export default TrashCan;
