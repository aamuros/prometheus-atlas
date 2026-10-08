import { app } from './app';
import type { WorkerBindings } from './env';

export default { fetch: app.fetch } satisfies ExportedHandler<WorkerBindings>;
