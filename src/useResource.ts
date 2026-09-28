import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { api, errorMessage } from "./api";
export function useResource<T>(path: string, schema: z.ZodType<T>) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    path: string;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ path, data: null, error: "", loading: true });
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const raw: unknown = await api
          .get(path, { signal: controller.signal })
          .json();
        const data = schema.parse(raw);
        if (!controller.signal.aborted)
          setState({ path, data, error: "", loading: false });
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        if (controller.signal.aborted) return;
        const message = await errorMessage(error);
        if (controller.signal.aborted) return;
        setState({ path, data: null, error: message, loading: false });
      }
    }
    void version;
    void load();
    return () => controller.abort();
  }, [path, schema, version]);
  return {
    data: state.path === path ? state.data : null,
    error: state.path === path ? state.error : "",
    loading: state.path !== path || state.loading,
    reload,
  };
}
