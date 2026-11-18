import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Linking } from 'react-native';
import { configured, requestMagicLink, exchangeMagicLink, exchangeCopiedEmailLink } from './ownerApi';
export default function OwnerLogin({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pastedLink, setPastedLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const handle = async ({ url }) => {
      if (!url?.startsWith('starcenttinel://auth/callback') || !active) return;
      setBusy(true); setError('');
      try { const token = await exchangeMagicLink(url); if (active) onAuthenticated(token); }
      catch { if (active) setError('The sign-in link is invalid or expired. Request another link.'); }
      finally { if (active) setBusy(false); }
    };
    const subscription = Linking.addEventListener('url', handle);
    Linking.getInitialURL().then(url => { if (url) handle({ url }); }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, [onAuthenticated]);
  const verifyCopied = async () => {
    setBusy(true); setError('');
    try { const token = await exchangeCopiedEmailLink(pastedLink); onAuthenticated(token); }
    catch { setError('That email link is invalid, expired, or already used. Request a new one.'); }
    finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true); setError('');
    try { await requestMagicLink(email.trim()); setSent(true); }
    catch { setError('Unable to send the link. Check the address or email provider limits.'); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: '#050307', justifyContent: 'center', padding: 30 }}>
    <Text style={{ color: '#f04b53', fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>STARCENTTINEL</Text>
    <Text style={{ color: 'white', fontSize: 18, marginBottom: 18 }}>PRIVATE OWNER ACCESS</Text>
    <Text style={{ color: '#ddd', marginBottom: 16 }}>Read-only owner status. Emergency actions remain disabled.</Text>
    {!configured() && <Text style={{ color: '#f9bb61', marginBottom: 12 }}>Authentication configuration required.</Text>}
    <TextInput accessibilityLabel="Owner email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="Owner email" placeholderTextColor="#888" style={{ color: 'white', borderColor: '#a52c37', borderWidth: 1, padding: 14, marginBottom: 12 }} />
    {sent && <Text style={{ color: '#ddd', marginBottom: 12 }}>Check your email for the sign-in link. Until native redirects are enabled, long-press the sign-in link and copy its address; do not open it. Paste the copied link below to verify securely.</Text>}
    {sent && <TextInput accessibilityLabel="Paste sign-in email link" autoCapitalize="none" autoCorrect={false} value={pastedLink} onChangeText={setPastedLink} placeholder="Paste sign-in link here" placeholderTextColor="#888" style={{ color: 'white', borderColor: '#a52c37', borderWidth: 1, padding: 14, marginBottom: 12 }} />}
    {sent && <Pressable accessibilityRole="button" disabled={busy || !pastedLink.trim()} onPress={verifyCopied} style={{ backgroundColor: '#24514c', padding: 16, alignItems: 'center', marginBottom: 12 }}><Text style={{ color: 'white', fontWeight: 'bold' }}>VERIFY COPIED LINK</Text></Pressable>}
    {!!error && <Text accessibilityRole="alert" style={{ color: '#ff8080', marginBottom: 12 }}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy || !configured() || !email.trim()} onPress={send} style={{ backgroundColor: '#821a28', padding: 16, alignItems: 'center' }}>{busy ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>{sent ? 'RESEND SIGN-IN LINK' : 'EMAIL ME A SIGN-IN LINK'}</Text>}</Pressable>
  </View>;
}