/**
 * Clients REST API Hook
 * Replaces Socket.IO-based useClients with REST API calls
 * Real-time updates still use Socket.IO listeners
 */

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { get, post, put, del, buildParams, ApiResponse } from '../services/api';

export interface Client {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  status: 'Active' | 'Inactive' | 'Lead';
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  type?: 'Enterprise' | 'SMB' | 'Startup';
  accountManager?: string;
  contractValue?: number;
  projects?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  newClients: number;
  totalContractValue: number;
}

export interface ClientFilters {
  page?: number;
  limit?: number;
  status?: string;
  tier?: string;
  type?: string;
  accountManager?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Clients REST API Hook
 * Uses REST APIs for CRUD operations and Socket.IO for real-time broadcasts
 */
export const useClientsREST = () => {
  const socket = useSocket();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all clients with optional filters
   * REST API: GET /api/clients
   */
  const fetchClients = useCallback(async (filters: ClientFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Client[]> = await get('/clients', { params });

      if (response.success && response.data) {
        setClients(response.data);
        if (response.pagination) {
          console.log('[useClientsREST] Pagination:', response.pagination);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch clients');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch clients';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch client statistics
   * REST API: GET /api/clients/stats
   */
  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<ClientStats> = await get('/clients/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useClientsREST] Failed to fetch stats:', err);
    }
  }, []);

  /**
   * Fetch clients by account manager
   * REST API: GET /api/clients/account/:managerId
   */
  const fetchByAccountManager = useCallback(async (managerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Client[]> = await get(`/clients/account/${managerId}`);

      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch clients';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch clients by tier
   * REST API: GET /api/clients/tier/:tier
   */
  const fetchByTier = useCallback(async (tier: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Client[]> = await get(`/clients/tier/${tier}`);

      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch clients';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get client by ID
   * REST API: GET /api/clients/:id
   */
  const getClientById = useCallback(async (clientId: string): Promise<Client | null> => {
    try {
      const response: ApiResponse<Client> = await get(`/clients/${clientId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch client');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch client';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Create new client
   * REST API: POST /api/clients
   */
  const createClient = useCallback(async (clientData: Partial<Client>): Promise<boolean> => {
    try {
      const response: ApiResponse<Client> = await post('/clients', clientData);

      if (response.success && response.data) {
        message.success('Client created successfully!');
        setClients(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create client');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create client';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Update client
   * REST API: PUT /api/clients/:id
   */
  const updateClient = useCallback(async (clientId: string, updateData: Partial<Client>): Promise<boolean> => {
    try {
      const response: ApiResponse<Client> = await put(`/clients/${clientId}`, updateData);

      if (response.success && response.data) {
        message.success('Client updated successfully!');
        setClients(prev =>
          prev.map(client =>
            client._id === clientId ? { ...client, ...response.data! } : client
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update client');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update client';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Delete client
   * REST API: DELETE /api/clients/:id
   */
  const deleteClient = useCallback(async (clientId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/clients/${clientId}`);

      if (response.success) {
        message.success('Client deleted successfully!');
        setClients(prev => prev.filter(client => client._id !== clientId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete client');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete client';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Update client tier
   * REST API: PUT /api/clients/:id/tier
   */
  const updateClientTier = useCallback(async (clientId: string, tier: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Client> = await put(`/clients/${clientId}/tier`, { tier });

      if (response.success && response.data) {
        message.success(`Client tier updated to ${tier}`);
        setClients(prev =>
          prev.map(client =>
            client._id === clientId ? { ...client, ...response.data! } : client
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update client tier');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update client tier';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Search clients
   * REST API: GET /api/clients (with search parameter)
   */
  const searchClients = useCallback(async (searchTerm: string) => {
    return fetchClients({ search: searchTerm });
  }, [fetchClients]);

  /**
   * Filter clients
   * REST API: GET /api/clients (with filter parameters)
   */
  const filterClients = useCallback((filters: ClientFilters) => {
    return fetchClients(filters);
  }, [fetchClients]);

  // Set up Socket.IO listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleClientCreated = (data: Client) => {
      console.log('[useClientsREST] Client created via broadcast:', data);
      setClients(prev => [...prev, data]);
    };

    const handleClientUpdated = (data: Client) => {
      console.log('[useClientsREST] Client updated via broadcast:', data);
      setClients(prev =>
        prev.map(client => (client._id === data._id ? { ...client, ...data } : client))
      );
    };

    const handleClientDeleted = (data: { _id: string }) => {
      console.log('[useClientsREST] Client deleted via broadcast:', data);
      setClients(prev => prev.filter(client => client._id !== data._id));
    };

    socket.on('client:created', handleClientCreated);
    socket.on('client:updated', handleClientUpdated);
    socket.on('client:deleted', handleClientDeleted);

    return () => {
      socket.off('client:created', handleClientCreated);
      socket.off('client:updated', handleClientUpdated);
      socket.off('client:deleted', handleClientDeleted);
    };
  }, [socket]);

  return {
    clients,
    stats,
    loading,
    error,
    fetchClients,
    fetchStats,
    fetchByAccountManager,
    fetchByTier,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    updateClientTier,
    searchClients,
    filterClients
  };
};

export default useClientsREST;
