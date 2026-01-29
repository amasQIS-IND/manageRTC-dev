/**
 * Project Reports Controller
 *
 * Handles project and task report generation with filtering and aggregation
 *
 * @module controllers/reports/projectReports
 */

import Project from '../../models/project/project.schema.js';
import Task from '../../models/task/task.schema.js';
import Employee from '../../models/employee/employee.schema.js';
import logger from '../../utils/logger.js';

/**
 * Generate project report
 * @route GET /api/reports/projects
 */
export const generateProjectReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      status,
      priority,
      client,
      department,
      startDate,
      endDate
    } = req.query;

    // Build filter
    const filter = { companyId, isDeleted: false };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (client) filter.client = client;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get projects
    const projects = await Project.find(filter)
      .populate('leader', 'employeeId firstName lastName')
      .populate('teamMembers', 'employeeId firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate statistics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'Active').length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const onHoldProjects = projects.filter(p => p.status === 'On Hold').length;

    // Group by status
    const byStatus = {
      Active: activeProjects,
      Completed: completedProjects,
      'On Hold': onHoldProjects,
      Cancelled: projects.filter(p => p.status === 'Cancelled').length
    };

    // Group by priority
    const byPriority = {
      High: projects.filter(p => p.priority === 'High').length,
      Medium: projects.filter(p => p.priority === 'Medium').length,
      Low: projects.filter(p => p.priority === 'Low').length
    };

    // Group by client
    const byClient = {};
    projects.forEach(project => {
      const client = project.client || 'Unknown';
      if (!byClient[client]) {
        byClient[client] = { count: 0, completed: 0 };
      }
      byClient[client].count++;
      if (project.status === 'Completed') byClient[client].completed++;
    });

    // Calculate average progress
    const avgProgress = projects.length > 0
      ? (projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length).toFixed(2)
      : 0;

    logger.info('Project report generated', { companyId, totalProjects });

    res.json({
      status: 'success',
      data: {
        summary: {
          totalProjects,
          activeProjects,
          completedProjects,
          onHoldProjects,
          avgProgress
        },
        byStatus,
        byPriority,
        byClient,
        projects
      }
    });
  } catch (error) {
    logger.error('Error generating project report', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate project report',
      error: error.message
    });
  }
};

/**
 * Generate task report
 * @route GET /api/reports/tasks
 */
export const generateTaskReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      projectId,
      status,
      priority,
      assignee,
      department,
      startDate,
      endDate,
      groupBy = 'status'
    } = req.query;

    // Build filter
    const filter = { companyId, isDeleted: false };

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Filter by assignee if provided
    if (assignee) {
      filter.assignee = { $in: [assignee] };
    } else if (department) {
      // Get employees from department
      const employees = await Employee.find({
        companyId,
        departmentId: department,
        isDeleted: false
      }).select('_id');
      const employeeIds = employees.map(e => e._id.toString());
      filter.assignee = { $in: employeeIds };
    }

    // Get tasks
    const tasks = await Task.find(filter)
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate statistics
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'Inprogress').length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const onHoldTasks = tasks.filter(t => t.status === 'Onhold').length;
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length;

    // Group by status
    const byStatus = {
      Pending: pendingTasks,
      Inprogress: inProgressTasks,
      Completed: completedTasks,
      Onhold: onHoldTasks
    };

    // Group by priority
    const byPriority = {
      High: tasks.filter(t => t.priority === 'High').length,
      Medium: tasks.filter(t => t.priority === 'Medium').length,
      Low: tasks.filter(t => t.priority === 'Low').length
    };

    // Group by project
    const byProject = {};
    tasks.forEach(task => {
      const projectName = task.projectId?.name || 'Unassigned';
      if (!byProject[projectName]) {
        byProject[projectName] = { total: 0, completed: 0 };
      }
      byProject[projectName].total++;
      if (task.status === 'Completed') byProject[projectName].completed++;
    });

    // Group by assignee
    const byAssignee = {};
    tasks.forEach(task => {
      task.assignee?.forEach(empId => {
        if (!byAssignee[empId]) {
          byAssignee[empId] = { total: 0, completed: 0, employeeId: empId };
        }
        byAssignee[empId].total++;
        if (task.status === 'Completed') byAssignee[empId].completed++;
      });
    });

    logger.info('Task report generated', { companyId, totalTasks });

    res.json({
      status: 'success',
      data: {
        summary: {
          totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          onHoldTasks,
          overdueTasks
        },
        byStatus,
        byPriority,
        byProject,
        byAssignee: Object.values(byAssignee),
        tasks
      }
    });
  } catch (error) {
    logger.error('Error generating task report', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate task report',
      error: error.message
    });
  }
};

