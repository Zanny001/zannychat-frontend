import React from 'react';
import Svg, { Path } from 'react-native-svg';

const VIEW_BOX = 180;
const RADIUS = 54;
const ARC_END_ANGLE = Math.PI * 2 * 0.66;
const endX = (centerX) => centerX + RADIUS * Math.cos(ARC_END_ANGLE);
const endY = 90 + RADIUS * Math.sin(ARC_END_ANGLE);

function rotatePoint(x, y, centerX, centerY, degrees) {
  const radians = (degrees * Math.PI) / 180;
  const dx = x - centerX;
  const dy = y - centerY;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  };
}

function openRingPath(centerX, rotationDegrees) {
  // Bake the rotation into the path coordinates. Avoid SVG transform/origin
  // props here: react-native-svg's web renderer has had runtime issues with
  // transform extraction on Path elements.
  const start = rotatePoint(centerX + RADIUS, 90, centerX, 90, rotationDegrees);
  const end = rotatePoint(endX(centerX), endY, centerX, 90, rotationDegrees);

  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${RADIUS} ${RADIUS} 0 1 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

// Static web implementation: no Reanimated animated components or SVG
// transform props are used, keeping the wordmark safe in browser rendering.
export default function Knot({ size = 96, signalColor, threadColor, strokeWidth = 10 }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
      <Path
        d={openRingPath(78, -35)}
        stroke={signalColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={openRingPath(102, 145)}
        stroke={threadColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
