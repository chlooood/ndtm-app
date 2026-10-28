import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Line icons drawn as SVG so they render the same on iOS, Android and web.

type IconProps = { size?: number; color: string };

export function CameraIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size * (22 / 26)} viewBox="0 0 26 22" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
      <Path d="M2 7.5c0-1.4 1-2.5 2.4-2.5h3.1l1.7-2.6h7.6L18.5 5h3.1C23 5 24 6.1 24 7.5v10.1c0 1.4-1 2.4-2.4 2.4H4.4C3 20 2 19 2 17.6z" />
      <Circle cx={13} cy={12.2} r={4.3} />
      <Path d="M5 8.6h2.4" strokeLinecap="round" />
    </Svg>
  );
}

export function FriendsIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size * (22 / 28)} viewBox="0 0 28 22" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx={10} cy={7.5} r={4} />
      <Path d="M2.5 20c.6-4 3.7-6.4 7.5-6.4s6.9 2.4 7.5 6.4" />
      <Circle cx={19.5} cy={6.5} r={3.2} />
      <Path d="M19 12.6c3.4 0 5.8 2.2 6.4 5.6" />
    </Svg>
  );
}

export function PhotosIcon({ size = 34, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 34 34" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
      <Rect x={8} y={5} width={22} height={18} rx={3} />
      <Path d="M4 10v15a3 3 0 0 0 3 3h19" strokeLinecap="round" />
      <Path d="m10 20 5.5-6 4 4 3-3 5.5 5" />
      <Circle cx={23} cy={10.5} r={2} />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth={2}>
      <Circle cx={8} cy={8} r={6} />
      <Path d="m12.5 12.5 4 4" strokeLinecap="round" />
    </Svg>
  );
}
