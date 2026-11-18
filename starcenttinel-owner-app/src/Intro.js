// STARCENTTINEL opening sequence — follows the approved storyboard exactly:
// ① tap to launch (OS icon) → ② logo activation → ③ laser engage → ④ camera into
// laser → ⑤ briefcase reveal → ⑥ briefcase opens → ⑦ systems initializing (fusion of
// both configurations) → ⑧ load complete → ⑨ command centre (Dashboard.js).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, CHROME, F, glow, textGlow } from './theme';
import { EyeGlow, useLoop } from './ui';

const A = {
  logo: require('../assets/logo.png'),
  laser: require('../assets/story/sb_laser.png'),
  tunnel: require('../assets/story/sb_tunnel.png'),
  closed: require('../assets/story/sb_case_closed.png'),
  open: require('../assets/story/sb_case_open.png'),
  caseA: require('../assets/case_a.png'),
  caseB: require('../assets/case_b.png'),
};
// pixel sizes (avoid web-incompatible resolveAssetSource)
const SIZE = { laser: [670, 570], tunnel: [632, 570], closed: [742, 570], open: [912, 580] };

export const SEQUENCE = [
  { key: 'logo', duration: 2100, Comp: LogoStage },
  { key: 'laser', duration: 1400, Comp: LaserStage },
  { key: 'tunnel', duration: 1400, Comp: TunnelStage, flashOut: true },
  { key: 'closed', duration: 1700, Comp: ClosedCaseStage },
  { key: 'open', duration: 1600, Comp: OpenCaseStage },
  { key: 'fusion', duration: 2500, Comp: FusionStage },
  { key: 'load', duration: 2100, Comp: LoadStage },
];
const REDUCED = SEQUENCE.filter(s => s.key === 'logo' || s.key === 'load');

export default function Intro({ reduceMotion, onDone }) {
  const dims = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const seq = reduceMotion ? REDUCED : SEQUENCE;
  const [i, setI] = useState(0);
  const p = useRef(new Animated.Value(0)).current;
  const env = useRef(new Animated.Value(0)).current;
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    const st = seq[i];
    p.setValue(0); env.setValue(0);
    const a = Animated.parallel([
      Animated.timing(p, { toValue: 1, duration: st.duration, easing: Easing.linear, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(env, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.delay(st.duration - 240 - (st.flashOut ? 60 : 200)),
        Animated.timing(env, { toValue: 0, duration: st.flashOut ? 60 : 200, useNativeDriver: true }),
      ]),
    ]);
    a.start(({ finished }) => { if (finished) (i >= seq.length - 1 ? finish() : setI(i + 1)); });
    return () => a.stop();
  }, [i]);

  const { Comp } = seq[i];
  return (
    <View style={s.full}>
      <StatusBar hidden />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: env }]}>
        <Comp key={seq[i].key} p={p} W={dims.width} H={dims.height} insets={insets} reduceMotion={reduceMotion} />
      </Animated.View>

      {/* HUD frame corners — persistent across the sequence */}
      <HudCorners insets={insets} />

      <Pressable onPress={finish} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip intro" style={[s.skip, { top: insets.top + 10 }]}>
        <Text style={s.skipText}>SKIP  ›</Text>
      </Pressable>
      <View style={[s.progress, { bottom: insets.bottom + 18 }]}>
        {seq.map((_, n) => <View key={n} style={[s.seg, n <= i && s.segOn]} />)}
      </View>
    </View>
  );
}

/* ───────────────────────── ② LOGO ACTIVATION ───────────────────────── */
function LogoStage({ p, W, H, reduceMotion }) {
  const size = Math.min(W * 0.94, H * 0.55);
  const top = H * 0.44 - size / 2;
  const spin = useLoop(9000, !reduceMotion);
  const opacity = p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] });
  const scale = p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.86, 1, 1.03] });
  const streak = p.interpolate({ inputRange: [0, 0.45, 0.58, 0.75, 1], outputRange: [0, 0, 1, 0.15, 0] });
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotRev = spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  return (
    <View style={s.full}>
      <View style={[s.abs, { top, left: (W - size) / 2, width: size, height: size }]}>
        <Animated.View style={[s.ring, { width: size, height: size, borderRadius: size / 2, borderStyle: 'dashed', transform: [{ rotate: rot }] }]} />
        <Animated.View style={[s.ring, { left: size * 0.06, top: size * 0.06, width: size * 0.88, height: size * 0.88, borderRadius: size, borderColor: '#ff233d33', transform: [{ rotate: rotRev }] }]} />
        <Animated.Image source={A.logo} style={{ width: size, height: size, opacity, transform: [{ scale }] }} resizeMode="contain" />
        <View style={[s.abs, { left: size / 2 - 60, top: size * 0.35 - 60 }]}>
          <EyeGlow size={120} reduceMotion={reduceMotion} />
        </View>
        <Animated.View style={[s.streak, { top: size * 0.35, width: W * 1.2, left: size / 2 - W * 0.6, opacity: streak, transform: [{ scaleX: streak }] }]} />
      </View>
      <Caption W={W} H={H} kicker="OPTICAL CORE" line="ACTIVATING" p={p} />
    </View>
  );
}

