import Svg, { Path, Circle } from 'react-native-svg';
export function ReviewIcon({ color, size = 20 }: { color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"
      stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
  </Svg>;
}
export function ShareIcon({ color, size = 20 }: { color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Circle cx={6} cy={12} r={3} stroke={color} strokeWidth={1.7} />
    <Circle cx={18} cy={5} r={3} stroke={color} strokeWidth={1.7} />
    <Circle cx={18} cy={19} r={3} stroke={color} strokeWidth={1.7} />
  </Svg>;
}
