import { useCallback, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

interface AsyncOptions {
  onError?: (error: Error) => void;
  onSuccess?: <T>(data: T) => void;
  showErrorAlert?: boolean;
}

/**
 * Custom hook for handling async operations with proper error handling
 */
export function useAsyncError() {
  const throwError = useCallback((error: Error) => {
    throw error;
  }, []);

  return throwError;
}

/**
 * Hook for executing async operations with loading and error states
 */
export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: AsyncOptions = {}
): [
  AsyncState<T>,
  (...args: any[]) => Promise<T | void>,
  () => void
] {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState({ data: null, error: null, loading: true });
      
      try {
        const data = await asyncFunction(...args);
        setState({ data, error: null, loading: false });
        
        if (options.onSuccess) {
          options.onSuccess(data);
        }
        
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, error: err, loading: false });
        
        if (options.onError) {
          options.onError(err);
        }
        
        if (options.showErrorAlert !== false) {
          console.error('Async operation failed:', err);
        }
        
        throw err;
      }
    },
    [asyncFunction, options]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return [state, execute, reset];
}

/**
 * Hook for handling multiple concurrent async operations
 */
export function useAsyncBatch<T = any>() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Error[]>([]);
  const [results, setResults] = useState<T[]>([]);

  const executeBatch = useCallback(
    async (promises: Promise<T>[]) => {
      setLoading(true);
      setErrors([]);
      setResults([]);

      try {
        const settled = await Promise.allSettled(promises);
        const newResults: T[] = [];
        const newErrors: Error[] = [];

        settled.forEach((result) => {
          if (result.status === 'fulfilled') {
            newResults.push(result.value);
          } else {
            newErrors.push(result.reason);
          }
        });

        setResults(newResults);
        setErrors(newErrors);
        
        return { results: newResults, errors: newErrors };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setLoading(false);
    setErrors([]);
    setResults([]);
  }, []);

  return {
    loading,
    errors,
    results,
    executeBatch,
    reset,
  };
}

/**
 * Hook for retry logic with exponential backoff
 */
export function useRetry<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const executeWithRetry = useCallback(
    async (...args: any[]): Promise<T> => {
      let lastError: Error | null = null;
      
      for (let i = 0; i <= maxRetries; i++) {
        try {
          setRetryCount(i);
          setIsRetrying(i > 0);
          
          const result = await asyncFunction(...args);
          setIsRetrying(false);
          setRetryCount(0);
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (i < maxRetries) {
            const delay = initialDelay * Math.pow(2, i);
            console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      setIsRetrying(false);
      throw lastError || new Error('Max retries exceeded');
    },
    [asyncFunction, maxRetries, initialDelay]
  );

  return {
    executeWithRetry,
    retryCount,
    isRetrying,
  };
}