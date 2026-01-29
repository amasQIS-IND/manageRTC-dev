/**
 * Attendance Reports Controller
 *
 * Handles attendance report generation with filtering and aggregation
 *
 * @module controllers/reports/attendanceReports
 */

import Attendance from '../../models/attendance/attendance.schema.js';
import Employee from '../../models/employee/employee.schema.js';
import logger from '../../utils/logger.js';

/**
 * Generate attendance report
 * @route GET /api/reports/attendance
 */
export const generateAttendanceReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      employeeId,
      department,
      status,
      startDate,
      endDate,
      groupBy = 'date'
    } = req.query;

    // Build filter
    const filter = { companyId };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (status) filter.status = status;

    // Get employees to filter by department
    let employeeIds = [];
    if (employeeId) {
      employeeIds = [employeeId];
    } else if (department) {
      const employees = await Employee.find({
        companyId,
        departmentId: department,
        isDeleted: false
      }).select('_id');
      employeeIds = employees.map(e => e._id);
    }

    if (employeeIds.length > 0) {
      filter.employeeId = { $in: employeeIds };
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find(filter)
      .populate('employeeId', 'employeeId firstName lastName departmentId')
      .sort({ date: -1 })
      .lean();

    // Calculate statistics
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(a => a.status === 'Present').length;
    const absentCount = attendanceRecords.filter(a => a.status === 'Absent').length;
    const halfDayCount = attendanceRecords.filter(a => a.status === 'Half Day').length;
    const leaveCount = attendanceRecords.filter(a => a.status === 'On Leave').length;

    const totalWorkHours = attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0);

    // Group data based on groupBy parameter
    let groupedData = {};

    if (groupBy === 'date') {
      // Group by date
      attendanceRecords.forEach(record => {
        const dateKey = record.date.toISOString().split('T')[0];
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = {
            date: dateKey,
            present: 0,
            absent: 0,
            halfDay: 0,
            leave: 0,
            totalWorkHours: 0
          };
        }
        groupedData[dateKey][record.status === 'Half Day' ? 'halfDay' : record.status.toLowerCase()]++;
        groupedData[dateKey].totalWorkHours += record.workHours || 0;
      });
    } else if (groupBy === 'employee') {
      // Group by employee
      attendanceRecords.forEach(record => {
        const empKey = record.employeeId?._id?.toString() || 'unknown';
        if (!groupedData[empKey]) {
          groupedData[empKey] = {
            employeeId: record.employeeId?.employeeId || 'N/A',
            name: record.employeeId ? `${record.employeeId.firstName} ${record.employeeId.lastName}` : 'Unknown',
            present: 0,
            absent: 0,
            halfDay: 0,
            leave: 0,
            totalWorkHours: 0,
            totalDays: 0
          };
        }
        groupedData[empKey][record.status === 'Half Day' ? 'halfDay' : record.status.toLowerCase()]++;
        groupedData[empKey].totalWorkHours += record.workHours || 0;
        groupedData[empKey].totalDays++;
      });
    } else if (groupBy === 'department') {
      // Group by department
      attendanceRecords.forEach(record => {
        const deptKey = record.employeeId?.departmentId?.toString() || 'unassigned';
        if (!groupedData[deptKey]) {
          groupedData[deptKey] = {
            department: deptKey === 'unassigned' ? 'Unassigned' : deptKey,
            present: 0,
            absent: 0,
            halfDay: 0,
            leave: 0,
            totalWorkHours: 0,
            totalDays: 0
          };
        }
        groupedData[deptKey][record.status === 'Half Day' ? 'halfDay' : record.status.toLowerCase()]++;
        groupedData[deptKey].totalWorkHours += record.workHours || 0;
        groupedData[deptKey].totalDays++;
      });
    }

    const groupedArray = Object.values(groupedData);

    logger.info('Attendance report generated', { companyId, totalRecords });

    res.json({
      status: 'success',
      data: {
        summary: {
          totalRecords,
          presentCount,
          absentCount,
          halfDayCount,
          leaveCount,
          totalWorkHours: totalWorkHours.toFixed(2),
          avgWorkHours: totalRecords > 0 ? (totalWorkHours / totalRecords).toFixed(2) : 0
        },
        groupBy,
        groupedData: groupedArray,
        rawRecords: attendanceRecords
      }
    });
  } catch (error) {
    logger.error('Error generating attendance report', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate attendance report',
      error: error.message
    });
  }
};

/**
 * Generate monthly attendance summary
 * @route GET /api/reports/attendance/monthly-summary
 */
