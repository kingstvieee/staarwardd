// ⑨ COMMAND CENTRE — portrait adaptation of storyboard frame 9 + the concept dashboard.
// Visual layout follows the boards; every value is read from src/status.js.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, glow, textGlow } from './theme';
import { Chrome, Dot, EyeGlow, PanelTitle, levelColor, useLoop } from './ui';
import { DATA_SOURCE, gateProgress } from './status';

const IMG = {
  core: require('../assets/ui/cc_core.png'),
  globe: require('../assets/ui/cc_globe.png'),
  owner: require('../assets/ui/cc_owner.png'),
  lockdown: require('../assets/ui/cc_lockdown.png'),
  recovery: require('../assets/ui/cc_recovery.png'),
  guardian: require('../assets/story/sb_guardian.png'),
  skyline: require('../assets/story/sb_skyline.png'),
  crest: require('../assets/story/sb_crest.png'),
  caseA: require('../assets/case_a.png'),
  caseB: require('../assets/case_b.png'),
};

// Concept left-menu, in order.
const MENU = [
  { key: 'command', label: 'Command Centre', icon: 'locate-outline' },
  { key: 'threat', label: 'Threat Intelligence', icon: 'pulse-outline' },
  { key: 'portals', label: 'Guardian Portals', icon: 'layers-outline' },
  { key: 'devices', label: 'Devices & Access', icon: 'desktop-outline' },
  { key: 'kit', label: 'Emergency Kit', icon: 'medkit-outline' },
  { key: 'recovery', label: 'Recovery & Backup', icon: 'refresh-outline' },
  { key: 'system', label: 'System Intelligence', icon: 'hardware-chip-outline' },
  { key: 'logs', label: 'Logs & Timeline', icon: 'list-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function Dashboard({ status, reduceMotion, onReplayIntro }) {
  const { width: W } = useWindowDimensions();
  const [section, setSection] = useState('command');
  const [menu, setMenu] = useState(false);
  const [locked, setLocked] = useState(false);
  const CW = W - 28; // content width
  const label = MENU.find(m => m.key === section).label;

  const blocks = {
    hero: <Hero status={status} CW={CW} reduceMotion={reduceMotion} />,
    modules: <Modules status={status} CW={CW} />,
    threat: <ThreatPanel status={status} CW={CW} />,
    healthPortals: (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <HealthPanel status={status} reduceMotion={reduceMotion} />
        <PortalsPanel status={status} />
      </View>
    ),
    timeline: <Timeline status={status} />,
    actions: <Actions CW={CW} status={status} onLocked={() => setLocked(true)} />,
    gates: <Gates status={status} />,
    kit: <Kit CW={CW} />,
  };
  const LAYOUT = {
    command: ['hero', 'modules', 'threat', 'healthPortals', 'timeline', 'actions'],
    threat: ['threat', 'timeline'],
    portals: ['healthPortals', 'modules'],
    devices: ['devices'],
    kit: ['kit', 'actions'],
    recovery: ['actions', 'kit'],
    system: ['gates', 'healthPortals'],
    logs: ['timeline'],
    settings: ['settings'],
  };
  blocks.devices = <Notice icon="desktop-outline" title="DEVICES & ACCESS" text="No devices or provider connections have been verified yet. Revocation controls stay disabled until passkey enrollment is complete." />;
  blocks.settings = <Settings onReplayIntro={onReplayIntro} />;

  return (
    <SafeAreaView style={s.full} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <Backdrop />
      <TopBar onMenu={() => setMenu(true)} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 60, gap: 12 }} key={section}>
        {section !== 'command' && <SectionHead label={label} />}
        {LAYOUT[section].map((b, n) => (
          <Enter key={b} delay={n * 90} reduceMotion={reduceMotion}>{blocks[b]}</Enter>
        ))}
        <Text style={s.footer}>STARCENTTINEL · OWNER PROTOTYPE 0.5 · {(status.source?.label || DATA_SOURCE.label)}</Text>
      </ScrollView>

      <Drawer visible={menu} active={section} onClose={() => setMenu(false)} onPick={k => { setSection(k); setMenu(false); }} />
      <LockedSheet visible={locked} status={status} onClose={() => setLocked(false)} />
    </SafeAreaView>
  );
}

