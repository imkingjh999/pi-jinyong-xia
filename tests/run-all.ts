/**
 * Test runner for Pi 金庸武侠宠物
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const tests = [
	"pet.test.ts",
];

async function runAll(): Promise<void> {
	console.log("🏯 Pi 金庸武侠宠物 - Running Tests\n");
	console.log("═".repeat(50));

	let passed = 0;
	let failed = 0;

	for (const testFile of tests) {
		const testPath = resolve(import.meta.dirname, testFile);
		console.log(`\n📋 Running: ${testFile}`);
		console.log("─".repeat(40));

		try {
			await import(pathToFileURL(testPath).href);
			passed++;
		} catch (err) {
			failed++;
			console.log(`  ❌ Failed: ${err}`);
		}
	}

	console.log("\n" + "═".repeat(50));
	console.log(`Results: ${passed} passed, ${failed} failed`);

	if (failed > 0) {
		process.exit(1);
	}
}

runAll();
