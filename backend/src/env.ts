import { z } from "zod";

const envSchema = z.object({
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("erp"),
  PORT: z.coerce.number().default(3001),
});

export const env = envSchema.parse(process.env);