/* ───────────── top bar: menu · crest · OWNER / PRIMARY AUTHORITY ───────────── */
function TopBar({ onMenu }) {
  return (
    <View style={s.topBar}>
      <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel="Open menu">
        <Chrome radius={10} accent={false} innerStyle={s.menuBtn}><Ionicons name="menu" size={22} color={C.redHot} /></Chrome>
      </Pressable>
      <Image source={IMG.crest} style={{ width: 64, height: 27 }} resizeMode="contain" />
      <Image source={IMG.owner} style={{ width: 132, height: 31 }} resizeMode="contain" accessibilityLabel="Owner, primary authority" />
    </View>
  );
}

/* ───────────── hero: eye core + wordmark · Guardian · system status · Toronto ───────────── */
function Hero({ status, CW, reduceMotion }) {
  const coreH = CW / 2.149;
  const lowH = 196;
  const st = status.system;
  const secure = st.state === 'SECURE';
  const col = secure ? C.ok : st.state === 'LOCKDOWN' ? C.red : C.caution;
  return (
    <Chrome radius={18}>
      <View style={{ width: CW - 3.2, height: coreH }}>
        <Image source={IMG.core} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <View style={[s.abs, { left: (CW - 3.2) * 0.503 - 45, top: coreH * 0.44 - 45 }]}><EyeGlow size={90} reduceMotion={reduceMotion} /></View>
        <View style={s.sourceChip}><Dot level="pending" size={6} /><Text style={s.sourceText}>{(status.source?.label || DATA_SOURCE.label)}</Text></View>
      </View>
      <View style={{ height: lowH }}>
        <Image source={IMG.skyline} style={[s.abs, { left: 0, right: 0, bottom: 0, width: '100%', height: lowH * 0.42 }]} resizeMode="cover" />
        <LinearGradient colors={['#0a0c10', '#0a0c10cc', '#0a0c1000']} style={[s.abs, { left: 0, right: 0, top: 0, height: lowH * 0.7 }]} />
        <Image source={IMG.guardian} style={[s.abs, { left: -6, bottom: 0, width: lowH * 1.0, height: lowH * 0.92 }]} resizeMode="cover" />
        <LinearGradient colors={['#0a0c1000', '#0a0c10']} start={{ x: 0.55, y: 0 }} end={{ x: 1, y: 0 }} style={[s.abs, { left: 0, bottom: 0, width: lowH * 1.0, height: lowH }]} />

        <View style={[s.abs, { right: 10, top: 12, width: CW * 0.5 }]}>
          <Chrome variant="red" radius={12}>
            <View style={{ padding: 12 }}>
              <Text style={s.statusKicker}>SYSTEM STATUS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Ionicons name={secure ? 'checkmark-circle' : 'warning'} size={26} color={col} style={textGlow(col, 8)} />
                <Text style={[s.statusWord, { color: col }, textGlow(col, 10)]} adjustsFontSizeToFit numberOfLines={1}>{st.state}</Text>
              </View>
              <Text style={s.statusRev}>{status.source?.live ? `LIVE REVISION ${st.revision}` : `HISTORICAL REVISION ${st.revision}`}</Text>
              {!secure && <View style={s.hazard}>{Array.from({ length: 9 }).map((_, k) => <View key={k} style={s.hazardStripe} />)}</View>}
              <Text style={s.statusLine}>{st.line1}{'\n'}{st.line2}</Text>
            </View>
          </Chrome>
        </View>
      </View>
    </Chrome>
  );
}

/* ───────────── module row (storyboard frame 9) ───────────── */
function Modules({ status, CW }) {
  const gap = 8, tw = (CW - gap * 3) / 4;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, justifyContent: 'center' }}>
      {status.modules.map(m => (
        <Chrome key={m.key} variant="ice" radius={10} style={{ width: tw }}>
          <View style={s.tile} accessible accessibilityLabel={`${m.name.replace('\n', ' ')}, ${m.status}`}>
            <Image source={m.icon} style={{ width: tw - 14, height: (tw - 14) * 0.58 }} resizeMode="cover" />
            <Text style={s.tileName} numberOfLines={2}>{m.name}</Text>
            <View style={s.tileStatus}><Dot level={m.level} size={6} /><Text style={[s.tileStatusText, { color: levelColor(m.level) }]} numberOfLines={1}>{m.status}</Text></View>
          </View>
        </Chrome>
      ))}
    </View>
  );
}

