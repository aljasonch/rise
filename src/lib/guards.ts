// Predikat device yang murni (tanpa DOM) supaya bisa diperiksa scripts/check-data.ts.
export const virtualCameras = [
  "obs", "virtual", "manycam", "snap", "splitcam", "xsplit", "droidcam", "iriun", "camtwist", "youcam",
];

export const isVirtualCamera = (label: string) =>
  virtualCameras.some((keyword) => label.toLowerCase().includes(keyword));

// Ponsel/tablet tidak boleh lolos hanya karena memakai Chrome Android.
export const isMobileDevice = (ua: string, uaDataMobile = false, touchOnly = false) =>
  uaDataMobile || touchOnly || /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
