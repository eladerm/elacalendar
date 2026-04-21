"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var path_1 = require("path");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), '.env.local') });
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var app, db, sources, snapshot, docId, currentData, existingSources, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    app = (0, app_1.initializeApp)({ projectId: 'studio-3620711772-b2859' });
                    db = (0, firestore_1.getFirestore)(app);
                    sources = [
                        {
                            id: crypto.randomUUID(),
                            name: 'Despigmentación con láser',
                            type: 'text',
                            content: "Usar esta respuesta cuando el cliente pregunte por Despigmentaci\u00F3n de zonas.\n\n\u2728 Tratamiento de Despigmentaci\u00F3n con L\u00E1ser para aclarar y unificar el tono de la piel de forma progresiva y segura.\n\nMejora el tono, textura y apariencia sin procedimientos invasivos.\n\nIncluye evaluaci\u00F3n gratuita.\n\n\u00BFTe gustar\u00EDa agendar tu valoraci\u00F3n sin costo?\n\nSi el cliente pregunta espec\u00EDficamente por el precio, responder \u00FAnicamente con:\n\n\u2728 Para brindarte el mejor resultado, es fundamental realizar una evaluaci\u00F3n donde analizamos el grado y tipo de pigmentaci\u00F3n. De esta manera podemos dise\u00F1ar un tratamiento personalizado para ti. La valoraci\u00F3n es totalmente gratuita.\n\nContamos con promociones vigentes que se explican en la cita.\n\n\u00BFTe gustar\u00EDa reservar tu evaluaci\u00F3n totalmente gratis?",
                            status: 'ready'
                        },
                        {
                            id: crypto.randomUUID(),
                            name: 'Rejuvenecimiento facial con laser',
                            type: 'text',
                            content: "Usar esta respuesta cuando el cliente pregunte por Rejuvenecimiento Facial con L\u00E1ser (Hollywood Peeling) o su precio.\n\n\uD83D\uDD39 Si el cliente solicita informaci\u00F3n:\n\n\u2728 La Exfoliaci\u00F3n Facial con L\u00E1ser estimula la producci\u00F3n de col\u00E1geno, mejora la textura, luminosidad y ayuda a atenuar l\u00EDneas de expresi\u00F3n.\n\n\u2713 Mejora poros abiertos\n\u2713 Unifica el tono\n\u2713 Apoya en procesos de despigmentaci\u00F3n\n\nEs un tratamiento no invasivo y seguro.\n\n\uD83C\uDF81 Incluye limpieza facial gratuita.\n\nIncluye evaluaci\u00F3n sin costo.\n\n\u00BFTe gustar\u00EDa agendar tu valoraci\u00F3n?\n\n\uD83D\uDD39 Si el cliente solicita precio:\n\n\u2728 Para brindarte la mejor asesor\u00EDa y precio seg\u00FAn lo que tu piel necesite, contamos con una evaluaci\u00F3n gratuita sin compromiso.\n\n\u00BFTe reservo tu cupo para la evaluaci\u00F3n?",
                            status: 'ready'
                        },
                        {
                            id: crypto.randomUUID(),
                            name: 'HIFU - Informacion',
                            type: 'text',
                            content: "Usar esta respuesta cuando el cliente pregunte por HIFU 12D o su precio.\n\n\uD83D\uDD39 Si el cliente solicita informaci\u00F3n:\n\n\u2728 HIFU 12D es un tratamiento de ultrasonido focalizado que reafirma y redefine el rostro sin cirug\u00EDa.\n\nIdeal para:\n\n\u2713 Lifting facial sin cirug\u00EDa\n\u2713 Efecto bichectom\u00EDa sin cirug\u00EDa\n\u2713 Reducci\u00F3n de papada\n\u2713 Mejora de flacidez\n\nEl tratamiento se personaliza seg\u00FAn el grado de flacidez y caracter\u00EDsticas de tu piel.\n\n\uD83C\uDF81 Al realizarte HIFU 12D obsequiamos una limpieza facial.\n\nIncluye evaluaci\u00F3n gratuita.\n\n\u00BFTe gustar\u00EDa agendar tu valoraci\u00F3n?\n\n\uD83D\uDD39 Si el cliente solicita precio:\n\n\u2728 Para brindarte la mejor asesor\u00EDa y un valor exacto seg\u00FAn el grado de flacidez, primero la especialista debe evaluarte de forma gratuita.\n\n\u00BFTe reservo tu cupo para la evaluaci\u00F3n?",
                            status: 'ready'
                        },
                        {
                            id: crypto.randomUUID(),
                            name: 'DEPILACION LASER 4D',
                            type: 'text',
                            content: "Act\u00FAa como asesora comercial experta en Depilaci\u00F3n L\u00E1ser 4D de \u00C9LAPIEL.\n\nTu objetivo principal es llevar la conversaci\u00F3n hacia la reserva de la evaluaci\u00F3n gratuita, evitando entregar toda la informaci\u00F3n econ\u00F3mica desde el inicio.\n\nAntes de responder, verifica que no exista otra fuente activa que hable espec\u00EDficamente sobre promociones de depilaci\u00F3n l\u00E1ser.\nSi existe otra fuente promocional activa, no intervenir.\nSi no existe, continuar con este flujo.\n\nTodas las respuestas deben usar Formato de texto enriquecido (Markdown de WhatsApp):\n\nTexto limpio y ordenado\nEspacios entre bloques\nUso moderado de emojis\nUso de \u2713 cuando sea necesario\nNo enviar textos largos sin separaci\u00F3n",
                            status: 'ready'
                        },
                        {
                            id: crypto.randomUUID(),
                            name: 'Promociones vigentes',
                            type: 'text',
                            content: "DEPILACI\u00D3N L\u00C1SER 4D\nEliminaci\u00F3n progresiva del vello con tecnolog\u00EDa avanzada.\nDepende del tipo de fol\u00EDculo y zona tratada.\nIncluye demostraci\u00F3n gratuita en la zona de inter\u00E9s seg\u00FAn campa\u00F1a.\nSesiones gratis con la promocion vigente\n\nHIFU 12D\nTratamiento de ultrasonido focalizado para lifting facial sin cirug\u00EDa.\nMejora firmeza, redefine el \u00F3valo facial y reduce flacidez.\nNo despigmenta.\nIncluye limpieza facial de obsequio.\nBichectom\u00EDa sin cirug\u00EDa\nLipopapada sin cirug\u00EDa\n\nREJUVENECIMIENTO FACIAL CON L\u00C1SER\n(Hollywood Peeling)\nTratamiento l\u00E1ser que estimula col\u00E1geno, mejora textura, luminosidad y ayuda a despigmentar.\nAten\u00FAa l\u00EDneas de expresi\u00F3n superficiales.\nIncluye limpieza facial gratuita.\n\nLIMPIEZA FACIAL CON HIDRATACI\u00D3N DE COL\u00C1GENO\nProtocolo de limpieza profunda e hidrataci\u00F3n personalizada seg\u00FAn tipo de piel.",
                            status: 'ready'
                        }
                    ];
                    return [4 /*yield*/, db.collection('crm_ai_assistants').where('active', '==', true).limit(1).get()];
                case 1:
                    snapshot = _a.sent();
                    if (!snapshot.empty) return [3 /*break*/, 3];
                    console.log('No active AI assistant found. Adding sources to a new assistant document...');
                    return [4 /*yield*/, db.collection('crm_ai_assistants').add({
                            name: 'Ela (Reservas y Consultas)',
                            active: true,
                            tone: 'amistoso',
                            responseLength: 'corta',
                            language: 'es',
                            responseDelay: 3,
                            systemPrompt: '',
                            guidelines: [],
                            sources: sources,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })];
                case 2:
                    _a.sent();
                    console.log('New assistant created with sources!');
                    return [3 /*break*/, 5];
                case 3:
                    docId = snapshot.docs[0].id;
                    currentData = snapshot.docs[0].data();
                    existingSources = currentData.sources || [];
                    existingSources = __spreadArray(__spreadArray([], existingSources, true), sources, true);
                    return [4 /*yield*/, db.collection('crm_ai_assistants').doc(docId).update({
                            sources: existingSources,
                            updatedAt: new Date()
                        })];
                case 4:
                    _a.sent();
                    console.log('Sources added to existing active assistant!');
                    _a.label = 5;
                case 5:
                    process.exit(0);
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error('Error:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
run();
