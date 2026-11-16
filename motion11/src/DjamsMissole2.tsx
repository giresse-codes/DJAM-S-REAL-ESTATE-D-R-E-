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
import shots from '../shots.json';

export const FPS = 30;
// Voix off : 78,68 s (ffprobe) → 2361 images à 30 i/s
export const VOICE_SECONDS = 78.68;
export const DURATION_FRAMES = Math.ceil(VOICE_SECONDS * FPS);

/* ---------- charte (identique à la pub Yassa) ---------- */
const GOLD = '#d4b483';
const BEIGE = '#efe4cf';
const INK = 'rgba(14,13,12,0.92)';
const SERIF = 'PlayfairDisplay, serif';
const SANS = 'Montserrat, sans-serif';

const s = (sec: number) => Math.round(sec * FPS);
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const prog = (f: number, a: number, b: number, e = ease) =>
	interpolate(f, [s(a), s(b)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});
const inOut = (f: number, a: number, b: number, dIn = 0.6, dOut = 0.45) => {
	const i = prog(f, a, a + dIn);
	const o = prog(f, b - dOut, b, Easing.in(Easing.cubic));
	return {i, o, v: i * (1 - o)};
};

/* ---------- timings des phrases (silencedetect + alignement du texte) ---------- */
const T = {
	p1: [0.29, 4.08],
	p2: [4.95, 11.37], facade: 8.27,
	p3: [12.35, 21.57], k: [14.1, 16.03, 19.2],
	p4: [22.83, 30.46], goudron: 22.83, m300: 24.55, dossier: 26.89, nonMorc: 28.32, transac: 29.55,
	p5: [31.57, 44.55], c: [32.75, 34.92, 36.55, 38.67, 40.29, 43.3],
	p6: [45.62, 47.84],
	p7: [48.91, 55.9],
	p8: [56.63, 60.62],
	p9: [62.05, 73.56],
	p11: [74.64, 78.68], slogan: 76.15,
};

/* ---------- polices ---------- */
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
			FONTS.map(([fam, file, w]) => new FontFace(fam, `url(${staticFile(file)})`, {weight: w}).load().then((l) => document.fonts.add(l))),
		).then(() => continueRender(handle));
	}, [handle]);
};

/* ---------- éléments communs ---------- */
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

