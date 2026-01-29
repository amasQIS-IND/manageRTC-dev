/**
 * Email Service
 *
 * Handles email sending via SendGrid
 * Supports transactional emails, notifications, and bulk emails
 *
 * @module services/email/emailService
 */

import sgMail from '@sendgrid/mail';

/**
 * Email Service Class
 */
export class EmailService {
  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@manage-rtc.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'manageRTC';
    this.replyTo = process.env.EMAIL_REPLY_TO || this.fromEmail;

    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.enabled = true;
    } else {
      console.warn('SendGrid API key not configured. Email service disabled.');
      this.enabled = false;
    }
  }

  /**
   * Send a single email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} SendGrid response
   */
  async sendEmail(options) {
    if (!this.enabled) {
      console.log('Email service disabled. Would have sent:', options);
      return { disabled: true };
    }

    const {
      to,
      subject,
      text,
      html,
      attachments = [],
      cc = [],
      bcc = [],
      replyTo = this.replyTo,
      categories = [],
      templateId = null,
      dynamicTemplateData = null
    } = options;

    try {
      const msg = {
        to: Array.isArray(to) ? to : [{ email: to }],
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        replyTo: {
          email: replyTo
        },
        subject,
        text,
        html,
        attachments: attachments.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.type || 'application/pdf',
          disposition: 'attachment'
        })),
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        categories,
        customArgs: {
          source: 'manageRTC'
        }
      };

      // Use template if provided
      if (templateId) {
        msg.templateId = templateId;
        if (dynamicTemplateData) {
          msg.dynamicTemplateData = dynamicTemplateData;
        }
        delete msg.subject;
        delete msg.text;
        delete msg.html;
      }

      const response = await sgMail.send(msg);
      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'],
        response: response[0]
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Send welcome email to new employee
   * @param {Object} employee - Employee data
   * @param {string} temporaryPassword - Temporary password (if applicable)
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(employee, temporaryPassword = null) {
    const loginUrl = process.env.FRONTEND_URL || 'https://manage-rtc.com';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to manageRTC!</h2>
        <p>Dear ${employee.firstName} ${employee.lastName},</p>
        <p>Welcome to the team! Your account has been created successfully.</p>

        <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Account Details:</h3>
          <p><strong>Employee ID:</strong> ${employee.employeeId}</p>
          <p><strong>Email:</strong> ${employee.email}</p>
          ${temporaryPassword ? `<p><strong>Temporary Password:</strong> ${temporaryPassword}</p>` : ''}
        </div>

        <p>Please <a href="${loginUrl}" style="color: #3498db;">click here to login</a> and change your password.</p>

        <p>If you have any questions, please contact your HR department.</p>

        <p>Best regards,<br>The manageRTC Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: employee.email,
      subject: 'Welcome to manageRTC',
      html,
      categories: ['welcome', 'onboarding']
    });
  }

  /**
   * Send payslip email to employee
   * @param {Object} employee - Employee data
   * @param {Object} payroll - Payroll data
   * @param {Buffer} payslipPdf - Payslip PDF buffer
   * @returns {Promise<Object>} Send result
   */
  async sendPayslipEmail(employee, payroll, payslipPdf) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://manage-rtc.com';
    const periodDisplay = this.getPeriodDisplay(payroll.month, payroll.year);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Your Payslip is Ready!</h2>
        <p>Dear ${employee.firstName} ${employee.lastName},</p>
        <p>Your payslip for ${periodDisplay} is now available.</p>

        <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Salary Summary:</h3>
          <p><strong>Gross Salary:</strong> ${this.formatCurrency(payroll.grossSalary)}</p>
          <p><strong>Total Deductions:</strong> ${this.formatCurrency(payroll.totalDeductions)}</p>
          <p style="font-size: 18px; color: #27ae60;"><strong>Net Salary:</strong> ${this.formatCurrency(payroll.netSalary)}</p>
        </div>

        <p>Your detailed payslip is attached as a PDF.</p>
        <p>You can also view it in the <a href="${frontendUrl}/payslip" style="color: #3498db;">employee portal</a>.</p>

        <p>Best regards,<br>HR Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: employee.email,
      subject: `Payslip for ${periodDisplay}`,
      html,
      attachments: [{
        content: payslipPdf.toString('base64'),
        filename: `payslip_${payroll.month}_${payroll.year}.pdf`,
        type: 'application/pdf'
      }],
      categories: ['payslip', 'payroll']
    });
  }

  /**
   * Send leave request notification to manager
   * @param {Object} employee - Employee data
   * @param {Object} leaveRequest - Leave request data
   * @param {string} managerEmail - Manager email
   * @returns {Promise<Object>} Send result
   */
  async sendLeaveRequestNotification(employee, leaveRequest, managerEmail) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://manage-rtc.com';
    const approvalUrl = `${frontendUrl}/leave-approval/${leaveRequest.leaveId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Leave Request</h2>
        <p>A new leave request requires your approval:</p>

        <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
          <p><strong>Employee ID:</strong> ${employee.employeeId}</p>
          <p><strong>Leave Type:</strong> ${leaveRequest.leaveType}</p>
          <p><strong>From:</strong> ${this.formatDate(leaveRequest.fromDate)}</p>
          <p><strong>To:</strong> ${this.formatDate(leaveRequest.toDate)}</p>
          <p><strong>Number of Days:</strong> ${leaveRequest.numberOfDays}</p>
          <p><strong>Reason:</strong> ${leaveRequest.reason}</p>
        </div>

        <p><a href="${approvalUrl}" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Request</a></p>

        <p>Best regards,<br>manageRTC System</p>
      </div>
    `;

    return await this.sendEmail({
      to: managerEmail,
      subject: `Leave Request: ${employee.firstName} ${employee.lastName}`,
      html,
      categories: ['leave-request', 'approval']
    });
  }

  /**
   * Send leave approval notification to employee
   * @param {Object} employee - Employee data
   * @param {Object} leaveRequest - Leave request data
   * @param {string} status - Approval status (Approved/Rejected)
   * @returns {Promise<Object>} Send result
   */
  async sendLeaveStatusNotification(employee, leaveRequest, status) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://manage-rtc.com';
    const statusColor = status === 'Approved' ? '#27ae60' : '#c0392b';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${statusColor};">Leave Request ${status}</h2>
        <p>Dear ${employee.firstName} ${employee.lastName},</p>
        <p>Your leave request has been ${status.toLowerCase()}.</p>

        <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Leave Type:</strong> ${leaveRequest.leaveType}</p>
          <p><strong>From:</strong> ${this.formatDate(leaveRequest.fromDate)}</p>
          <p><strong>To:</strong> ${this.formatDate(leaveRequest.toDate)}</p>
          <p><strong>Number of Days:</strong> ${leaveRequest.numberOfDays}</p>
          ${status === 'Rejected' ? `<p><strong>Reason:</strong> ${leaveRequest.rejectedReason || 'Not specified'}</p>` : ''}
        </div>

        <p>You can view your leave balance in the <a href="${frontendUrl}/leave" style="color: #3498db;">employee portal</a>.</p>

        <p>Best regards,<br>HR Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: employee.email,
      subject: `Leave Request ${status}`,
      html,
      categories: ['leave-status', 'notification']
    });
  }

  /**
   * Send interview invitation
   * @param {Object} candidate - Candidate data
   * @param {Object} interview - Interview details
   * @returns {Promise<Object>} Send result
   */
  async sendInterviewInvitation(candidate, interview) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Interview Invitation</h2>
        <p>Dear ${candidate.name},</p>
        <p>You have been shortlisted for an interview at our company.</p>

        <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Position:</strong> ${interview.position}</p>
          <p><strong>Date:</strong> ${this.formatDate(interview.date)}</p>
          <p><strong>Time:</strong> ${interview.time}</p>
          <p><strong>Location:</strong> ${interview.location || 'Our Office'}</p>
          <p><strong>Interviewer:</strong> ${interview.interviewer}</p>
        </div>

        <p>Please confirm your attendance by replying to this email.</p>

        <p>Best regards,<br>HR Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: candidate.email,
      subject: `Interview Invitation - ${interview.position}`,
      html,
      categories: ['recruitment', 'interview']
    });
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} resetLink - Password reset link
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(email, resetLink) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Reset Your Password</h2>
        <p>You requested to reset your password.</p>
        <p>Click the button below to set a new password:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">Reset Password</a>
        </div>

        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>

        <p>Best regards,<br>manageRTC Team</p>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html,
      categories: ['security', 'password-reset']
    });
  }

  /**
   * Send bulk email to multiple recipients
   * @param {Array} recipients - Array of email addresses
   * @param {Object} emailOptions - Email options
   * @returns {Promise<Object>} Bulk send result
   */
  async sendBulkEmail(recipients, emailOptions) {
    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const recipient of recipients) {
      try {
        await this.sendEmail({
          ...emailOptions,
          to: recipient
        });
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          recipient,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Send company announcement
   * @param {Array} recipients - Array of employee emails
   * @param {string} subject - Announcement subject
   * @param {string} message - Announcement message
   * @returns {Promise<Object>} Send result
   */
  async sendAnnouncement(recipients, subject, message) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">${subject}</h2>
        <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p>Best regards,<br>Management</p>
      </div>
    `;

    return await this.sendBulkEmail(recipients, {
      subject: `[Announcement] ${subject}`,
      html,
      categories: ['announcement', 'company']
    });
  }

  /**
   * Send notification email
   * @param {Object} employee - Employee data
   * @param {string} notificationType - Type of notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} Send result
   */
  async sendNotification(employee, notificationType, data = {}) {
    const notifications = {
      'document_uploaded': async () => {
        return await this.sendEmail({
          to: employee.email,
          subject: 'New Document Added',
          html: `
            <p>Dear ${employee.firstName},</p>
            <p>A new document has been added to your profile.</p>
            <p><strong>Document:</strong> ${data.documentName}</p>
          `,
          categories: ['notification', 'document']
        });
      },
      'profile_updated': async () => {
        return await this.sendEmail({
          to: employee.email,
          subject: 'Profile Updated',
          html: `
            <p>Dear ${employee.firstName},</p>
            <p>Your profile has been updated successfully.</p>
          `,
          categories: ['notification', 'profile']
        });
      },
      'salary_updated': async () => {
        return await this.sendEmail({
          to: employee.email,
          subject: 'Salary Details Updated',
          html: `
            <p>Dear ${employee.firstName},</p>
            <p>Your salary details have been updated.</p>
            <p>Please check the employee portal for details.</p>
          `,
          categories: ['notification', 'salary']
        });
      }
    };

    const notification = notifications[notificationType];
    if (notification) {
      return await notification();
    }

    console.warn(`Unknown notification type: ${notificationType}`);
    return { skipped: true };
  }

  /**
   * Format currency
   * @param {number} amount - Amount
   * @returns {string} Formatted currency
   */
  formatCurrency(amount) {
    if (typeof amount !== 'number') return '₹0';
    return '₹' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Format date
   * @param {Date} date - Date
   * @returns {string} Formatted date
   */
  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Get period display
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {string} Formatted period
   */
  getPeriodDisplay(month, year) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[month - 1]} ${year}`;
  }
}

// Export singleton instance
export default new EmailService();
