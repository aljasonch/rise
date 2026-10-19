export type Identity = {
  name: string;
  email: string;
  position: string;
  verificationCode: string;
};

export type IdentityErrors = Partial<Record<keyof Identity, string>>;

// Kode statis sementara untuk verifikasi peserta.
export const VERIFICATION_CODE = "ABC123";

export const emptyIdentity: Identity = {
  name: "",
  email: "",
  position: "",
  verificationCode: "",
};

export const normalizeIdentity = (identity: Identity): Identity => ({
  name: identity.name.trim(),
  email: identity.email.trim().toLowerCase(),
  position: identity.position.trim(),
  verificationCode: identity.verificationCode.replace(/\s+/g, "").toUpperCase(),
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateIdentity = (identity: Identity): IdentityErrors => {
  const value = normalizeIdentity(identity);
  const errors: IdentityErrors = {};

  if (value.name.length < 2) {
    errors.name = "Nama minimal 2 karakter.";
  } else if (value.name.length > 80) {
    errors.name = "Nama maksimal 80 karakter.";
  }

  if (!value.email) {
    errors.email = "Email wajib diisi.";
  } else if (value.email.length > 120) {
    errors.email = "Email maksimal 120 karakter.";
  } else if (!emailPattern.test(value.email)) {
    errors.email = "Format email belum benar.";
  }

  if (value.position.length < 2) {
    errors.position = "Posisi minimal 2 karakter.";
  } else if (value.position.length > 80) {
    errors.position = "Posisi maksimal 80 karakter.";
  }

  if (!value.verificationCode) {
    errors.verificationCode = "Kode verifikasi wajib diisi.";
  } else if (value.verificationCode !== VERIFICATION_CODE) {
    errors.verificationCode = "Kode verifikasi tidak sesuai.";
  }

  return errors;
};

export const identityIsComplete = (identity: Identity) =>
  Object.keys(validateIdentity(identity)).length === 0;
