import React from 'react';
import Svg, { Path } from 'react-native-svg';

const VIEW_BOX = 180;
const RADIUS = 54;
const ARC_END_ANGLE = (Math.PI * 2 * 0.66);
const endX = (centerX) => centerX + RADIUS * Math.cos(ARC_END_ANGLE);
const endY = 90 + RADIUS * Math.sin(ARC_END_ANGLE);

function openRingPath(centerX) {
  return `M ${centerX + RADIUS} 90 A ${RADIUS} ${RADIUS} 0 1 1 ${endX(centerX)} ${endY}`;
}

// Use explicit SVG arc paths on web rather than Circle stroke-dash rendering.
// This preserves the two-colour open-ring mark without relying on SVG dash
// offset behavior in the browser renderer.
export default function Knot({ size = 96, signalColor, threadColor, strokeWidth = 10 }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
      <Path
        d={openRingPath(78)}
        stroke={signalColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        rotation={-35}
        origin="78, 90"
      />
      <Path
        d={openRingPath(102)}
        stroke={threadColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        rotation={145}
        origin="102, 90"
      />
    </Svg>
  );
}
