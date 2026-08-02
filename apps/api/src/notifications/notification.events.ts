import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';

interface EventPayload {
  tenantId: string;
  employeeEmail?: string;
  employeeName?: string;
  extra?: string;
}

function nameOf(payload: EventPayload): string {
  return payload.employeeName ?? payload.employeeEmail ?? 'Employee';
}

@Injectable()
export class NotificationEvents {
  constructor(private notifications: NotificationService) {}

  @OnEvent('leave.requested')
  onLeaveRequested(payload: EventPayload) {
    this.notifications.notifyApprovers(
      payload.tenantId,
      'leaves',
      'approve',
      'leave_request',
      `Leave request from ${nameOf(payload)}`,
      payload.extra ? `Reason: ${payload.extra}` : undefined,
      { kind: 'leave.requested' },
    );
  }

  @OnEvent('leave.approved')
  onLeaveApproved(payload: EventPayload) {
    if (!payload.employeeEmail) return;
    this.notifications.notifyEmployee(
      payload.tenantId,
      payload.employeeEmail,
      'leave_approved',
      'Leave approved',
      'Your leave request was approved.',
      { kind: 'leave.approved' },
    );
  }

  @OnEvent('leave.rejected')
  onLeaveRejected(payload: EventPayload) {
    if (!payload.employeeEmail) return;
    this.notifications.notifyEmployee(
      payload.tenantId,
      payload.employeeEmail,
      'leave_rejected',
      'Leave rejected',
      payload.extra || 'Your leave request was rejected.',
      { kind: 'leave.rejected' },
    );
  }

  @OnEvent('attendance.correction.submitted')
  onCorrectionSubmitted(payload: EventPayload) {
    this.notifications.notifyApprovers(
      payload.tenantId,
      'attendance',
      'approve',
      'attendance_correction',
      `Attendance correction from ${nameOf(payload)}`,
      payload.extra,
      { kind: 'attendance.correction.submitted' },
    );
  }

  @OnEvent('attendance.correction.resolved')
  onCorrectionResolved(payload: EventPayload) {
    if (!payload.employeeEmail) return;
    this.notifications.notifyEmployee(
      payload.tenantId,
      payload.employeeEmail,
      'attendance_correction_resolved',
      'Attendance correction reviewed',
      payload.extra,
      { kind: 'attendance.correction.resolved' },
    );
  }
}
