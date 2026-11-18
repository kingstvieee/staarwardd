import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { configured, requestEmailCode, verifyEmailCode } from './ownerApi';
export default function OwnerLogin({ onAuthenticated }) {
  const [email,setEmail] = useState(''); const [code,setCode] = useState('');
  const [sent,setSent] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const run = async () => { setBusy(true); setError(''); try {
    if (!sent) { await requestEmailCode(email.trim()); setSent(true); }
    else { const token = await verifyEmailCode(email.trim(),code.trim()); onAuthenticated(token); }
  } catch { setError('Owner authentication unavailable or unsuccessful.'); } finally { setBusy(false); } };
  return <View style={{ flex:1,backgroundColor:'#050307',justifyContent:'center',padding:30 }}>
    <Text style={{color:'#f04b53',fontSize:24,fontWeight:'bold',marginBottom:12}}>STARCENTTINEL</Text>
    <Text style={{color:'white',fontSize:18,marginBottom:18}}>PRIVATE OWNER ACCESS</Text>
    <Text style={{color:'#ddd',marginBottom:16}}>Read-only owner status. Emergency actions remain disabled.</Text>
    {!configured() && <Text style={{color:'#f9bb61',marginBottom:12}}>Public authentication configuration required before sign-in.</Text>}
    <TextInput accessibilityLabel="Owner email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="Owner email" placeholderTextColor="#888" style={{color:'white',borderColor:'#a52c37',borderWidth:1,padding:14,marginBottom:12}} />
    {sent && <TextInput accessibilityLabel="Email verification code" keyboardType="number-pad" value={code} onChangeText={setCode} placeholder="Email verification code" placeholderTextColor="#888" style={{color:'white',borderColor:'#a52c37',borderWidth:1,padding:14,marginBottom:12}} />}
    {sent && <Pressable accessibilityRole="button" onPress={() => {setSent(false);setCode('');setError('');}} style={{marginBottom:12}}><Text style={{color:'#f9bb61'}}>Use a different email / resend code</Text></Pressable>}
    {!!error && <Text accessibilityRole="alert" style={{color:'#ff8080',marginBottom:12}}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy || !configured() || !email.trim() || (sent && !code.trim())} onPress={run} style={{backgroundColor:'#821a28',padding:16,alignItems:'center'}}>{busy ? <ActivityIndicator color="white"/> : <Text style={{color:'white',fontWeight:'bold'}}>{sent ? 'VERIFY OWNER' : 'SEND EMAIL CODE'}</Text>}</Pressable>
  </View>;
}
