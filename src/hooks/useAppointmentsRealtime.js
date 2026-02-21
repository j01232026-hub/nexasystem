import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useAppointmentsRealtime = (tenantId, callback, options = {}) => {
  const callbackRef = useRef(callback);
  const channelRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`appointments_realtime:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('🔄 [Realtime] 預約變動偵測:', {
            event: payload.eventType,
            id: payload.new?.id || payload.old?.id,
            status: payload.new?.status || payload.old?.status
          });
          
          if (callbackRef.current) {
            callbackRef.current(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [Realtime] 訂閱狀態:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId]);

  return channelRef.current;
};

export default useAppointmentsRealtime;
