/**
 * 热加载入口 - v3
 */
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, "dist", "extensions", "index.js");

export default function (pi) {
	console.log(`[pi-jinyong-xia] v3 loading at ${new Date().toISOString()}`);
	const url = pathToFileURL(distEntry).href + `?_t=${Date.now()}`;
	return import(url).then(mod => {
		console.log(`[pi-jinyong-xia] index.js loaded`);
		return mod.default(pi);
	});
}
