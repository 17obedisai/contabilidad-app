export const EVAL_CATS = [
  { id:"ec",   label:"Eval. Contadora",    icon:"👩‍💼", weight:20, type:"cont"  },
  { id:"ae",   label:"Autoevaluación",     icon:"🪞",   weight:8,  type:"self"  },
  { id:"err",  label:"Precisión Contable", icon:"🎯",   weight:18, type:"count", unit:"errores",   pen:4,   start:100 },
  { id:"punt", label:"Puntualidad",        icon:"⏰",   weight:13, type:"count", unit:"tardanzas",  pen:1.5, start:100 },
  { id:"perm", label:"Permisos",           icon:"📋",   weight:7,  type:"ct",   unit:"permisos",  free:2,  pen:15,  start:100 },
  { id:"sal",  label:"Salidas",            icon:"🚪",   weight:6,  type:"ct",   unit:"salidas",   free:4,  pen:5,   start:100 },
  { id:"uni",  label:"Uniforme",           icon:"👔",   weight:9,  type:"count", unit:"fallas",   pen:20,  start:100 },
  { id:"part", label:"Participación",      icon:"🎉",   weight:9,  type:"part"  },
  { id:"quiz", label:"Quiz",               icon:"📝",   weight:10, type:"quiz"  },
]

export const EV_ITEMS = [
  { id:"ep", label:"Puntualidad",          icon:"⏰" },
  { id:"et", label:"Calidad del trabajo",  icon:"✨" },
  { id:"ea", label:"Actitud y disposición",icon:"💪" },
  { id:"el", label:"Aprendizaje",          icon:"📚" },
  { id:"ee", label:"Trabajo en equipo",    icon:"🤝" },
  { id:"em", label:"Comunicación",         icon:"💬" },
  { id:"er", label:"Proactividad",         icon:"🚀" },
  { id:"eu", label:"Uso del uniforme",     icon:"👔" },
  { id:"ex", label:"Participación",        icon:"🎉" },
  { id:"eg", label:"Evaluación general",   icon:"⭐" },
]

export function calcMetric(cat, v) {
  if (v == null || v === "") return null
  const n = Number(v)
  if (cat.type === "count") return Math.max(0, cat.start - n * cat.pen)
  if (cat.type === "ct")    return Math.max(0, cat.start - Math.max(0, n - cat.free) * cat.pen)
  if (cat.type === "part" || cat.type === "quiz") return Math.min(100, Math.max(0, n))
  return n
}

export function catScore(evalData, catId) {
  const cat = EVAL_CATS.find(c => c.id === catId)
  if (!cat || !evalData) return null

  if (cat.type === "self") {
    let s = 0, c = 0
    EV_ITEMS.forEach(({ id }) => {
      const v = evalData.self_eval?.[id]
      if (v != null && v !== "") { s += Number(v) * 10; c++ }
    })
    return c > 0 ? s / c : null
  }

  if (cat.type === "cont") {
    let s = 0, c = 0
    EV_ITEMS.forEach(({ id }) => {
      const v = evalData.cont_eval?.[id]
      if (v != null && v !== "") { s += Number(v) * 10; c++ }
    })
    return c > 0 ? s / c : null
  }

  return calcMetric(cat, evalData.metrics?.[catId])
}

export function computeMonthScore(evalData) {
  if (!evalData) return 0
  let tot = 0, tw = 0
  EVAL_CATS.forEach(cat => {
    const s = catScore(evalData, cat.id)
    if (s != null) { tot += (s * cat.weight) / 100; tw += cat.weight }
  })
  return tw > 0 ? (tot / tw) * 100 : 0
}

export function computeYearScore(allData) {
  let s = 0, c = 0
  for (let m = 1; m <= 12; m++) {
    const t = computeMonthScore(allData[String(m)])
    if (t > 0) { s += t; c++ }
  }
  return c > 0 ? s / c : 0
}
