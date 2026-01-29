/**
 * Employee Reports Controller
 *
 * Handles employee report generation with filtering and aggregation
 *
 * @module controllers/reports/employeeReports
 */

import Employee from '../../models/employee/employee.schema.js';
import Department from '../../models/organization/department.schema.js';
import Designation from '../../models/organization/designation.schema.js';
import Attendance from '../../models/attendance/attendance.schema.js';
import logger from '../../utils/logger.js';

/**
 * Generate comprehensive employee report
 * @route GET /api/reports/employees
 */
export const generateEmployeeReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      department,
      designation,
      status,
      employmentType,
      gender,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { companyId, isDeleted: false };

    if (department) filter.departmentId = department;
    if (designation) filter.designationId = designation;
    if (status) filter.employmentStatus = status;
    if (employmentType) filter.employmentType = employmentType;
    if (gender) filter.gender = gender;

    // Date range filter
    if (startDate || endDate) {
      filter.joiningDate = {};
      if (startDate) filter.joiningDate.$gte = new Date(startDate);
      if (endDate) filter.joiningDate.$lte = new Date(endDate);
    }

    // Execute query with population
    const employees = await Employee.find(filter)
      .populate('departmentId', 'name description')
      .populate('designationId', 'title level')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .lean();

    // Calculate statistics
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.employmentStatus === 'Active').length;
    const onProbation = employees.filter(e => e.employmentStatus === 'Probation').length;
    const resigned = employees.filter(e => e.employmentStatus === 'Resigned').length;

    // Group by department
    const byDepartment = {};
    employees.forEach(emp => {
      const deptName = emp.departmentId?.name || 'Unassigned';
      if (!byDepartment[deptName]) {
        byDepartment[deptName] = { count: 0, totalSalary: 0 };
      }
      byDepartment[deptName].count++;
      byDepartment[deptName].totalSalary += (emp.salary?.basic || 0) + (emp.salary?.hra || 0) + (emp.salary?.allowances || 0);
    });

    // Group by designation
    const byDesignation = {};
    employees.forEach(emp => {
      const designationTitle = emp.designationId?.title || 'Unassigned';
      if (!byDesignation[designationTitle]) {
        byDesignation[designationTitle] = 0;
      }
      byDesignation[designationTitle]++;
    });

    // Gender distribution
    const genderDistribution = {};
    employees.forEach(emp => {
      const gender = emp.gender || 'Not Specified';
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
    });

    // Employment type distribution
    const employmentTypeDistribution = {};
    employees.forEach(emp => {
      const type = emp.employmentType || 'Unknown';
      employmentTypeDistribution[type] = (employmentTypeDistribution[type] || 0) + 1;
    });

    // Total payroll
    const totalPayroll = employees.reduce((sum, emp) => {
      return sum + (emp.salary?.basic || 0) + (emp.salary?.hra || 0) + (emp.salary?.allowances || 0);
    }, 0);

    logger.info('Employee report generated', { companyId, totalEmployees });

    res.json({
      status: 'success',
      data: {
        summary: {
          totalEmployees,
          activeEmployees,
          onProbation,
          resigned,
          totalPayroll
        },
        byDepartment,
        byDesignation,
        genderDistribution,
        employmentTypeDistribution,
        employees
      }
    });
  } catch (error) {
    logger.error('Error generating employee report', { error: error.message, companyId: req.user?.companyId });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate employee report',
      error: error.message
    });
  }
};

/**
 * Generate employee attendance summary report
 * @route GET /api/reports/employee-attendance-summary
 */