/* ───────────────────────── ③ LASER ENGAGE ───────────────────────── */
function LaserStage({ p, W, H }) {
  const c = cover(SIZE.laser, W, H);
  const eyeX = c.x + 0.45 * c.w, eyeY = c.y + 0.53 * c.h;
  const zoom = p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const beam = p.interpolate({ inputRange: [0, 0.15, 0.5, 1], outputRange: [0, 0, 1, 1] });
  const flash = p.interpolate({ inputRange: [0, 0.82, 0.92, 1], outputRange: [0, 0, 0.75, 1] });
  const len = W - eyeX + 40;
  return (
    <View style={s.full}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
        <Image source={A.laser} style={[s.abs, { left: c.x, top: c.y, width: c.w, height: c.h }]} />
        {/* coded beam over the art so it actually fires */}
        <Animated.View style={[s.abs, { left: eyeX, top: eyeY - 9, width: len, height: 18, borderRadius: 9, backgroundColor: '#ff233d66', transformOrigin: 'left', transform: [{ scaleX: beam }] }, glow(C.red, 20)]} />
        <Animated.View style={[s.abs, { left: eyeX, top: eyeY - 2, width: len, height: 4, borderRadius: 2, backgroundColor: '#ffe3e6', transformOrigin: 'left', transform: [{ scaleX: beam }] }]} />
        <View style={[s.abs, { left: eyeX - 80, top: eyeY - 80 }]}><EyeGlow size={160} /></View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#ff3347', opacity: flash }]} />
      <Caption W={W} H={H} kicker="LASER" line="ENGAGED" p={p} />
    </View>
  );
}

/* ───────────────────────── ④ CAMERA INTO LASER ───────────────────────── */
function TunnelStage({ p, W, H }) {
  const c = cover(SIZE.tunnel, W, H);
  const zoom = p.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.55] });
  const core = p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.7, 1.3, 7] });
  const white = p.interpolate({ inputRange: [0, 0.85, 1], outputRange: [0, 0, 1] });
  const fly = useLoop(360);
  const rays = useMemo(() => Array.from({ length: 56 }, (_, k) => ({
    a: (k / 56) * 360 + (k % 3) * 3, len: 70 + (k % 5) * 45, w: k % 4 === 0 ? 3 : 1.5, col: k % 3 === 0 ? '#ffffff' : C.red, d: (k % 6) / 6,
  })), []);
  const R = Math.hypot(W, H) / 2;
  return (
    <View style={s.full}>
      <Animated.Image source={A.tunnel} style={[s.abs, { left: c.x, top: c.y, width: c.w, height: c.h, transform: [{ scale: zoom }] }]} />
      <View style={[s.abs, { left: W / 2, top: H / 2 }]}>
        {rays.map((r, k) => {
          const ty = fly.interpolate({ inputRange: [0, 1], outputRange: [-(R * 0.1 + r.d * R * 0.5), -(R * 0.6 + r.d * R * 0.5)] });
          return <Animated.View key={k} style={{ position: 'absolute', width: r.w, height: r.len, marginLeft: -r.w / 2, backgroundColor: r.col, opacity: 0.85, transform: [{ rotate: `${r.a}deg` }, { translateY: ty }] }} />;
        })}
      </View>
      <Animated.View style={[s.abs, { left: W / 2 - 90, top: H / 2 - 90, width: 180, height: 180, alignItems: 'center', justifyContent: 'center', transform: [{ scale: core }] }]}>
        {[1, 0.75, 0.52, 0.34, 0.2].map((k, n) => (
          <View key={n} style={{ position: 'absolute', width: 180 * k, height: 180 * k, borderRadius: 90, backgroundColor: n > 2 ? '#ffe6e9' : '#ff3a50', opacity: 0.12 + n * 0.12 }} />
        ))}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: white }]} />
    </View>
  );
}

