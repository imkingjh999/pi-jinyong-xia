// 诊断 cmux 下 widget 实际走哪个分支。在 cmux 终端里运行：
//   cd /Users/jjo/projects/pi-plugins/pi-jinyong-xia && npx tsx diag-cmux.ts
import { canShowImages } from "./extensions/xia-render.ts";
import { getCapabilities } from "@earendil-works/pi-tui";

console.log("=== 环境变量 ===");
for (const k of [
	"TMUX", "TERM", "TERM_PROGRAM", "TERM_PROGRAM_VERSION",
	"ITERM_SESSION_ID", "ITERM_PROFILE",
	"WEZTERM_EXECUTABLE", "GHOSTTY_RESOURCES_DIR",
	"STY", "ZELLIJ", "CURSOR_TRACE",
]) {
	console.log(`  ${k} = ${JSON.stringify(process.env[k] ?? "")}`);
}

console.log("\n=== pi-tui capabilities ===");
let caps: unknown;
try { caps = getCapabilities(); } catch (e) { caps = `ERROR: ${(e as Error).message}`; }
console.log("  getCapabilities():", JSON.stringify(caps));

console.log("\n=== xia-render 判断函数 ===");
console.log("  isTmux() (== !!TMUX):", !!process.env.TMUX);
let canImg: boolean | string;
try { canImg = canShowImages(); } catch (e) { canImg = `ERROR: ${(e as Error).message}`; }
console.log("  canShowImages():", canImg);

console.log("\n=== 推断：widget render 会走哪个分支（假设 _mode=ansi）===");
const tmux = !!process.env.TMUX;
const ci = typeof canImg === "boolean" ? canImg : false;
const ghosttyDir = process.env.GHOSTTY_RESOURCES_DIR || "";
const managed = tmux || !!process.env.ZELLIJ || ghosttyDir.includes("cmux");
console.log(`  hasManagedBuffer: tmux=${tmux} zellij=${!!process.env.ZELLIJ} cmuxDir=${ghosttyDir.includes("cmux")} → ${managed}`);
let branch: string;
if (ci && loadPortraitPngFake()) branch = "image → normalize 12 行（头像加载则 _mode=image）";
else if (!managed && ci) branch = "normalize 12 行（裸跑 + 支持图，防抖）";
else branch = "紧凑 + 分隔线 ✓（多路复用器 / 不支持图）";
console.log("  →", branch);

function loadPortraitPngFake(): boolean { return ci; /* 占位：真实判断在运行时 */
}
