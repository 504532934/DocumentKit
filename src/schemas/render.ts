import { z } from 'zod';

const sourceFields = {
  url: z.string().url().max(8_192).optional(),
  html: z
    .string()
    .max(2 * 1024 * 1024)
    .optional(),
};

const sourceRefinement = (value: {
  url?: string | undefined;
  html?: string | undefined;
}): boolean => Number(value.url !== undefined) + Number(value.html !== undefined) === 1;

const pageSchema = z
  .object({
    waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).default('load'),
    timeoutMs: z.number().int().min(1_000).max(120_000).optional(),
    delayMs: z.number().int().min(0).max(5_000).default(0),
    viewport: z
      .object({
        width: z.number().int().min(320).max(4_096),
        height: z.number().int().min(200).max(4_096),
        deviceScaleFactor: z.number().min(0.5).max(3).default(1),
      })
      .default({ width: 1440, height: 900, deviceScaleFactor: 1 }),
    colorScheme: z.enum(['light', 'dark', 'no-preference']).default('light'),
    reducedMotion: z.enum(['reduce', 'no-preference']).default('reduce'),
    locale: z.string().max(64).default('en-US'),
    userAgent: z.string().max(512).optional(),
    extraHeaders: z.record(z.string().max(128), z.string().max(4_096)).optional(),
    css: z.string().max(100_000).optional(),
  })
  .prefault({});

const baseSchema = z.object({ ...sourceFields, page: pageSchema }).strict();

export const pdfRequestSchema = baseSchema
  .extend({
    pdf: z
      .object({
        format: z
          .enum(['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'])
          .default('A4'),
        landscape: z.boolean().default(false),
        printBackground: z.boolean().default(true),
        preferCSSPageSize: z.boolean().default(false),
        displayHeaderFooter: z.boolean().default(false),
        headerTemplate: z.string().max(100_000).default(''),
        footerTemplate: z.string().max(100_000).default(''),
        margin: z
          .object({
            top: z.string().max(32).optional(),
            right: z.string().max(32).optional(),
            bottom: z.string().max(32).optional(),
            left: z.string().max(32).optional(),
          })
          .default({}),
        tagged: z.boolean().default(true),
        outline: z.boolean().default(false),
      })
      .prefault({}),
  })
  .refine(sourceRefinement, { message: 'Exactly one of url or html must be provided.' });

export const screenshotRequestSchema = baseSchema
  .extend({
    screenshot: z
      .object({
        type: z.enum(['png', 'jpeg', 'webp']).default('png'),
        quality: z.number().int().min(1).max(100).optional(),
        fullPage: z.boolean().default(false),
        omitBackground: z.boolean().default(false),
        scale: z.enum(['css', 'device']).default('css'),
      })
      .prefault({}),
  })
  .refine(sourceRefinement, { message: 'Exactly one of url or html must be provided.' })
  .superRefine((value, context) => {
    if (value.screenshot.type === 'png' && value.screenshot.quality !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['screenshot', 'quality'],
        message: 'quality is only supported for JPEG and WebP.',
      });
    }
  });

export type PdfRequest = z.infer<typeof pdfRequestSchema>;
export type ScreenshotRequest = z.infer<typeof screenshotRequestSchema>;

export interface RenderResult {
  data: Buffer;
  contentType: string;
  extension: string;
}
