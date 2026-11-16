import React, {useEffect, useState} from 'react';
import {
	AbsoluteFill,
	Audio,
	Easing,
	OffthreadVideo,
	Sequence,
	continueRender,
	delayRender,
	interpolate,
	staticFile,
	useCurrentFrame,
} from 'remotion';

export const FPS = 30;
// Voix off : 55,48 s (ffprobe) → 1665 images à 30 i/s
export const VOICE_SECONDS = 55.48;
export const DURATION_FRAMES = Math.ceil(VOICE_SECONDS * FPS);

/* ---------- palette & typo ---------- */
const GOLD = '#d4b483';
const BEIGE = '#efe4cf';
const INK = 'rgba(14,13,12,0.92)';
const SERIF = 'PlayfairDisplay, serif';
const SANS = 'Montserrat, sans-serif';

/* ---------- timing helpers (seconds, calés sur silencedetect) ---------- */
const s = (sec: number) => Math.round(sec * FPS);
const ease = Easing.bezier(0.22, 1, 0.36, 1); // ease-out doux

/** progress 0→1 between two times (seconds) */
const prog = (f: number, a: number, b: number, e = ease) =>
	interpolate(f, [s(a), s(b)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});

/** fade/slide in at `a`, out at `b` */
const inOut = (f: number, a: number, b: number, dIn = 0.6, dOut = 0.45) => {
	const i = prog(f, a, a + dIn);
	const o = prog(f, b - dOut, b, Easing.in(Easing.cubic));
	return {i, o, v: i * (1 - o)};
};

/* ---------- phrase timings (voix off) ---------- */
const T = {
	p1: [0.24, 2.46], p2: [3.37, 6.6], p3: [7.56, 15.0], p3loc: 11.2,
	p4: [15.95, 25.8], b1: 17.46, b2: 21.16, b3: 24.27,
	p5: [26.72, 32.35], c: [28.2, 29.1, 30.3, 31.2],
	p6: [33.29, 40.36], newPrice: 34.9, last: 36.85, comm: 38.5,
	p7: [41.43, 42.48], p8: [43.42, 50.59], p9: [51.64, 55.12],
};

/* ---------- footage plan: [file, start(s), end(s)] ---------- */
const SHOTS: [string, number, number][] = [
	['shot1.mp4', 0, 7.0],
	['shot2.mp4', 7.0, 15.4],
	['shot3.mp4', 15.4, 21.4],
	['shot4.mp4', 21.4, 26.3],
	['shot5.mp4', 26.3, 30.3],
	['shot6.mp4', 30.3, 33.0],
	['shot7.mp4', 33.0, 41.0],
	['shot8.mp4', 41.0, 43.4],
	['shot9.mp4', 43.4, VOICE_SECONDS + 0.1],
];
const XFADE = 0.4;

/* ---------- fonts ---------- */
const FONTS: [string, string, string][] = [
	['PlayfairDisplay', 'playfair-display-latin-500-normal.woff2', '500'],
	['PlayfairDisplay', 'playfair-display-latin-600-normal.woff2', '600'],
	['PlayfairDisplay', 'playfair-display-latin-700-normal.woff2', '700'],
	['Montserrat', 'montserrat-latin-400-normal.woff2', '400'],
	['Montserrat', 'montserrat-latin-600-normal.woff2', '600'],
	['Montserrat', 'montserrat-latin-800-normal.woff2', '800'],
];
const useFonts = () => {
	const [handle] = useState(() => delayRender('fonts'));
	useEffect(() => {
		Promise.all(
			FONTS.map(([fam, file, w]) => {
				const ff = new FontFace(fam, `url(${staticFile(file)})`, {weight: w});
				return ff.load().then((l) => document.fonts.add(l));
			}),
		).then(() => continueRender(handle));
	}, [handle]);
};

/* ---------- building blocks ---------- */
const Glass: React.FC<{style?: React.CSSProperties; children: React.ReactNode}> = ({style, children}) => (
	<div
		style={{
			background: 'rgba(16,14,12,0.42)',
			backdropFilter: 'blur(18px) saturate(1.1)',
			WebkitBackdropFilter: 'blur(18px) saturate(1.1)',
			border: '1.5px solid rgba(255,255,255,0.22)',
			borderRadius: 28,
			color: '#fff',
			boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
			...style,
		}}
	>
		{children}
	</div>
);

