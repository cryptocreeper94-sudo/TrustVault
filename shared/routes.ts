import { z } from 'zod';
import { insertVideoSchema, videos } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  videos: {
    list: {
      method: 'GET' as const,
      path: '/api/videos' as const,
      responses: {
        200: z.array(z.custom<typeof videos.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/videos/:id' as const,
      responses: {
        200: z.custom<typeof videos.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/videos' as const,
      input: insertVideoSchema,
      responses: {
        201: z.custom<typeof videos.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/videos/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    toggleFavorite: {
      method: 'PATCH' as const,
      path: '/api/videos/:id/favorite' as const,
      input: z.object({ isFavorite: z.boolean() }),
      responses: {
        200: z.custom<typeof videos.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    }
  },
  // Upload routes are handled by object storage integration but we can document them or add wrappers if needed.
  // The object storage blueprint provides /api/uploads/request-url. 
  // We'll use a wrapper route 'create' above to save metadata AFTER upload or separate flow.
  // Actually, standard flow: 
  // 1. Frontend requests presigned URL -> Uploads file.
  // 2. Frontend calls POST /api/videos with the objectPath and metadata to save the record in DB.
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type VideoInput = z.infer<typeof api.videos.create.input>;
export type VideoResponse = z.infer<typeof api.videos.create.responses[201]>;