export const generateMonthlyAttendanceSummary = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { month, year } = req.query;

    const reportMonth = parseInt(month) || new Date().getMonth() + 1;
    const reportYear = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59);

    // Get all employees for the company
    const employees = await Employee.find({ companyId, isDeleted: false })
      .populate('departmentId', 'name')
      .lean();

    // Get attendance for the month
    const attendanceRecords = await Attendance.find({
      companyId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Calculate summary for each employee
    const employeeSummaries = employees.map(employee => {
      const employeeAttendance = attendanceRecords.filter(
        a => a.employeeId.toString() === employee._id.toString()
      );

      const present = employeeAttendance.filter(a => a.status === 'Present').length;
      const absent = employeeAttendance.filter(a => a.status === 'Absent').length;
      const halfDay = employeeAttendance.filter(a => a.status === 'Half Day').length;
      const leave = employeeAttendance.filter(a => a.status === 'On Leave').length;
      const totalWorkHours = employeeAttendance.reduce((sum, a) => sum + (a.workHours || 0), 0);

      // Calculate attendance percentage (considering half-day as 0.5)
      const effectivePresent = present + (halfDay * 0.5);
      const workingDays = present + absent + halfDay;
      const attendancePercentage = workingDays > 0 ? ((effectivePresent / workingDays) * 100).toFixed(2) : 0;

      return {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.departmentId?.name || 'Unassigned',
        present,
        absent,
        halfDay,
        leave,
        totalWorkHours: totalWorkHours.toFixed(2),
        attendancePercentage
      };
    });

    // Calculate department-wise summary
    const departmentSummaries = {};
    employeeSummaries.forEach(summary => {
      const dept = summary.department;
      if (!departmentSummaries[dept]) {
        departmentSummaries[dept] = {
          department: dept,
          totalEmployees: 0,
          avgAttendancePercentage: 0,
          totalPresent: 0,
          totalAbsent: 0
        };
      }
      departmentSummaries[dept].totalEmployees++;
      departmentSummaries[dept].avgAttendancePercentage += parseFloat(summary.attendancePercentage);
      departmentSummaries[dept].totalPresent += summary.present;
      departmentSummaries[dept].totalAbsent += summary.absent;
    });

    // Calculate averages for departments
    Object.values(departmentSummaries).forEach(dept => {
      dept.avgAttendancePercentage = (dept.avgAttendancePercentage / dept.totalEmployees).toFixed(2);
    });

    // Overall company statistics
    const companyStats = {
      totalEmployees: employees.length,
      avgAttendancePercentage: (employeeSummaries.reduce((sum, e) => sum + parseFloat(e.attendancePercentage), 0) / employees.length).toFixed(2),
      totalPresent: employeeSummaries.reduce((sum, e) => sum + e.present, 0),
      totalAbsent: employeeSummaries.reduce((sum, e) => sum + e.absent, 0),
      totalWorkHours: employeeSummaries.reduce((sum, e) => sum + parseFloat(e.totalWorkHours), 0).toFixed(2)
    };

    logger.info('Monthly attendance summary generated', { companyId, month: reportMonth, year: reportYear });

    res.json({
      status: 'success',
      data: {
        period: { month: reportMonth, year: reportYear },
        companyStats,
        departmentSummaries: Object.values(departmentSummaries),
        employeeSummaries
      }
    });
  } catch (error) {
    logger.error('Error generating monthly attendance summary', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate monthly attendance summary',
      error: error.message
    });
  }
};

/**
 * Export attendance report to CSV
 * @route GET /api/reports/attendance/export
 */
export const exportAttendanceReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate } = req.query;

    const filter = { companyId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const attendanceRecords = await Attendance.find(filter)
      .populate('employeeId', 'employeeId firstName lastName email')
      .sort({ date: -1 })
      .lean();

    // Generate CSV
    const headers = [
      'Date',
      'Employee ID',
      'Employee Name',
      'Email',
      'Clock In',
      'Clock Out',
      'Work Hours',
      'Status'
    ];

    const rows = attendanceRecords.map(record => [
      record.date?.toISOString().split('T')[0],
      record.employeeId?.employeeId || 'N/A',
      record.employeeId ? `${record.employeeId.firstName} ${record.employeeId.lastName}` : 'Unknown',
      record.employeeId?.email || 'N/A',
      record.clockIn || 'N/A',
      record.clockOut || 'N/A',
      record.workHours || 0,
      record.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Error exporting attendance report', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to export attendance report',
      error: error.message
    });
  }
};

export default {
  generateAttendanceReport,
  generateMonthlyAttendanceSummary,
  exportAttendanceReport
};