/* ───────────────────────── ⑤ BRIEFCASE REVEAL ───────────────────────── */
function ClosedCaseStage({ p, W, H }) {
  const w = W * 1.32, h = w * (SIZE.closed[1] / SIZE.closed[0]);
  const top = H * 0.45 - h / 2;
  const settle = p.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1] });
  const whiteIn = p.interpolate({ inputRange: [0, 0.12], outputRange: [0.9, 0], extrapolate: 'clamp' });
  const sweep = p.interpolate({ inputRange: [0, 0.3, 0.9, 1], outputRange: [-W, -W, W * 1.2, W * 1.2] });
  const under = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.9, 0.6] });
  return (
    <View style={s.full}>
      <LinearGradient colors={['#000', '#14040a', '#000']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[s.abs, { left: W * 0.1, top: top + h * 0.78, width: W * 0.8, height: 60, borderRadius: 60, backgroundColor: '#ff233d', opacity: under, transform: [{ scaleY: 0.35 }] }, glow(C.red, 40)]} />
      <Animated.View style={[s.abs, { left: (W - w) / 2, top, width: w, height: h, transform: [{ scale: settle }], overflow: 'hidden' }]}>
        <Image source={A.closed} style={{ width: w, height: h }} />
        <Animated.View style={[s.abs, { top: -40, height: h + 80, width: 70, transform: [{ translateX: sweep }, { rotate: '14deg' }] }]}>
          <LinearGradient colors={['#ff233d00', '#ff6b7acc', '#ff233d00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: whiteIn }]} />
      <Caption W={W} H={H} kicker="EMERGENCY CASE" line="BIOMETRIC SEAL VERIFIED" p={p} />
    </View>
  );
}

/* ───────────────────────── ⑥ BRIEFCASE OPENS ───────────────────────── */
function OpenCaseStage({ p, W, H }) {
  const w = W * 1.18, h = w * (SIZE.open[1] / SIZE.open[0]);
  const top = H * 0.45 - h / 2;
  const burst = p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.2, 1.4, 1.1] });
  const burstO = p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.85, 0.5] });
  const rays = p.interpolate({ inputRange: [0, 0.15, 0.5, 1], outputRange: [0, 0, 1, 0.9] });
  const push = p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const smoke = p.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cx = W / 2, cy = top + h * 0.55;
  return (
    <View style={s.full}>
      <LinearGradient colors={['#000', '#1a0509', '#000']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: push }] }]}>
        <Image source={A.open} style={[s.abs, { left: (W - w) / 2, top, width: w, height: h }]} />
        {[-3, -2, -1, 0, 1, 2, 3].map(k => (
          <Animated.View key={k} style={[s.abs, { left: cx + k * W * 0.08 - 6, top: cy - H * 0.32, width: 12, height: H * 0.32, opacity: rays, transformOrigin: 'bottom', transform: [{ scaleY: rays }] }]}>
            <LinearGradient colors={['#ff233d00', '#ff3b50aa']} style={{ flex: 1, borderRadius: 6 }} />
          </Animated.View>
        ))}
        <Animated.View style={[s.abs, { left: cx - 120, top: cy - 120, width: 240, height: 240, borderRadius: 120, backgroundColor: '#ff233d55', opacity: burstO, transform: [{ scale: burst }] }, glow(C.red, 50)]} />
        {[[-1, 0.2], [1, 0.1], [-1.3, -0.1], [1.2, -0.2]].map(([dx, dy], k) => (
          <Animated.View key={k} style={[s.abs, {
            left: cx - 90, top: cy - 60, width: 180, height: 120, borderRadius: 90, backgroundColor: '#ffffff12',
            transform: [{ translateX: Animated.multiply(smoke, dx * W * 0.35) }, { translateY: Animated.multiply(smoke, dy * 80) }, { scale: Animated.add(1, smoke) }],
          }]} />
        ))}
      </Animated.View>
      <Caption W={W} H={H} kicker="ACCESS GRANTED" line="CASE OPENING" p={p} />
    </View>
  );
}