/* ───────────── threat intelligence (concept panel + globe) ───────────── */
function ThreatPanel({ status }) {
  const t = status.threats;
  const v = x => (x == null ? '—' : String(x));
  return (
    <Chrome>
      <View style={{ padding: 14, minHeight: 150 }}>
        <Image source={IMG.globe} style={[s.abs, { right: -30, top: 10, width: 250, height: 105 * 1.25 }]} resizeMode="cover" />
        <LinearGradient colors={['#0c0e13', '#0c0e13dd', '#0c0e1300']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.abs, { left: 0, top: 0, bottom: 0, width: '75%' }]} />
        <PanelTitle right={<Ionicons name="chevron-forward" size={16} color={C.gold} />}>THREAT INTELLIGENCE</PanelTitle>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={[s.bigNum, textGlow('#fff', 6)]}>{v(t.active)}</Text>
          <Text style={s.rowLabel}>ACTIVE THREATS</Text>
        </View>
        <View style={s.rule} />
        <Row num={v(t.monitoring)} label="MONITORING" />
        <Row num={v(t.contained24h)} label="CONTAINED (24H)" />
        {t.note ? <Text style={s.note}>{t.note}</Text> : null}
      </View>
    </Chrome>
  );
}
const Row = ({ num, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
    <Text style={s.midNum}>{num}</Text><Text style={s.rowLabelSm}>{label}</Text>
  </View>
);

/* ───────────── system health ring ───────────── */
function HealthPanel({ status, reduceMotion }) {
  const pct = status.health.pct;
  const spin = useLoop(6000, !reduceMotion);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Chrome style={{ flex: 1 }}>
      <View style={{ padding: 12, alignItems: 'center' }}>
        <PanelTitle lines={2}>SYSTEM{'\n'}HEALTH</PanelTitle>
        <View style={{ width: 92, height: 92, alignItems: 'center', justifyContent: 'center' }}>
          <View style={[s.ringBase]} />
          <Animated.View style={[s.ringArc, { transform: [{ rotate: rot }] }, glow(C.red, 8)]} />
          <Text style={[s.ringNum, textGlow('#fff', 6)]}>{pct == null ? '—' : pct}<Text style={{ fontSize: 13 }}>%</Text></Text>
        </View>
        <Text style={s.rowLabelSm}>{pct == null ? status.health.note.toUpperCase() : 'OPERATIONAL'}</Text>
      </View>
    </Chrome>
  );
}

/* ───────────── guardian portals 7 cores ───────────── */
function PortalsPanel({ status }) {
  const { total, verified, note } = status.portals;
  return (
    <Chrome style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        <PanelTitle lines={2}>GUARDIAN{'\n'}PORTALS</PanelTitle>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
          <Text style={[s.bigNum, textGlow('#fff', 6)]}>{verified}/{total}</Text>
        </View>
        <Text style={s.rowLabelSm}>VERIFIED LIVE</Text>
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 12, flexWrap: 'wrap' }}>
          {Array.from({ length: total }).map((_, k) => (
            <View key={k} style={[s.core, k < verified ? [{ backgroundColor: C.red }, glow(C.red, 6)] : { backgroundColor: '#3a1218', borderColor: '#ff233d66' }]} />
          ))}
        </View>
        <Text style={[s.note, { marginTop: 10 }]}>{note}</Text>
      </View>
    </Chrome>
  );
}

