/**
 * Pipelines REST API Hook
 * Replaces Socket.IO-based pipeline operations with REST API calls
 */

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { get, post, put, del, patch, buildParams, ApiResponse } from '../services/api';

export interface Pipeline {
  _id: string;
  name: string;
  type: 'sales' | 'recruitment' | 'support' | 'project' | 'custom';
  stage: string;
  stages?: string[];
  value?: number;
  probability?: number;
  expectedCloseDate?: string;
  owner?: string;
  lead?: string;
  client?: string;
  status: 'Active' | 'Won' | 'Lost' | 'Abandoned';
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineFilters {
  page?: number;
  limit?: number;
  type?: string;
  stage?: string;
  owner?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PipelineStats {
  total: number;
  byType: Record<string, number>;
  byStage: Record<string, number>;
  byStatus: Record<string, number>;
  totalValue: number;
  wonValue: number;
  lostValue: number;
}

/**
 * Pipelines REST API Hook
 */
export const usePipelinesREST = () => {
  const socket = useSocket();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPipelines = useCallback(async (filters: PipelineFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Pipeline[]> = await get('/pipelines', { params });

      if (response.success && response.data) {
        setPipelines(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch pipelines');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch pipelines';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<PipelineStats> = await get('/pipelines/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[usePipelinesREST] Failed to fetch stats:', err);
    }
  }, []);

  const createPipeline = useCallback(async (pipelineData: Partial<Pipeline>): Promise<boolean> => {
    try {
      const response: ApiResponse<Pipeline> = await post('/pipelines', pipelineData);

      if (response.success && response.data) {
        message.success('Pipeline created successfully!');
        setPipelines(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create pipeline');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create pipeline';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updatePipeline = useCallback(async (pipelineId: string, updateData: Partial<Pipeline>): Promise<boolean> => {
    try {
      const response: ApiResponse<Pipeline> = await put(`/pipelines/${pipelineId}`, updateData);

      if (response.success && response.data) {
        message.success('Pipeline updated successfully!');
        setPipelines(prev =>
          prev.map(pipeline => pipeline._id === pipelineId ? { ...pipeline, ...response.data! } : pipeline)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update pipeline');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update pipeline';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const moveStage = useCallback(async (pipelineId: string, stage: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Pipeline> = await put(`/pipelines/${pipelineId}/move-stage`, { stage });

      if (response.success && response.data) {
        message.success(`Pipeline moved to ${stage}`);
        setPipelines(prev =>
          prev.map(pipeline => pipeline._id === pipelineId ? { ...pipeline, ...response.data! } : pipeline)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to move pipeline');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to move pipeline';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const markAsWon = useCallback(async (pipelineId: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Pipeline> = await put(`/pipelines/${pipelineId}/won`);

      if (response.success && response.data) {
        message.success('Pipeline marked as won! 🎉');
        setPipelines(prev =>
          prev.map(pipeline => pipeline._id === pipelineId ? { ...pipeline, ...response.data! } : pipeline)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to mark pipeline as won');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to mark pipeline as won';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const markAsLost = useCallback(async (pipelineId: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Pipeline> = await put(`/pipelines/${pipelineId}/lost`);

      if (response.success && response.data) {
        message.success('Pipeline marked as lost');
        setPipelines(prev =>
          prev.map(pipeline => pipeline._id === pipelineId ? { ...pipeline, ...response.data! } : pipeline)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to mark pipeline as lost');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to mark pipeline as lost';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const deletePipeline = useCallback(async (pipelineId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/pipelines/${pipelineId}`);

      if (response.success) {
        message.success('Pipeline deleted successfully!');
        setPipelines(prev => prev.filter(pipeline => pipeline._id !== pipelineId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete pipeline');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete pipeline';
      message.error(errorMessage);
      return false;
    }
  }, []);

  // Socket.IO real-time listeners
  useEffect(() => {
    if (!socket) return;

    const handlePipelineCreated = (data: Pipeline) => {
      setPipelines(prev => [...prev, data]);
    };

    const handlePipelineUpdated = (data: Pipeline) => {
      setPipelines(prev =>
        prev.map(pipeline => pipeline._id === data._id ? { ...pipeline, ...data } : pipeline)
      );
    };

    const handlePipelineDeleted = (data: { _id: string }) => {
      setPipelines(prev => prev.filter(pipeline => pipeline._id !== data._id));
    };

    socket.on('pipeline:created', handlePipelineCreated);
    socket.on('pipeline:updated', handlePipelineUpdated);
    socket.on('pipeline:deleted', handlePipelineDeleted);

    return () => {
      socket.off('pipeline:created', handlePipelineCreated);
      socket.off('pipeline:updated', handlePipelineUpdated);
      socket.off('pipeline:deleted', handlePipelineDeleted);
    };
  }, [socket]);

  return {
    pipelines,
    stats,
    loading,
    error,
    fetchPipelines,
    fetchStats,
    createPipeline,
    updatePipeline,
    moveStage,
    markAsWon,
    markAsLost,
    deletePipeline
  };
};

export default usePipelinesREST;
