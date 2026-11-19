import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { configured, requestEmailCode, verifyEmailCode } from './ownerApi';
export default function OwnerLogin({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const verify = async () => {
    setBusy(true); setError('');
    try { const token = await verifyEmailCode(email.trim(), code); onAuthenticated(token); }
    catch { setError('The six-digit code is invalid or expired. Check the email or request another.'); }
    finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true); setError('');
    try { await requestEmailCode(email.trim()); setSent(true); }
    catch { setError('Unable to send the code. Check the address or email provider limits.'); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: '#050307', justifyContent: 'center', padding: 30 }}>
    <Text style={{ color: '#f04b53', fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>STARCENTTINEL</Text>
    <Text style={{ color: 'white', fontSize: 18, marginBottom: 18 }}>PRIVATE OWNER ACCESS</Text>
    <Text style={{ color: '#ddd', marginBottom: 16 }}>Read-only owner status. Emergency actions remain disabled.</Text>
    {!configured() && <Text style={{ color: '#f9bb61', marginBottom: 12 }}>Authentication configuration required.</Text>}
    <TextInput accessibilityLabel="Owner email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="Owner email" placeholderTextColor="#888" style={{ color: 'white', borderColor: '#a52c37', borderWidth: 1, padding: 14, marginBottom: 12 }} />
    {sent && <Text style={{ color: '#ddd', marginBottom: 12 }}>Enter the six-digit verification code sent to your email. Codes expire and can be used once.</Text>}
    {sent && <TextInput accessibilityLabel="Six-digit verification code" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} value={code} onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" placeholderTextColor="#888" style={{ color: 'white', borderColor: '#a52c37', borderWidth: 1, padding: 14, marginBottom: 12, letterSpacing: 5 }} />}
    {sent && <Pressable accessibilityRole="button" disabled={busy || code.length !== 6} onPress={verify} style={{ backgroundColor: '#24514c', padding: 16, alignItems: 'center', marginBottom: 12 }}><Text style={{ color: 'white', fontWeight: 'bold' }}>VERIFY & SIGN IN</Text></Pressable>}
    {!!error && <Text accessibilityRole="alert" style={{ color: '#ff8080', marginBottom: 12 }}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy || !configured() || !email.trim()} onPress={send} style={{ backgroundColor: '#821a28', padding: 16, alignItems: 'center' }}>{busy ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>{sent ? 'RESEND CODE' : 'SEND CODE'}</Text>}</Pressable>
  </View>;
}