type IconName = 'pin' | 'phone' | 'check' | 'cross' | 'building' | 'briefcase' | 'truck' | 'factory' | 'store' | 'crane' | 'eye' | 'road' | 'area';
const Icon: React.FC<{name: IconName; size?: number; color?: string}> = ({name, size = 44, color = GOLD}) => {
	const p = {fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
	const paths: Record<IconName, React.ReactNode> = {
		pin: (
			<>
				<path {...p} d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
				<circle {...p} cx="12" cy="10" r="2.4" />
			</>
		),
		phone: <path {...p} d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.58 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z" />,
		check: <path {...p} strokeWidth={2.4} d="M5 12.5l4.2 4.2L19 7" />,
		cross: <path {...p} strokeWidth={2.2} d="M7 7l10 10M17 7L7 17" />,
		building: (
			<>
				<rect {...p} x="5" y="3.5" width="14" height="17" rx="1" />
				<path {...p} d="M9 7.5h1.5M13.5 7.5H15M9 11h1.5M13.5 11H15M9 14.5h1.5M13.5 14.5H15M10.5 20.5v-3h3v3" />
			</>
		),
		briefcase: (
			<>
				<rect {...p} x="3.5" y="7" width="17" height="12.5" rx="2" />
				<path {...p} d="M9 7V5.5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17" />
			</>
		),
		truck: (
			<>
				<path {...p} d="M3 6.5h11v9H3zM14 9.5h3.5l3 3v3H14" />
				<circle {...p} cx="7" cy="17.5" r="1.8" />
				<circle {...p} cx="17" cy="17.5" r="1.8" />
			</>
		),
		factory: (
			<>
				<path {...p} d="M3 20.5V10l5 3V10l5 3V10l5 3v7.5z" />
				<path {...p} d="M18 13V4.5h2.5V20.5" />
			</>
		),
		store: (
			<>
				<path {...p} d="M4 9.5l1.5-5h13L20 9.5M4 9.5h16M4 9.5v11h16v-11" />
				<path {...p} d="M10 20.5v-5h4v5" />
			</>
		),
		crane: (
			<>
				<path {...p} d="M7 20.5V4l-3 3M7 4h13M7 4l4 4M17 4v5" />
				<rect {...p} x="15.5" y="9" width="3" height="3" />
				<path {...p} d="M4 20.5h7" />
			</>
		),
		eye: (
			<>
				<path {...p} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
				<circle {...p} cx="12" cy="12" r="3" />
			</>
		),
		road: (
			<>
				<path {...p} d="M8 3L4 21M16 3l4 18" />
				<path {...p} d="M12 4v3M12 10.5v3M12 17v3" />
			</>
		),
		area: (
			<>
				<path {...p} d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
			</>
		),
	};
	return (
		<svg width={size} height={size} viewBox="0 0 24 24">
			{paths[name]}
		</svg>
	);
};

/* ---------- vidéo du terrain : la star ---------- */
const XFADE = 0.45;
const Footage: React.FC = () => {
	const f = useCurrentFrame();
	const endBlur = prog(f, T.p11[0] - 0.4, T.p11[0] + 0.8);
	return (
		<AbsoluteFill style={{backgroundColor: '#0d0c0b'}}>
			{(shots as [string, number, number, number, number][]).map(([file, a, b, , srcDur], k) => {
				const from = s(a) - (k ? s(XFADE / 2) : 0);
				const dur = s(b) - from + s(XFADE / 2);
				const rate = Math.min(1, srcDur / (dur / FPS)); // ralenti doux si le plan est un peu court
				const local = f - from;
				const op = k === 0 ? 1 : interpolate(local, [0, s(XFADE)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				const kb = interpolate(local, [0, dur], [1.02, 1.1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				const dx = interpolate(local, [0, dur], [0, k % 2 ? -16 : 16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				return (
					<Sequence key={file} from={from} durationInFrames={dur} layout="none">
						<AbsoluteFill style={{opacity: op}}>
							<OffthreadVideo
								src={staticFile(file)}
								muted
								playbackRate={rate}
								style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${kb}) translateX(${dx}px)`}}
							/>
						</AbsoluteFill>
					</Sequence>
				);
			})}
			<AbsoluteFill style={{backdropFilter: `blur(${endBlur * 16}px)`, background: `rgba(10,9,8,${endBlur * 0.55})`}} />
			<AbsoluteFill
				style={{background: 'linear-gradient(180deg, rgba(8,7,6,0.55) 0%, rgba(8,7,6,0) 24%, rgba(8,7,6,0) 64%, rgba(8,7,6,0.6) 100%)'}}
			/>
		</AbsoluteFill>
	);
};

const TOP = 150;
const BOTTOM = 1380;
const shadow = '0 4px 30px rgba(0,0,0,.45)';

/* 1 — titre */
const Scene1: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p1[0], T.p2[0] - 0.1, 0.9, 0.5);
	const sub = prog(f, 1.6, 2.4);
	const pin = prog(f, 1.7, 2.5, Easing.out(Easing.back(1.3)));
	const hover = Math.sin((f / FPS) * 2.4) * 4;
	return (
		<div style={{position: 'absolute', top: TOP, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 30}px)`}}>
			<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 26, letterSpacing: 10, color: BEIGE, marginBottom: 18}}>DJAM'S REAL ESTATE PRÉSENTE</div>
			<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 80, color: '#fff', letterSpacing: 2, lineHeight: 1.06, textShadow: shadow}}>
				OPPORTUNITÉ FONCIÈRE
				<br />
				<span style={{color: BEIGE}}>STRATÉGIQUE</span>
			</div>
			<div style={{display: 'flex', justifyContent: 'center', margin: '22px 0'}}>
				<div style={{transform: `scaleX(${sub})`}}>
					<GoldRule w={440} />
				</div>
			</div>
			<div style={{display: 'inline-flex', alignItems: 'center', gap: 14, opacity: sub, transform: `translateY(${(1 - sub) * 16}px)`}}>
				<div style={{transform: `translateY(${(1 - pin) * -40 + hover}px) scale(${0.6 + 0.4 * pin})`, opacity: pin}}>
					<Icon name="pin" size={54} />
				</div>
				<span style={{fontFamily: SANS, fontWeight: 800, fontSize: 44, letterSpacing: 8, color: '#fff'}}>MISSOLE 2 – DIBAMBA</span>
			</div>
		</div>
	);
};

/* 2 — 14 hectares + façade */
const Scene2: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p2[0], T.p3[0] - 0.1, 0.7, 0.45);
	const n = Math.round(14 * prog(f, T.p2[0] + 0.2, T.p2[0] + 1.8, Easing.out(Easing.cubic)));
	const line = prog(f, T.facade, T.facade + 1.8, Easing.inOut(Easing.cubic));
	const lab = prog(f, T.facade + 0.9, T.facade + 1.6);
	return (
		<>
			<div style={{position: 'absolute', top: TOP + 10, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 30}px)`}}>
				<div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 230, color: '#fff', lineHeight: 0.95, textShadow: shadow, fontVariantNumeric: 'tabular-nums'}}>{n}</div>
				<div style={{fontFamily: SANS, fontWeight: 800, fontSize: 56, letterSpacing: 18, color: GOLD, marginTop: 30, textShadow: '0 2px 14px rgba(0,0,0,.6)'}}>HECTARES</div>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: '#fff', marginTop: 18, textShadow: '0 2px 12px rgba(0,0,0,.7)'}}>En vente · directement à partir du goudron</div>
			</div>
			{/* ligne de façade d'un bord à l'autre */}
			<div style={{position: 'absolute', top: 1500, left: 0, right: 0, opacity: t.v}}>
				<div style={{position: 'relative', height: 40}}>
					<div style={{position: 'absolute', left: 0, top: 18, height: 4, width: `${line * 100}%`, background: `linear-gradient(90deg, ${GOLD}, #fff 50%, ${GOLD})`, boxShadow: '0 0 18px rgba(212,180,131,.8)'}} />
					<div style={{position: 'absolute', left: 0, top: 6, width: 4, height: 28, background: GOLD, opacity: line > 0 ? 1 : 0}} />
					<div style={{position: 'absolute', right: 0, top: 6, width: 4, height: 28, background: GOLD, opacity: line >= 0.99 ? 1 : 0}} />
				</div>
				<div style={{display: 'flex', justifyContent: 'center', marginTop: 26, opacity: lab, transform: `translateY(${(1 - lab) * 16}px)`}}>
					<Glass style={{padding: '18px 36px', borderRadius: 999}}>
						<span style={{fontFamily: SANS, fontWeight: 600, fontSize: 36}}>
							≈ <b style={{color: GOLD, fontWeight: 800}}>300 m</b> de façade sur la Nationale
						</span>
					</Glass>
				</div>
			</div>
		</>
	);
};

/* 3 — mots-clés */
const Scene3: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p3[0], T.p4[0] - 0.15, 0.7, 0.45);
	const words: [IconName, string][] = [
		['eye', 'Visibilité exceptionnelle'],
		['road', 'Accès direct'],
		['area', 'Grande superficie'],
	];
	return (
		<>
			<div style={{position: 'absolute', top: TOP + 20, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 30}px)`}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: 12, color: BEIGE}}>UN EMPLACEMENT</div>
				<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 92, color: '#fff', textShadow: shadow}}>stratégique</div>
				<div style={{display: 'flex', justifyContent: 'center', marginTop: 8}}>
					<GoldRule w={320} />
				</div>
			</div>
			{words.map(([ic, w], k) => {
				const a = inOut(f, T.k[k], T.p4[0] - 0.15, 0.6, 0.45);
				return (
					<div key={w} style={{position: 'absolute', top: 1300 + k * 140, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: a.v, transform: `translateY(${(1 - a.i) * 30}px)`}}>
						<Glass style={{padding: '20px 40px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 18}}>
							<Icon name={ic} size={44} />
							<span style={{fontFamily: SANS, fontWeight: 600, fontSize: 38}}>{w}</span>
						</Glass>
					</div>
				);
			})}
		</>
	);
};

/* 4 — checklist */
const Scene4: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p4[0] - 0.2, T.p5[0] - 0.1, 0.7, 0.45);
	const rows: [string, number, boolean][] = [
		['Espace commençant au goudron', T.goudron, true],
		['300 m de façade sur la Nationale', T.m300, true],
		['Dossier foncier à jour', T.dossier, true],
		['Transaction sécurisée', T.transac, true],
		['Non morcelable, vendu d\'un seul tenant', T.nonMorc, false],
	];
	return (
		<div style={{position: 'absolute', top: 1180, left: 60, right: 60, opacity: t.v, transform: `translateY(${(1 - t.i) * 40}px)`}}>
			<Glass style={{padding: '30px 36px'}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: 8, color: BEIGE, marginBottom: 12}}>LE TERRAIN EN BREF</div>
				{rows.map(([txt, at, ok]) => {
					const q = prog(f, at, at + 0.5);
					const mark = prog(f, at + 0.05, at + 0.45, Easing.out(Easing.back(1.2)));
					return (
						<div key={txt} style={{display: 'flex', alignItems: 'center', gap: 20, padding: '10px 0', opacity: 0.35 + 0.65 * q}}>
							<div
								style={{
									width: 50,
									height: 50,
									borderRadius: 25,
									border: `2px solid ${ok ? GOLD : 'rgba(200,200,200,.7)'}`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									background: ok && q > 0 ? 'rgba(212,180,131,.12)' : 'transparent',
								}}
							>
								<div style={{transform: `scale(${mark})`, opacity: mark}}>
									<Icon name={ok ? 'check' : 'cross'} size={32} color={ok ? GOLD : '#c9c9c9'} />
								</div>
							</div>
							<span style={{fontFamily: SANS, fontWeight: 600, fontSize: 34, color: ok ? '#fff' : '#d0d0d0'}}>{txt}</span>
						</div>
					);
				})}
			</Glass>
		</div>
	);
};

/* 5 — grille d'usages */
const Scene5: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p5[0], T.p6[0] - 0.1, 0.7, 0.45);
	const items: [IconName, string][] = [
		['building', 'Projets commerciaux'],
		['briefcase', "Implantation d'entreprises"],
		['truck', 'Logistique & entrepôts'],
		['factory', 'Activités industrielles'],
		['store', 'Grandes enseignes'],
		['crane', 'Infrastructures privées'],
	];
	return (
		<>
			<div style={{position: 'absolute', top: TOP + 20, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 30}px)`}}>
				<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 96, color: '#fff', textShadow: shadow}}>Idéal pour</div>
				<div style={{display: 'flex', justifyContent: 'center', marginTop: 10}}>
					<GoldRule w={300} />
				</div>
			</div>
			<div style={{position: 'absolute', top: 1270, left: 50, right: 50, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, opacity: t.v}}>
				{items.map(([ic, txt], k) => {
					const q = prog(f, T.c[k] - 0.1, T.c[k] + 0.5);
					return (
						<div key={txt} style={{opacity: q, transform: `translateY(${(1 - q) * 24}px)`}}>
							<Glass style={{padding: '18px 22px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 16, height: 104}}>
								<Icon name={ic} size={44} />
								<span style={{fontFamily: SANS, fontWeight: 600, fontSize: 28, lineHeight: 1.15}}>{txt}</span>
							</Glass>
						</div>
					);
				})}
			</div>
		</>
	);
};