/* ──────────────── ⑦ SYSTEMS INITIALIZING — FUSION OF BOTH CONFIGURATIONS ──────────────── */
function FusionStage({ p, W, H, insets }) {
  const half = H * 0.36;
  const topY = H * 0.5 - half - 18, botY = H * 0.5 + 18;
  const inA = p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [-W, 0, 0], easing: Easing.out(Easing.cubic) });
  const inB = p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [W, 0, 0], easing: Easing.out(Easing.cubic) });
  const badge = p.interpolate({ inputRange: [0, 0.3, 0.42, 1], outputRange: [0, 0, 1.25, 1] });
  const scan = useLoop(1300);
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [topY, botY + half] });
  const [dots, setDots] = useState('');
  useEffect(() => { const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 300); return () => clearInterval(t); }, []);
  return (
    <View style={s.full}>
      <Half W={W} half={half} src={A.caseA} y={topY} tx={inA} label="CONFIG A · PRIMARY" />
      <Half W={W} half={half} src={A.caseB} y={botY} tx={inB} label="CONFIG B · CONTINUITY" />
      <LinearGradient colors={CHROME} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.abs, { left: -W * 0.2, top: H / 2 - 2, width: W * 1.4, height: 4, transform: [{ rotate: '-7deg' }] }]} />
      <Animated.View style={[s.abs, { left: W / 2 - 36, top: H / 2 - 36, transform: [{ scale: badge }] }]}>
        <LinearGradient colors={CHROME} style={[{ width: 72, height: 72, borderRadius: 36, padding: 3 }, glow(C.red, 24)]}>
          <View style={{ flex: 1, borderRadius: 36, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 40, fontFamily: F.display, marginTop: -4 }}>+</Text>
          </View>
        </LinearGradient>
      </Animated.View>
      <Animated.View style={[s.abs, { left: 0, width: W, height: 2, backgroundColor: C.red, opacity: 0.8, transform: [{ translateY: scanY }] }, glow(C.red, 10)]} />
      <View style={[s.abs, { top: insets.top + 64, left: 0, right: 0, alignItems: 'center' }]}>
        <Text style={[s.hudTitle, textGlow(C.red, 14)]}>SYSTEMS INITIALIZING{dots}</Text>
        <Text style={s.hudSub}>FUSION OF BOTH CONFIGURATIONS</Text>
      </View>
    </View>
  );
}

function Half({ W, half, src, y, tx, label }) {
  return (
    <Animated.View style={[s.abs, { left: 0, top: y, width: W, height: half, transform: [{ translateX: tx }] }]}>
      <Image source={src} style={{ width: W, height: half }} resizeMode="cover" />
      <LinearGradient colors={['#00000000', '#000000aa']} style={StyleSheet.absoluteFill} />
      <View style={s.cfgChip}><Text style={s.cfgText}>{label}</Text></View>
    </Animated.View>
  );
}

