import { Command } from 'commander';

import type { CliContext } from '../types';
import { requireTabId, resolveCommandUser } from '../utils/command-helpers';
import { resolveTabId } from '../utils/session-resolver';

export function registerTraceCommands(program: Command, context: CliContext): void {
	const trace = program.command('trace').description('Playwright trace recording');

	trace
		.command('start')
		.description('Start trace recording')
		.argument('[tabId]', 'Tab ID (auto-resolved if omitted)')
		.option('-u, --user <userId>', 'User/session ID')
		.option('--screenshots', 'Include screenshots in trace', true)
		.option('--no-screenshots', 'Exclude screenshots')
		.option('--snapshots', 'Include DOM snapshots', true)
		.option('--no-snapshots', 'Exclude DOM snapshots')
		.action(
			async (
				tabIdArg: string | undefined,
				opts: { user?: string; screenshots?: boolean; snapshots?: boolean },
				command: Command,
			) => {
				try {
					const userId = resolveCommandUser({ command, user: opts.user });
					const tabId = requireTabId(resolveTabId({ tabId: tabIdArg }), opts);
					const result = await context.getTransport().post(`/tabs/${encodeURIComponent(tabId)}/trace/start`, {
						userId,
						screenshots: opts.screenshots,
						snapshots: opts.snapshots,
					});
					context.print(command, result.data);
				} catch (error) {
					context.handleError(error);
				}
			},
		);

	trace
		.command('stop')
		.description('Stop trace recording and save ZIP')
		.argument('[tabId]', 'Tab ID (auto-resolved if omitted)')
		.option('-u, --user <userId>', 'User/session ID')
		.option('-o, --output <path>', 'Output path for trace ZIP')
		.action(
			async (tabIdArg: string | undefined, opts: { user?: string; output?: string }, command: Command) => {
				try {
					const userId = resolveCommandUser({ command, user: opts.user });
					const tabId = requireTabId(resolveTabId({ tabId: tabIdArg }), opts);
					const result = await context.getTransport().post(`/tabs/${encodeURIComponent(tabId)}/trace/stop`, {
						userId,
						path: opts.output,
					});
					context.print(command, result.data);
				} catch (error) {
					context.handleError(error);
				}
			},
		);

	trace
		.command('chunk-start')
		.description('Start a new trace chunk')
		.argument('[tabId]', 'Tab ID (auto-resolved if omitted)')
		.option('-u, --user <userId>', 'User/session ID')
		.action(async (tabIdArg: string | undefined, opts: { user?: string }, command: Command) => {
			try {
				const userId = resolveCommandUser({ command, user: opts.user });
				const tabId = requireTabId(resolveTabId({ tabId: tabIdArg }), opts);
				const result = await context.getTransport().post(`/tabs/${encodeURIComponent(tabId)}/trace/chunk/start`, {
					userId,
				});
				context.print(command, result.data);
			} catch (error) {
				context.handleError(error);
			}
		});

	trace
		.command('chunk-stop')
		.description('Stop trace chunk and save ZIP')
		.argument('[tabId]', 'Tab ID (auto-resolved if omitted)')
		.option('-u, --user <userId>', 'User/session ID')
		.option('-o, --output <path>', 'Output path for chunk ZIP')
		.action(
			async (tabIdArg: string | undefined, opts: { user?: string; output?: string }, command: Command) => {
				try {
					const userId = resolveCommandUser({ command, user: opts.user });
					const tabId = requireTabId(resolveTabId({ tabId: tabIdArg }), opts);
					const result = await context
						.getTransport()
						.post(`/tabs/${encodeURIComponent(tabId)}/trace/chunk/stop`, {
							userId,
							path: opts.output,
						});
					context.print(command, result.data);
				} catch (error) {
					context.handleError(error);
				}
			},
		);

	trace
		.command('status')
		.description('Check active trace status')
		.argument('[tabId]', 'Tab ID (auto-resolved if omitted)')
		.option('-u, --user <userId>', 'User/session ID')
		.action(async (tabIdArg: string | undefined, opts: { user?: string }, command: Command) => {
			try {
				const userId = resolveCommandUser({ command, user: opts.user });
				const tabId = requireTabId(resolveTabId({ tabId: tabIdArg }), opts);
				const params = `userId=${encodeURIComponent(userId)}`;
				const result = await context.getTransport().get(`/tabs/${encodeURIComponent(tabId)}/trace/status?${params}`);
				context.print(command, result.data);
			} catch (error) {
				context.handleError(error);
			}
		});
}
