const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'login', 'approve', 'reject'],
      required: true,
    },
    entity: {
      type: String,
      enum: ['company', 'admin', 'user', 'vehicle', 'fuel_log', 'membership'],
      required: true,
    },
    entityId:    { type: mongoose.Schema.Types.ObjectId, default: null },
    entityName:  { type: String, default: '' },
    detail:      { type: String, default: '' },
    performedBy: { type: String, default: 'superadmin' },
    companyName: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ entity: 1, action: 1 });
activityLogSchema.index({ entityName: 'text', detail: 'text', performedBy: 'text' });
// Auto-delete logs older than 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
