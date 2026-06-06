/**
 * 热加载入口
 *
 * 开发流程：
 *   1. 终端A: cd pi-jinyong-xia && npx tsc --watch
 *   2. 改 TS 代码（tsc --watch 自动编译到 dist/）
 *   3. 终端B（pi 里）: /reload
 */
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, "dist", "extensions", "index.js");

export default function (pi) {
	const url = pathToFileURL(distEntry).href + `?_t=${Date.now()}`;
	return import(url).then(mod => mod.default(pi));
}
