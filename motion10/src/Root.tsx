import React from 'react';
import {Composition} from 'remotion';
import {DjamsYassa, FPS, DURATION_FRAMES} from './DjamsYassa';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="DjamsYassa"
		component={DjamsYassa}
		durationInFrames={DURATION_FRAMES}
		fps={FPS}
		width={1080}
		height={1920}
	/>
);
