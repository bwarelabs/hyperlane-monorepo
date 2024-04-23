import z from 'zod';

const envScheme = z.object({
  HYP_KEY: z.string().optional(),
  HYP_OWNER_ADDRESS: z.string().optional(),
});

const parsedEnv = envScheme.safeParse(process.env);

export const ENV = parsedEnv.success ? parsedEnv.data : {};
