import { z } from 'zod';

import { ProfileSchema } from '@/schemas.ts';

export type Profile = z.infer<typeof ProfileSchema>;
