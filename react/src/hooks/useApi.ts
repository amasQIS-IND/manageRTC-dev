/**
 * Base API Hook
 * Provides common functionality for all REST API hooks
 * Replaces Socket.IO-based data fetching with REST API calls
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import apiClient, { handleApiError, RequestConfig } from '../services/api';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export interface UseApiMutationResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<boolean>;
  reset: () => void;
}

/**
 * Base hook for data fetching (GET requests)
 */
export const useApi = <T = any>(
  fetchFn: () => Promise<T | null>,
  deps: any[] = []
): UseApiResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('[useApi] Fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    fetchData();
  }, deps);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    clearError
  };
};

/**
 * Base hook for mutations (POST, PUT, DELETE, etc.)
 */
export const useApiMutation = <T = any>(
  mutationFn: (...args: any[]) => Promise<T | null>,
  options?: {
    successMessage?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
): UseApiMutationResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: any[]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn(...args);
      setData(result);

      if (options?.successMessage) {
        message.success(options.successMessage);
      }

      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return true;
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);

      if (options?.onError) {
        options.onError(errorMessage);
      } else {
        message.error(errorMessage);
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
};

/**
 * Base hook for paginated data
 */
export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const usePaginatedApi = <T = any>(
  fetchFn: (params: any) => Promise<{ items: T[]; pagination: any } | null>,
  initialParams: Record<string, any> = {}
) => {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, any>>(initialParams);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(params);
      if (result) {
        setData(result.items);
        setPagination(result.pagination);
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('[usePaginatedApi] Fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, params]);

  const updateParams = useCallback((newParams: Record<string, any>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      updateParams({ page: pagination.page + 1 });
    }
  }, [pagination.page, pagination.totalPages, updateParams]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      updateParams({ page: pagination.page - 1 });
    }
  }, [pagination.page, updateParams]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      updateParams({ page });
    }
  }, [pagination.totalPages, updateParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    pagination,
    loading,
    error,
    params,
    updateParams,
    nextPage,
    prevPage,
    goToPage,
    refetch: fetchData
  };
};

export default useApi;
