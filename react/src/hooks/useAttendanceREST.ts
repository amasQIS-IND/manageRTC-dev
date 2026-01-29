/**
 * Attendance REST API Hook
 * Replaces Socket.IO-based attendance operations with REST API calls
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { get, post, put, patch, buildParams, ApiResponse } from '../services/api';

export interface Attendance {
  _id: string;
  employee?: string;
  employeeId?: string;
  date?: string;
  clockIn?: string;
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
  totalHours?: number;
  status: 'Present' | 'Absent' | 'HalfDay';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDays: number;
  averageHours: number;
}

/**
 * Attendance REST API Hook
 */
export const useAttendanceREST = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams(params);
      const response: ApiResponse<Attendance[]> = await get('/attendance', { params: queryParams });

      if (response.success && response.data) {
        setAttendance(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch attendance');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch attendance';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clockIn = useCallback(async (): Promise<boolean> => {
    try {
      const response: ApiResponse<Attendance> = await post('/attendance/clock-in');

      if (response.success && response.data) {
        message.success('Clocked in successfully! 👋');
        return true;
      }
      throw new Error(response.error?.message || 'Failed to clock in');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to clock in';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const clockOut = useCallback(async (): Promise<boolean> => {
    try {
      const response: ApiResponse<Attendance> = await post('/attendance/clock-out');

      if (response.success && response.data) {
        message.success('Clocked out successfully! 👋');
        return true;
      }
      throw new Error(response.error?.message || 'Failed to clock out');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to clock out';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const clockOutById = useCallback(async (attendanceId: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Attendance> = await post(`/attendance/clock-out/${attendanceId}`);

      if (response.success && response.data) {
        message.success('Clocked out successfully!');
        return true;
      }
      throw new Error(response.error?.message || 'Failed to clock out');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to clock out';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const getEmployeeAttendance = useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Attendance[]> = await get(`/attendance/employee/${employeeId}`);

      if (response.success && response.data) {
        setAttendance(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch attendance';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<AttendanceStats> = await get('/attendance/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useAttendanceREST] Failed to fetch stats:', err);
    }
  }, []);

  return {
    attendance,
    stats,
    loading,
    error,
    fetchAttendance,
    clockIn,
    clockOut,
    clockOutById,
    getEmployeeAttendance,
    fetchStats
  };
};

export default useAttendanceREST;
