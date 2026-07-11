// Minimal line icons (stroke follows currentColor) used in the nav and actions.
interface P { size?: number; }
const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const IconPlayers = ({ size = 22 }: P) => (
  <svg {...base(size)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 4.5a3 3 0 0 1 0 6M18.5 20c0-2.4-1-4.2-2.7-5.2" /></svg>
);
export const IconStaff = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M9 4h6v3H9zM7 7h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" /><path d="M9 12h6M9 15.5h4" /></svg>
);
export const IconParents = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M12 20.5s-6.5-4.2-8.4-8.2C2.2 9.6 3.6 6.5 6.6 6.5c1.8 0 2.9 1 3.4 2 .5-1 1.6-2 3.4-2 3 0 4.4 3.1 3 5.8-1.9 4-8.4 8.2-8.4 8.2z" /></svg>
);
export const IconAdmin = ({ size = 22 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.2-1.3L14 2h-4l-.4 2.2a7 7 0 0 0-2.2 1.3l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.2 1.3L10 22h4l.4-2.2a7 7 0 0 0 2.2-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z" /></svg>
);
export const IconShare = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.7l7.6-4.4M8.2 13.3l7.6 4.4" /></svg>
);
export const IconKey = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M17 6l2 2M14 9l2 2" /></svg>
);
export const IconGlobe = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" /></svg>
);
export const IconLogout = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 12H3m0 0 3-3m-3 3 3 3" /></svg>
);
export const IconEdit = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" /><path d="M13.5 6.5l3 3" /></svg>
);
export const IconEye = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconPlus = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);
