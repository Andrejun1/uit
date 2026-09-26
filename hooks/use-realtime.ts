import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

interface RealtimeSubscriptionOptions {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  onSuccess?: (payload: any) => void;
  onError?: (error: any) => void;
  debounceMs?: number;
}

export function useRealtimeSubscription({
  table,
  event = "*",
  schema = "public",
  onSuccess,
  onError,
  debounceMs = 0,
}: RealtimeSubscriptionOptions) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);

  const handleUpdate = useCallback(
    (payload: any) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate < debounceMs) {
        // Debounce: schedule for later
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          lastUpdateRef.current = Date.now();
          onSuccess?.(payload);
        }, debounceMs - timeSinceLastUpdate);
      } else {
        // Process immediately
        lastUpdateRef.current = now;
        onSuccess?.(payload);
      }
    },
    [onSuccess, debounceMs]
  );

  useEffect(() => {
    let channelName = `${table}:${event}`;
    if (debounceMs > 0) {
      channelName += `:debounce-${debounceMs}`;
    }

    // Create and subscribe to channel
    subscriptionRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: event,
          schema: schema,
          table: table,
        },
        (payload: any) => {
          try {
            handleUpdate(payload);
          } catch (err) {
            onError?.(err);
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [table, event, schema, handleUpdate, onError]);
}

/**
 * Hook for managing realtime data with automatic refetch
 */
export function useRealtimeData<T>(
  fetchFn: () => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
    debounceMs?: number;
    refetchOnMount?: boolean;
  }
) {
  const { onSuccess, onError, debounceMs = 0, refetchOnMount = true } = options || {};

  const handleRefetch = useCallback(async () => {
    try {
      const data = await fetchFn();
      onSuccess?.(data);
    } catch (err) {
      onError?.(err);
    }
  }, [fetchFn, onSuccess, onError]);

  // Initial fetch on mount
  useEffect(() => {
    if (refetchOnMount) {
      handleRefetch();
    }
  }, [refetchOnMount, handleRefetch]);

  return { refetch: handleRefetch };
}

/**
 * Hook for deduplicating multiple subscriptions to the same table
 */
const subscriptionCacheRef = new Map<
  string,
  {
    channel: any;
    listeners: Array<(payload: any) => void>;
  }
>();

export function useRealtimeListener(
  table: string,
  onUpdate: (payload: any) => void,
  options?: {
    event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    schema?: string;
  }
) {
  const { event = "*", schema = "public" } = options || {};
  const cacheKey = `${schema}:${table}:${event}`;

  useEffect(() => {
    // Get or create subscription
    let subscription = subscriptionCacheRef.get(cacheKey);

    if (!subscription) {
      const listeners: Array<(payload: any) => void> = [];
      const channel = supabase
        .channel(cacheKey)
        .on(
          "postgres_changes",
          {
            event: event,
            schema: schema,
            table: table,
          },
          (payload: any) => {
            listeners.forEach((listener) => {
              try {
                listener(payload);
              } catch (err) {
                console.error("Error in listener:", err);
              }
            });
          }
        )
        .subscribe();

      subscription = { channel, listeners };
      subscriptionCacheRef.set(cacheKey, subscription);
    }

    // Add listener
    subscription.listeners.push(onUpdate);

    // Cleanup
    return () => {
      const idx = subscription!.listeners.indexOf(onUpdate);
      if (idx > -1) {
        subscription!.listeners.splice(idx, 1);
      }

      // Remove subscription if no listeners
      if (subscription!.listeners.length === 0) {
        supabase.removeChannel(subscription!.channel);
        subscriptionCacheRef.delete(cacheKey);
      }
    };
  }, [cacheKey, table, event, schema, onUpdate]);
}