/* 6 — prix (moment fort) */
const Scene6: React.FC<{f: number}> = ({f}) => {
	const t = inOut(f, T.p6[0] - 0.15, T.p7[0] - 0.15, 0.8, 0.45);
	const shine = prog(f, T.p6[0] + 0.9, T.p6[0] + 2.2, Easing.inOut(Easing.cubic));
	return (
		<div style={{position: 'absolute', top: 1290, left: 0, right: 0, textAlign: 'center', opacity: t.v, transform: `translateY(${(1 - t.i) * 40}px) scale(${0.96 + 0.04 * t.i})`}}>
			<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: 16, color: BEIGE}}>PRIX</div>
			<div style={{position: 'relative', display: 'inline-block', marginTop: 6}}>
				<span
					style={{
						fontFamily: SERIF,
						fontWeight: 700,
						fontSize: 180,
						lineHeight: 1,
						backgroundImage: `linear-gradient(105deg, #ffffff 0%, #ffffff ${shine * 130 - 30}%, #f3e2bd ${shine * 130 - 15}%, #ffffff ${shine * 130}%, #ffffff 100%)`,
						WebkitBackgroundClip: 'text',
						backgroundClip: 'text',
						color: 'transparent',
						filter: 'drop-shadow(0 6px 26px rgba(0,0,0,.5))',
					}}
				>
					5 000
				</span>
			</div>
			<div style={{fontFamily: SANS, fontWeight: 800, fontSize: 52, letterSpacing: 6, color: GOLD, textShadow: '0 2px 14px rgba(0,0,0,.6)'}}>FCFA / m²</div>
		</div>
	);
};

