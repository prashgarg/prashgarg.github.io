// Keep the same physical screen while making its entire interface 25%
// larger than the original 1280 × 800 desktop, including nested pages.
// Width × scale and height × scale preserve the monitor's 3D dimensions.
export const MONITOR_VIEWPORT = {
  width: 1024,
  height: 640,
  scale: 0.0245,
} as const;
