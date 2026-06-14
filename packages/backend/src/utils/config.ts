import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  LLM_PROVIDER: z.enum(['anthropic', 'openai', 'ollama', 'openrouter', 'gemini']).default('anthropic'),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20240620'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),

  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.1'),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4o'),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-pro'),

  MAX_TOKENS: z.coerce.number().default(512),
  CONTEXT_WINDOW: z.coerce.number().default(20),

  REPLY_DELAY_MIN: z.coerce.number().default(2000),
  REPLY_DELAY_MAX: z.coerce.number().default(8000),

  DB_PATH: z.string().default('./data/wa-ai-bot.sqlite'),
  AUTH_DIR: z.string().default('./auth_info_baileys'),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export const config: AppConfig = ConfigSchema.parse(process.env);
