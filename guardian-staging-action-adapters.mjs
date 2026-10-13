import { createHash } from 'node:crypto';

function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export function registerGuardianStagingAdapters(executor) {
  if (!executor?.registerAdapter) throw new Error('GuardianIsolatedActionExecutor is required');

  const registered = [];
  registered.push(executor.registerAdapter({
    adapterId: 'staging-artifact',
    capabilities: ['artifact.verify','artifact.prepare'],
    async execute(input) {
      const payload = structuredClone(input || {});
      return {
        staging: true,
        sideEffects: false,
        artifactHash: hash(payload),
        preparedAt: new Date().toISOString(),
        summary: String(payload.description || payload.name || 'artifact').slice(0, 300)
      };
    }
  }));

  registered.push(executor.registerAdapter({
    adapterId: 'staging-notification',
    capabilities: ['notification.preview'],
    async execute(input) {
      return {
        staging: true,
        sideEffects: false,
        wouldSend: {
          channel: String(input?.channel || 'unspecified').slice(0,80),
          recipient: String(input?.recipient || 'unspecified').slice(0,160),
          messageLength: String(input?.message || '').length
        }
      };
    }
  }));

  registered.push(executor.registerAdapter({
    adapterId: 'staging-calendar',
    capabilities: ['calendar.preview-reschedule'],
    async execute(input) {
      return {
        staging: true,
        sideEffects: false,
        proposedChange: {
          eventId: String(input?.eventId || '').slice(0,160),
          from: input?.from || null,
          to: input?.to || null,
          reason: String(input?.reason || '').slice(0,300)
        }
      };
    }
  }));

  return registered;
}
