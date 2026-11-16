import React from 'react';
import {Composition} from 'remotion';
import {DjamsMissole2, FPS, DURATION_FRAMES} from './DjamsMissole2';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="DjamsMissole2"
		component={DjamsMissole2}
		durationInFrames={DURATION_FRAMES}
		fps={FPS}
		width={1080}
		height={1920}
	/>
);
