(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/app/_components/grid-glow.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GridGlow",
    ()=>GridGlow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
function GridGlow() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "GridGlow.useEffect": ()=>{
            if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
            const root = document.documentElement;
            let raf = 0;
            const move = {
                "GridGlow.useEffect.move": (e)=>{
                    cancelAnimationFrame(raf);
                    raf = requestAnimationFrame({
                        "GridGlow.useEffect.move": ()=>{
                            root.style.setProperty("--mx", `${e.clientX}px`);
                            root.style.setProperty("--my", `${e.clientY}px`);
                        }
                    }["GridGlow.useEffect.move"]);
                }
            }["GridGlow.useEffect.move"];
            addEventListener("pointermove", move, {
                passive: true
            });
            return ({
                "GridGlow.useEffect": ()=>{
                    removeEventListener("pointermove", move);
                    cancelAnimationFrame(raf);
                }
            })["GridGlow.useEffect"];
        }
    }["GridGlow.useEffect"], []);
    return null;
}
_s(GridGlow, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = GridGlow;
var _c;
__turbopack_context__.k.register(_c, "GridGlow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_app__components_grid-glow_tsx_0e8r8xivktbt1._.js.map