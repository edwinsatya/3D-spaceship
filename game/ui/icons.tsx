import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PauseIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </Icon>
);

export const PlayIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
  </Icon>
);

export const SoundOnIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </Icon>
);

export const SoundOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M17 9l5 6M22 9l-5 6" />
  </Icon>
);

export const CameraIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const RestartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6" />
    <path d="M4 4v4.5h4.5" />
  </Icon>
);

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v10h12V10" />
  </Icon>
);

export const BoltIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" />
  </Icon>
);

export const RocketIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2c3 2.5 4.5 6 4.5 10.5L14 16h-4l-2.5-3.5C7.5 8 9 4.5 12 2z" />
    <circle cx="12" cy="9" r="1.6" />
    <path d="M10 16l-1 5 3-2 3 2-1-5M7.5 12.5L4 15l1 3 3.5-2M16.5 12.5L20 15l-1 3-3.5-2" />
  </Icon>
);

export const OrbitIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)" />
  </Icon>
);

export const LandIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v11m-4-4 4 4 4-4" />
    <path d="M4 20h16" />
  </Icon>
);

export const TakeOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 16V5m-4 4 4-4 4 4" />
    <path d="M4 20h16" />
  </Icon>
);

export const PhotoIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const GalleryIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.5" />
    <path d="m4 17 5-5 4 4 3-3 4 4" />
  </Icon>
);

export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const CargoIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 8l9-4 9 4v8l-9 4-9-4z" />
    <path d="M3 8l9 4 9-4M12 12v8" />
  </Icon>
);

export const TrophyIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
    <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4" />
  </Icon>
);

export const FlagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 21V4" />
    <path d="M6 4h11l-2.5 4L17 12H6" />
  </Icon>
);

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
);

export const HangarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 20V9l9-5 9 5v11" />
    <path d="M7 20v-6h10v6" />
    <path d="M12 10l3 2.5-3 1-3-1z" fill="currentColor" />
  </Icon>
);

export const BookIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
    <circle cx="12" cy="10" r="2.6" />
  </Icon>
);

export const MapIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="9.5" ry="4.5" />
    <circle cx="19" cy="9.6" r="1.4" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="5.5" ry="2.6" strokeOpacity="0.6" />
  </Icon>
);

export const StarIcon = ({ filled = true, ...props }: IconProps & { filled?: boolean }) => (
  <Icon {...props} strokeWidth={1.6}>
    <path
      d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
      fill={filled ? "currentColor" : "none"}
    />
  </Icon>
);

export const ArrowIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 12h14M13 6l6 6-6 6" />
  </Icon>
);
