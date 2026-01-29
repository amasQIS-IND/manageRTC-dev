/**
 * Leave REST API Hook
 * Replaces Socket.IO-based leave operations with REST API calls
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { get, post, put, patch, buildParams, ApiResponse } from '../services/api';

export interface Leave {
  _id: string;
  employee?: string;
  employeeId?: string;
  holidayType?: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  appliedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  employeeId: string;
  annual: { total: number; used: number; remaining: number; };
  sick: { total: number; used: number; remaining: number; };
  casual: { total: number; used: number; remaining: number; };
}

/**
 * Leave REST API Hook
 */
export const useLeaveREST = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaves = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams(params);
      const response: ApiResponse<Leave[]> = await get('/leaves', { params: queryParams });

      if (response.success && response.data) {
        setLeaves(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch leaves');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch leaves';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLeave = useCallback(async (leaveData: Partial<Leave>): Promise<boolean> => {
    try {
      const response: ApiResponse<Leave> = await post('/leaves', leaveData);

      if (response.success && response.data) {
        message.success('Leave request submitted successfully!');
        setLeaves(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create leave request');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create leave request';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updateLeave = useCallback(async (leaveId: string, updateData: Partial<Leave>): Promise<boolean> => {
    try {
      const response: ApiResponse<Leave> = await put(`/leaves/${leaveId}`, updateData);

      if (response.success && response.data) {
        message.success('Leave request updated successfully!');
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...response.data! } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update leave request');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update leave request';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const approveLeave = useCallback(async (leaveId: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Leave> = await put(`/leaves/${leaveId}/approve`);

      if (response.success && response.data) {
        message.success('Leave approved successfully!');
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...response.data! } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to approve leave');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to approve leave';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const rejectLeave = useCallback(async (leaveId: string, reason?: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Leave> = await put(`/leaves/${leaveId}/reject`, { reason });

      if (response.success && response.data) {
        message.success('Leave rejected');
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...response.data! } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to reject leave');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to reject leave';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const cancelLeave = useCallback(async (leaveId: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Leave> = await put(`/leaves/${leaveId}/submit`);

      if (response.success && response.data) {
        message.success('Leave cancelled');
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...response.data! } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to cancel leave');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to cancel leave';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const getLeaveBalance = useCallback(async (employeeId: string): Promise<LeaveBalance | null> => {
    try {
      const response: ApiResponse<LeaveBalance> = await get(`/leaves/balance/${employeeId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch leave balance');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch leave balance';
      message.error(errorMessage);
      return null;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse = await get('/leaves/stats');

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      console.error('[useLeaveREST] Failed to fetch stats:', err);
      return null;
    }
  }, []);

  return {
    leaves,
    loading,
    error,
    fetchLeaves,
    createLeave,
    updateLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveBalance,
    fetchStats
  };
};

export default useLeaveREST;
