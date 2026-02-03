/**
 * Holidays REST API Hook
 * Replaces Socket.IO-based holiday operations with REST API calls
 * Real-time updates still use Socket.IO listeners
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { get, post, put, del, ApiResponse } from '../services/api';

export interface Holiday {
  _id: string;
  title: string;
  date: string;
  description?: string;
  status: 'Active' | 'Inactive';
  holidayTypeId: string;
  holidayTypeName?: string;
  repeatsEveryYear: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HolidayType {
  _id: string;
  name: string;
  code?: string;
  displayOrder?: number;
  isActive?: boolean;
  companyId?: string;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Holidays REST API Hook
 */
export const useHolidaysREST = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayTypes, setHolidayTypes] = useState<HolidayType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all holidays
   * REST API: GET /api/holidays
   */
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Holiday[]> = await get('/holidays');

      if (response.success && response.data) {
        setHolidays(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch holidays');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch holidays';
      setError(errorMessage);
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get holiday by ID
   * REST API: GET /api/holidays/:id
   */
  const getHolidayById = useCallback(async (holidayId: string): Promise<Holiday | null> => {
    try {
      const response: ApiResponse<Holiday> = await get(`/holidays/${holidayId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch holiday');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch holiday';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Get holidays by year
   * REST API: GET /api/holidays/year/:year
   */
  const getHolidaysByYear = useCallback(async (year: number): Promise<Holiday[]> => {
    try {
      const response: ApiResponse<Holiday[]> = await get(`/holidays/year/${year}`);

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch holidays';
      message.error(errorMessage);
      return [];
    }
  }, []);

  /**
   * Get upcoming holidays
   * REST API: GET /api/holidays/upcoming
   */
  const getUpcomingHolidays = useCallback(async (limit: number = 10): Promise<Holiday[]> => {
    try {
      const response: ApiResponse<Holiday[]> = await get('/holidays/upcoming', {
        params: { limit }
      });

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch upcoming holidays';
      console.error(errorMessage);
      return [];
    }
  }, []);

  /**
   * Create new holiday
   * REST API: POST /api/holidays
   */
  const createHoliday = useCallback(async (holidayData: Partial<Holiday>): Promise<boolean> => {
    try {
      const response: ApiResponse<Holiday> = await post('/holidays', holidayData);

      if (response.success && response.data) {
        message.success('Holiday created successfully!');
        setHolidays(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create holiday');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create holiday';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Update holiday
   * REST API: PUT /api/holidays/:id
   */
  const updateHoliday = useCallback(async (holidayId: string, updateData: Partial<Holiday>): Promise<boolean> => {
    try {
      const response: ApiResponse<Holiday> = await put(`/holidays/${holidayId}`, updateData);

      if (response.success && response.data) {
        message.success('Holiday updated successfully!');
        setHolidays(prev =>
          prev.map(holiday =>
            holiday._id === holidayId ? { ...holiday, ...response.data! } : holiday
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update holiday');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update holiday';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Delete holiday
   * REST API: DELETE /api/holidays/:id
   */
  const deleteHoliday = useCallback(async (holidayId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/holidays/${holidayId}`);

      if (response.success) {
        message.success('Holiday deleted successfully!');
        setHolidays(prev => prev.filter(holiday => holiday._id !== holidayId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete holiday');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete holiday';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Fetch all holiday types
   * REST API: GET /api/holiday-types
   */
  const fetchHolidayTypes = useCallback(async (activeOnly?: boolean): Promise<HolidayType[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = activeOnly !== undefined ? { active: activeOnly.toString() } : {};
      const response: ApiResponse<HolidayType[]> = await get('/holiday-types', { params });

      if (response.success && response.data) {
        setHolidayTypes(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch holiday types');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch holiday types';
      setError(errorMessage);
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new holiday type
   * REST API: POST /api/holiday-types
   */
  const createHolidayType = useCallback(async (typeData: Partial<HolidayType>): Promise<boolean> => {
    try {
      const response: ApiResponse<HolidayType> = await post('/holiday-types', typeData);

      if (response.success && response.data) {
        message.success('Holiday type created successfully!');
        setHolidayTypes(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create holiday type');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create holiday type';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Update holiday type
   * REST API: PUT /api/holiday-types/:id
   */
  const updateHolidayType = useCallback(async (typeId: string, updateData: Partial<HolidayType>): Promise<boolean> => {
    try {
      const response: ApiResponse<HolidayType> = await put(`/holiday-types/${typeId}`, updateData);

      if (response.success && response.data) {
        message.success('Holiday type updated successfully!');
        setHolidayTypes(prev =>
          prev.map(type =>
            type._id === typeId ? { ...type, ...response.data! } : type
          )
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update holiday type');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update holiday type';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Delete holiday type (soft delete)
   * REST API: DELETE /api/holiday-types/:id
   */
  const deleteHolidayType = useCallback(async (typeId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/holiday-types/${typeId}`);

      if (response.success) {
        message.success('Holiday type deleted successfully!');
        setHolidayTypes(prev => prev.filter(type => type._id !== typeId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete holiday type');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete holiday type';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Initialize default holiday types
   * REST API: POST /api/holiday-types/initialize
   */
  const initializeDefaultHolidayTypes = useCallback(async (): Promise<boolean> => {
    try {
      const response: ApiResponse<HolidayType[]> = await post('/holiday-types/initialize');

      if (response.success && response.data) {
        message.success('Default holiday types initialized successfully!');
        setHolidayTypes(response.data);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to initialize default holiday types');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to initialize default holiday types';
      message.error(errorMessage);
      return false;
    }
  }, []);

  return {
    holidays,
    holidayTypes,
    loading,
    error,
    fetchHolidays,
    getHolidayById,
    getHolidaysByYear,
    getUpcomingHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    fetchHolidayTypes,
    createHolidayType,
    updateHolidayType,
    deleteHolidayType,
    initializeDefaultHolidayTypes
  };
};

export default useHolidaysREST;
