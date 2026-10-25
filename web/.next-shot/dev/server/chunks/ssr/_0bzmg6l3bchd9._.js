(()=>{"use strict";module.exports = [
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactDOM;
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime;
}),
"[project]/src/app/_components/marshmallow.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// A chubby housemate. Shade colour comes from the name (same hash as Avatar); angry turns the body red.
__turbopack_context__.s([
    "Marshmallow",
    ()=>Marshmallow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
function Marshmallow({ name, angry = false, className = "" }) {
    const hue = [
        ...name
    ].reduce((a, c)=>(a * 31 + c.charCodeAt(0)) % 360, 7);
    const body = angry ? "#ffd9d4" : "#fbfaf5";
    const shade = angry ? "#f08a80" : `hsl(${hue} 85% 86%)`;
    const ink = "#1a1a1a";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": true,
        viewBox: "0 0 130 198",
        className: className,
        stroke: ink,
        strokeWidth: "3.2",
        strokeLinejoin: "round",
        strokeLinecap: "round",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: "40",
                cy: "184",
                rx: "20",
                ry: "11",
                fill: body
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 9,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: "90",
                cy: "184",
                rx: "20",
                ry: "11",
                fill: body
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 10,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M32 84Q18 128 26 162Q30 178 46 178H60Q62 168 65 168Q68 168 70 178H84Q100 178 104 162Q112 128 98 84Z",
                fill: body
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 11,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M30 96Q4 94 6 120Q8 140 30 136Q40 134 38 122Z",
                fill: body
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M100 96Q126 94 124 120Q122 140 100 136Q90 134 92 122Z",
                fill: body
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M33 90Q22 128 29 160Q32 171 38 175Q31 150 37 122Q39 104 41 90Z",
                fill: shade,
                stroke: "none"
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M10 112Q10 100 22 99Q16 107 16 118Q16 130 24 133Q8 134 10 112Z",
                fill: shade,
                stroke: "none"
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: "65",
                cy: "48",
                rx: "56",
                ry: "42",
                fill: body
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M12 50Q12 14 55 6Q30 22 32 50Q34 70 56 84Q12 80 12 50Z",
                fill: shade,
                stroke: "none"
            }, void 0, false, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                fill: ink,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                        className: "mm-eyes",
                        stroke: "none",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                cx: "47",
                                cy: angry ? 54 : 52,
                                r: "4.5"
                            }, void 0, false, {
                                fileName: "[project]/src/app/_components/marshmallow.tsx",
                                lineNumber: 20,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                cx: "83",
                                cy: angry ? 54 : 52,
                                r: "4.5"
                            }, void 0, false, {
                                fileName: "[project]/src/app/_components/marshmallow.tsx",
                                lineNumber: 21,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/_components/marshmallow.tsx",
                        lineNumber: 19,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                        cx: "37",
                        cy: "65",
                        rx: "6",
                        ry: "4",
                        fill: angry ? "#e5483c" : "#ff9a9a",
                        stroke: "none",
                        opacity: angry ? 0.5 : 0.6
                    }, void 0, false, {
                        fileName: "[project]/src/app/_components/marshmallow.tsx",
                        lineNumber: 23,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                        cx: "93",
                        cy: "65",
                        rx: "6",
                        ry: "4",
                        fill: angry ? "#e5483c" : "#ff9a9a",
                        stroke: "none",
                        opacity: angry ? 0.5 : 0.6
                    }, void 0, false, {
                        fileName: "[project]/src/app/_components/marshmallow.tsx",
                        lineNumber: 24,
                        columnNumber: 9
                    }, this),
                    angry ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M54 72Q65 63 76 72",
                                fill: "none"
                            }, void 0, false, {
                                fileName: "[project]/src/app/_components/marshmallow.tsx",
                                lineNumber: 27,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M36 40L56 48M94 40L74 48",
                                fill: "none"
                            }, void 0, false, {
                                fileName: "[project]/src/app/_components/marshmallow.tsx",
                                lineNumber: 28,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/_components/marshmallow.tsx",
                        lineNumber: 26,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M53 62Q65 74 77 62",
                                fill: "none"
                            }, void 0, false, {
                                fileName: "[project]/src/app/_components/marshmallow.tsx",
                                lineNumber: 32,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M42 34Q47 28 53 33M77 33Q83 28 88 34",
                                fill: "none",
                                strokeWidth: "2.4"
                            }, void 0, false, {
                                fileName: "[project]/src/app/_components/marshmallow.tsx",
                                lineNumber: 33,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/_components/marshmallow.tsx",
                        lineNumber: 31,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/_components/marshmallow.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/_components/marshmallow.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/_components/roamers.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Roamers",
    ()=>Roamers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$_components$2f$marshmallow$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/_components/marshmallow.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
const W = 56; // px, figure width
const MAX = 5;
const SPEED = 36; // px per second
// One housemate wandering along the bottom edge. Position is a CSS transition, so no per-frame JS.
function Roamer({ name }) {
    const outer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const hop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [walking, setWalking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [dir, setDir] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1);
    const [angry, setAngry] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const taps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])([]);
    const calm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const delay = -([
        ...name
    ].reduce((a, c)=>a + c.charCodeAt(0), 0) % 40) / 10; // desync the idle loops, same on server and client
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = outer.current;
        if (!el) return;
        let x = Math.random() * Math.max(0, innerWidth - W);
        el.style.transform = `translateX(${x}px)`;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // stand still
        let t = 0;
        const go = ()=>{
            if (document.hidden || document.documentElement.dataset.figures === "off") {
                t = window.setTimeout(go, 1000);
                return;
            } // idle while unseen
            const to = Math.random() * Math.max(0, innerWidth - W);
            const secs = Math.abs(to - x) / SPEED;
            setDir(to < x ? -1 : 1);
            setWalking(true);
            el.style.transition = `transform ${secs}s linear`;
            el.style.transform = `translateX(${to}px)`;
            x = to;
            t = window.setTimeout(()=>{
                setWalking(false);
                t = window.setTimeout(go, 1500 + Math.random() * 3500);
            }, secs * 1000);
        };
        t = window.setTimeout(go, 500 + Math.random() * 2000);
        return ()=>{
            clearTimeout(t);
            clearTimeout(calm.current);
        };
    }, []);
    function tap() {
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
            hop.current?.animate([
                {
                    transform: "none"
                },
                {
                    transform: "translateY(-28px) scale(0.94, 1.08)",
                    offset: 0.4
                },
                {
                    transform: "scale(1.08, 0.92)",
                    offset: 0.75
                },
                {
                    transform: "none"
                }
            ], {
                duration: 420,
                easing: "cubic-bezier(0.23, 1, 0.32, 1)"
            });
        }
        const now = Date.now();
        taps.current = [
            ...taps.current.filter((n)=>now - n < 2000),
            now
        ];
        if (taps.current.length >= 5) {
            taps.current = [];
            setAngry(true);
            clearTimeout(calm.current);
            calm.current = window.setTimeout(()=>setAngry(false), 4000);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: outer,
        className: "absolute bottom-0 left-0",
        style: {
            width: W,
            "--d": `${delay}s`
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            ref: hop,
            onPointerDown: tap,
            className: "pointer-events-auto cursor-pointer select-none touch-manipulation",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    transform: `scaleX(${dir})`
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$_components$2f$marshmallow$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Marshmallow"], {
                    name: name,
                    angry: angry,
                    className: `block w-full ${walking ? "mm-walk" : "mm-breathe"}`
                }, void 0, false, {
                    fileName: "[project]/src/app/_components/roamers.tsx",
                    lineNumber: 69,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/_components/roamers.tsx",
                lineNumber: 68,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/_components/roamers.tsx",
            lineNumber: 67,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/_components/roamers.tsx",
        lineNumber: 66,
        columnNumber: 5
    }, this);
}
function Roamers({ names }) {
    const list = names.slice(0, MAX);
    if (!list.length) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "aria-hidden": true,
        "data-roamers": true,
        className: "pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 h-32 overflow-x-clip md:bottom-0",
        children: list.map((n, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Roamer, {
                name: n
            }, `${n}-${i}`, false, {
                fileName: "[project]/src/app/_components/roamers.tsx",
                lineNumber: 82,
                columnNumber: 27
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/app/_components/roamers.tsx",
        lineNumber: 81,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/_components/submit-button.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SubmitButton",
    ()=>SubmitButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)");
"use client";
;
;
function SubmitButton({ children, className, pendingText = "Working…", name, value, shortcut }) {
    const { pending, data } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useFormStatus"])();
    const mine = pending && (!name || data?.get(name) === value);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "submit",
        name: name,
        value: value,
        disabled: pending,
        "aria-busy": mine,
        "data-shortcut": shortcut,
        className: className,
        children: mine ? pendingText : children
    }, void 0, false, {
        fileName: "[project]/src/app/_components/submit-button.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/_components/theme-toggle.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeToggle",
    ()=>ThemeToggle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$_components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/_components/ui.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
const OPTIONS = [
    {
        key: "system",
        label: "Match system",
        icon: "monitor"
    },
    {
        key: "light",
        label: "Light",
        icon: "sun"
    },
    {
        key: "dark",
        label: "Dark",
        icon: "moon"
    }
];
function ThemeToggle() {
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("system");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Read after mount so server and client markup match; the layout script already applied the theme.
        const id = requestAnimationFrame(()=>{
            const t = document.documentElement.getAttribute("data-theme");
            if (t === "light" || t === "dark") setTheme(t);
        });
        return ()=>cancelAnimationFrame(id);
    }, []);
    function pick(t) {
        setTheme(t);
        const root = document.documentElement;
        root.classList.add("theming"); // cross-fade for 150ms
        if (t === "system") root.removeAttribute("data-theme");
        else root.setAttribute("data-theme", t);
        try {
            if (t === "system") localStorage.removeItem("theme");
            else localStorage.setItem("theme", t);
        } catch  {}
        setTimeout(()=>root.classList.remove("theming"), 200);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        role: "group",
        "aria-label": "Theme",
        className: "flex gap-0.5 rounded-full bg-surface-2 p-0.5",
        children: OPTIONS.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                "aria-label": o.label,
                title: o.label,
                "aria-pressed": theme === o.key,
                onClick: ()=>pick(o.key),
                className: `grid size-8 place-items-center rounded-full transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.92] ${theme === o.key ? "bg-ink text-bg" : "text-muted hover:text-ink"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$_components$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Icon"], {
                    name: o.icon,
                    className: "size-4"
                }, void 0, false, {
                    fileName: "[project]/src/app/_components/theme-toggle.tsx",
                    lineNumber: 43,
                    columnNumber: 11
                }, this)
            }, o.key, false, {
                fileName: "[project]/src/app/_components/theme-toggle.tsx",
                lineNumber: 41,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/app/_components/theme-toggle.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/app/_components/ui.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Avatar",
    ()=>Avatar,
    "Banner",
    ()=>Banner,
    "Chip",
    ()=>Chip,
    "Icon",
    ()=>Icon,
    "Kbd",
    ()=>Kbd,
    "Section",
    ()=>Section,
    "arrow",
    ()=>arrow,
    "button",
    ()=>button,
    "danger",
    ()=>danger,
    "ghost",
    ()=>ghost,
    "input",
    ()=>input
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/errors.ts [app-ssr] (ecmascript)");
;
;
const input = "w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 focus:border-ink focus:ring-4 focus:ring-accent";
const button = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-base font-semibold text-bg transition-[transform,opacity] duration-150 ease-out hover:opacity-85 [@media(hover:hover)]:hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";
const ghost = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-transparent px-3.5 py-2 text-sm font-medium text-ink transition-[transform,background-color] duration-150 ease-out hover:bg-surface-2 [@media(hover:hover)]:hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";
const arrow = "grid size-8 place-items-center rounded-full border border-line text-muted transition-[transform,color,background-color,opacity] duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-90 disabled:pointer-events-none disabled:opacity-30";
const danger = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-bad px-3.5 py-2 text-sm font-semibold text-bg transition-[transform,opacity] duration-150 ease-out hover:opacity-85 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";
const ICONS = {
    home: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5",
    trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
    calendar: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4",
    check: "m5 12.5 4.5 4.5L19 7.5",
    x: "M6 6l12 12M18 6 6 18",
    plus: "M12 5v14M5 12h14",
    chevron: "m9 6 6 6-6 6",
    grip: "M8 6a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14 6a1 1 0 1 0 2 0a1 1 0 1 0-2 0M8 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0M8 18a1 1 0 1 0 2 0a1 1 0 1 0-2 0M14 18a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
    copy: "M9 9h10v10H9zM5 15V5h10",
    share: "M12 4v11M8 8l4-4 4 4M5 14v5h14v-5",
    medal: "M8 3h3l1 4M16 3h-3l-1 4M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    wash: "M5 3h14v18H5zM5 8h14M12 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    wallet: "M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1V7Zm0 0V6a2 2 0 0 1 2-2h11M16 14h2",
    out: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9",
    monitor: "M4 5h16v11H4zM9 20h6M12 16v4",
    sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
    moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
    star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"
};
function Icon({ name, className = "size-5" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        "aria-hidden": true,
        viewBox: "0 0 24 24",
        className: `${className} shrink-0`,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.9",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: ICONS[name]
        }, void 0, false, {
            fileName: "[project]/src/app/_components/ui.tsx",
            lineNumber: 44,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/_components/ui.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
function Section({ title, count, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "rise space-y-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "eyebrow flex items-center gap-2 px-1",
                children: [
                    title,
                    !!count && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "rounded-full bg-accent px-2 py-0.5 text-[0.7rem] tracking-normal text-[#16171b] tabular-nums",
                        children: count
                    }, void 0, false, {
                        fileName: "[project]/src/app/_components/ui.tsx",
                        lineNumber: 54,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/_components/ui.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3 rounded-[1.75rem] border border-line bg-surface/95 p-4 shadow-[var(--shadow)] sm:p-5",
                children: children
            }, void 0, false, {
                fileName: "[project]/src/app/_components/ui.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/_components/ui.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
function Banner({ error, info }) {
    const text = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["errorText"])(error) ?? info;
    if (!text) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        role: error ? "alert" : "status",
        className: `rounded-2xl border p-3.5 text-sm font-medium ${error ? "border-bad/40 bg-bad/10 text-bad" : "border-ok/40 bg-ok/10 text-ok"}`,
        children: text
    }, void 0, false, {
        fileName: "[project]/src/app/_components/ui.tsx",
        lineNumber: 65,
        columnNumber: 5
    }, this);
}
const TONES = {
    ok: "bg-ok/15 text-ok",
    bad: "bg-bad/15 text-bad",
    warn: "bg-warn/15 text-warn",
    points: "bg-accent text-[#16171b]",
    muted: "bg-surface-2 text-muted"
};
function Chip({ tone = "muted", className = "text-xs px-2.5 py-0.5", children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `inline-flex items-center gap-1 rounded-full font-semibold tabular-nums ${className} ${TONES[tone]}`,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/app/_components/ui.tsx",
        lineNumber: 83,
        columnNumber: 10
    }, this);
}
function Avatar({ name, className = "size-10" }) {
    const hue = [
        ...name
    ].reduce((a, c)=>(a * 31 + c.charCodeAt(0)) % 360, 7);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "aria-hidden": true,
        style: {
            background: `hsl(${hue} 70% 78%)`
        },
        className: `${className} display grid shrink-0 place-items-center rounded-full text-sm font-bold text-[#16171b]`,
        children: name.trim()[0]?.toUpperCase() ?? "?"
    }, void 0, false, {
        fileName: "[project]/src/app/_components/ui.tsx",
        lineNumber: 90,
        columnNumber: 5
    }, this);
}
function Kbd({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("kbd", {
        "aria-hidden": true,
        className: "ml-1 hidden rounded-md border border-current/30 px-1.5 text-xs font-medium opacity-60 [@media(hover:hover)]:inline",
        children: children
    }, void 0, false, {
        fileName: "[project]/src/app/_components/ui.tsx",
        lineNumber: 98,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/lib/errors.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "errorCode",
    ()=>errorCode,
    "errorText",
    ()=>errorText
]);
// Errors travel in the URL as short codes, never as free text, so a crafted link cannot show arbitrary words on the page.
const TEXT = {
    "not-signed-in": "Please sign in again.",
    "already-in-a-household": "You are already in a household.",
    "invite-not-found": "That invite link is invalid, expired or revoked.",
    "housemates-only": "Only housemates can do that.",
    "admin-only": "Only an admin can do that.",
    "deed-not-found": "That deed doesn't exist.",
    "deed-is-inactive": "That deed is hidden.",
    "only-good-deeds-can-be-claimed": "Penalties are entered by an admin.",
    "already-waiting-for-approval": "You already have that claim waiting for approval.",
    "claim-not-found": "That claim no longer exists.",
    "claim-already-decided": "That claim was already decided.",
    "target-must-be-a-housemate-in-this-household": "Pick a housemate in this household.",
    "entry-not-found": "That entry no longer exists.",
    "unknown-time-zone": "Pick a time zone from the list.",
    "invalid-title": "Describe the deed in 1 to 80 characters.",
    "points-must-be-positive": "Give a custom deed a whole number of points above 0.",
    "invalid-points": "Points must be a whole number other than 0.",
    "dibs-are-closed": "That week is over, so its chores can no longer be claimed.",
    "already-taken": "Someone else already took that chore.",
    "too-late-to-release": "Chores can only be released before Sunday's handout.",
    "over-your-fair-share": "You already have your fair share of chores.",
    "chore-not-found": "That chore no longer exists.",
    "this-chore-can-no-longer-move": "That chore can no longer be moved.",
    "chore-has-no-deed-to-claim": "That chore has no deed to claim yet. Ask the admin to link one.",
    "week-has-not-started": "That week has not started yet.",
    "already-submitted": "You already submitted that chore.",
    "invalid-chore": "Give the chore a name, a weekday and a weight from 1 to 3.",
    "invalid-email": "Enter a valid email address.",
    "invalid-category": "Give the category a name (up to 40 characters) and an amount of 0 or more.",
    "category-name-taken": "A category with that name already exists.",
    "deed-has-pending-claims": "That deed has claims waiting. Decide them before turning it into a penalty.",
    "invalid-amount": "Enter an amount above 0.",
    "category-not-found": "That category no longer exists.",
    "no-household": "You are not in a household.",
    "email-rate-limit-exceeded": "Too many sign-in emails. Wait a few minutes and try again.",
    "invalid-login-credentials": "Wrong email or password.",
    "user-already-registered": "That email already has an account. Sign in instead.",
    "weak-password": "Use a password with at least 8 characters.",
    "email-not-confirmed": "Confirm your email first, using the link we sent you.",
    "bad-link": "That sign-in link is invalid or expired."
};
const errorCode = (message)=>{
    const code = message.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return code in TEXT ? code : "unknown";
};
const errorText = (code)=>code ? TEXT[code] ?? "Something went wrong. Try again." : undefined;
}),
];})()

//# sourceMappingURL=_0bzmg6l3bchd9._.js.map