/* 7 — axe stratégique */
const Scene7: React.FC<{f: number}> = ({f}) => {
	const a = inOut(f, T.p7[0], T.p8[0] - 0.15, 0.8, 0.45);
	const b = inOut(f, T.p7[0] + 2.8, T.p8[0] - 0.15, 0.8, 0.45);
	return (
		<div style={{position: 'absolute', top: TOP + 30, left: 0, right: 0, textAlign: 'center'}}>
			<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 76, color: '#fff', textShadow: shadow, opacity: a.v, transform: `translateY(${(1 - a.i) * 24}px)`}}>UN AXE STRATÉGIQUE</div>
			<div style={{display: 'flex', justifyContent: 'center', margin: '18px 0', opacity: a.v}}>
				<GoldRule w={360} />
			</div>
			<div style={{fontFamily: SERIF, fontWeight: 500, fontSize: 64, color: BEIGE, textShadow: shadow, opacity: b.v, transform: `translateY(${(1 - b.i) * 24}px)`}}>UNE VISION LONG TERME</div>
			<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: '#fff', marginTop: 18, opacity: a.v}}>Grande emprise foncière · 14 ha</div>
		</div>
	);
};

/* 8 — investisseurs sérieux */
const Scene8: React.FC<{f: number}> = ({f}) => {
	const a = inOut(f, T.p8[0] - 0.1, T.p9[0] - 0.15, 0.7, 0.45);
	const b = inOut(f, T.p8[0] + 1.9, T.p9[0] - 0.15, 0.7, 0.45);
	return (
		<div style={{position: 'absolute', top: BOTTOM + 30, left: 0, right: 0, textAlign: 'center'}}>
			<div style={{display: 'inline-block', padding: '16px 40px', border: `2px solid ${GOLD}`, borderRadius: 999, background: 'rgba(16,14,12,0.5)', backdropFilter: 'blur(14px)', opacity: a.v, transform: `translateY(${(1 - a.i) * 24}px)`}}>
				<span style={{fontFamily: SANS, fontWeight: 800, fontSize: 34, letterSpacing: 6, color: '#fff'}}>INVESTISSEURS SÉRIEUX UNIQUEMENT</span>
			</div>
			<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 52, color: '#fff', textShadow: shadow, marginTop: 30, opacity: b.v, transform: `translateY(${(1 - b.i) * 20}px)`}}>
				Contactez-nous pour une visite du site
			</div>
		</div>
	);
};

