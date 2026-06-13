/**
 * Pi 金庸武侠宠物 - Extension Entry Point
 *
 * 用动态 import + 时间戳破缓存，支持 /reload 热更新。
 * xia.ts 中的子模块依赖也通过动态 import 加载，
 * 这样 index.ts 的 cache-bust 能传递到整条依赖链。
 */
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 生成带 cache-bust 后缀的 URL */
function bust(rel: string): string {
	return pathToFileURL(resolve(__dirname, rel)).href + `?_t=${Date.now()}`;
}

export default function (pi: any) {
	const url = bust("xia.js");
	return import(url).then((mod: any) => mod.default(pi));
}
