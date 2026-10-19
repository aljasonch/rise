export type Identity = {
  name: string;
  email: string;
  position: string;
};

export type IdentityErrors = Partial<Record<keyof Identity, string>>;

export const emptyIdentity: Identity = { name: "", email: "", position: "" };

export const normalizeIdentity = (identity: Identity): Identity => ({
  name: identity.name.trim(),
  email: identity.email.trim().toLowerCase(),
  position: identity.position.trim(),
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

  return errors;
};

export const identityIsComplete = (identity: Identity) =>
  Object.keys(validateIdentity(identity)).length === 0;
