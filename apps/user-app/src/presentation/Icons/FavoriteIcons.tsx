import Svg, { Path } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function HeartIcon({ color, size = 22, filled = false }: IconProps & { filled?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill={filled ? color : 'none'} />
  </Svg>;
}

export function MinusIcon({ color, size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>;
}