export const generateEmployeeAttendanceSummary = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { month, year, department } = req.query;

    const reportMonth = parseInt(month) || new Date().getMonth() + 1;
    const reportYear = parseInt(year) || new Date().getFullYear();

    // Calculate date range for the month
    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59);

    // Build filter
    const filter = {
      companyId,
      date: { $gte: startDate, $lte: endDate }
    };

    // Get attendance records
    const attendanceRecords = await Attendance.find(filter).lean();

    // Get employees for this company
    const employeeFilter = { companyId, isDeleted: false };
    if (department) employeeFilter.departmentId = department;

    const employees = await Employee.find(employeeFilter)
      .populate('departmentId', 'name')
      .lean();

    // Calculate attendance summary for each employee
    const employeeSummaries = await Promise.all(
      employees.map(async (employee) => {
        const employeeAttendance = attendanceRecords.filter(
          a => a.employeeId.toString() === employee._id.toString()
        );

        const totalDays = employeeAttendance.length;
        const presentDays = employeeAttendance.filter(a => a.status === 'Present').length;
        const absentDays = employeeAttendance.filter(a => a.status === 'Absent').length;
        const halfDays = employeeAttendance.filter(a => a.status === 'Half Day').length;
        const leaveDays = employeeAttendance.filter(a => a.status === 'On Leave').length;

        const totalWorkHours = employeeAttendance.reduce((sum, a) => sum + (a.workHours || 0), 0);
        const avgWorkHours = totalDays > 0 ? (totalWorkHours / totalDays).toFixed(2) : 0;

        // Calculate overtime (assuming 8 hours is standard work day)
        const totalOvertime = employeeAttendance.reduce((sum, a) => {
          const overtime = (a.workHours || 0) > 8 ? (a.workHours - 8) : 0;
          return sum + overtime;
        }, 0);

        return {
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.departmentId?.name || 'Unassigned',
          totalDays,
          presentDays,
          absentDays,
          halfDays,
          leaveDays,
          totalWorkHours: totalWorkHours.toFixed(2),
          avgWorkHours,
          totalOvertime: totalOvertime.toFixed(2),
          attendancePercentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0
        };
      })
    );

    // Calculate totals
    const totals = {
      totalEmployees: employees.length,
      totalPresentDays: employeeSummaries.reduce((sum, e) => sum + e.presentDays, 0),
      totalAbsentDays: employeeSummaries.reduce((sum, e) => sum + e.absentDays, 0),
      totalWorkHours: employeeSummaries.reduce((sum, e) => sum + parseFloat(e.totalWorkHours), 0).toFixed(2),
      totalOvertime: employeeSummaries.reduce((sum, e) => sum + parseFloat(e.totalOvertime), 0).toFixed(2)
    };

    logger.info('Employee attendance summary generated', { companyId, month: reportMonth, year: reportYear });

    res.json({
      status: 'success',
      data: {
        period: { month: reportMonth, year: reportYear },
        totals,
        employees: employeeSummaries
      }
    });
  } catch (error) {
    logger.error('Error generating employee attendance summary', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate attendance summary',
      error: error.message
    });
  }
};

/**
 * Export employee report to CSV
 * @route GET /api/reports/employees/export
 */
export const exportEmployeeReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { format = 'csv' } = req.query;

    const employees = await Employee.find({ companyId, isDeleted: false })
      .populate('departmentId', 'name')
      .populate('designationId', 'title')
      .lean();

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Employee ID',
        'Name',
        'Email',
        'Department',
        'Designation',
        'Status',
        'Joining Date',
        'Basic Salary',
        'HRA',
        'Allowances',
        'Total Salary'
      ];

      const rows = employees.map(emp => [
        emp.employeeId,
        `${emp.firstName} ${emp.lastName}`,
        emp.email,
        emp.departmentId?.name || 'Unassigned',
        emp.designationId?.title || 'Unassigned',
        emp.employmentStatus,
        emp.joiningDate?.toISOString().split('T')[0],
        emp.salary?.basic || 0,
        emp.salary?.hra || 0,
        emp.salary?.allowances || 0,
        (emp.salary?.basic || 0) + (emp.salary?.hra || 0) + (emp.salary?.allowances || 0)
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="employees-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (error) {
    logger.error('Error exporting employee report', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to export employee report',
      error: error.message
    });
  }
};

export default {
  generateEmployeeReport,
  generateEmployeeAttendanceSummary,
  exportEmployeeReport
};