const GoldRule: React.FC<{w: number}> = ({w}) => (
	<div style={{height: 3, width: w, background: `linear-gradient(90deg, rgba(212,180,131,0), ${GOLD}, rgba(212,180,131,0))`}} />
);

const Icon: React.FC<{name: 'pin' | 'road' | 'grid' | 'chart' | 'calendar' | 'phone'; size?: number; color?: string}> = ({
	name,
	size = 44,
	color = GOLD,
}) => {
	const p = {fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
	return (
		<svg width={size} height={size} viewBox="0 0 24 24">
			{name === 'pin' && (
				<>
					<path {...p} d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
					<circle {...p} cx="12" cy="10" r="2.4" />
				</>
			)}
			{name === 'road' && (
				<>
					<path {...p} d="M8 3L4 21M16 3l4 18" />
					<path {...p} d="M12 4v3M12 10.5v3M12 17v3" />
				</>
			)}
			{name === 'grid' && (
				<>
					<rect {...p} x="3.5" y="3.5" width="17" height="17" rx="1.5" />
					<path {...p} d="M12 3.5v17M3.5 12h17" />
				</>
			)}
			{name === 'chart' && (
				<>
					<path {...p} d="M4 20h16" />
					<path {...p} d="M5 16l4.5-4.5 3.5 3L19 8" />
					<path {...p} d="M15 8h4v4" />
				</>
			)}
			{name === 'calendar' && (
				<>
					<rect {...p} x="3.5" y="5" width="17" height="15" rx="2" />
					<path {...p} d="M3.5 10h17M8 3v4M16 3v4" />
					<path {...p} d="M8.5 14.5l2 2 4-4" />
				</>
			)}
			{name === 'phone' && (
				<path
					{...p}
					d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.58 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z"
				/>
			)}
		</svg>
	);
};

/* ---------- footage (the star) ---------- */
const Footage: React.FC = () => {
	const f = useCurrentFrame();
	const endBlur = prog(f, T.p8[0] - 0.3, T.p8[0] + 0.9);
	return (
		<AbsoluteFill style={{backgroundColor: '#0d0c0b'}}>
			{SHOTS.map(([file, a, b], k) => {
				const from = s(a) - (k ? s(XFADE / 2) : 0);
				const dur = s(b) - from + s(XFADE / 2);
				const local = f - from;
				const op = k === 0 ? 1 : interpolate(local, [0, s(XFADE)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				// Ken Burns : zoom lent + léger glissement, sens alterné
				const kb = interpolate(local, [0, dur], [1.02, 1.1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				const dx = interpolate(local, [0, dur], [0, k % 2 ? -18 : 18], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				return (
					<Sequence key={file} from={from} durationInFrames={dur} layout="none">
						<AbsoluteFill style={{opacity: op}}>
							<OffthreadVideo
								src={staticFile(file)}
								muted
								style={{
									width: '100%',
									height: '100%',
									objectFit: 'cover',
									transform: `scale(${kb}) translateX(${dx}px)`,
								}}
							/>
						</AbsoluteFill>
					</Sequence>
				);
			})}
			{/* écran de fin : vidéo floutée et assombrie */}
			<AbsoluteFill style={{backdropFilter: `blur(${endBlur * 16}px)`, background: `rgba(10,9,8,${endBlur * 0.55})`}} />
			{/* léger dégradé haut/bas pour la lisibilité */}
			<AbsoluteFill
				style={{
					background:
						'linear-gradient(180deg, rgba(8,7,6,0.55) 0%, rgba(8,7,6,0) 24%, rgba(8,7,6,0) 66%, rgba(8,7,6,0.55) 100%)',
				}}
			/>
		</AbsoluteFill>
	);
};

/* ---------- scenes ---------- */
const TOP = 150; // haut de la zone de texte supérieure
const BOTTOM = 1380; // haut de la zone de texte inférieure (au-dessus de l'interface TikTok)

const Scene1: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p1[0], T.p3[0] - 0.1, 0.9, 0.5);
	const sub = prog(f, 0.9, 1.6);
	const pin = prog(f, 1.0, 1.7, Easing.out(Easing.back(1.3)));
	const hover = Math.sin((f / FPS) * 2.4) * 4;
	return (
		<div style={{position: 'absolute', top: TOP, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 30}px)`}}>
			<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 26, letterSpacing: 10, color: BEIGE, marginBottom: 18}}>DJAM'S REAL ESTATE PRÉSENTE</div>
			<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 92, color: '#fff', letterSpacing: 2, lineHeight: 1.05, textShadow: '0 4px 30px rgba(0,0,0,.45)'}}>
				OPPORTUNITÉ
				<br />
				FONCIÈRE
			</div>
			<div style={{display: 'flex', justifyContent: 'center', margin: '22px 0'}}>
				<div style={{transform: `scaleX(${sub})`}}>
					<GoldRule w={420} />
				</div>
			</div>
			<div style={{display: 'inline-flex', alignItems: 'center', gap: 14, opacity: sub, transform: `translateY(${(1 - sub) * 16}px)`}}>
				<div style={{transform: `translateY(${(1 - pin) * -40 + hover}px) scale(${0.6 + 0.4 * pin})`, opacity: pin}}>
					<Icon name="pin" size={54} />
				</div>
				<span style={{fontFamily: SANS, fontWeight: 800, fontSize: 46, letterSpacing: 8, color: '#fff'}}>YASSA – DOUALA</span>
			</div>
		</div>
	);
};

const Scene2: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p2[0], T.p3[0] - 0.1, 0.7, 0.45);
	return (
		<div style={{position: 'absolute', top: BOTTOM, left: 70, right: 70, opacity: t.v, transform: `translateY(${(1 - t.i) * 40}px)`}}>
			<Glass style={{padding: '34px 40px'}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 40, lineHeight: 1.3, textAlign: 'center'}}>
					Vous recherchez un emplacement <span style={{color: GOLD}}>stratégique</span> pour un projet immobilier ou commercial ?
				</div>
			</Glass>
		</div>
	);
};

const Scene3: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p3[0], T.p4[0] - 0.15, 0.7, 0.45);
	const n = Math.round(2000 * prog(f, T.p3[0] + 0.5, T.p3[0] + 2.4, Easing.out(Easing.cubic)));
	const loc = inOut(f, T.p3loc, T.p4[0] - 0.15, 0.7, 0.45);
	return (
		<>
			<div style={{position: 'absolute', top: TOP + 10, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 30}px)`}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: 12, color: BEIGE}}>TERRAIN DE</div>
				<div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 190, color: '#fff', lineHeight: 1.0, textShadow: '0 6px 36px rgba(0,0,0,.45)', fontVariantNumeric: 'tabular-nums'}}>
					{n.toLocaleString('fr-FR').replace(/ | /g, ' ')}
					<span style={{fontSize: 110, color: GOLD}}> m²</span>
				</div>
				<div style={{display: 'flex', justifyContent: 'center', marginTop: 10}}>
					<GoldRule w={360} />
				</div>
			</div>
			<div style={{position: 'absolute', top: BOTTOM, left: 70, right: 70, opacity: loc.v, transform: `translateY(${(1 - loc.i) * 40}px)`}}>
				<Glass style={{padding: '28px 36px', display: 'flex', alignItems: 'center', gap: 26}}>
					<Icon name="pin" size={64} />
					<div style={{fontFamily: SANS, fontSize: 36, lineHeight: 1.35}}>
						<b style={{fontWeight: 800}}>500 m du carrefour Yassa</b>
						<br />
						<span style={{color: BEIGE}}>Derrière l'Université La Perle</span>
					</div>
				</Glass>
			</div>
		</>
	);
};

