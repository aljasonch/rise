// lib.dom TypeScript 5.9 belum memuat dua API Chromium ini.
interface Screen {
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
  isExtended: boolean;
}

interface Navigator {
  keyboard?: {
    lock(keys: string[]): Promise<void>;
    unlock(): void;
  };
}
