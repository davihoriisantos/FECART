var FloodGuardHero = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/shims/react.js
  var require_react = __commonJS({
    "src/shims/react.js"(exports, module) {
      module.exports = window.React;
    }
  });

  // src/shims/react-dom-client.js
  var require_react_dom_client = __commonJS({
    "src/shims/react-dom-client.js"(exports, module) {
      module.exports = window.ReactDOM;
    }
  });

  // src/shims/framer-motion.js
  var require_framer_motion = __commonJS({
    "src/shims/framer-motion.js"(exports, module) {
      var safeMotion = typeof window !== "undefined" && window.Motion ? window.Motion : {
        motion: new Proxy({}, {
          get: (_, tag) => (props) => {
            const {
              animate,
              initial,
              exit,
              transition,
              whileHover,
              whileTap,
              variants,
              layout,
              ...rest
            } = props || {};
            return typeof window !== "undefined" && window.React ? window.React.createElement(tag, rest) : null;
          }
        }),
        AnimatePresence: ({ children }) => children,
        useMotionValue: (initialVal = 0) => ({
          get: () => initialVal,
          set: () => {
          },
          onChange: () => () => {
          }
        }),
        useSpring: (val) => val,
        useTransform: (val) => val
      };
      module.exports = safeMotion;
    }
  });

  // src/index.jsx
  var index_exports = {};
  __export(index_exports, {
    HeroSection: () => HeroSection
  });
  var import_react3 = __toESM(require_react());
  var import_client = __toESM(require_react_dom_client());

  // src/components/HeroSection.jsx
  var import_react2 = __toESM(require_react());
  var import_framer_motion2 = __toESM(require_framer_motion());

  // src/components/DynamicLogo.jsx
  var import_react = __toESM(require_react());
  var import_framer_motion = __toESM(require_framer_motion());
  function DynamicLogo({
    logoSrc = "/static/img/logo.jpg",
    weatherData = null,
    onWeatherClick = null
  }) {
    const cardRef = (0, import_react.useRef)(null);
    const [isHovered, setIsHovered] = (0, import_react.useState)(false);
    const [spotlight, setSpotlight] = (0, import_react.useState)({ x: 50, y: 50 });
    const mouseX = (0, import_framer_motion.useMotionValue)(0);
    const mouseY = (0, import_framer_motion.useMotionValue)(0);
    const springConfig = { damping: 20, stiffness: 220 };
    const rotateX = (0, import_framer_motion.useSpring)((0, import_framer_motion.useTransform)(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
    const rotateY = (0, import_framer_motion.useSpring)((0, import_framer_motion.useTransform)(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);
    const handleMouseMove = (e) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const xCoord = e.clientX - rect.left;
      const yCoord = e.clientY - rect.top;
      mouseX.set(xCoord / width - 0.5);
      mouseY.set(yCoord / height - 0.5);
      setSpotlight({
        x: Math.round(xCoord / width * 100),
        y: Math.round(yCoord / height * 100)
      });
    };
    const handleMouseEnter = () => {
      setIsHovered(true);
    };
    const handleMouseLeave = () => {
      setIsHovered(false);
      mouseX.set(0);
      mouseY.set(0);
      setSpotlight({ x: 50, y: 50 });
    };
    const rainText = weatherData?.chuvaAtual !== void 0 ? `${weatherData.chuvaAtual} mm/h` : "0.0 mm/h";
    const tempText = weatherData?.temperatura !== void 0 ? `${weatherData.temperatura}\xB0C` : "22\xB0C";
    const conditionText = weatherData?.condicaoTexto || "Monitoramento Ativo";
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "relative w-full max-w-[420px] mx-auto lg:max-w-[460px] flex items-center justify-center py-6 select-none" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none" }, /* @__PURE__ */ import_react.default.createElement(
      import_framer_motion.motion.div,
      {
        animate: {
          scale: [1, 1.18, 1],
          opacity: [0.35, 0.7, 0.35]
        },
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        },
        className: "w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-gradient-to-tr from-sky-500/25 via-blue-600/30 to-cyan-400/20 blur-3xl"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      import_framer_motion.motion.div,
      {
        animate: { rotate: 360 },
        transition: { duration: 30, repeat: Infinity, ease: "linear" },
        className: "absolute w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] rounded-full border border-dashed border-sky-400/20 opacity-70"
      }
    ), /* @__PURE__ */ import_react.default.createElement(
      import_framer_motion.motion.div,
      {
        animate: { rotate: -360 },
        transition: { duration: 45, repeat: Infinity, ease: "linear" },
        className: "absolute w-[290px] h-[290px] sm:w-[330px] sm:h-[330px] rounded-full border border-sky-500/20 opacity-50",
        style: { borderTopColor: "rgba(56, 189, 248, 0.6)" }
      }
    )), /* @__PURE__ */ import_react.default.createElement(
      import_framer_motion.motion.div,
      {
        ref: cardRef,
        onMouseMove: handleMouseMove,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        animate: {
          y: [0, -14, 0]
        },
        transition: {
          y: {
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        },
        style: {
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        },
        whileHover: { scale: 1.035 },
        className: "relative z-10 w-full cursor-pointer perspective-1000"
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: "relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-blue-950/80 backdrop-blur-xl border border-sky-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(56,189,248,0.25)] transition-all duration-300 group overflow-visible" }, /* @__PURE__ */ import_react.default.createElement(
        "div",
        {
          className: "absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300",
          style: {
            opacity: isHovered ? 0.75 : 0.25,
            background: `radial-gradient(circle 240px at ${spotlight.x}% ${spotlight.y}%, rgba(56, 189, 248, 0.35), transparent 70%)`
          }
        }
      ), /* @__PURE__ */ import_react.default.createElement("div", { className: "relative w-full aspect-square max-h-[300px] sm:max-h-[340px] rounded-2xl overflow-hidden bg-slate-950/80 border border-sky-400/20 flex items-center justify-center shadow-inner" }, /* @__PURE__ */ import_react.default.createElement(
        "img",
        {
          src: logoSrc,
          alt: "Logo FloodGuard AI",
          className: "w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105",
          loading: "eager"
        }
      ), /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" }), /* @__PURE__ */ import_react.default.createElement(
        import_framer_motion.motion.div,
        {
          animate: { y: ["-100%", "200%"] },
          transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
          className: "absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-sky-400/20 to-transparent pointer-events-none"
        }
      )), /* @__PURE__ */ import_react.default.createElement(
        import_framer_motion.motion.div,
        {
          animate: { y: [0, 8, 0] },
          transition: { duration: 3.8, repeat: Infinity, ease: "easeInOut" },
          className: "absolute -top-3 -left-3 sm:-top-4 sm:-left-4 z-20 bg-slate-900/95 border border-emerald-400/40 shadow-[0_4px_16px_rgba(16,185,129,0.3)] rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur-md"
        },
        /* @__PURE__ */ import_react.default.createElement("span", { className: "relative flex h-2 w-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" }), /* @__PURE__ */ import_react.default.createElement("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-emerald-500" })),
        /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[11px] sm:text-xs font-bold text-emerald-300 tracking-wide uppercase" }, "IA Preditiva Ativa")
      ), /* @__PURE__ */ import_react.default.createElement(
        import_framer_motion.motion.div,
        {
          animate: { y: [0, -6, 0] },
          transition: { duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          whileHover: { scale: 1.05 },
          onClick: (e) => {
            e.stopPropagation();
            if (onWeatherClick) onWeatherClick();
            else {
              const el = document.getElementById("clima-ao-vivo");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }
          },
          className: "absolute -bottom-4 -right-2 sm:-bottom-5 sm:-right-4 z-20 bg-slate-900/95 border border-sky-400/50 hover:border-sky-300 shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(56,189,248,0.25)] rounded-2xl p-2.5 sm:p-3 backdrop-blur-md flex items-center gap-3 transition-colors cursor-pointer group/card",
          title: "Clique para ver o monitoramento meteorol\xF3gico completo"
        },
        /* @__PURE__ */ import_react.default.createElement("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 border border-sky-400/40 flex items-center justify-center text-xl shrink-0" }, "\u{1F327}\uFE0F"),
        /* @__PURE__ */ import_react.default.createElement("div", { className: "text-left pr-1" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] font-bold uppercase tracking-wider text-sky-400" }, "Clima em Tempo Real"), /* @__PURE__ */ import_react.default.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" })), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-baseline gap-2 mt-0.5" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "text-sm font-extrabold text-white" }, tempText), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xs font-bold text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-500/30" }, rainText))),
        /* @__PURE__ */ import_react.default.createElement("span", { className: "text-slate-400 group-hover/card:text-sky-300 transition-transform group-hover/card:translate-y-0.5 text-xs" }, "\u2193")
      ))
    ));
  }

  // src/components/HeroSection.jsx
  function HeroSection({
    onAuthRedirect = null,
    logoSrc = "/static/img/logo.jpg"
  }) {
    const [weatherData, setWeatherData] = (0, import_react2.useState)(null);
    const [isRedirecting, setIsRedirecting] = (0, import_react2.useState)(false);
    const [showAuthModal, setShowAuthModal] = (0, import_react2.useState)(false);
    (0, import_react2.useEffect)(() => {
      if (typeof window !== "undefined" && window.realWeatherDataCache) {
        setWeatherData(window.realWeatherDataCache);
      }
      const handleWeatherUpdate = (e) => {
        if (e?.detail?.weather) {
          setWeatherData(e.detail.weather);
        }
      };
      window.addEventListener("floodguard:weatherUpdate", handleWeatherUpdate);
      return () => {
        window.removeEventListener("floodguard:weatherUpdate", handleWeatherUpdate);
      };
    }, []);
    const handleMapCtaClick = (e) => {
      e.preventDefault();
      setIsRedirecting(true);
      if (onAuthRedirect) {
        onAuthRedirect();
        return;
      }
      setTimeout(() => {
        window.location.href = "/login?redirect=/map";
      }, 450);
    };
    const handleScrollToWeather = (e) => {
      if (e) e.preventDefault();
      const weatherElem = document.getElementById("clima-ao-vivo");
      if (weatherElem) {
        weatherElem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.12,
          delayChildren: 0.05
        }
      }
    };
    const itemVariants = {
      hidden: { opacity: 0, y: 22 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1]
        }
      }
    };
    return /* @__PURE__ */ import_react2.default.createElement("section", { className: "relative w-full pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden", id: "hero-section" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-600/10 blur-[120px]" }), /* @__PURE__ */ import_react2.default.createElement("div", { className: "absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-blue-700/10 blur-[140px]" })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center" }, /* @__PURE__ */ import_react2.default.createElement(
      import_framer_motion2.motion.div,
      {
        variants: containerVariants,
        initial: "hidden",
        animate: "visible",
        className: "lg:col-span-7 flex flex-col items-start text-left"
      },
      /* @__PURE__ */ import_react2.default.createElement(import_framer_motion2.motion.div, { variants: itemVariants, className: "mb-5" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-sky-950/60 border border-sky-400/35 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.22)] backdrop-blur-md transition-all hover:border-sky-400/60" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-sm" }, "\u{1F6E1}\uFE0F"), /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-[11px] sm:text-xs font-bold tracking-wider uppercase text-sky-300" }, "TECNOLOGIA PREDITIVA DE ALTO IMPACTO"), /* @__PURE__ */ import_react2.default.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse ml-0.5" }))),
      /* @__PURE__ */ import_react2.default.createElement(
        import_framer_motion2.motion.h1,
        {
          variants: itemVariants,
          className: "text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-white tracking-tight leading-[1.2] mb-5"
        },
        "Prevenindo Enchentes.",
        /* @__PURE__ */ import_react2.default.createElement("br", null),
        /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 drop-shadow-[0_2px_15px_rgba(56,189,248,0.25)]" }, "Salvando Vidas com IA em Tempo Real.")
      ),
      /* @__PURE__ */ import_react2.default.createElement(
        import_framer_motion2.motion.p,
        {
          variants: itemVariants,
          className: "text-slate-300 text-sm sm:text-base lg:text-[17px] leading-relaxed max-w-xl font-normal mb-8"
        },
        "Uma plataforma de Intelig\xEAncia Artificial de alta precis\xE3o projetada para monitorar rios, solo e chuvas, antecipando alagamentos antes que eles ocorram para proteger voc\xEA e sua fam\xEDlia."
      ),
      /* @__PURE__ */ import_react2.default.createElement(
        import_framer_motion2.motion.div,
        {
          variants: itemVariants,
          className: "w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8"
        },
        /* @__PURE__ */ import_react2.default.createElement(
          import_framer_motion2.motion.button,
          {
            type: "button",
            onClick: handleMapCtaClick,
            disabled: isRedirecting,
            whileHover: { scale: 1.03, y: -2 },
            whileTap: { scale: 0.98 },
            className: `relative group inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold text-white text-sm sm:text-base shadow-lg shadow-sky-500/25 transition-all duration-200 cursor-pointer overflow-hidden ${isRedirecting ? "bg-sky-700 opacity-90 cursor-wait" : "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500"}`,
            title: "Acesso Seguro ao Mapa Preditivo de Risco"
          },
          /* @__PURE__ */ import_react2.default.createElement("div", { className: "absolute inset-0 w-1/2 h-full bg-white/15 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" }),
          /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-lg" }, "\u{1F5FA}\uFE0F"),
          /* @__PURE__ */ import_react2.default.createElement("span", null, isRedirecting ? "\u{1F510} Redirecionando para Login..." : "Ver Mapa de Risco ao Vivo"),
          /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-[10px] bg-sky-950/70 text-sky-200 uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border border-sky-400/30" }, "Login")
        ),
        /* @__PURE__ */ import_react2.default.createElement(
          import_framer_motion2.motion.button,
          {
            type: "button",
            onClick: handleScrollToWeather,
            whileHover: { scale: 1.025, y: -2 },
            whileTap: { scale: 0.98 },
            className: "inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-sky-400/50 backdrop-blur-md shadow-sm transition-all duration-200 text-sm sm:text-base cursor-pointer group"
          },
          /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-lg group-hover:scale-110 transition-transform" }, "\u{1F327}\uFE0F"),
          /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-left" }, "Dados de Chuva e Clima em Tempo Real"),
          /* @__PURE__ */ import_react2.default.createElement("span", { className: "flex h-2 w-2 relative ml-1" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" }), /* @__PURE__ */ import_react2.default.createElement("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-emerald-500" }))
        )
      ),
      /* @__PURE__ */ import_react2.default.createElement(
        import_framer_motion2.motion.div,
        {
          variants: itemVariants,
          className: "w-full pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-6 sm:gap-8 text-xs text-slate-400"
        },
        /* @__PURE__ */ import_react2.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-sky-400 font-bold text-sm" }, "\u{1F3AF} 99.4%"), /* @__PURE__ */ import_react2.default.createElement("span", null, "Precis\xE3o Preditiva")),
        /* @__PURE__ */ import_react2.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-emerald-400 font-bold text-sm" }, "\u23F1\uFE0F +45 min"), /* @__PURE__ */ import_react2.default.createElement("span", null, "Alerta Antecipado")),
        /* @__PURE__ */ import_react2.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-blue-400 font-bold text-sm" }, "\u{1F4CD} Grande SP"), /* @__PURE__ */ import_react2.default.createElement("span", null, "Cobertura Cont\xEDnua"))
      )
    ), /* @__PURE__ */ import_react2.default.createElement(
      import_framer_motion2.motion.div,
      {
        initial: { opacity: 0, scale: 0.92, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] },
        className: "lg:col-span-5 flex items-center justify-center w-full"
      },
      /* @__PURE__ */ import_react2.default.createElement(
        DynamicLogo,
        {
          logoSrc,
          weatherData,
          onWeatherClick: handleScrollToWeather
        }
      )
    ))), /* @__PURE__ */ import_react2.default.createElement(import_framer_motion2.AnimatePresence, null, isRedirecting && /* @__PURE__ */ import_react2.default.createElement(
      import_framer_motion2.motion.div,
      {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        className: "fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-sky-400/60 shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(56,189,248,0.3)] rounded-2xl p-4 flex items-center gap-3 backdrop-blur-xl text-white max-w-sm"
      },
      /* @__PURE__ */ import_react2.default.createElement("div", { className: "w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-xl shrink-0 animate-spin" }, "\u23F3"),
      /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "text-xs font-bold text-sky-400 uppercase tracking-wider" }, "Autentica\xE7\xE3o Necess\xE1ria"), /* @__PURE__ */ import_react2.default.createElement("div", { className: "text-sm font-semibold text-slate-200" }, "Redirecionando para a tela de login seguro..."))
    )));
  }

  // src/index.jsx
  function initHero() {
    const container = document.getElementById("hero-root");
    if (!container) return;
    const root = import_client.default.createRoot(container);
    root.render(/* @__PURE__ */ import_react3.default.createElement(HeroSection, null));
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHero);
  } else {
    initHero();
  }
  return __toCommonJS(index_exports);
})();
