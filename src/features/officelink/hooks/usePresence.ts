import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface DeviceState {
  user_id: string;
  email: string;
  nom_appareil: string;
  systeme_exploitation: string;
  online_at: string;
}

export function usePresence(session: Session | null) {
  const [onlineDevices, setOnlineDevices] = useState<DeviceState[]>([]);

  useEffect(() => {
    if (!session?.user) return;

    // Récupérer le système d'exploitation de base
    const getOS = () => {
      const userAgent = window.navigator.userAgent;
      if (userAgent.indexOf("Windows") !== -1) return "Windows";
      if (userAgent.indexOf("Mac") !== -1) return "macOS";
      if (userAgent.indexOf("Linux") !== -1) return "Linux";
      if (userAgent.indexOf("Android") !== -1) return "Android";
      if (userAgent.indexOf("like Mac") !== -1) return "iOS";
      return "Inconnu";
    };

    // Créer un canal Presence Supabase
    const roomOne = supabase.channel('officelink_presence');

    const userStatus = {
      user_id: session.user.id,
      email: session.user.email,
      nom_appareil: `Appareil de ${session.user.email?.split('@')[0]}`,
      systeme_exploitation: getOS(),
      online_at: new Date().toISOString(),
    };

    roomOne
      .on('presence', { event: 'sync' }, () => {
        const newState = roomOne.presenceState();
        
        // Flatten state
        const users: DeviceState[] = [];
        for (const id in newState) {
          // Supabase presenceState returns an array of objects for each key
          const presences = newState[id] as any[];
          presences.forEach(p => {
            users.push(p as DeviceState);
          });
        }
        
        // Remove duplicates by user_id
        const uniqueUsers = Array.from(new Map(users.map(item => [item.user_id, item])).values());
        setOnlineDevices(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('join', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('leave', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomOne.track(userStatus);
        }
      });

    return () => {
      roomOne.unsubscribe();
    };
  }, [session]);

  return { onlineDevices };
}
