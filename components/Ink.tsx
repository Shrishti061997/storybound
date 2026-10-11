// Hand-drawn ink marks. Strokes are slightly irregular on purpose, ~1.5px, in the ink color.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 22, children, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="ink" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export function InkUnderline() {
  return (
    <svg className="ink ink-underline" viewBox="0 0 210 12" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d="M2 7.5c18-4.2 37-4.6 56-2.1 21 2.7 39 3.9 61 .8 24-3.4 49-3.1 73-.4 6 .7 11 1.6 16 2.9" />
    </svg>
  );
}

export function InkDivider() {
  return (
    <svg className="ink ink-divider" viewBox="0 0 400 10" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 5.2c40-2.6 71 2.2 118 .4 52-2 88 2.6 141 .6 49-1.9 92-.2 137-1.4" />
    </svg>
  );
}

export function BookMark({ size = 22 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M12 6.4c-2.3-1.7-5-2.2-8.2-1.6v12.6c3.1-.6 5.8 0 8.2 1.7" />
      <path d="M12 6.4c2.4-1.8 5.1-2.3 8.3-1.5v12.5c-3.2-.7-5.9-.1-8.3 1.7" />
      <path d="M12 6.6v12.3" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 7.6c2.6-.1 4.5 1.8 4.4 4.4-.1 2.5-1.9 4.3-4.5 4.3-2.5 0-4.3-1.8-4.3-4.4 0-2.4 1.9-4.2 4.400-4.300z" />
      <path d="M12 2.6v2.200M12.200 19.300v2.100M2.700 12.100h2.100M19.200 11.900h2.200M5.300 5.400l1.500 1.400M17.300 17.200l1.500 1.500M5.200 18.700l1.600-1.500M17.200 6.900l1.600-1.600" />
    </Icon>
  );
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.800v18.500M4.100 7.300l15.900 9.300M4 16.800l16-9.400" />
      <path d="M9.800 4.600l2.200 2 2.100-2.100M9.900 19.500l2.100-2 2.200 2.100M3.800 10.200l2.800-.9-.7-2.900M17.400 17.700l-.700-2.900 2.900-.8M4 13.900l2.800.8-.8 2.900M17.300 6.400l-.600 2.900 2.800.9" />
    </Icon>
  );
}

export function LampIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.300 3.700h7.300l3.100 8.400H5.400z" />
      <path d="M12 12.200v7.100M8.600 20.600c2.300-.5 4.600-.5 6.900 0" />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21.200c-3.600-4.300-5.700-7.300-5.700-10.300 0-3.300 2.500-5.800 5.700-5.800s5.800 2.500 5.800 5.800c0 3-2.200 6-5.800 10.300z" />
      <path d="M12 8.900c1.200 0 2.100.9 2.100 2.100s-.9 2.100-2.100 2.100-2.100-.9-2.100-2.100.9-2.100 2.100-2.100z" />
    </Icon>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.200 12.200c5-.4 10-.4 15.200-.1M14.300 7.100c1.500 1.900 3.200 3.500 5.300 4.900-2.100 1.300-3.800 3-5.200 5" />
    </Icon>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.700 12.100c-5 .3-10 .300-15.200 0M9.600 7.200c-1.500 1.900-3.200 3.400-5.300 4.800 2.100 1.400 3.800 3 5.200 5.100" />
    </Icon>
  );
}