const Badge: React.FC<{f: number; at: number; end: number; icon: 'road' | 'grid' | 'chart'; text: string; y: number}> = ({f, at, end, icon, text, y}) => {
	const t = inOut(f, at, end, 0.6, 0.45);
	return (
		<div style={{position: 'absolute', top: y, left: 70, right: 70, opacity: t.v, transform: `translateX(${(1 - t.i) * -60}px)`}}>
			<Glass style={{padding: '22px 30px', display: 'flex', alignItems: 'center', gap: 24, borderRadius: 24}}>
				<div style={{width: 72, height: 72, borderRadius: 18, border: `1.5px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
					<Icon name={icon} size={44} />
				</div>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 38}}>{text}</div>
			</Glass>
		</div>
	);
};

const Scene4: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p4[0], T.p5[0] - 0.1, 0.7, 0.45);
	const end = T.p5[0] - 0.1;
	return (
		<>
			<div style={{position: 'absolute', top: TOP + 20, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 30}px)`}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: 12, color: BEIGE}}>LES ATOUTS</div>
				<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 78, color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,.45)'}}>du terrain</div>
			</div>
			<Badge f={f} at={T.b1} end={end} icon="road" text="Double façade 10 m & 20 m" y={1270} />
			<Badge f={f} at={T.b2} end={end} icon="grid" text="Morcelable dès 300 m²" y={1410} />
			<Badge f={f} at={T.b3} end={end} icon="chart" text="Fort potentiel" y={1550} />
		</>
	);
};

