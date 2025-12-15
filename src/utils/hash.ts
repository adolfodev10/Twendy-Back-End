import bcrypt from "bcryptjs";

export const hashPassword = (password: string) =>
  bcrypt.hash(password, 8);

export const comparePassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);
