import { z } from 'zod';

/**
 * Entrada do mini chat. O `projectId` amarra a conversa a um projeto observável;
 * a posse do projeto é validada na pipeline de ingestão de traces.
 */
export const chatMessageSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  /// Modelo escolhido no seletor do chat. Opcional; valida-se na allowlist.
  model: z.string().min(1).max(200).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
