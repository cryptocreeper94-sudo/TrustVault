import { z } from 'zod';
import { insertMediaSchema, insertCollectionSchema, mediaItems, collections } from './schema';

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

export const api = {
  media: {
    list: {
      method: 'GET' as const,
      path: '/api/media' as const,
      responses: {
        200: z.array(z.custom<typeof mediaItems.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/media/:id' as const,
      responses: {
        200: z.custom<typeof mediaItems.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/media' as const,
      input: insertMediaSchema,
      responses: {
        201: z.custom<typeof mediaItems.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/media/:id' as const,
      input: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        label: z.string().optional(),
        tags: z.array(z.string()).optional(),
        artist: z.string().optional(),
        venue: z.string().optional(),
        tour: z.string().optional(),
        eventDate: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        durationSeconds: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof mediaItems.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/media/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    toggleFavorite: {
      method: 'PATCH' as const,
      path: '/api/media/:id/favorite' as const,
      input: z.object({ isFavorite: z.boolean() }),
      responses: {
        200: z.custom<typeof mediaItems.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    batchUpdate: {
      method: 'PATCH' as const,
      path: '/api/media/batch' as const,
      input: z.object({
        ids: z.array(z.number()),
        updates: z.object({
          isFavorite: z.boolean().optional(),
          label: z.string().optional(),
          tags: z.array(z.string()).optional(),
        }),
      }),
      responses: {
        200: z.array(z.custom<typeof mediaItems.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    batchDelete: {
      method: 'DELETE' as const,
      path: '/api/media/batch' as const,
      input: z.object({ ids: z.array(z.number()) }),
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  collections: {
    list: {
      method: 'GET' as const,
      path: '/api/collections' as const,
      responses: {
        200: z.array(z.custom<typeof collections.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/collections/:id' as const,
      responses: {
        200: z.custom<typeof collections.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/collections' as const,
      input: insertCollectionSchema,
      responses: {
        201: z.custom<typeof collections.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/collections/:id' as const,
      input: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        coverMediaId: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof collections.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/collections/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    items: {
      method: 'GET' as const,
      path: '/api/collections/:id/items' as const,
      responses: {
        200: z.array(z.custom<typeof mediaItems.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    addItems: {
      method: 'POST' as const,
      path: '/api/collections/:id/items' as const,
      input: z.object({ mediaItemIds: z.array(z.number()) }),
      responses: {
        200: z.object({ added: z.number() }),
        401: errorSchemas.unauthorized,
      },
    },
    removeItems: {
      method: 'DELETE' as const,
      path: '/api/collections/:id/items' as const,
      input: z.object({ mediaItemIds: z.array(z.number()) }),
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      },
    },
  },
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

export type MediaInput = z.infer<typeof api.media.create.input>;
export type MediaResponse = z.infer<typeof api.media.create.responses[201]>;
