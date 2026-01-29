/**
 * Employees REST API Hook
 * Replaces Socket.IO-based employee operations with REST API calls
 */

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { get, post, put, del, buildParams, ApiResponse } from '../services/api';

export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  manager?: string;
  status: 'Active' | 'Inactive' | 'OnLeave';
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  dateOfJoining: string;
  salary?: number;
  avatar?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  skills?: string[];
  qualifications?: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFilters {
  page?: number;
  limit?: number;
  department?: string;
  status?: string;
  manager?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  onLeaveEmployees: number;
  newHiresThisMonth: number;
  departmentCounts: Record<string, number>;
}

/**
 * Employees REST API Hook
 */
export const useEmployeesREST = () => {
  const socket = useSocket();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async (filters: EmployeeFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Employee[]> = await get('/employees', { params });

      if (response.success && response.data) {
        setEmployees(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch employees');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employees';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<EmployeeStats> = await get('/employees/dashboard');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useEmployeesREST] Failed to fetch stats:', err);
    }
  }, []);

  const getEmployeeById = useCallback(async (employeeId: string): Promise<Employee | null> => {
    try {
      const response: ApiResponse<Employee> = await get(`/employees/${employeeId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch employee');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employee';
      message.error(errorMessage);
      return null;
    }
  }, []);

  const createEmployee = useCallback(async (employeeData: Partial<Employee>): Promise<boolean> => {
    try {
      const response: ApiResponse<Employee> = await post('/employees', employeeData);

      if (response.success && response.data) {
        message.success('Employee created successfully!');
        setEmployees(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create employee');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create employee';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updateEmployee = useCallback(async (employeeId: string, updateData: Partial<Employee>): Promise<boolean> => {
    try {
      const response: ApiResponse<Employee> = await put(`/employees/${employeeId}`, updateData);

      if (response.success && response.data) {
        message.success('Employee updated successfully!');
        setEmployees(prev =>
          prev.map(emp => (emp._id === employeeId ? { ...emp, ...response.data! } : emp))
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update employee');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update employee';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const deleteEmployee = useCallback(async (employeeId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/employees/${employeeId}`);

      if (response.success) {
        message.success('Employee deleted successfully!');
        setEmployees(prev => prev.filter(emp => emp._id !== employeeId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete employee');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete employee';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const searchEmployees = useCallback(async (searchTerm: string) => {
    try {
      const response: ApiResponse<Employee[]> = await get('/employees/search', { params: { q: searchTerm } });

      if (response.success && response.data) {
        setEmployees(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to search employees';
      message.error(errorMessage);
    }
  }, []);

  const getDepartmentStats = useCallback(async () => {
    try {
      const response: ApiResponse<Record<string, number>> = await get('/employees/stats/by-department');

      if (response.success && response.data) {
        return response.data;
      }
      return {};
    } catch (err: any) {
      console.error('[useEmployeesREST] Failed to fetch department stats:', err);
      return {};
    }
  }, []);

  // Socket.IO real-time listeners
  useEffect(() => {
    if (!socket) return;

    const handleEmployeeCreated = (data: Employee) => {
      console.log('[useEmployeesREST] Employee created via broadcast:', data);
      setEmployees(prev => [...prev, data]);
    };

    const handleEmployeeUpdated = (data: Employee) => {
      console.log('[useEmployeesREST] Employee updated via broadcast:', data);
      setEmployees(prev =>
        prev.map(emp => (emp._id === data._id ? { ...emp, ...data } : emp))
      );
    };

    const handleEmployeeDeleted = (data: { _id: string }) => {
      console.log('[useEmployeesREST] Employee deleted via broadcast:', data);
      setEmployees(prev => prev.filter(emp => emp._id !== data._id));
    };

    socket.on('employee:created', handleEmployeeCreated);
    socket.on('employee:updated', handleEmployeeUpdated);
    socket.on('employee:deleted', handleEmployeeDeleted);

    return () => {
      socket.off('employee:created', handleEmployeeCreated);
      socket.off('employee:updated', handleEmployeeUpdated);
      socket.off('employee:deleted', handleEmployeeDeleted);
    };
  }, [socket]);

  return {
    employees,
    stats,
    loading,
    error,
    fetchEmployees,
    fetchStats,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    getDepartmentStats
  };
};

export default useEmployeesREST;