/* 9-10 — ligne discrète */
const Scene9: React.FC<{f: number}> = ({f}) => {
	const a = inOut(f, T.p9[0], T.p11[0] - 0.2, 0.8, 0.5);
	return (
		<div style={{position: 'absolute', top: 1500, left: 70, right: 70, opacity: a.v, transform: `translateY(${(1 - a.i) * 24}px)`}}>
			<Glass style={{padding: '24px 34px', textAlign: 'center'}}>
				<div style={{fontFamily: SANS, fontWeight: 600, fontSize: 33, lineHeight: 1.35}}>
					Acheter ou vendre un bien avec <span style={{color: GOLD}}>titre foncier</span> ?
				</div>
				<div style={{fontFamily: SERIF, fontWeight: 500, fontSize: 36, color: BEIGE, marginTop: 8}}>Accompagnement personnalisé</div>
			</Glass>
		</div>
	);
};

/* 11 — écran de fin */
const EndScene: React.FC<{f: number}> = ({f}) => {
	const a = prog(f, T.p11[0] - 0.2, T.p11[0] + 0.8);
	const logo = prog(f, T.p11[0], T.p11[0] + 1.2);
	const slogan = prog(f, T.slogan - 0.1, T.slogan + 0.9);
	const phone = prog(f, T.slogan + 0.5, T.slogan + 1.3);
	const breathe = 1 + Math.sin((f / FPS) * 1.2) * 0.006;
	return (
		<AbsoluteFill style={{opacity: a}}>
			<div style={{position: 'absolute', top: 430, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: logo, transform: `scale(${(0.94 + 0.06 * logo) * breathe})`}}>
				<img src={staticFile('logo-djams.png')} style={{width: 540}} />
			</div>
			<div style={{position: 'absolute', top: 1000, left: 50, right: 50, textAlign: 'center', opacity: slogan, transform: `translateY(${(1 - slogan) * 24}px)`}}>
				<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 62, color: '#fff', lineHeight: 1.2}}>Bâtir aujourd'hui,</div>
				<div style={{fontFamily: SERIF, fontWeight: 500, fontSize: 58, color: BEIGE, lineHeight: 1.2}}>impacter pour l'éternité</div>
				<div style={{display: 'flex', justifyContent: 'center', marginTop: 24}}>
					<GoldRule w={380} />
				</div>
			</div>
			<div style={{position: 'absolute', top: 1250, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: phone, transform: `translateY(${(1 - phone) * 24}px)`}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 20, padding: '24px 46px', borderRadius: 999, background: `linear-gradient(135deg, #e6cfa3, ${GOLD} 55%, #b8955c)`, boxShadow: '0 18px 50px rgba(0,0,0,.35)'}}>
					<Icon name="phone" size={50} color={INK} />
					<span style={{fontFamily: SANS, fontWeight: 800, fontSize: 52, color: INK, letterSpacing: 1}}>(+237) 690 54 61 11</span>
				</div>
			</div>
		</AbsoluteFill>
	);
};

export const DjamsMissole2: React.FC = () => {
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
			<Scene8 f={f} />
			<Scene9 f={f} />
			<EndScene f={f} />
			<Audio src={staticFile('voix-off-missole2.wav')} />
			<Audio src={staticFile('music.wav')} />
		</AbsoluteFill>
	);
};