/* ───────────── live incident timeline ───────────── */
function Timeline({ status }) {
  return (
    <Chrome>
      <View style={{ padding: 14 }}>
        <PanelTitle right={<Ionicons name="calendar-outline" size={16} color={C.muted} />}>LIVE INCIDENT TIMELINE</PanelTitle>
        {status.timeline.map((e, k) => (
          <View key={k} style={[s.tlRow, k > 0 && s.tlBorder]}>
            <Dot level={e.level} size={9} />
            <Text style={[s.tlTime, { color: levelColor(e.level) }]}>{e.time}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.tlText}>{e.text}</Text>
              <Text style={s.tlDetail}>{e.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </Chrome>
  );
}

/* ───────────── INITIATE LOCKDOWN · EMERGENCY RECOVERY (concept buttons) ───────────── */
function Actions({ CW, status, onLocked }) {
  const gp = gateProgress(status.gates);
  const h = CW / 5.3;
  const Btn = ({ src, label }) => (
    <Pressable onPress={onLocked} accessibilityRole="button" accessibilityLabel={`${label}, locked`} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <Image source={src} style={{ width: CW, height: h }} resizeMode="stretch" />
      <View style={s.lockTag}><Ionicons name="lock-closed" size={10} color={C.goldHi} /><Text style={s.lockTagText}>LOCKED</Text></View>
    </Pressable>
  );
  return (
    <View style={{ gap: 8 }}>
      <Btn src={IMG.lockdown} label="Initiate lockdown" />
      <Btn src={IMG.recovery} label="Emergency recovery" />
      <Text style={[s.note, { textAlign: 'center' }]}>{gp.done}/{gp.total} security gates cleared · live controls remain disabled pending independent authorization and device tests</Text>
    </View>
  );
}

/* ───────────── emergency kit (both configurations) ───────────── */
function Kit({ CW }) {
  return (
    <Chrome>
      <View style={{ padding: 14, gap: 12 }}>
        <PanelTitle>BOTH CONFIGURATIONS</PanelTitle>
        {[[IMG.caseA, 'CONFIG A · PRIMARY CASE'], [IMG.caseB, 'CONFIG B · CONTINUITY KIT']].map(([src, name], k) => (
          <View key={k} style={{ borderRadius: 10, overflow: 'hidden' }}>
            <Image source={src} style={{ width: '100%', height: (CW - 32) / 1.5 }} resizeMode="cover" />
            <LinearGradient colors={['#00000000', '#000000cc']} style={[s.abs, { left: 0, right: 0, bottom: 0, height: 50 }]} />
            <Text style={s.kitName}>{name}</Text>
          </View>
        ))}
      </View>
    </Chrome>
  );
}

/* ───────────── system intelligence: security gates ───────────── */
function Gates({ status }) {
  const gp = gateProgress(status.gates);
  return (
    <Chrome>
      <View style={{ padding: 14 }}>
        <PanelTitle right={<Text style={[s.rowLabelSm, { color: C.gold }]}>{gp.done}/{gp.total}</Text>}>LIVE-CONTROL READINESS</PanelTitle>
        <View style={s.gBar}><LinearGradient colors={[C.goldHi, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${gp.pct}%`, height: '100%' }} /></View>
        {status.gates.map(g => (
          <View key={g.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
            <Ionicons name={g.done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={g.done ? C.ok : C.off} />
            <Text style={[s.gText, g.done && { color: '#fff' }]}>{g.name}</Text>
          </View>
        ))}
      </View>
    </Chrome>
  );
}

function Notice({ icon, title, text }) {
  return (
    <Chrome>
      <View style={{ padding: 18, alignItems: 'center' }}>
        <PanelTitle>{title}</PanelTitle>
        <Ionicons name={icon} size={40} color={C.red} style={[{ marginVertical: 10 }, textGlow(C.red, 10)]} />
        <Text style={[s.gText, { textAlign: 'center' }]}>{text}</Text>
      </View>
    </Chrome>
  );
}

function Settings({ onReplayIntro }) {
  return (
    <Chrome>
      <View style={{ padding: 14 }}>
        <PanelTitle>SETTINGS</PanelTitle>
        <Pressable onPress={onReplayIntro} style={s.setRow} accessibilityRole="button">
          <Ionicons name="play-circle-outline" size={20} color={C.redHot} />
          <Text style={s.setText}>Replay opening sequence</Text>
          <Ionicons name="chevron-forward" size={16} color={C.faint} />
        </Pressable>
        <View style={s.setRow}>
          <Ionicons name="server-outline" size={20} color={C.pending} />
          <Text style={s.setText}>Data source: {(status.source?.label || DATA_SOURCE.label)}</Text>
        </View>
      </View>
    </Chrome>
  );
}

/* ───────────── drawer — concept left menu ───────────── */
function Drawer({ visible, active, onClose, onPick }) {
  const insets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(-320)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: visible ? 0 : -320, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close menu" />
      <Animated.View style={[s.drawer, { paddingTop: insets.top + 14, transform: [{ translateX: x }] }]}>
        <Chrome radius={16} style={{ flex: 1 }} innerStyle={{ flex: 1, paddingVertical: 10 }}>
          <Image source={require('../assets/ui/cc_wordmark.png')} style={{ width: '92%', height: 38, alignSelf: 'center', marginBottom: 10 }} resizeMode="contain" />
          {MENU.map(m => {
            const on = m.key === active;
            return (
              <Pressable key={m.key} onPress={() => onPick(m.key)} accessibilityRole="menuitem" accessibilityState={{ selected: on }}>
                {on ? (
                  <LinearGradient colors={['#ff233d', '#7a0c1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.mItem, s.mOn, glow(C.red, 12)]}>
                    <Ionicons name={m.icon} size={22} color="#fff" /><Text style={[s.mText, { color: '#fff' }]}>{m.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                  </LinearGradient>
                ) : (
                  <View style={s.mItem}>
                    <Ionicons name={m.icon} size={22} color="#d8dae0" /><Text style={s.mText}>{m.label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </Chrome>
      </Animated.View>
    </Modal>
  );
}

function LockedSheet({ visible, status, onClose }) {
  const gp = gateProgress(status.gates);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modal}>
        <Chrome variant="red" radius={18} style={{ width: '100%' }}>
          <View style={{ padding: 22, alignItems: 'center' }}>
            <Ionicons name="lock-closed" size={34} color={C.redHot} style={textGlow(C.red, 12)} />
            <Text style={[s.sheetTitle, textGlow(C.red, 10)]}>CONTROL LOCKED</Text>
            <Text style={[s.gText, { textAlign: 'center' }]}>Lockdown and recovery unlock once all {gp.total} security gates are cleared — passkey on an independent device, signed scoped capability and a verified security API with durable audit. {gp.done}/{gp.total} cleared.</Text>
            <Pressable onPress={onClose} style={{ width: '100%', marginTop: 20 }} accessibilityRole="button">
              <LinearGradient colors={['#ff233d', '#7a0c1a']} style={s.sheetBtn}><Text style={s.sheetBtnText}>UNDERSTOOD</Text></LinearGradient>
            </Pressable>
          </View>
        </Chrome>
      </View>
    </Modal>
  );
}

/* ───────────── helpers ───────────── */
function SectionHead({ label }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 4 }}>
      <Text style={[s.sectionHead, textGlow(C.red, 10)]}>{label.toUpperCase()}</Text>
      <LinearGradient colors={['#ff233d00', '#ff233d', '#ff233d00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 2, width: '70%', marginTop: 6 }} />
    </View>
  );
}

function Enter({ delay, reduceMotion, children }) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>{children}</Animated.View>;
}

function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#12040a', '#040507', '#040507', '#0d0306']} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const s = StyleSheet.create({
  full: { flex: 1, backgroundColor: C.bg },
  abs: { position: 'absolute' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  menuBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },

  sourceChip: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, backgroundColor: '#000b' },
  sourceText: { color: C.pending, fontFamily: F.uiB, fontSize: 10, letterSpacing: 1.2 },
  statusKicker: { color: '#fff', fontFamily: F.uiB, fontSize: 12, letterSpacing: 2.5, textAlign: 'center' },
  statusWord: { fontFamily: F.display, fontSize: 21, letterSpacing: 1, flexShrink: 1 },
  statusRev: { color: '#fff', fontFamily: F.uiB, fontSize: 13, letterSpacing: 2, marginTop: 2 },
  hazard: { flexDirection: 'row', gap: 4, marginVertical: 6, overflow: 'hidden', height: 5 },
  hazardStripe: { width: 7, height: 5, backgroundColor: C.caution, transform: [{ skewX: '-35deg' }], opacity: 0.85 },
  statusLine: { color: '#d9dbe1', fontFamily: F.ui, fontSize: 12, lineHeight: 15 },

  tile: { alignItems: 'center', paddingTop: 6, paddingBottom: 8, paddingHorizontal: 5 },
  tileName: { color: '#fff', fontFamily: F.uiB, fontSize: 11, lineHeight: 12, textAlign: 'center', marginTop: 4, letterSpacing: 0.5, minHeight: 24 },
  tileStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tileStatusText: { fontFamily: F.uiB, fontSize: 10, letterSpacing: 0.5 },

  bigNum: { color: '#fff', fontFamily: F.display, fontSize: 30 },
  midNum: { color: '#fff', fontFamily: F.displayB, fontSize: 17, width: 30 },
  rowLabel: { color: '#fff', fontFamily: F.uiB, fontSize: 15, letterSpacing: 1.5 },
  rowLabelSm: { color: '#d1d3d9', fontFamily: F.uiB, fontSize: 12, letterSpacing: 1.2 },
  rule: { height: 1, backgroundColor: '#ffffff1f', marginVertical: 8, width: '55%' },
  note: { color: C.gold, fontFamily: F.ui, fontSize: 12, marginTop: 8 },

  ringBase: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 7, borderColor: '#2a2d35' },
  ringArc: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 7, borderColor: 'transparent', borderTopColor: C.red, borderRightColor: C.red },
  ringNum: { color: '#fff', fontFamily: F.display, fontSize: 22 },
  core: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#ff8a96' },

  tlRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
  tlBorder: { borderTopWidth: 1, borderTopColor: '#ffffff12' },
  tlTime: { fontFamily: F.displayB, fontSize: 12, width: 44, marginTop: -1 },
  tlText: { color: '#fff', fontFamily: F.uiB, fontSize: 14 },
  tlDetail: { color: C.muted, fontFamily: F.ui, fontSize: 12, marginTop: 1 },

  lockTag: { position: 'absolute', right: 12, top: 6, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: '#000a', borderWidth: 1, borderColor: '#e8ba6a66' },
  lockTagText: { color: C.goldHi, fontFamily: F.uiB, fontSize: 10, letterSpacing: 1 },

  kitName: { position: 'absolute', left: 12, bottom: 10, color: '#fff', fontFamily: F.displayB, fontSize: 12, letterSpacing: 1.5 },
  gBar: { height: 6, borderRadius: 3, backgroundColor: '#ffffff14', marginBottom: 10, overflow: 'hidden' },
  gText: { color: C.muted, fontFamily: F.ui, fontSize: 14, flex: 1, lineHeight: 19 },

  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#ffffff12' },
  setText: { color: '#fff', fontFamily: F.uiB, fontSize: 15, flex: 1 },

  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000c' },
  drawer: { position: 'absolute', left: 10, top: 0, bottom: 20, width: 300 },
  mItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16, marginHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#ffffff10' },
  mOn: { borderRadius: 10, borderBottomWidth: 0 },
  mText: { flex: 1, color: '#e6e7eb', fontFamily: F.uiB, fontSize: 17 },

  modal: { flex: 1, backgroundColor: '#000d', alignItems: 'center', justifyContent: 'center', padding: 22 },
  sheetTitle: { color: '#fff', fontFamily: F.display, fontSize: 18, letterSpacing: 2, marginVertical: 12 },
  sheetBtn: { padding: 15, borderRadius: 10, alignItems: 'center' },
  sheetBtnText: { color: '#fff', fontFamily: F.displayB, letterSpacing: 2 },

  sectionHead: { color: '#fff', fontFamily: F.display, fontSize: 17, letterSpacing: 2 },
  footer: { textAlign: 'center', color: C.faint, fontFamily: F.uiB, fontSize: 11, letterSpacing: 1.5, marginTop: 8 },
});
