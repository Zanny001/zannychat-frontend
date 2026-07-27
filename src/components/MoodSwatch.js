import React from 'react';
import { View, StyleSheet } from 'react-native';

// A plain flat swatch can't show that a mood is really two colors
// (signal for you, thread for them) — so instead of one circle, this
// renders two overlapping ones, same as the relationship they
// represent in a chat bubble.
export default function MoodSwatch({ mood, size = 44 }) {
  const circleSize = size * 0.68;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: mood.signal,
            left: 0,
            top: size * 0.16,
          },
        ]}
      />
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: mood.thread,
            right: 0,
            top: size * 0.16,
            opacity: 0.92,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { position: 'absolute' },
});
