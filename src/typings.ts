import { z } from 'zod';

import { ProfileSchema } from '@/schemas';

export type Profile = z.infer<typeof ProfileSchema>;