const Scene5: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p5[0], T.p6[0] - 0.1, 0.7, 0.45);
	const items = ['Résidence', 'Immeuble commercial', 'Clinique', 'Projet immobilier'];
	// pastilles qui défilent : chaque nouvelle pastille entre par la droite
	const shown = T.c.map((c) => prog(f, c - 0.15, c + 0.55));
	const total = shown.reduce((a, b) => a + b, 0);
	const shift = interpolate(total, [0, 1, 2, 3, 4], [0, 0, 0, -300, -580]);
	return (
		<>
			<div style={{position: 'absolute', top: TOP + 20, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 30}px)`}}>
				<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 96, color: '#fff', textShadow: '0 4px 30px rgba(0,0,0,.45)'}}>Idéal pour</div>
				<div style={{display: 'flex', justifyContent: 'center', marginTop: 12}}>
					<GoldRule w={300} />
				</div>
			</div>
			<div style={{position: 'absolute', top: 1450, left: 0, right: 0, height: 120, overflow: 'hidden', opacity: t.v}}>
				<div style={{display: 'flex', gap: 20, paddingLeft: 70, transform: `translateX(${shift}px)`}}>
					{items.map((it, k) => (
						<div key={it} style={{opacity: shown[k], transform: `translateX(${(1 - shown[k]) * 80}px)`}}>
							<Glass style={{padding: '22px 34px', borderRadius: 999, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 16}}>
								<span style={{width: 12, height: 12, borderRadius: 6, background: GOLD, display: 'inline-block'}} />
								<span style={{fontFamily: SANS, fontWeight: 600, fontSize: 38}}>{it}</span>
							</Glass>
						</div>
					))}
				</div>
			</div>
		</>
	);
};

const Scene6: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p6[0], T.p7[0] - 0.15, 0.7, 0.5);
	const old = prog(f, T.p6[0] + 0.3, T.p6[0] + 0.8);
	const strike = prog(f, T.p6[0] + 0.9, T.p6[0] + 1.35);
	const oldOut = prog(f, T.newPrice - 0.45, T.newPrice);
	const np = prog(f, T.newPrice, T.newPrice + 0.8);
	const last = prog(f, T.last, T.last + 0.6);
	const comm = prog(f, T.comm, T.comm + 0.6);
	return (
		<div style={{position: 'absolute', top: TOP - 10, left: 0, right: 0, textAlign: 'center', opacity: t.v}}>
			<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: 14, color: BEIGE, opacity: t.i}}>PRIX</div>
			<div style={{position: 'relative', height: 236}}>
				{/* ancien prix barré */}
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: 40,
						opacity: old * (1 - oldOut),
						transform: `translateY(${oldOut * -30}px) scale(${1 - oldOut * 0.15})`,
						filter: `blur(${oldOut * 6}px)`,
					}}
				>
					<span style={{position: 'relative', fontFamily: SERIF, fontWeight: 500, fontSize: 96, color: 'rgba(255,255,255,.75)'}}>
						70 000
						<span style={{position: 'absolute', left: -10, right: -10, top: '54%', height: 6, background: '#c8102e', transformOrigin: 'left', transform: `scaleX(${strike}) rotate(-6deg)`}} />
					</span>
				</div>
				{/* nouveau prix */}
				<div style={{position: 'absolute', left: 0, right: 0, top: 0, opacity: np, transform: `translateY(${(1 - np) * 30}px) scale(${0.94 + 0.06 * np})`}}>
					<span style={{fontFamily: SERIF, fontWeight: 700, fontSize: 176, color: '#fff', textShadow: '0 6px 36px rgba(0,0,0,.45)'}}>55 000</span>
				</div>
			</div>
			<div style={{fontFamily: SANS, fontWeight: 800, fontSize: 46, letterSpacing: 4, color: GOLD, opacity: np, marginTop: 4, textShadow: '0 2px 14px rgba(0,0,0,.6)'}}>FCFA / m²</div>
			<div style={{display: 'flex', justifyContent: 'center', marginTop: 22, opacity: last, transform: `translateY(${(1 - last) * 16}px)`}}>
				<div style={{padding: '12px 34px', border: `2px solid ${GOLD}`, borderRadius: 999, background: 'rgba(16,14,12,0.45)', backdropFilter: 'blur(12px)', fontFamily: SANS, fontWeight: 800, fontSize: 32, letterSpacing: 8, color: '#fff'}}>
					DERNIER PRIX
				</div>
			</div>
			<div style={{marginTop: 18, fontFamily: SANS, fontWeight: 600, fontSize: 28, color: BEIGE, opacity: comm, letterSpacing: 1}}>Commission 5 % obligatoire</div>
		</div>
	);
};

const Scene7: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p7[0] - 0.2, T.p8[0] - 0.1, 0.6, 0.4);
	return (
		<div style={{position: 'absolute', top: BOTTOM + 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 40}px)`}}>
			<Glass style={{padding: '26px 44px', display: 'flex', alignItems: 'center', gap: 22, borderRadius: 999}}>
				<Icon name="calendar" size={56} />
				<span style={{fontFamily: SANS, fontWeight: 800, fontSize: 40, letterSpacing: 4}}>VISITES TOUS LES JOURS</span>
			</Glass>
		</div>
	);
};

