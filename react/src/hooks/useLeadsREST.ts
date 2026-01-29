/**
 * Leads REST API Hook
 * Replaces Socket.IO-based lead operations with REST API calls
 */

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { get, post, put, del, patch, buildParams, ApiResponse } from '../services/api';

export interface Lead {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  source?: string;
  value?: number;
  probability?: number;
  expectedCloseDate?: string;
  owner?: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  stage?: string;
  source?: string;
  owner?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeadStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  lostLeads: number;
  totalValue: number;
  conversionRate: number;
}

/**
 * Leads REST API Hook
 */
export const useLeadsREST = () => {
  const socket = useSocket();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (filters: LeadFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Lead[]> = await get('/leads', { params });

      if (response.success && response.data) {
        setLeads(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch leads');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch leads';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<LeadStats> = await get('/leads/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useLeadsREST] Failed to fetch stats:', err);
    }
  }, []);

  const getLeadById = useCallback(async (leadId: string): Promise<Lead | null> => {
    try {
      const response: ApiResponse<Lead> = await get(`/leads/${leadId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch lead');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch lead';
      message.error(errorMessage);
      return null;
    }
  }, []);

  const createLead = useCallback(async (leadData: Partial<Lead>): Promise<boolean> => {
    try {
      const response: ApiResponse<Lead> = await post('/leads', leadData);

      if (response.success && response.data) {
        message.success('Lead created successfully!');
        setLeads(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create lead');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create lead';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updateLead = useCallback(async (leadId: string, updateData: Partial<Lead>): Promise<boolean> => {
    try {
      const response: ApiResponse<Lead> = await put(`/leads/${leadId}`, updateData);

      if (response.success && response.data) {
        message.success('Lead updated successfully!');
        setLeads(prev =>
          prev.map(lead => (lead._id === leadId ? { ...lead, ...response.data! } : lead))
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update lead');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update lead';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const deleteLead = useCallback(async (leadId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/leads/${leadId}`);

      if (response.success) {
        message.success('Lead deleted successfully!');
        setLeads(prev => prev.filter(lead => lead._id !== leadId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete lead');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete lead';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const moveStage = useCallback(async (leadId: string, stage: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Lead> = await put(`/leads/${leadId}/stage`, { stage });

      if (response.success && response.data) {
        message.success(`Lead moved to ${stage}`);
        setLeads(prev =>
          prev.map(lead => (lead._id === leadId ? { ...lead, ...response.data! } : lead))
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to move lead');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to move lead';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const convertToClient = useCallback(async (leadId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await put(`/leads/${leadId}/convert`);

      if (response.success) {
        message.success('Lead converted to client successfully!');
        setLeads(prev => prev.filter(lead => lead._id !== leadId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to convert lead');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to convert lead';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const getLeadsByStage = useCallback(async (stage: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Lead[]> = await get(`/leads/stage/${stage}`);

      if (response.success && response.data) {
        setLeads(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch leads';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket.IO real-time listeners
  useEffect(() => {
    if (!socket) return;

    const handleLeadCreated = (data: Lead) => {
      console.log('[useLeadsREST] Lead created via broadcast:', data);
      setLeads(prev => [...prev, data]);
    };

    const handleLeadUpdated = (data: Lead) => {
      console.log('[useLeadsREST] Lead updated via broadcast:', data);
      setLeads(prev =>
        prev.map(lead => (lead._id === data._id ? { ...lead, ...data } : lead))
      );
    };

    const handleLeadStageChanged = (data: Lead) => {
      console.log('[useLeadsREST] Lead stage changed via broadcast:', data);
      setLeads(prev =>
        prev.map(lead => (lead._id === data._id ? { ...lead, ...data } : lead))
      );
    };

    const handleLeadConverted = (data: { _id: string }) => {
      console.log('[useLeadsREST] Lead converted via broadcast:', data);
      setLeads(prev => prev.filter(lead => lead._id !== data._id));
    };

    const handleLeadDeleted = (data: { _id: string }) => {
      console.log('[useLeadsREST] Lead deleted via broadcast:', data);
      setLeads(prev => prev.filter(lead => lead._id !== data._id));
    };

    socket.on('lead:created', handleLeadCreated);
    socket.on('lead:updated', handleLeadUpdated);
    socket.on('lead:stage_changed', handleLeadStageChanged);
    socket.on('lead:converted', handleLeadConverted);
    socket.on('lead:deleted', handleLeadDeleted);

    return () => {
      socket.off('lead:created', handleLeadCreated);
      socket.off('lead:updated', handleLeadUpdated);
      socket.off('lead:stage_changed', handleLeadStageChanged);
      socket.off('lead:converted', handleLeadConverted);
      socket.off('lead:deleted', handleLeadDeleted);
    };
  }, [socket]);

  return {
    leads,
    stats,
    loading,
    error,
    fetchLeads,
    fetchStats,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    moveStage,
    convertToClient,
    getLeadsByStage
  };
};

export default useLeadsREST;
