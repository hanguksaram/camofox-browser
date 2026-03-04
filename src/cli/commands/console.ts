import { Command } from 'commander';

import type { CliContext } from '../types';
import { resolveCommandUser, requireTabId } from '../utils/command-helpers';
import { resolveTabId } from '../utils/session-resolver';

function parseLimit(value: string | undefined, fallback = 100): number {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) return fallback;
	return parsed;
}

export function registerConsoleCommands(program: Command, context: CliContext): void {
	program
		.command('console')
		.description('View browser console messages')
		.argument('[tabId]', 'Tab ID (auto-resolved if omitted)')
		.option('-u, --user <userId>', 'User/session ID')
		.option('-t, --type <type>', 'Filter by type: log, warning, error, info, debug')
		.option('-l, --limit <n>', 'Max messages to show', '100')
		.option('--clear', 'Clear console messages after viewing')
		.action(
			async (
				tabIdArg: string | undefined,
				opts: { user?: string; type?: string; limit?: string; clear?: boolean },
				command: Command,
			) => {
				try {
					const userId = resolveCommandUser({ command, user: opts.user });
					const resolvedTabId = requireTabId(resolveTabId({ tabId: tabIdArg }), opts);
					const query = new URLSearchParams({ userId });
					if (opts.type) query.set('type', opts.type);
					if (opts.limit) query.set('limit', String(parseLimit(opts.limit)));

					const result = await context
						.getTransport()
						.get(`/tabs/${encodeURIComponent(resolvedTabId)}/console?${query.toString()}`);
					context.print(command, result.data);

					if (opts.clear) {
						const clearResult = await context
							.getTransport()
							.post(`/tabs/${encodeURIComponent(resolvedTabId)}/console/clear`, { userId });
						context.print(command, clearResult.data);
					}
				} catch (err) {
					context.handleError(err);
				}
			},
		);

	program
		.command('errors')
		.description('View uncaught JavaScript errors')
		.argument('[tabId]', 'Tab ID (auto-resolved if omitted)')
		.option('-u, --user <userId>', 'User/session ID')
		.option('-l, --limit <n>', 'Max errors to show', '100')
		.option('--clear', 'Clear errors after viewing')
		.action(
			async (
				tabIdArg: string | undefined,
				opts: { user?: string; limit?: string; clear?: boolean },
				command: Command,
			) => {
				try {
					const userId = resolveCommandUser({ command, user: opts.user });
					const resolvedTabId = requireTabId(resolveTabId({ tabId: tabIdArg }), opts);
					const query = new URLSearchParams({ userId });
					if (opts.limit) query.set('limit', String(parseLimit(opts.limit)));

					const result = await context
						.getTransport()
						.get(`/tabs/${encodeURIComponent(resolvedTabId)}/errors?${query.toString()}`);
					context.print(command, result.data);

					if (opts.clear) {
						const clearResult = await context
							.getTransport()
							.post(`/tabs/${encodeURIComponent(resolvedTabId)}/console/clear`, { userId });
						context.print(command, clearResult.data);
					}
				} catch (err) {
					context.handleError(err);
				}
			},
		);
}