const EndScene: React.FC<{f: number}> = ({f}) => {
	const a = prog(f, T.p8[0], T.p8[0] + 1.0);
	const line1 = inOut(f, T.p8[0] + 0.1, T.p9[0] - 0.1, 0.8, 0.5);
	const logo = prog(f, T.p8[0] + 0.4, T.p8[0] + 1.6);
	const cta = prog(f, T.p9[0] - 0.1, T.p9[0] + 0.8);
	const phone = prog(f, T.p9[0] + 0.5, T.p9[0] + 1.3);
	const breathe = 1 + Math.sin((f / FPS) * 1.2) * 0.006;
	return (
		<AbsoluteFill style={{opacity: a}}>
			<div style={{position: 'absolute', top: 360, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: logo, transform: `scale(${(0.94 + 0.06 * logo) * breathe})`}}>
				<img src={staticFile('logo-djams.png')} style={{width: 520}} />
			</div>
			<div style={{position: 'absolute', top: 900, left: 60, right: 60, textAlign: 'center', opacity: line1.v, transform: `translateY(${(1 - line1.i) * 24}px)`}}>
				<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 64, color: '#fff', lineHeight: 1.2}}>Ne manquez pas cette opportunité</div>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 32, color: BEIGE, marginTop: 16, letterSpacing: 2}}>Un secteur à fort potentiel</div>
			</div>
			<div style={{position: 'absolute', top: 900, left: 60, right: 60, textAlign: 'center', opacity: cta, transform: `translateY(${(1 - cta) * 24}px)`}}>
				<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 66, color: '#fff', lineHeight: 1.2}}>Contactez-nous pour une visite</div>
				<div style={{display: 'flex', justifyContent: 'center', margin: '26px 0'}}>
					<GoldRule w={380} />
				</div>
			</div>
			<div style={{position: 'absolute', top: 1150, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: phone, transform: `translateY(${(1 - phone) * 24}px)`}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 20, padding: '24px 46px', borderRadius: 999, background: `linear-gradient(135deg, #e6cfa3, ${GOLD} 55%, #b8955c)`, boxShadow: '0 18px 50px rgba(0,0,0,.35)'}}>
					<Icon name="phone" size={50} color={INK} />
					<span style={{fontFamily: SANS, fontWeight: 800, fontSize: 52, color: INK, letterSpacing: 1}}>(+237) 690 54 61 11</span>
				</div>
			</div>
			<div style={{position: 'absolute', top: 1300, left: 0, right: 0, textAlign: 'center', opacity: phone, fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: 6, color: BEIGE}}>
				APPEL · WHATSAPP
			</div>
		</AbsoluteFill>
	);
};

export const DjamsYassa: React.FC = () => {
	useFonts();
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{backgroundColor: '#0d0c0b'}}>
			<Footage />
			<Scene1 f={f} />
			<Scene2 f={f} />
			<Scene3 f={f} />
			<Scene4 f={f} />
			<Scene5 f={f} />
			<Scene6 f={f} />
			<Scene7 f={f} />
			<EndScene f={f} />
			<Audio src={staticFile('voix-off.wav')} />
			<Audio src={staticFile('music.wav')} volume={1} />
		</AbsoluteFill>
	);
};