/* ───────────────────────── ⑧ LOAD COMPLETE ───────────────────────── */
const SEGS = 18;
const SEG_COL = Array.from({ length: SEGS }, (_, k) => mix('#ffb347', '#ff233d', k / (SEGS - 1)));
function LoadStage({ p, W, H, reduceMotion }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = p.addListener(({ value }) => setPct(Math.min(100, Math.round((value / 0.78) * 100))));
    return () => p.removeListener(id);
  }, []);
  const spin = useLoop(4000, !reduceMotion);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotR = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const chev = useLoop(700);
  const cy = H * 0.46, R = Math.min(W, H) * 0.48;
  const lit = Math.round((pct / 100) * SEGS);
  const complete = pct >= 100;
  return (
    <View style={s.full}>
      <RadialRed W={W} H={H} cy={cy} />
      {[1, 0.82, 0.64].map((k, n) => (
        <View key={n} style={[s.ring, { left: W / 2 - R * k, top: cy - R * k, width: R * 2 * k, height: R * 2 * k, borderRadius: R * k, borderWidth: n === 0 ? 6 : 2, borderColor: n === 0 ? '#1d2027' : '#2a2d35' }]} />
      ))}
      <Animated.View style={[s.ring, { left: W / 2 - R, top: cy - R, width: R * 2, height: R * 2, borderRadius: R, borderWidth: 3, borderColor: 'transparent', borderTopColor: C.red, borderRightColor: '#ff233d55', transform: [{ rotate: rot }] }, glow(C.red, 12)]} />
      <Animated.View style={[s.ring, { left: W / 2 - R * 0.82, top: cy - R * 0.82, width: R * 1.64, height: R * 1.64, borderRadius: R, borderWidth: 2, borderColor: 'transparent', borderBottomColor: '#ffffffaa', transform: [{ rotate: rotR }] }]} />

      <View style={[s.abs, { left: 0, right: 0, top: cy - 92, alignItems: 'center' }]}>
        <Text style={[s.brand, textGlow('#ffffff', 8)]}>STARCENTTINEL<Text style={{ fontSize: 10 }}>™</Text></Text>
        <Text style={s.loading}>{complete ? 'LOAD COMPLETE' : 'SYSTEMS LOADING'}</Text>
        <LinearGradient colors={['#ffb3bb', '#ff233d', '#5a0b16', '#ff5a6a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.barFrame, { width: W * 0.78 }, glow(C.red, 14)]}>
          <View style={s.barInner}>
            {SEG_COL.map((col, k) => (
              <View key={k} style={[s.barSeg, { backgroundColor: k < lit ? col : '#2a1015' }]} />
            ))}
          </View>
        </LinearGradient>
        <Text style={[s.pct, textGlow('#ffffff', 6)]}>{pct}%</Text>
      </View>
      {complete && (
        <View style={[s.abs, { left: 0, right: 0, top: cy + 110, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }]}>
          {[0, 1, 2].map(k => (
            <Animated.Text key={k} style={[s.chev, textGlow(C.red, 10), { opacity: chev.interpolate({ inputRange: [0, (k + 1) / 4, 1], outputRange: [0.2, 1, 0.2] }) }]}>›</Animated.Text>
          ))}
        </View>
      )}
    </View>
  );
}

/* ───────────────────────── shared ───────────────────────── */
function Caption({ W, H, kicker, line, p }) {
  const o = p.interpolate({ inputRange: [0, 0.3, 0.5, 1], outputRange: [0, 0, 1, 1] });
  return (
    <Animated.View style={[s.abs, { left: 24, right: 24, bottom: H * 0.11, opacity: o }]}>
      <Text style={s.capKicker}>{kicker}</Text>
      <Text style={[s.capLine, textGlow(C.red, 10)]}>{line}</Text>
    </Animated.View>
  );
}

function RadialRed({ W, H, cy }) {
  return [1.1, 0.75, 0.45].map((k, n) => (
    <View key={n} style={[s.abs, { left: W / 2 - W * k, top: cy - W * k, width: W * 2 * k, height: W * 2 * k, borderRadius: W * k, backgroundColor: '#ff233d', opacity: 0.035 + n * 0.02 }]} />
  ));
}

function HudCorners({ insets }) {
  const b = { position: 'absolute', width: 22, height: 22, borderColor: '#ff233d88' };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[b, { top: insets.top + 8, left: 10, borderTopWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[b, { bottom: insets.bottom + 8, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[b, { bottom: insets.bottom + 8, right: 10, borderBottomWidth: 2, borderRightWidth: 2 }]} />
    </View>
  );
}

function cover([iw, ih], W, H) {
  const k = Math.max(W / iw, H / ih);
  const w = iw * k, h = ih * k;
  return { w, h, x: (W - w) / 2, y: (H - h) / 2 };
}
function mix(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const s = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  abs: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: '#ff233d66' },
  streak: { position: 'absolute', height: 3, backgroundColor: '#ffe3e6', borderRadius: 2, ...glow(C.red, 18) },
  skip: { position: 'absolute', right: 14, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#000b', borderWidth: 1, borderColor: '#ffffff30' },
  skipText: { color: '#fff', fontFamily: F.uiB, fontSize: 13, letterSpacing: 2 },
  progress: { position: 'absolute', left: 40, right: 40, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 2, borderRadius: 1, backgroundColor: '#ffffff26' },
  segOn: { backgroundColor: C.red },
  capKicker: { color: C.gold, fontFamily: F.uiB, fontSize: 12, letterSpacing: 4 },
  capLine: { color: '#fff', fontFamily: F.displayB, fontSize: 20, letterSpacing: 2, marginTop: 4 },
  hudTitle: { color: '#fff', fontFamily: F.displayB, fontSize: 17, letterSpacing: 2 },
  hudSub: { color: C.muted, fontFamily: F.uiB, fontSize: 12, letterSpacing: 3, marginTop: 6 },
  cfgChip: { position: 'absolute', left: 14, bottom: 12, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 6, backgroundColor: '#000c', borderWidth: 1, borderColor: '#ff233d88' },
  cfgText: { color: '#fff', fontFamily: F.uiB, fontSize: 11, letterSpacing: 2 },
  brand: { color: '#fff', fontFamily: F.display, fontSize: 24, letterSpacing: 2 },
  loading: { color: C.muted, fontFamily: F.uiB, fontSize: 13, letterSpacing: 7, marginTop: 6, marginBottom: 22 },
  barFrame: { borderRadius: 14, padding: 2 },
  barInner: { flexDirection: 'row', gap: 3, padding: 5, borderRadius: 12, backgroundColor: '#120306' },
  barSeg: { flex: 1, height: 16, borderRadius: 2, transform: [{ skewX: '-20deg' }] },
  pct: { color: '#fff', fontFamily: F.display, fontSize: 28, marginTop: 16 },
  chev: { color: C.red, fontFamily: F.display, fontSize: 44, marginHorizontal: -2 },
});
