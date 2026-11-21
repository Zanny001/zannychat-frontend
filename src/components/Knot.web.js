import React from 'react';
import Svg, { Circle } from 'react-native-svg';

const VIEW_BOX = 180;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VISIBLE_LENGTH = CIRCUMFERENCE * 0.66;

// Web keeps the brand mark visually identical without mounting Reanimated's
// animated SVG host component, which is not needed for the static chat header.
export default function Knot({ size = 96, signalColor, threadColor, strokeWidth = 10 }) {
  const dashOffset = CIRCUMFERENCE - VISIBLE_LENGTH;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
      <Circle
        cx={78}
        cy={90}
        r={RADIUS}
        stroke={signalColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        rotation={-35}
        origin="78, 90"
      />
      <Circle
        cx={102}
        cy={90}
        r={RADIUS}
        stroke={threadColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        rotation={145}
        origin="102, 90"
      />
    </Svg>
  );
}
