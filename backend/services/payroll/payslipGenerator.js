/**
 * Payslip PDF Generator Service
 *
 * Generates PDF payslips for employees with complete salary breakdown
 * Supports email delivery and download
 *
 * @module services/payroll/payslipGenerator
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Payslip Generator Class
 */
export class PayslipGenerator {
  constructor() {
    this.fonts = {
      regular: null,
      bold: null
    };
  }

  /**
   * Generate payslip PDF for a payroll record
   * @param {Object} payroll - Payroll document
   * @param {Object} employee - Employee document
   * @param {Object} options - Generation options
   * @returns {Buffer} PDF buffer
   */
  async generatePayslipPDF(payroll, employee, options = {}) {
    const {
      includeLogo = true,
      includeSummary = true,
      includeAttendance = true,
      includeYearToDate = false,
      language = 'en'
    } = options;

    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Payslip - ${employee.firstName} ${employee.lastName}`,
            Author: 'manageRTC',
            Subject: `Payslip for ${this.getPeriodDisplay(payroll.month, payroll.year)}`,
            Creator: 'manageRTC Payroll System'
          }
        });

        // Collect PDF chunks
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate payslip content
        this.generatePayslipContent(doc, payroll, employee, {
          includeLogo,
          includeSummary,
          includeAttendance,
          includeYearToDate,
          language
        });

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate payslip content
   * @param {PDFDocument} doc - PDFKit document
   * @param {Object} payroll - Payroll data
   * @param {Object} employee - Employee data
   * @param {Object} options - Options
   */
  generatePayslipContent(doc, payroll, employee, options) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;

    // Header Section
    if (options.includeLogo) {
      this.drawHeader(doc, centerX);
    }

    // Title
    doc.moveDown(20);
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#333333')
       .text('Payslip', { align: 'center' });
    doc.moveDown(5);

    // Period
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#666666')
       .text(`Period: ${this.getPeriodDisplay(payroll.month, payroll.year)}`, { align: 'center' });

    // Employee Details Section
    doc.moveDown(20);
    this.drawSectionTitle(doc, 'Employee Details');
    this.drawEmployeeDetails(doc, employee, payroll);

    // Earnings Section
    doc.moveDown(15);
    this.drawSectionTitle(doc, 'Earnings');
    this.drawEarningsTable(doc, payroll.earnings, payroll.grossSalary);

    // Deductions Section
    doc.moveDown(15);
    this.drawSectionTitle(doc, 'Deductions');
    this.drawDeductionsTable(doc, payroll.deductions, payroll.totalDeductions);

    // Net Salary Section
    doc.moveDown(15);
    this.drawNetSalaryBox(doc, payroll.grossSalary, payroll.totalDeductions, payroll.netSalary);

    // Attendance Details
    if (options.includeAttendance && payroll.attendanceData) {
      doc.moveDown(15);
      this.drawSectionTitle(doc, 'Attendance Details');
      this.drawAttendanceDetails(doc, payroll.attendanceData);
    }

    // Payment Information
    doc.moveDown(15);
    this.drawSectionTitle(doc, 'Payment Information');
    this.drawPaymentInfo(doc, payroll);

    // Footer
    this.drawFooter(doc, pageWidth);
  }

  /**
   * Draw header with company info
   * @param {PDFDocument} doc - PDF document
   * @param {number} centerX - Center X position
   */
  drawHeader(doc, centerX) {
    // Company name
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('manageRTC', centerX, 50, { align: 'center' });

    // Tagline
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#7f8c8d')
       .text('Human Resource Management System', centerX, 72, { align: 'center' });

    // Line separator
    doc.moveTo(50, 95)
       .lineTo(doc.page.width - 50, 95)
       .lineWidth(1)
       .strokeColor('#3498db')
       .stroke();
  }

  /**
   * Draw section title
   * @param {PDFDocument} doc - PDF document
   * @param {string} title - Section title
   */
  drawSectionTitle(doc, title) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text(title, 50, doc.y);

    // Underline
    doc.moveTo(50, doc.y + 2)
       .lineTo(200, doc.y + 2)
       .lineWidth(2)
       .strokeColor('#3498db')
       .stroke();

    doc.moveDown(5);
  }

  /**
   * Draw employee details
   * @param {PDFDocument} doc - PDF document
   * @param {Object} employee - Employee data
   * @param {Object} payroll - Payroll data
   */
  drawEmployeeDetails(doc, employee, payroll) {
    const details = [
      ['Employee Name', `${employee.firstName} ${employee.lastName}`],
      ['Employee ID', employee.employeeId || 'N/A'],
      ['Department', this.getDepartmentName(employee)],
      ['Designation', this.getDesignationName(employee)],
      ['Date of Joining', this.formatDate(employee.joiningDate)],
      ['Employment Type', employee.employmentType || 'Full-time']
    ];

    this.drawTwoColumnTable(doc, details, 50, doc.y);
  }

  /**
   * Draw earnings table
   * @param {PDFDocument} doc - PDF document
   * @param {Object} earnings - Earnings data
   * @param {number} total - Total earnings
   */
  drawEarningsTable(doc, earnings, total) {
    const tableData = [
      ['Description', 'Amount (₹)'],
      ['Basic Salary', this.formatCurrency(earnings.basicSalary)],
      ['House Rent Allowance (HRA)', this.formatCurrency(earnings.hra)],
      ['Dearness Allowance', this.formatCurrency(earnings.dearnessAllowance)],
      ['Conveyance Allowance', this.formatCurrency(earnings.conveyanceAllowance)],
      ['Medical Allowance', this.formatCurrency(earnings.medicalAllowance)],
      ['Special Allowance', this.formatCurrency(earnings.specialAllowance)],
      ['Other Allowances', this.formatCurrency(earnings.otherAllowances)],
      ['Overtime', this.formatCurrency(earnings.overtime)],
      ['Bonus', this.formatCurrency(earnings.bonus)],
      ['Incentive', this.formatCurrency(earnings.incentive)],
      ['Arrears', this.formatCurrency(earnings.arrears)],
      ['Commission', this.formatCurrency(earnings.commission)],
      ['', ''],
      ['Gross Salary', this.formatCurrency(total)]
    ];

    this.drawTable(doc, tableData, {
      headerBackgroundColor: '#27ae60',
      headerTextColor: '#ffffff',
      alternateRowColor: '#f0f9f4',
      totalRow: true,
      totalRowColor: '#1e8449'
    });
  }

  /**
   * Draw deductions table
   * @param {PDFDocument} doc - PDF document
   * @param {Object} deductions - Deductions data
   * @param {number} total - Total deductions
   */
  drawDeductionsTable(doc, deductions, total) {
    const tableData = [
      ['Description', 'Amount (₹)'],
      ['Professional Tax', this.formatCurrency(deductions.professionalTax)],
      ['Income Tax (TDS)', this.formatCurrency(deductions.tds)],
      ['Provident Fund (PF)', this.formatCurrency(deductions.providentFund)],
      ['Employee State Insurance (ESI)', this.formatCurrency(deductions.esi)],
      ['Loan Deduction', this.formatCurrency(deductions.loanDeduction)],
      ['Advance Deduction', this.formatCurrency(deductions.advanceDeduction)],
      ['Late Coming Deduction', this.formatCurrency(deductions.lateDeduction)],
      ['Other Deductions', this.formatCurrency(deductions.otherDeductions)],
      ['', ''],
      ['Total Deductions', this.formatCurrency(total)]
    ];

    this.drawTable(doc, tableData, {
      headerBackgroundColor: '#c0392b',
      headerTextColor: '#ffffff',
      alternateRowColor: '#fdedec',
      totalRow: true,
      totalRowColor: '#922b21'
    });
  }

  /**
   * Draw net salary box
   * @param {PDFDocument} doc - PDF document
   * @param {number} grossSalary - Gross salary
   * @param {number} totalDeductions - Total deductions
   * @param {number} netSalary - Net salary
   */
  drawNetSalaryBox(doc, grossSalary, totalDeductions, netSalary) {
    const boxY = doc.y;
    const boxWidth = doc.page.width - 100;
    const boxHeight = 80;

    // Draw background box
    doc.rect(50, boxY, boxWidth, boxHeight)
       .fill('#ecf0f1')
       .stroke('#bdc3c7');

    // Net Salary label
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Net Salary', 70, boxY + 15);

    // Net Salary amount
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('#27ae60')
       .text(this.formatCurrency(netSalary), 70, boxY + 40);

    // Summary on right side
    const summaryX = 350;
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#7f8c8d');

    doc.text(`Gross Salary:`, summaryX, boxY + 20);
    doc.text(`Total Deductions:`, summaryX, boxY + 40);
    doc.text(`Net Payable:`, summaryX, boxY + 60);

    doc.fillColor('#2c3e50')
       .text(this.formatCurrency(grossSalary), summaryX + 100, boxY + 20)
       .text(`- ${this.formatCurrency(totalDeductions)}`, summaryX + 100, boxY + 40);

    doc.fillColor('#27ae60')
       .font('Helvetica-Bold')
       .text(`= ${this.formatCurrency(netSalary)}`, summaryX + 100, boxY + 60);

    doc.moveDown(80);
  }

  /**
   * Draw attendance details
   * @param {PDFDocument} doc - PDF document
   * @param {Object} attendanceData - Attendance data
   */
  drawAttendanceDetails(doc, attendanceData) {
    const details = [
      ['Present Days', attendanceData.presentDays || 0],
      ['Absent Days', attendanceData.absentDays || 0],
      ['Paid Leave Days', attendanceData.paidLeaveDays || 0],
      ['Unpaid Leave Days', attendanceData.unpaidLeaveDays || 0],
      ['Holidays', attendanceData.holidays || 0],
      ['Overtime Hours', attendanceData.overtimeHours || 0],
      ['Late Days', attendanceData.lateDays || 0]
    ];

    this.drawTwoColumnTable(doc, details, 50, doc.y);
  }

  /**
   * Draw payment information
   * @param {PDFDocument} doc - PDF document
   * @param {Object} payroll - Payroll data
   */
  drawPaymentInfo(doc, payroll) {
    const paymentDate = payroll.paymentDate ? this.formatDate(payroll.paymentDate) : 'Pending';
    const paymentMethod = payroll.paymentMethod || 'Bank Transfer';

    const details = [
      ['Payment Date', paymentDate],
      ['Payment Method', paymentMethod],
      ['Payment Status', payroll.status],
      ['Bank Name', payroll.bankName || employee.bankDetails?.bankName || 'N/A']
    ];

    if (payroll.transactionId) {
      details.push(['Transaction ID', payroll.transactionId]);
    }

    if (payroll.utr) {
      details.push(['UTR', payroll.utr]);
    }

    this.drawTwoColumnTable(doc, details, 50, doc.y);
  }

  /**
   * Draw a simple table
   * @param {PDFDocument} doc - PDF document
   * @param {Array} tableData - 2D array of table data
   * @param {Object} options - Table options
   */
  drawTable(doc, tableData, options = {}) {
    const {
      headerBackgroundColor = '#34495e',
      headerTextColor = '#ffffff',
      alternateRowColor = '#f8f9fa',
      totalRow = false,
      totalRowColor = '#2c3e50'
    } = options;

    const startX = 50;
    const startY = doc.y;
    const colWidths = [350, 150];
    const rowHeight = 25;
    const headerHeight = 30;

    let currentY = startY;

    tableData.forEach((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      const isTotal = totalRow && rowIndex === tableData.length - 1;
      const isAlternate = !isHeader && !isTotal && rowIndex % 2 === 0;

      // Draw row background
      if (isHeader) {
        doc.rect(startX, currentY, colWidths[0] + colWidths[1], headerHeight)
           .fill(headerBackgroundColor);
      } else if (isTotal) {
        doc.rect(startX, currentY, colWidths[0] + colWidths[1], rowHeight)
           .fill(totalRowColor);
      } else if (isAlternate) {
        doc.rect(startX, currentY, colWidths[0] + colWidths[1], rowHeight)
           .fill(alternateRowColor);
      }

      // Draw text
      row.forEach((cell, cellIndex) => {
        const cellX = startX + (cellIndex === 0 ? 10 : colWidths[0] + 10);
        const cellWidth = colWidths[cellIndex];

        if (isHeader || isTotal) {
          doc.fontSize(isHeader ? 11 : 12)
             .font('Helvetica-Bold')
             .fillColor(headerBackgroundColor ? '#ffffff' : headerTextColor);
        } else {
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#333333');
        }

        const align = cellIndex === 1 ? 'right' : 'left';
        doc.text(cell, cellX, currentY + (isHeader ? 10 : 8), { width: cellWidth - 20, align });
      });

      currentY += isHeader ? headerHeight : rowHeight;
    });

    doc.y = currentY + 10;
  }

  /**
   * Draw two-column layout
   * @param {PDFDocument} doc - PDF document
   * @param {Array} data - Array of [label, value] pairs
   * @param {number} startX - Start X position
   * @param {number} startY - Start Y position
   */
  drawTwoColumnTable(doc, data, startX, startY) {
    const col1Width = 200;
    const col2Width = 200;
    const rowHeight = 20;

    let currentY = startY;

    data.forEach(([label, value]) => {
      // Label
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#7f8c8d')
         .text(label, startX, currentY);

      // Value
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#2c3e50')
         .text(value || 'N/A', startX + col1Width, currentY);

      currentY += rowHeight;
    });

    doc.y = currentY + 10;
  }

  /**
   * Draw footer
   * @param {PDFDocument} doc - PDF document
   * @param {number} pageWidth - Page width
   */
  drawFooter(doc, pageWidth) {
    const footerY = doc.page.height - 50;

    // Line separator
    doc.moveTo(50, footerY)
       .lineTo(pageWidth - 50, footerY)
       .lineWidth(1)
       .strokeColor('#bdc3c7')
       .stroke();

    // Footer text
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#95a5a6')
       .text(
        'This is a computer-generated payslip and does not require signature.',
        pageWidth / 2,
        footerY + 15,
        { align: 'center' }
       );

    doc.text(
      `Generated on ${this.formatDate(new Date())}`,
      pageWidth / 2,
      footerY + 30,
      { align: 'center' }
    );
  }

  /**
   * Get department name from employee
   * @param {Object} employee - Employee document
   * @returns {string} Department name
   */
  getDepartmentName(employee) {
    if (employee.departmentId?.name) {
      return employee.departmentId.name;
    }
    return 'N/A';
  }

  /**
   * Get designation name from employee
   * @param {Object} employee - Employee document
   * @returns {string} Designation name
   */
  getDesignationName(employee) {
    if (employee.designationId?.title) {
      return employee.designationId.title;
    }
    return 'N/A';
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
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
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
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

  /**
   * Save payslip PDF to file
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {string} filename - Output filename
   * @returns {string} File path
   */
  async savePayslipToFile(pdfBuffer, filename) {
    const outputDir = path.join(process.cwd(), 'public', 'payslips');

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, pdfBuffer);

    return outputPath;
  }

  /**
   * Generate payslip filename
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {string} Filename
   */
  generatePayslipFilename(employeeId, month, year) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    return `payslip_${employeeId}_${month}_${year}_${timestamp}.pdf`;
  }

  /**
   * Generate payslip for payroll record
   * @param {string} payrollId - Payroll ID
   * @returns {Object} Generated payslip info
   */
  async generatePayslip(payrollId) {
    const Payroll = (await import('../../models/payroll/payroll.schema.js')).default;
    const Employee = (await import('../../models/employee/employee.schema.js')).default;

    const payroll = await Payroll.findOne({ payrollId }).populate('employeeId');
    if (!payroll) {
      throw new Error('Payroll record not found');
    }

    const employee = await Employee.findById(payroll.employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Generate PDF
    const pdfBuffer = await this.generatePayslipPDF(payroll, employee);

    // Generate filename
    const filename = this.generatePayslipFilename(employee.employeeId, payroll.month, payroll.year);

    // Save to file
    const filePath = await this.savePayslipToFile(pdfBuffer, filename);

    // Update payroll record
    payroll.payslipUrl = `/payslips/${filename}`;
    payroll.payslipGenerated = true;
    await payroll.save();

    return {
      filename,
      filePath,
      url: payroll.payslipUrl,
      size: pdfBuffer.length
    };
  }

  /**
   * Generate payslips for a company for a specific period
   * @param {string} companyId - Company ID
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Array} Generated payslips info
   */
  async generateCompanyPayslips(companyId, month, year) {
    const Payroll = (await import('../../models/payroll/payroll.schema.js')).default;

    const payrolls = await Payroll.find({
      companyId,
      month,
      year,
      status: { $in: ['Generated', 'Approved', 'Paid'] }
    }).populate('employeeId');

    const results = [];

    for (const payroll of payrolls) {
      try {
        const result = await this.generatePayslip(payroll.payrollId);
        results.push({
          success: true,
          payrollId: payroll.payrollId,
          employeeId: payroll.employeeId.employeeId,
          ...result
        });
      } catch (error) {
        results.push({
          success: false,
          payrollId: payroll.payrollId,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export default new PayslipGenerator();
