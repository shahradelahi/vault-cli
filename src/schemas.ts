import { z } from 'zod';

export const ProfileSchema = z.object({
  endpointUrl: z.string(),
  token: z.string()
});
