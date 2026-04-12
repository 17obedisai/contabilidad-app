"""
Run: python seed.py
Seeds users, quizzes (12 months), tasks and board items.
Safe to re-run — each section skips already-existing documents.

Month convention: 1 = January … 12 = December (1-indexed).
Collection names must match the routes:  users · quizzes · tasks · board
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import hash_password

YEAR = 2026

# ── nick → original numeric id mapping (for tasks / board lookup) ────────────
NICK_TO_NUM = {
    "yennifer": 1, "sandra": 2, "juan": 3, "fabian": 4, "jair": 5,
    "sazu": 6, "nevis": 7, "karen": 8, "obed": 9, "nelson": 10,
}

# ── TEAM ─────────────────────────────────────────────────────────────────────
TEAM = [
    {"name": "Yennifer",      "nick": "yennifer", "role": "Contadora",               "emoji": "👩‍💼", "level": 1, "isCont": True,  "noQuiz": False, "password": "yenni25"},
    {"name": "Sandra",        "nick": "sandra",   "role": "Coord. Tributaria",        "emoji": "📊",  "level": 2, "isCont": False, "noQuiz": False, "password": "sandra25"},
    {"name": "Juan",          "nick": "juan",     "role": "Asist. Puntos Compra",     "emoji": "☕",  "level": 3, "isCont": False, "noQuiz": False, "password": "juan25"},
    {"name": "Fabián",        "nick": "fabian",   "role": "Asist. CXP Generales",     "emoji": "📑",  "level": 3, "isCont": False, "noQuiz": False, "password": "fabian25"},
    {"name": "Jair",          "nick": "jair",     "role": "Asist. Tributario",        "emoji": "🧾",  "level": 3, "isCont": False, "noQuiz": False, "password": "jair25"},
    {"name": "Sandra Azucena","nick": "sazu",     "role": "Aux. Legalizaciones",      "emoji": "📂",  "level": 4, "isCont": False, "noQuiz": False, "password": "sazu25"},
    {"name": "Nevis",         "nick": "nevis",    "role": "Aux. Proveedores",         "emoji": "🏪",  "level": 4, "isCont": False, "noQuiz": False, "password": "nevis25"},
    {"name": "Karen",         "nick": "karen",    "role": "Aux. Puntos Venta",        "emoji": "🛒",  "level": 4, "isCont": False, "noQuiz": False, "password": "karen25"},
    {"name": "Obed",          "nick": "obed",     "role": "Pasante SENA",             "emoji": "💻",  "level": 5, "isCont": False, "noQuiz": True,  "password": "obed25"},
    {"name": "Nelson",        "nick": "nelson",   "role": "Asist. Contable",          "emoji": "📋",  "level": 3, "isCont": False, "noQuiz": False, "password": "nelson25"},
]

# ── helpers ───────────────────────────────────────────────────────────────────
def q(text, options, correct, difficulty):
    return {"text": text, "options": options, "correct": correct, "difficulty": difficulty}

# ── 12 MONTHLY QUIZZES ────────────────────────────────────────────────────────
# months 8-12 share these 15 questions
_REPEAT_QS = [
    q("¿Cuál es la base en UVT para retención por compra general?",
      ["2 UVT","5 UVT","10 UVT","27 UVT"], 2, "m"),
    q("La retención por restaurante, hotel y hospedaje es del:",
      ["1%","2%","3.5%","4%"], 2, "m"),
    q("¿Qué código BTER tiene un Gran Contribuyente que NO es autorretenedor?",
      ["100","101","102","103"], 1, "m"),
    q("¿Cuál es la base de ReteICA en Pital?",
      ["$262.000","$524.000","$1","$1.047.500"], 2, "m"),
    q("Los medios magnéticos para alcaldías son elaborados por:",
      ["El pasante","La coordinadora tributaria","El área de sistemas","Gerencia"], 1, "m"),
    q("¿Cuál es la tarifa de retención por compra de bienes para persona natural declarante?",
      ["1.5%","2.5%","3.5%","4%"], 1, "m"),
    q("El manual SARLAFT es de cumplimiento:",
      ["Opcional","Obligatorio para todos","Solo para la contadora","Solo para tributaria"], 1, "m"),
    q("¿Qué documento se necesita para habilitar resolución de facturación de un asociado?",
      ["Cédula","RUT actualizado","Extracto bancario","Carta de autorización firmada"], 3, "m"),
    q("Las cuentas de orden se clasifican en:",
      ["Solo deudoras","Solo acreedoras","Deudoras y acreedoras","No existen en el PUC"], 2, "m"),
    q("¿Cuál es el plazo para actualizar el régimen especial ante la DIAN?",
      ["Primeros 3 meses","Primeros 6 meses","Todo el año","No tiene plazo"], 1, "m"),
    q("La encuesta DANE de comercio se elabora:",
      ["Semanal","Mensual/Anual","Trimestral","Solo cuando lo solicitan"], 1, "m"),
    q("En el municipio de Agrado, la base para ReteICA es:",
      ["$262.000","$524.000","$1","$1.047.500"], 2, "m"),
    q("¿Qué es la contribución cafetera?",
      ["Un impuesto municipal","Un aporte obligatorio por compra de café","Una donación voluntaria","Un subsidio del gobierno"], 1, "m"),
    q("El cierre de costos de producción en OasisCom se hace a través de:",
      ["BTER","KSPT","UPGA","EBOFAC"], 2, "m"),
    q("¿Para qué sirve la tabla de períodos en OasisCom?",
      ["Solo para inventarios","Para actualizar % interés de cartera y abrir/cerrar períodos","Para nómina","Para generar informes"], 1, "d"),
]

QUIZZES = [
    # ── Mes 1: Enero — Fundamentos contables y IVA ──────────────────────────
    {"month": 1, "title": "Fundamentos contables y IVA", "questions": [
        q("¿Cuál es la ecuación contable fundamental?",
          ["Activo = Pasivo + Patrimonio","Activo = Pasivo − Patrimonio","Patrimonio = Activo + Pasivo","Activo + Patrimonio = Pasivo"], 0, "f"),
        q("¿Cuál es la tarifa general del IVA en Colombia?",
          ["16%","19%","21%","15%"], 1, "f"),
        q("La retención en la fuente por servicios en general para persona jurídica es del:",
          ["2%","4%","6%","3.5%"], 1, "m"),
        q("Según la tabla 2026, ¿a partir de qué monto se retiene por compra de bienes en general?",
          ["$105.000","$262.000","$524.000","$1.000.000"], 2, "m"),
        q("¿Cuál es el valor de la UVT para el año 2026?",
          ["$49.799","$47.065","$52.374","$50.000"], 2, "m"),
        q("La retención por arrendamiento de bienes inmuebles es del:",
          ["2.5%","3.5%","4%","5%"], 1, "m"),
        q("¿Cuántas UVT es la base para retención por compra de café pergamino?",
          ["10 UVT","27 UVT","50 UVT","70 UVT"], 3, "d"),
        q("La tarifa de retención por café pergamino o cereza es del:",
          ["1%","0.5%","1.5%","2%"], 1, "m"),
        q("¿Cuál es la retención del IVA (Reteiva) tanto para bienes como servicios?",
          ["10% del IVA","15% del IVA","19% del IVA","50% del IVA"], 1, "m"),
        q("La base para retención por servicios en general es de:",
          ["$524.000","$262.000","$105.000 (2 UVT)","$1.000.000"], 2, "m"),
        q("¿Cuál es el salario mínimo legal vigente 2026?",
          ["$1.423.500","$1.300.000","$1.750.905","$1.600.000"], 2, "f"),
        q("El auxilio de transporte 2026 es de:",
          ["$200.000","$162.000","$249.095","$180.000"], 2, "m"),
        q("¿Qué cuenta del PUC representa la retención en la fuente por pagar?",
          ["2365","1355","4135","2408"], 0, "m"),
        q("Según NIIF 15, ¿cuándo se reconoce un ingreso?",
          ["Al recibir efectivo","Al satisfacer obligación de desempeño","Al firmar contrato","Al emitir factura"], 1, "d"),
        q("¿Cuál es la sanción mínima DIAN 2026?",
          ["$498.000","$424.000","$524.000","$380.000"], 2, "m"),
    ]},
    # ── Mes 2: Febrero — Retenciones y tipos contribuyentes ─────────────────
    {"month": 2, "title": "Retenciones y tipos de contribuyentes", "questions": [
        q("La retención por honorarios para persona jurídica es del:",
          ["10%","11%","6%","4%"], 1, "m"),
        q("La retención por transporte nacional de carga es del:",
          ["1%","2%","3.5%","4%"], 0, "m"),
        q("¿Cuál es la retención para contratos de interventoría/consultoría para persona jurídica?",
          ["4%","6%","10%","11%"], 1, "m"),
        q("La retención por compra de combustibles derivados del petróleo es del:",
          ["0.1%","0.5%","1%","2%"], 0, "m"),
        q("¿A partir de cuántas UVT se retiene por compra de productos agrícolas sin procesamiento?",
          ["10 UVT","27 UVT","50 UVT","70 UVT"], 3, "d"),
        q("La retención en loterías, rifas y apuestas es del:",
          ["10%","15%","20%","25%"], 2, "m"),
        q("¿Cuál es la retención por rendimientos financieros?",
          ["4%","7%","10%","11%"], 1, "m"),
        q("La retención por servicios de vigilancia o aseo (sobre AIU) es del:",
          ["1%","2%","4%","6%"], 1, "m"),
        q("¿Qué significa ser Gran Contribuyente Autorretenedor (código BTER 100)?",
          ["Tiene código 13 en RUT","Tiene códigos 13 y 23 en RUT","Tiene código 23 solamente","Tiene código 04 en RUT"], 1, "d"),
        q("El código BTER 203 corresponde a:",
          ["Gran Contribuyente","Régimen Simple","Régimen Tributario Especial","No responsable de IVA"], 2, "d"),
        q("La retención por Otros Ingresos Tributarios para persona jurídica es del:",
          ["1.5%","2%","2.5%","3.5%"], 2, "m"),
        q("La retención por compra de bienes muebles es del:",
          ["2.5%","3.5%","4%","1%"], 2, "m"),
        q("¿A partir de cuánto se retiene por honorarios persona natural no declarante?",
          ["$1","$105.000","$524.000","No tiene base mínima"], 0, "m"),
        q("La retención para persona natural no declarante por servicios en general es del:",
          ["4%","6%","10%","3.5%"], 1, "m"),
        q("¿Cuál es la tarifa de retención por transporte terrestre de pasajeros?",
          ["1%","2%","3.5%","4%"], 2, "m"),
    ]},
    # ── Mes 3: Marzo — ReteICA Municipal ────────────────────────────────────
    {"month": 3, "title": "ReteICA Municipal", "questions": [
        q("¿A partir de cuánto se aplica ReteICA en Garzón por compra de bienes y servicios?",
          ["$1","$105.000","$262.000","$524.000"], 2, "m"),
        q("¿Cuántas UVT es la base de ReteICA en Garzón?",
          ["2 UVT","5 UVT","10 UVT","27 UVT"], 1, "m"),
        q("¿En cuál municipio la base de ReteICA por compra de bienes es de 40 UVT ($2.094.960)?",
          ["Garzón","Gigante","La Plata","Pitalito"], 1, "m"),
        q("¿Cuál es la tarifa de ReteICA en Gigante?",
          ["5x1000","3x1000","6x1000","1%"], 1, "m"),
        q("En el municipio de Tarqui, ¿cuál es la tarifa de ReteICA?",
          ["5x1000","3x1000","1%","6x1000"], 2, "m"),
        q("¿En Suaza existe la obligación de medios magnéticos?",
          ["Sí","No","Solo por oficio","Depende del monto"], 0, "m"),
        q("¿Cuál es la base para ReteICA por prestación de servicios en Acevedo?",
          ["$1","$209.500 (4 UVT)","$524.000","$2.618.700"], 1, "d"),
        q("¿En cuál municipio la base de compra de bienes para ReteICA es de 50 UVT?",
          ["Garzón","Timaná","Acevedo","Bogotá"], 2, "m"),
        q("La tarifa de ReteICA en Timaná es de:",
          ["3x1000","5x1000","6x1000","1%"], 2, "m"),
        q("Para Bogotá, ¿cuál es la base de ReteICA por compra de bienes?",
          ["$262.000","$524.000","$1.047.500","$1.414.098 (27 UVT)"], 3, "d"),
        q("¿En cuál municipio NO se presentan medios magnéticos?",
          ["Garzón","Guadalupe","Pitalito","Bogotá"], 1, "m"),
        q("¿Cuál es la tarifa de ReteICA por bienes en Guadalupe?",
          ["3x1000","5x1000","6x1000","1%"], 1, "m"),
        q("En La Plata, la base para compra de bienes es de:",
          ["4 UVT","10 UVT","20 UVT","50 UVT"], 2, "m"),
        q("¿Cuál municipio tiene la base más baja ($1) para ReteICA?",
          ["Garzón","Suaza","Gigante","Timaná"], 1, "m"),
        q("¿En Pitalito cuál es la base para prestación de servicios?",
          ["$104.748 (2 UVT)","$209.500 (4 UVT)","$523.740 (10 UVT)","$1.047.480"], 0, "d"),
    ]},
    # ── Mes 4: Abril — NIIF y estados financieros ────────────────────────────
    {"month": 4, "title": "NIIF y estados financieros", "questions": [
        q("¿Qué norma NIIF regula los arrendamientos para el arrendatario?",
          ["NIC 17","NIIF 16","NIC 36","NIIF 9"], 1, "d"),
        q("¿Qué sección de NIIF para PYMES regula instrumentos financieros básicos?",
          ["Sección 9","Sección 11","Sección 15","Sección 20"], 1, "d"),
        q("Un anticipo de un cliente por servicios futuros se registra como:",
          ["Ingreso","Activo diferido","Pasivo (ingreso por anticipado)","Cuenta por cobrar"], 2, "m"),
        q("Una diferencia temporaria imponible según NIC 12 genera:",
          ["Activo por impuesto diferido","Pasivo por impuesto diferido","Gasto no deducible","Reserva patrimonial"], 1, "d"),
        q("¿Cuáles son los estados financieros básicos según NIIF?",
          ["Balance y P&G solamente","ESF, ERI, EFE, Estado cambios patrimonio, Notas","Balance, P&G y Flujo de caja","ESF y ERI únicamente"], 1, "m"),
        q("¿Qué método de depreciación genera mayor gasto en primeros años?",
          ["Línea recta","Unidades producción","Saldos decrecientes","Todos iguales"], 2, "m"),
        q("La compra de PPE en el Estado de Flujos de Efectivo se clasifica como:",
          ["Actividad de operación","Actividad de inversión","Actividad de financiación","No se incluye"], 1, "m"),
        q("Si el ratio corriente es 0.7, significa que:",
          ["Buena liquidez","Activos corrientes no cubren pasivos corrientes","Exceso de inventario","Bajo endeudamiento"], 1, "m"),
        q("¿Qué es el EBITDA?",
          ["Utilidad neta","Utilidad antes de intereses, impuestos, depreciación y amortización","Flujo de caja operativo","Margen bruto"], 1, "m"),
        q("¿Cada cuánto se debe realizar el cierre contable según la normatividad?",
          ["Trimestral","Semestral","Mensual y anual","Solo anual"], 2, "m"),
        q("¿Qué NIC regula la presentación de estados financieros?",
          ["NIC 1","NIC 7","NIC 16","NIC 38"], 0, "m"),
        q("El deterioro de inventarios se contabiliza contra:",
          ["Patrimonio","Gasto del período","Provisiones a largo plazo","Cuentas de orden"], 1, "m"),
        q("¿Qué es una provisión según NIC 37?",
          ["Una estimación contable cualquiera","Un pasivo de monto o vencimiento incierto","Una reserva de capital","Un activo contingente"], 1, "d"),
        q("La moneda funcional según NIC 21 es:",
          ["Siempre el peso colombiano","La del país donde opera","La del entorno económico principal de la entidad","La del país de los accionistas"], 2, "d"),
        q("¿Qué significa el principio de 'Empresa en Marcha'?",
          ["La empresa es rentable","La empresa continuará operando en el futuro previsible","La empresa no tiene deudas","La empresa crece cada año"], 1, "f"),
    ]},
    # ── Mes 5: Mayo — Declaraciones tributarias ──────────────────────────────
    {"month": 5, "title": "Declaraciones tributarias", "questions": [
        q("¿Cuál es el período gravable del impuesto de renta en Colombia?",
          ["Mensual","Bimestral","Anual (ene 1 - dic 31)","Semestral"], 2, "f"),
        q("¿Cuál es la tarifa de renta para personas jurídicas en Colombia?",
          ["30%","33%","35%","25%"], 2, "m"),
        q("Las declaraciones de IVA para Coocentral son:",
          ["Mensuales","Bimestrales","Cuatrimestrales","Anuales"], 1, "m"),
        q("¿Qué es la información exógena?",
          ["Los estados financieros","Un reporte detallado de operaciones a la DIAN","La declaración de renta","El RUT actualizado"], 1, "m"),
        q("¿Cuál es la base para que un asalariado NO esté obligado a declarar renta (patrimonio)?",
          ["1.400 UVT","3.000 UVT","4.500 UVT","6.000 UVT"], 2, "d"),
        q("En pesos, ¿cuál es el tope de patrimonio para no declarar renta (4.500 UVT)?",
          ["$150.000.000","$200.000.000","$224.096.000","$250.000.000"], 2, "d"),
        q("El tope de ingresos brutos para no declarar renta es de:",
          ["1.000 UVT","1.400 UVT","2.300 UVT","4.500 UVT"], 1, "m"),
        q("¿Cuál es el tope en pesos de ingresos para no declarar renta?",
          ["$52.374.000","$69.719.000","$100.000.000","$80.000.000"], 1, "d"),
        q("¿Qué tope aplica para consumos con tarjeta de crédito para no declarar?",
          ["1.000 UVT","1.400 UVT","2.300 UVT","4.500 UVT"], 1, "m"),
        q("¿Qué es el régimen simple de tributación?",
          ["Un impuesto para grandes empresas","Un modelo integrado que sustituye renta e ICA","Un régimen para asalariados","Una exención total"], 1, "m"),
        q("El código DIAN 47 en el RUT corresponde a:",
          ["Gran Contribuyente","Autorretenedor","Régimen Simple de Tributación","Facturador electrónico"], 2, "m"),
        q("¿Cuál es la responsabilidad código 52 en el RUT?",
          ["Declarante de renta","Responsable de IVA","Facturador electrónico","Agente retenedor"], 2, "m"),
        q("La actualización del RUB (Registro Único de Beneficiarios Finales) es obligatoria para:",
          ["Solo personas naturales","Personas jurídicas y similares","Solo entidades sin ánimo de lucro","Nadie, es voluntario"], 1, "m"),
        q("¿Cuándo se renueva la matrícula mercantil ante Cámara de Comercio?",
          ["Cada 5 años","Anualmente en los primeros 3 meses","Cada 2 años","No se renueva"], 1, "m"),
        q("¿Qué es la permanencia en régimen especial ante la DIAN?",
          ["Un trámite de una sola vez","Una actualización anual en los primeros 6 meses","Un proceso cada 5 años","Solo aplica a entidades públicas"], 1, "d"),
    ]},
    # ── Mes 6: Junio — Facturación electrónica y BTER ────────────────────────
    {"month": 6, "title": "Facturación electrónica y BTER", "questions": [
        q("¿Qué es BTER en OasisCom?",
          ["Un módulo de tesorería","El módulo de terceros","Un reporte tributario","Una base de datos de empleados"], 1, "f"),
        q("¿Qué campo de BTER se activa cuando el tercero tiene código 52?",
          ["isEbill","isGranContribuyente","isAutoRetenedor","isExento"], 0, "m"),
        q("El código BTER 100 corresponde a:",
          ["Régimen Simple","Gran Contribuyente Autorretenedor","Régimen Común","No responsable de IVA"], 1, "m"),
        q("¿Qué códigos DIAN identifica al código BTER 204 (ESAL)?",
          ["04 y 23","13 y 48","04 y 74","05 y 49"], 2, "d"),
        q("El código BTER 207 corresponde a:",
          ["Gran Contribuyente","Régimen Tributario Especial","Régimen Simple de Tributación","No responsable de IVA"], 2, "m"),
        q("¿En qué casilla del RUT se encuentran las responsabilidades?",
          ["Casilla 48","Casilla 50","Casilla 53","Casilla 55"], 2, "m"),
        q("¿Qué es el RADIAN?",
          ["Un módulo de nómina","El sistema de aceptación de facturas electrónicas","Un tipo de impuesto","Un formato de declaración"], 1, "m"),
        q("¿Qué es el código alterno en BTER?",
          ["El NIT del tercero","El año de generación del RUT","El código CIIU","La dirección"], 1, "d"),
        q("Un tercero con códigos 05 + 49 + 52 en el RUT tiene código BTER:",
          ["200","201","205","206"], 2, "d"),
        q("¿Qué es el dígito de verificación?",
          ["El código de seguridad del RUT","Número de control después del guión en el NIT","El código CIIU","El número de folio"], 1, "m"),
        q("El campo 'Sexo' en BTER para persona jurídica se marca como:",
          ["M","F","J","E"], 3, "m"),
        q("¿Qué es zBase en el contexto de Coocentral?",
          ["Un sistema de contabilidad","Un cruce para asociados con NIT como código cliente","Una base de datos tributaria","El inventario general"], 1, "d"),
        q("¿Cuándo se debe activar isEbill en un tercero?",
          ["Siempre","Cuando tiene código 52 en responsabilidades","Cuando es persona jurídica","Cuando es Gran Contribuyente"], 1, "m"),
        q("El código BTER 153 corresponde a cooperativas con códigos:",
          ["04 y 23","13 y 48","04 y 48","05 y 49"], 2, "d"),
        q("¿Qué documento es fuente principal para actualizar BTER?",
          ["Cámara de Comercio","RUT expedido por DIAN","Extracto bancario","NIT impreso"], 1, "f"),
    ]},
    # ── Mes 7: Julio — Conciliaciones y módulos OasisCom ─────────────────────
    {"month": 7, "title": "Conciliaciones y módulos OasisCom", "questions": [
        q("¿Cuál es el objetivo principal de una conciliación bancaria?",
          ["Calcular intereses","Comparar saldos del banco con los del libro contable","Determinar impuestos","Calcular nómina"], 1, "f"),
        q("¿Qué módulos de OasisCom se concilian mensualmente con contabilidad?",
          ["Solo PRCS","PRCS, TRCS, IRCS, CRCS, HRCS","Solo HRCS","PRCS y TRCS"], 1, "m"),
        q("¿Qué opción de OasisCom se usa para verificar saldos de caja?",
          ["UPGA","KRCC y KSPC","BTER","KSPT"], 1, "m"),
        q("¿Cada cuánto se envía el informe de Línea de Financiamiento a la FNC?",
          ["Semanalmente","El 15 de cada mes","Trimestralmente","Anualmente"], 1, "m"),
        q("¿Qué es la opción UPGA en OasisCom?",
          ["Un módulo de nómina","El proceso de cierre de costos de producción","Un reporte de inventarios","La conciliación bancaria"], 1, "m"),
        q("¿Qué es KSPT en OasisCom?",
          ["Control de inventarios","Módulo de saldos contrarios","Gestión de activos","Nómina electrónica"], 1, "d"),
        q("Las legalizaciones de anticipos a empleados deben contar con:",
          ["Solo la factura","Soportes idóneos debidamente autorizados","El visto bueno del gerente","Una carta del empleado"], 1, "m"),
        q("¿Qué es el módulo EBOFAC?",
          ["Exportación de datos","Módulo de facturas electrónicas recibidas","Creación de terceros","Inventarios"], 1, "m"),
        q("La conciliación de provisión agrícola se coordina con:",
          ["El área jurídica","El área comercial","El área de sistemas","Gerencia directamente"], 1, "m"),
        q("Los aportes sociales mínimos irreducibles se contabilizan:",
          ["Diariamente","Semanalmente","Mensualmente","Anualmente"], 2, "m"),
        q("¿Qué se verifica en la revisión de resoluciones de facturación?",
          ["Los precios de venta","Los vencimientos de las resoluciones","Los proveedores activos","Los saldos bancarios"], 1, "m"),
        q("¿Cuál es la frecuencia del envío de información a Supersolidaria?",
          ["Semanal","Mensual","Trimestral","Anual"], 1, "m"),
        q("¿Qué software usa Coocentral como sistema contable?",
          ["SAP","Siigo","OasisCom","World Office"], 2, "f"),
        q("¿Qué es el SICSES?",
          ["Un módulo de nómina","Aplicativo para reportar a Supersolidaria","Un sistema de facturación","Una herramienta de auditoría"], 1, "m"),
        q("La revisión del RUT y documentos de terceros se debe hacer:",
          ["Semanalmente","Diariamente","Mensualmente","Solo al crear el tercero"], 1, "m"),
    ]},
    # ── Meses 8-12: comparten el mismo banco de preguntas ────────────────────
    *[{"month": m, "title": f"Repaso general — mes {m}", "questions": _REPEAT_QS}
      for m in range(8, 13)],
]

# ── INITIAL TASKS (keyed by original numeric id) ──────────────────────────────
# fmt: {type, freq, hoursEstimated, hoursActual}
IT = {
    1: [
        {"type": "Control contabilidad",      "freq": "diaria",   "hoursEstimated": 2,    "hoursActual": 0},
        {"type": "Liderazgo equipo",           "freq": "diaria",   "hoursEstimated": 1,    "hoursActual": 0},
        {"type": "Parametrización OasisCom",   "freq": "semanal",  "hoursEstimated": 3,    "hoursActual": 0},
        {"type": "Apertura/cierre períodos",   "freq": "mensual",  "hoursEstimated": 8,    "hoursActual": 0},
        {"type": "Supervisión contabilización","freq": "diaria",   "hoursEstimated": 1.5,  "hoursActual": 0},
        {"type": "Revisión notas contables",   "freq": "mensual",  "hoursEstimated": 12,   "hoursActual": 0},
        {"type": "Informe Línea FNC",          "freq": "mensual",  "hoursEstimated": 6,    "hoursActual": 0},
        {"type": "Cierre costos UPGA",         "freq": "mensual",  "hoursEstimated": 8,    "hoursActual": 0},
        {"type": "Amortizaciones",             "freq": "mensual",  "hoursEstimated": 4,    "hoursActual": 0},
        {"type": "Estados financieros",        "freq": "mensual",  "hoursEstimated": 16,   "hoursActual": 0},
        {"type": "Informes Almacafé",          "freq": "mensual",  "hoursEstimated": 8,    "hoursActual": 0},
        {"type": "Supersolidaria SICSES",      "freq": "mensual",  "hoursEstimated": 8,    "hoursActual": 0},
        {"type": "Apoyo exógena/renta",        "freq": "mensual",  "hoursEstimated": 10,   "hoursActual": 0},
    ],
    2: [
        {"type": "Planeación tributaria",             "freq": "mensual",  "hoursEstimated": 8,  "hoursActual": 0},
        {"type": "Declaraciones IVA/Ret/ICA/Renta",   "freq": "mensual",  "hoursEstimated": 24, "hoursActual": 0},
        {"type": "Requerimientos DIAN",               "freq": "mensual",  "hoursEstimated": 12, "hoursActual": 0},
        {"type": "Verificación fact. electrónica",    "freq": "semanal",  "hoursEstimated": 4,  "hoursActual": 0},
        {"type": "Información exógena",               "freq": "mensual",  "hoursEstimated": 16, "hoursActual": 0},
        {"type": "Medios magnéticos",                 "freq": "mensual",  "hoursEstimated": 6,  "hoursActual": 0},
        {"type": "Orientación tributaria",            "freq": "semanal",  "hoursEstimated": 3,  "hoursActual": 0},
        {"type": "Supervisión Supersolidaria",        "freq": "mensual",  "hoursEstimated": 4,  "hoursActual": 0},
        {"type": "Actualización RUB/RUT",             "freq": "mensual",  "hoursEstimated": 3,  "hoursActual": 0},
        {"type": "Plan beneficios tributarios",       "freq": "mensual",  "hoursEstimated": 6,  "hoursActual": 0},
        {"type": "Revisión facturación ICA",          "freq": "mensual",  "hoursEstimated": 8,  "hoursActual": 0},
    ],
    3: [
        {"type": "Conciliación bancarias",      "freq": "mensual",  "hoursEstimated": 90,  "hoursActual": 0},
        {"type": "Informe línea financ.",       "freq": "mensual",  "hoursEstimated": 8,   "hoursActual": 0},
        {"type": "Cruce anticipos café",        "freq": "diaria",   "hoursEstimated": 1,   "hoursActual": 0},
        {"type": "Liquidación intereses mora",  "freq": "mensual",  "hoursEstimated": 6,   "hoursActual": 0},
        {"type": "Facturas arrendamientos",     "freq": "mensual",  "hoursEstimated": 8,   "hoursActual": 0},
        {"type": "Legalizaciones anticipos",    "freq": "semanal",  "hoursEstimated": 3,   "hoursActual": 0},
        {"type": "Aportes sociales",            "freq": "mensual",  "hoursEstimated": 4,   "hoursActual": 0},
        {"type": "Conciliación módulos",        "freq": "mensual",  "hoursEstimated": 10,  "hoursActual": 0},
        {"type": "Soporte fieles compra",       "freq": "semanal",  "hoursEstimated": 3,   "hoursActual": 0},
        {"type": "Revisión RUT",                "freq": "diaria",   "hoursEstimated": 0.5, "hoursActual": 0},
    ],
    4: [
        {"type": "Contabilización diaria",      "freq": "diaria",   "hoursEstimated": 3,   "hoursActual": 0},
        {"type": "Predial/suelos/bomberos",     "freq": "mensual",  "hoursEstimated": 4,   "hoursActual": 0},
        {"type": "Cruce CxC/CxP",              "freq": "mensual",  "hoursEstimated": 10,  "hoursActual": 0},
        {"type": "Conciliación CxP vs DIAN",   "freq": "mensual",  "hoursEstimated": 12,  "hoursActual": 0},
        {"type": "Revisión RUT",               "freq": "diaria",   "hoursEstimated": 0.5, "hoursActual": 0},
        {"type": "Creación terceros",          "freq": "diaria",   "hoursEstimated": 0.5, "hoursActual": 0},
        {"type": "Ajustes contables",          "freq": "semanal",  "hoursEstimated": 2,   "hoursActual": 0},
    ],
    5: [
        {"type": "Inscripción RUT",             "freq": "diaria",   "hoursEstimated": 1,   "hoursActual": 0},
        {"type": "Facturación electrónica",     "freq": "diaria",   "hoursEstimated": 2,   "hoursActual": 0},
        {"type": "Actualización BTER",          "freq": "diaria",   "hoursEstimated": 1,   "hoursActual": 0},
        {"type": "Certificados ventas/ret",     "freq": "semanal",  "hoursEstimated": 3,   "hoursActual": 0},
        {"type": "Verificación envío DIAN",     "freq": "diaria",   "hoursEstimated": 1.5, "hoursActual": 0},
        {"type": "Aceptación RADIAN",           "freq": "diaria",   "hoursEstimated": 1,   "hoursActual": 0},
        {"type": "Módulo activos fijos",        "freq": "semanal",  "hoursEstimated": 4,   "hoursActual": 0},
        {"type": "Borrador exógena",            "freq": "mensual",  "hoursEstimated": 16,  "hoursActual": 0},
        {"type": "Excel Auditoría",             "freq": "mensual",  "hoursEstimated": 8,   "hoursActual": 0},
    ],
    6: [
        {"type": "Legalizaciones anticipos",    "freq": "diaria",   "hoursEstimated": 2.5, "hoursActual": 0},
        {"type": "Conciliación anticipos",      "freq": "mensual",  "hoursEstimated": 8,   "hoursActual": 0},
        {"type": "Informe anticipos",           "freq": "mensual",  "hoursEstimated": 6,   "hoursActual": 0},
        {"type": "Resoluciones DIAN",           "freq": "mensual",  "hoursEstimated": 4,   "hoursActual": 0},
        {"type": "Revisión conciliaciones",     "freq": "mensual",  "hoursEstimated": 12,  "hoursActual": 0},
        {"type": "Verificación OasisCom",       "freq": "diaria",   "hoursEstimated": 0.5, "hoursActual": 0},
        {"type": "Revisión RUT",                "freq": "diaria",   "hoursEstimated": 0.5, "hoursActual": 0},
        {"type": "Ajustes contables",           "freq": "semanal",  "hoursEstimated": 2,   "hoursActual": 0},
    ],
    7: [
        {"type": "Contabilización facturas prov.", "freq": "diaria",  "hoursEstimated": 3,   "hoursActual": 0},
        {"type": "Conciliación provisión",         "freq": "mensual", "hoursEstimated": 10,  "hoursActual": 0},
        {"type": "CxP Almacafé",                   "freq": "mensual", "hoursEstimated": 6,   "hoursActual": 0},
        {"type": "Conciliación proveedores",       "freq": "mensual", "hoursEstimated": 12,  "hoursActual": 0},
        {"type": "CxP FLO/proyectos",              "freq": "mensual", "hoursEstimated": 8,   "hoursActual": 0},
        {"type": "Encuesta DANE",                  "freq": "mensual", "hoursEstimated": 4,   "hoursActual": 0},
        {"type": "Certificados retenciones",       "freq": "mensual", "hoursEstimated": 6,   "hoursActual": 0},
        {"type": "Revisión EBOFAC",                "freq": "diaria",  "hoursEstimated": 1,   "hoursActual": 0},
        {"type": "Consolidado CxC/CxP",            "freq": "mensual", "hoursEstimated": 8,   "hoursActual": 0},
        {"type": "Revisión RUT",                   "freq": "diaria",  "hoursEstimated": 0.5, "hoursActual": 0},
    ],
    8: [
        {"type": "Registro puntos venta",           "freq": "diaria",  "hoursEstimated": 3,   "hoursActual": 0},
        {"type": "Revisión saldos caja",            "freq": "diaria",  "hoursEstimated": 1,   "hoursActual": 0},
        {"type": "Conciliación PuntoRed/Efecty",    "freq": "mensual", "hoursEstimated": 12,  "hoursActual": 0},
        {"type": "Anticipos clientes",              "freq": "mensual", "hoursEstimated": 6,   "hoursActual": 0},
        {"type": "CxP honorarios/arrend.",          "freq": "mensual", "hoursEstimated": 8,   "hoursActual": 0},
        {"type": "Archivo general",                 "freq": "semanal", "hoursEstimated": 2,   "hoursActual": 0},
        {"type": "Revisión RUT",                    "freq": "diaria",  "hoursEstimated": 0.5, "hoursActual": 0},
        {"type": "Informe papelería",               "freq": "mensual", "hoursEstimated": 4,   "hoursActual": 0},
    ],
    9: [
        {"type": "Diseño interfaces",    "freq": "semanal", "hoursEstimated": 6,   "hoursActual": 0},
        {"type": "Corrección errores",   "freq": "diaria",  "hoursEstimated": 1.5, "hoursActual": 0},
        {"type": "Automatización Excel", "freq": "semanal", "hoursEstimated": 4,   "hoursActual": 0},
        {"type": "Manuales y guías",     "freq": "semanal", "hoursEstimated": 3,   "hoursActual": 0},
        {"type": "Asistencia técnica",   "freq": "diaria",  "hoursEstimated": 1,   "hoursActual": 0},
        {"type": "Casos errores → TIC",  "freq": "semanal", "hoursEstimated": 2,   "hoursActual": 0},
        {"type": "Revisión terceros",    "freq": "diaria",  "hoursEstimated": 1,   "hoursActual": 0},
    ],
    10: [
        {"type": "Seguridad social prest. servicios", "freq": "mensual", "hoursEstimated": 16, "hoursActual": 0},
        {"type": "Apoyo contabilización",             "freq": "diaria",  "hoursEstimated": 3,  "hoursActual": 0},
    ],
}

# ── INITIAL BOARD ITEMS ───────────────────────────────────────────────────────
# fmt: (numeric_id, title, desc, date, priority)
_BI_TODOS = [
    ("Actualización procedimientos depto.", "Todos", "", "baja"),
    ("Capacitaciones Platzi",               "Todos", "", "baja"),
    ("Auto control - revisión gastos",      "Todos", "", "baja"),
]

IB_RAW = [
    # (num_id, title, desc, date, priority)
    (5,  "Cancelar cuentas de orden",                 "",                                "10 abril",      "alta"),
    (5,  "Política contable Activos Fijos",           "",                                "07 mayo 2026",  "alta"),
    (5,  "Actualizar Base Terceros (Bter)",           "",                                "10 abril",      "alta"),
    (5,  "Tabla impuestos clasificación trámites",    "",                                "",              "media"),
    (5,  "Capacitación fieles obtención RUT",         "",                                "Junio",         "media"),
    (5,  "Capacitación Asociados Fact. Electrónica",  "",                                "Junio",         "media"),
    (5,  "Propuesta FE - Flujo de costos",            "",                                "Mayo",          "alta"),
    (5,  "Excel Auditoría",                           "concepto, cuenta, obs",           "",              "media"),
    (5,  "Capacitación nuevo personal",               "Con Juan",                        "",              "baja"),
    (8,  "Listado facturas pendientes",               "Con Nelson",                      "",              "alta"),
    (8,  "Verificación honorarios/arrendamientos",    "Correo enviado",                  "",              "media"),
    (8,  "Revisión listado ReteICA Ene-Feb",          "",                                "15 abril",      "alta"),
    (8,  "Revisión facturas pendientes Ene-Feb",      "",                                "15 febrero",    "media"),
    (10, "Seguridad social contratos",                "",                                "",              "alta"),
    (10, "Listado facturas pendientes",               "Con Karen",                       "",              "media"),
    (7,  "Mercancía consignación",                    "Subir al sistema",                "",              "alta"),
    (7,  "Explicar a Juan revisiones CXC/CXP",        "",                                "15 abril",      "alta"),
    (7,  "Fraccionamiento OCAF/Órdenes",              "",                                "",              "media"),
    (3,  "Fletes inventario",                         "Revisión",                        "Abril",         "alta"),
    (3,  "Caso conciliaciones",                       "",                                "Mayo",          "media"),
    (3,  "Prima Rain Forest",                         "",                                "Mayo",          "media"),
    (3,  "Inventario terceros",                       "café, fertilizantes, maquila",    "Mayo",          "alta"),
    (3,  "Contribución cafetera al costo",            "",                                "",              "media"),
    (3,  "Capacitación nuevo personal",               "Con Jair",                        "",              "baja"),
    (9,  "Rotación del inventario",                   "",                                "",              "media"),
    (9,  "Productos vencidos",                        "",                                "",              "media"),
    (9,  "Capacitaciones en IA",                      "Para equipo",                     "",              "alta"),
    (9,  "Evaluación de desempeño",                   "Este sistema",                    "",              "alta"),
    (9,  "Quiz de conocimientos",                     "Mensual",                         "",              "alta"),
    (9,  "Calendario Tareas Reunión",                 "Jueves",                          "",              "media"),
    (9,  "Enlace TIC",                                "Mejoramiento tecnológico",        "",              "alta"),
    (2,  "Plan beneficios tributarios",               "",                                "",              "alta"),
    (2,  "Revisión facturación municipios ICA",       "",                                "",              "media"),
    (2,  "Capacitación Asociados Fact. Electrónica",  "Con Jair",                        "Junio",         "media"),
    (2,  "Propuesta FE - Servicio integral",          "Con Jair",                        "",              "alta"),
    (2,  "Propuesta fact. créditos Garzón",           "Personas naturales, ahorro ICA",  "",              "alta"),
    (2,  "Propuesta FE apoyo social",                 "Costear nómina con FLO",          "",              "alta"),
    (2,  "Plan beneficios: primer empleo",            "Enlace con nómina",               "",              "alta"),
    (2,  "Donaciones Fundación deducción renta",      "",                                "",              "media"),
    (2,  "Activos productivos reducción renta",       "",                                "",              "media"),
    (2,  "Búsqueda opciones reducción tributos",      "",                                "",              "media"),
    (1,  "Revisión informes financieros mensuales",   "",                                "",              "alta"),
    (1,  "Cierre contable mensual",                   "",                                "",              "alta"),
    (1,  "Reuniones equipo contable",                 "Cada 15-20 días",                 "",              "media"),
]
# Add the 3 "Todos" items for every team member
for _m in TEAM:
    _num = NICK_TO_NUM[_m["nick"]]
    for _title, _desc, _date, _prio in _BI_TODOS:
        IB_RAW.append((_num, _title, _desc, _date, _prio))


# ── SEED ──────────────────────────────────────────────────────────────────────
async def seed():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    # ── 1. Users ──────────────────────────────────────────────────────────────
    print("\n── Users ──")
    users_by_num: dict[int, str] = {}   # numeric_id → mongodb _id string

    for member in TEAM:
        existing = await db.users.find_one({"nick": member["nick"]})
        num_id = NICK_TO_NUM[member["nick"]]
        if existing:
            users_by_num[num_id] = str(existing["_id"])
            print(f"  skip   {member['nick']}")
        else:
            doc = {
                "name": member["name"], "nick": member["nick"],
                "role": member["role"], "emoji": member["emoji"],
                "level": member["level"], "isCont": member["isCont"],
                "noQuiz": member["noQuiz"],
                "password_hash": hash_password(member["password"]),
            }
            res = await db.users.insert_one(doc)
            users_by_num[num_id] = str(res.inserted_id)
            print(f"  insert {member['nick']}")

    # ── 2. Quizzes ────────────────────────────────────────────────────────────
    print("\n── Quizzes ──")
    q_ins = q_skip = 0
    for quiz in QUIZZES:
        exists = await db.quizzes.find_one({"year": YEAR, "month": quiz["month"]})
        if exists:
            print(f"  skip   mes {quiz['month']:02d}")
            q_skip += 1
        else:
            await db.quizzes.insert_one({"year": YEAR, **quiz})
            print(f"  insert mes {quiz['month']:02d} — {quiz['title']}")
            q_ins += 1
    print(f"  → {q_ins} insertados, {q_skip} omitidos")

    # ── 3. Tasks ──────────────────────────────────────────────────────────────
    print("\n── Tasks ──")
    t_ins = t_skip = 0
    for num_id, task_list in IT.items():
        user_id = users_by_num.get(num_id)
        if not user_id:
            print(f"  WARN: no userId for num_id={num_id}")
            continue
        existing_count = await db.tasks.count_documents({"userId": user_id})
        if existing_count > 0:
            print(f"  skip   userId={user_id} ({existing_count} tareas ya existen)")
            t_skip += existing_count
            continue
        docs = [{"userId": user_id, **t} for t in task_list]
        await db.tasks.insert_many(docs)
        print(f"  insert {len(docs)} tareas → num_id={num_id}")
        t_ins += len(docs)
    print(f"  → {t_ins} insertadas, {t_skip} omitidas")

    # ── 4. Board items ────────────────────────────────────────────────────────
    print("\n── Board items ──")
    b_ins = b_skip = 0
    for num_id, title, desc, date, priority in IB_RAW:
        user_id = users_by_num.get(num_id)
        if not user_id:
            continue
        exists = await db.board.find_one({"userId": user_id, "title": title})
        if exists:
            b_skip += 1
            continue
        await db.board.insert_one({
            "userId": user_id, "title": title, "desc": desc,
            "date": date, "priority": priority,
            "status": "pendiente", "progress": 0,
            "observations": "", "obsHistory": [], "changes": [],
        })
        b_ins += 1
    print(f"  → {b_ins} insertados, {b_skip} omitidos")

    client.close()
    print("\n✓ Seed completado.")


if __name__ == "__main__":
    asyncio.run(seed())
