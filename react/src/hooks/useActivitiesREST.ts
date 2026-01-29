/**
 * Activities REST API Hook
 * Replaces Socket.IO-based activity operations with REST API calls
 */

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { get, post, put, del, patch, buildParams, ApiResponse } from '../services/api';

export interface Activity {
  _id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'follow-up' | 'demo' | 'site-visit' | 'other';
  title: string;
  description?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Postponed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  regardingType?: 'lead' | 'client' | 'deal' | 'project' | 'task';
  regardingId?: string;
  owner?: string;
  dueDate?: string;
  completedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  owner?: string;
  priority?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Activities REST API Hook
 */
export const useActivitiesREST = () => {
  const socket = useSocket();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (filters: ActivityFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Activity[]> = await get('/activities', { params });

      if (response.success && response.data) {
        setActivities(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch activities');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch activities';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Activity[]> = await get('/activities/upcoming');

      if (response.success && response.data) {
        setActivities(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch upcoming activities';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOverdue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Activity[]> = await get('/activities/overdue');

      if (response.success && response.data) {
        setActivities(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch overdue activities';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createActivity = useCallback(async (activityData: Partial<Activity>): Promise<boolean> => {
    try {
      const response: ApiResponse<Activity> = await post('/activities', activityData);

      if (response.success && response.data) {
        message.success('Activity created successfully!');
        setActivities(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create activity');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create activity';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updateActivity = useCallback(async (activityId: string, updateData: Partial<Activity>): Promise<boolean> => {
    try {
      const response: ApiResponse<Activity> = await put(`/activities/${activityId}`, updateData);

      if (response.success && response.data) {
        message.success('Activity updated successfully!');
        setActivities(prev =>
          prev.map(activity => activity._id === activityId ? { ...activity, ...response.data! } : activity)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update activity');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update activity';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const completeActivity = useCallback(async (activityId: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Activity> = await put(`/activities/${activityId}/complete`);

      if (response.success && response.data) {
        message.success('Activity completed! ✓');
        setActivities(prev =>
          prev.map(activity => activity._id === activityId ? { ...activity, ...response.data! } : activity)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to complete activity');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to complete activity';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const postponeActivity = useCallback(async (activityId: string, postponeTo?: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Activity> = await put(`/activities/${activityId}/postpone`, {
        postponeTo
      });

      if (response.success && response.data) {
        message.success('Activity postponed');
        setActivities(prev =>
          prev.map(activity => activity._id === activityId ? { ...activity, ...response.data! } : activity)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to postpone activity');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to postpone activity';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const deleteActivity = useCallback(async (activityId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/activities/${activityId}`);

      if (response.success) {
        message.success('Activity deleted successfully!');
        setActivities(prev => prev.filter(activity => activity._id !== activityId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete activity');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete activity';
      message.error(errorMessage);
      return false;
    }
  }, []);

  // Socket.IO real-time listeners
  useEffect(() => {
    if (!socket) return;

    const handleActivityCreated = (data: Activity) => {
      setActivities(prev => [...prev, data]);
    };

    const handleActivityUpdated = (data: Activity) => {
      setActivities(prev =>
        prev.map(activity => activity._id === data._id ? { ...activity, ...data } : activity)
      );
    };

    const handleActivityCompleted = (data: Activity) => {
      setActivities(prev =>
        prev.map(activity => activity._id === data._id ? { ...activity, ...data } : activity)
      );
    };

    const handleActivityDeleted = (data: { _id: string }) => {
      setActivities(prev => prev.filter(activity => activity._id !== data._id));
    };

    socket.on('activity:created', handleActivityCreated);
    socket.on('activity:updated', handleActivityUpdated);
    socket.on('activity:completed', handleActivityCompleted);
    socket.on('activity:deleted', handleActivityDeleted);

    return () => {
      socket.off('activity:created', handleActivityCreated);
      socket.off('activity:updated', handleActivityUpdated);
      socket.off('activity:completed', handleActivityCompleted);
      socket.off('activity:deleted', handleActivityDeleted);
    };
  }, [socket]);

  return {
    activities,
    loading,
    error,
    fetchActivities,
    fetchUpcoming,
    fetchOverdue,
    createActivity,
    updateActivity,
    completeActivity,
    postponeActivity,
    deleteActivity
  };
};

export default useActivitiesREST;
