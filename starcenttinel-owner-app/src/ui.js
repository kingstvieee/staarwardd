import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, CHROME, CHROME_ICE, CHROME_RED, F, glow, textGlow } from './theme';

const FRAMES = { chrome: CHROME, red: CHROME_RED, ice: CHROME_ICE };
const INNER = {
  chrome: ['#1c1f27', '#0a0c10'],
  red: ['#3a0a12', '#120306'],
  ice: ['#122233', '#070c12'],
};
const GLOW = { chrome: C.red, red: C.red, ice: '#3aa0ff' };

/** Bevelled chrome frame — the core visual unit of every concept panel. */
export function Chrome({ variant = 'chrome', radius = 14, glowOn = true, style, innerStyle, children, accent = true }) {
  return (
    <View style={[{ borderRadius: radius }, glowOn && glow(GLOW[variant], 10), style]}>
      <LinearGradient colors={FRAMES[variant]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius, padding: 1.6 }}>
        <LinearGradient colors={INNER[variant]} style={[{ borderRadius: radius - 1.5, overflow: 'hidden' }, innerStyle]}>
          {/* glass highlight along the top edge */}
          <LinearGradient colors={['#ffffff22', '#ffffff00']} style={s.sheen} pointerEvents="none" />
          {children}
        </LinearGradient>
      </LinearGradient>
      {accent && variant !== 'ice' && (
        <>
          <View style={[s.accentTL, { backgroundColor: C.red }]} pointerEvents="none" />
          <View style={[s.accentBR, { backgroundColor: C.red }]} pointerEvents="none" />
        </>
      )}
    </View>
  );
}

/** Panel title with red pulse rule, like "THREAT INTELLIGENCE" on the concept. */
export function PanelTitle({ children, right, color = C.text, lines = 1 }) {
  return (
    <View style={s.titleRow}>
      <View style={s.titleBar} />
      <Text style={[s.title, { color }]} numberOfLines={lines}>{children}</Text>
      {right}
    </View>
  );
}

export function Dot({ level = 'ok', size = 7 }) {
  const col = { ok: C.ok, pending: C.pending, caution: C.caution, off: C.off, red: C.red }[level];
  return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: col }, level !== 'off' && glow(col, 5)]} />;
}

export function levelColor(level) {
  return { ok: C.ok, pending: C.pending, caution: C.caution, off: C.off, red: C.redHot }[level];
}

/** Looping 0→1 driver for ambient motion (eye pulse, ring spin). */
export function useLoop(duration, enabled = true, easing = Easing.linear) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [enabled]);
  return v;
}

/** Glowing red core — used over the eye in the logo, hero and loader. */
export function EyeGlow({ size = 60, reduceMotion }) {
  const p = useLoop(2200, !reduceMotion, Easing.inOut(Easing.sin));
  const scale = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1.15, 0.85] });
  const opacity = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 0.95, 0.55] });
  return (
    <Animated.View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity, transform: [{ scale }] }}>
      {[1, 0.78, 0.58, 0.4, 0.26].map((k, n) => (
        <View key={n} style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: size, backgroundColor: '#ff2a44', opacity: 0.1 + n * 0.07 }} />
      ))}
      <View style={[{ width: size * 0.1, height: size * 0.1, borderRadius: size, backgroundColor: '#fff2f3' }, glow('#ff6070', size * 0.25)]} />
    </Animated.View>
  );
}

export const HudText = ({ style, children, glowColor, ...rest }) => (
  <Text {...rest} style={[{ color: C.text, fontFamily: F.displayB, letterSpacing: 2 }, glowColor && textGlow(glowColor), style]}>{children}</Text>
);

const s = StyleSheet.create({
  sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 18 },
  accentTL: { position: 'absolute', left: 10, top: -1, width: 26, height: 2, borderRadius: 1 },
  accentBR: { position: 'absolute', right: 10, bottom: -1, width: 26, height: 2, borderRadius: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  titleBar: { width: 3, height: 14, borderRadius: 2, backgroundColor: C.red, ...glow(C.red, 6) },
  title: { flex: 1, fontFamily: F.displayB, fontSize: 12, letterSpacing: 1.6 },
});
