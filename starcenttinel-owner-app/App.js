import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import Intro from './src/Intro';
import Dashboard from './src/Dashboard';
import { getOwnerStatus, mergeOwnerRead } from './src/status';
import { readOwnerStatus } from './src/ownerApi';
import OwnerLogin from './src/OwnerLogin';
import { C } from './src/theme';

export default function App() {
  const [sessionToken, setSessionToken] = useState(null);
  const [ownerReadError, setOwnerReadError] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [fontsReady] = useFonts({ Orbitron_700Bold, Orbitron_900Black, Rajdhani_600SemiBold, Rajdhani_700Bold });
  const [status, setStatus] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showIntro, setShowIntro] = useState(true); // storyboard: full sequence on every launch (skippable)

  useEffect(() => {
    getOwnerStatus().then(setStatus).catch(() => setLoadError(true));
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    if (!sessionToken) return;
    // Never carry an old owner's live dashboard into a new session.
    let cancelled = false;
    setStatus(null);
    getOwnerStatus().then(snapshot => { if (!cancelled) setStatus(old => old?.source?.live ? old : snapshot); });
    const refresh = async () => {
      try { const data = await readOwnerStatus(sessionToken); if (!cancelled) { setStatus(old => mergeOwnerRead(old, data)); setOwnerReadError(false); } }
      catch (error) { if (!cancelled) { if (error?.code === 'SESSION_EXPIRED') { setStatus(null); setSessionToken(null); setSessionExpired(true); return; } setOwnerReadError(true); setStatus(old => old ? ({ ...old, source: { live:false,label:'OFFLINE · NOT LIVE' }, system: { state:'UNVERIFIED',revision:'—',line1:'Owner API unavailable.',line2:'Live state unknown.' }, timeline:[{time:'—',level:'off',text:'Audit feed unavailable',detail:'Connection lost'}] }) : old); } }
    };
    refresh(); const interval = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sessionToken]);
  if (loadError) return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 }}><Text style={{ color: '#fff', fontSize: 17 }}>Owner status unavailable. Emergency controls remain disabled.</Text></View>;
  // Login must be accessible even when the historical snapshot cannot load.
  if (!sessionToken) return <OwnerLogin key={sessionExpired ? 'expired' : 'initial'} onAuthenticated={token => { setStatus(null); setSessionExpired(false); setSessionToken(token); }} />;
  if (!fontsReady || !status) return <View style={{ flex: 1, backgroundColor: '#000', justifyContent:'center', padding:24 }}><Text style={{ color:'#fff' }}>Verifying independent owner status…</Text></View>;
  return (
    <SafeAreaProvider style={{ backgroundColor: C.bg }}>
      {showIntro ? (
        <Intro reduceMotion={reduceMotion} onDone={() => setShowIntro(false)} />
      ) : (
        <Dashboard status={status} reduceMotion={reduceMotion} onReplayIntro={() => setShowIntro(true)} />
      )}
    </SafeAreaProvider>
  );
}
