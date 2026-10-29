import { useCallback, useEffect, useRef, useState } from "react";

const PUBLIC_FETCH_TIMEOUT = 5000;

const createPublicFetchError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const useFetchPublicData = (url = null, options = {}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const requestRef = useRef(null);
  const optionsRef = useRef(options);

  const fetchData = useCallback(async (
    requestUrl = url,
    requestOptions = optionsRef.current,
  ) => {
    if (!requestUrl) return null;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(
      () => {
        timedOut = true;
        controller.abort();
      },
      PUBLIC_FETCH_TIMEOUT,
    );

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(requestUrl, {
        ...requestOptions,
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw createPublicFetchError("Public API rate limit reached.", 429);
      }
      if (!response.ok) {
        throw createPublicFetchError("Public API request failed.", response.status);
      }

      const responseData = await response.json();
      setData(responseData);
      return responseData;
    } catch (requestError) {
      if (requestError.name !== "AbortError" || timedOut) {
        const fetchError =
          timedOut && requestError.name === "AbortError"
            ? createPublicFetchError(
            "Public API request timed out.",
            408,
              )
            : requestError;
        setError(fetchError);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (url) fetchData(url, optionsRef.current);

    return () => {
      requestRef.current?.abort();
    };
  }, [fetchData, url]);

  return {
    data,
    error,
    fetchData,
    isLoading,
    refetch: () => fetchData(url, options),
  };
};

export default useFetchPublicData;