/**
 * Generate project timeline report
 * @route GET /api/reports/projects/timeline
 */
export const generateProjectTimelineReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { month, year } = req.query;

    const reportMonth = parseInt(month) || new Date().getMonth() + 1;
    const reportYear = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59);

    // Get projects active during this month
    const projects = await Project.find({
      companyId,
      isDeleted: false,
      $or: [
        { startDate: { $lte: endDate } },
        { dueDate: { $gte: startDate } }
      ]
    })
      .populate('leader', 'employeeId firstName lastName')
      .lean();

    // Analyze each project
    const projectTimeline = projects.map(project => {
      const projectStart = new Date(project.startDate);
      const projectEnd = new Date(project.dueDate);

      // Check if project is active during this month
      const isActiveDuringMonth = projectStart <= endDate && projectEnd >= startDate;

      // Days until/due
      const today = new Date();
      const daysUntilDue = Math.ceil((projectEnd - today) / (1000 * 60 * 60 * 24));
      const isOverdue = projectEnd < today && project.status !== 'Completed';

      return {
        projectId: project.projectId,
        name: project.name,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        dueDate: project.dueDate,
        progress: project.progress,
        leader: project.leader ? `${project.leader.firstName} ${project.leader.lastName}` : 'Unassigned',
        isActiveDuringMonth,
        daysUntilDue,
        isOverdue
      };
    });

    // Filter to only active projects in month
    const activeInMonth = projectTimeline.filter(p => p.isActiveDuringMonth);

    // Statistics
    const startingThisMonth = activeInMonth.filter(p => {
      const start = new Date(p.startDate);
      return start.getMonth() + 1 === reportMonth && start.getFullYear() === reportYear;
    }).length;

    const endingThisMonth = activeInMonth.filter(p => {
      const end = new Date(p.dueDate);
      return end.getMonth() + 1 === reportMonth && end.getFullYear() === reportYear;
    }).length;

    const overdueCount = activeInMonth.filter(p => p.isOverdue).length;

    logger.info('Project timeline report generated', { companyId, month: reportMonth, year: reportYear });

    res.json({
      status: 'success',
      data: {
        period: { month: reportMonth, year: reportYear },
        summary: {
          totalActiveProjects: activeInMonth.length,
          startingThisMonth,
          endingThisMonth,
          overdueCount
        },
        projects: activeInMonth
      }
    });
  } catch (error) {
    logger.error('Error generating project timeline report', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate project timeline report',
      error: error.message
    });
  }
};

/**
 * Export project report to CSV
 * @route GET /api/reports/projects/export
 */
export const exportProjectReport = async (req, res) => {
  try {
    const { companyId } = req.user;

    const projects = await Project.find({ companyId, isDeleted: false })
      .populate('leader', 'employeeId firstName lastName')
      .lean();

    // Generate CSV
    const headers = [
      'Project ID',
      'Name',
      'Description',
      'Client',
      'Status',
      'Priority',
      'Start Date',
      'Due Date',
      'Progress',
      'Leader'
    ];

    const rows = projects.map(project => [
      project.projectId,
      project.name,
      project.description || '',
      project.client || 'N/A',
      project.status,
      project.priority,
      project.startDate?.toISOString().split('T')[0],
      project.dueDate?.toISOString().split('T')[0],
      project.progress,
      project.leader ? `${project.leader.firstName} ${project.leader.lastName}` : 'Unassigned'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="projects-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Error exporting project report', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to export project report',
      error: error.message
    });
  }
};

export default {
  generateProjectReport,
  generateTaskReport,
  generateProjectTimelineReport,
  exportProjectReport
};
