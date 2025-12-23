// hash.ts
import * as bcrypt from "bcrypt";

export const hashPassword = (password: string) =>
  bcrypt.hash(password, 8);

export const comparePassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);