/**
 * Minimal test framework helpers
 */

export function describe(name: string, fn: () => void): void {
	console.log(`\n  ${name}`);
	fn();
}

export function it(name: string, fn: () => void | Promise<void>): void {
	const result = fn();
	if (result instanceof Promise) {
		result.then(
			() => console.log(`    ✅ ${name}`),
			(err: unknown) => {
				const msg = err instanceof Error ? err.message : String(err);
				console.log(`    ❌ ${name}: ${msg}`);
			},
		);
	} else {
		console.log(`    ✅ ${name}`);
	}
}

export function expect(actual: unknown) {
	return {
		toBe(expected: unknown): void {
			if (actual !== expected) {
				throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
			}
		},
		toBeDefined(): void {
			if (actual === undefined || actual === null) {
				throw new Error(`Expected defined, got ${String(actual)}`);
			}
		},
		toBeTrue(): void {
			if (actual !== true) {
				throw new Error(`Expected true, got ${String(actual)}`);
			}
		},
		toBeFalse(): void {
			if (actual !== false) {
				throw new Error(`Expected false, got ${String(actual)}`);
			}
		},
		toBeGreaterThan(expected: number): void {
			if ((actual as number) <= expected) {
				throw new Error(`Expected ${actual} > ${expected}`);
			}
		},
		toContain(expected: unknown): void {
			if (typeof actual === "string" && typeof expected === "string") {
				if (!(actual as string).includes(expected as string)) {
					throw new Error(`Expected string to contain ${JSON.stringify(expected)}`);
				}
				return;
			}
			if (!Array.isArray(actual) || !actual.includes(expected)) {
				throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
			}
		},
	};
}
