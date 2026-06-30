
import React, { useState, useMemo } from 'react';
import { PatientRecord as PatientRecordType } from '../types';
import { CheckCircle2, X, FileText, Scissors, Zap, Hash } from 'lucide-react';
import { cn } from '../lib/utils';
import { SignatureCanvas } from './SignatureCanvas';
import { ConsentTemplateType } from './ConsentManager';

interface Props {
  patient: PatientRecordType;
  doctorName: string;
  clinicName: string;
  templateType: ConsentTemplateType;
  onSave: (data: { title: string; content: string; signatureData: string; witnessName?: string }) => void;
  onCancel: () => void;
}

const ProfessionalConsentForm: React.FC<Props> = ({ patient, doctorName, clinicName, templateType, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    city: '',
    day: new Date().getDate().toString(),
    month: new Date().toLocaleString('es-HN', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    patientID: patient.identification.idNumber || '',
    address: patient.identification.address || '',
    representativeName: '',
    representativeID: '',
    dentistLicense: '',
    affiliatedTo: clinicName,
    witness1: '',
    witness2: '',
    // Procedure specific
    pieces: '',
    observations: '',
    applianceType: '',
  });

  const [showSigning, setShowSigning] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderInlineInput = (name: string, placeholder: string, width: string = 'auto', className: string = '') => (
    <input
      key={name}
      type="text"
      name={name}
      value={(formData as any)[name]}
      onChange={handleInputChange}
      placeholder={placeholder}
      style={{ width }}
      className={cn(
        "inline-block border-b border-dashed border-slate-300 bg-transparent px-1 text-blue-700 font-medium focus:border-blue-500 focus:bg-blue-50/50 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal text-center min-w-[60px]",
        className
      )}
    />
  );

  const config = useMemo(() => {
    const commonHeader = `En la ciudad de ${formData.city || '_______'}, a los ${formData.day || '___'} días del mes de ${formData.month || '__________________'} de ${formData.year || '________'}, comparece el(la) paciente **${patient.identification.fullName}**, identificado(a) con Documento No. ${formData.patientID || '_______'}, y en caso de representación, **${formData.representativeName || '_______'}**, en calidad de representante legal.`;
    const commonDoctor = `Yo, ${doctorName}, odontólogo(a), con número de colegiación/profesional ${formData.dentistLicense || '_______'}, adscrito(a) a **${formData.affiliatedTo}**...`;

    switch (templateType) {
      case 'extraction':
        return {
          title: 'CONSENTIMIENTO INFORMADO PARA EXTRACCIÓN DENTAL',
          icon: <Scissors className="text-red-400" />,
          content: `
[${clinicName}]
CONSENTIMIENTO INFORMADO PARA EXTRACCIÓN DENTAL

${commonHeader}

Yo, ${doctorName}, odontólogo(a), con número de colegiación/profesional ${formData.dentistLicense || '_______'}, certifico que he explicado al paciente la necesidad de realizar la extracción del(de los) órgano(s) dentario(s) identificado(s) como: **${formData.pieces || '__________________'}**.

DECLARACIONES

PRIMERA: Naturaleza del procedimiento.
La extracción dental consiste en la remoción total del diente o remanente radicular indicado, pudiendo tratarse de extracción simple, quirúrgica o compleja, según las condiciones anatómicas y clínicas encontradas al momento del procedimiento.

SEGUNDA: Indicación clínica.
Se me ha informado que la extracción se recomienda por razones tales como caries extensa no restaurable, fractura coronaria o radicular, infección, absceso, enfermedad periodontal avanzada, movilidad severa, retención, indicación ortodóntica, fracaso de tratamiento previo, o cualquier otra condición que haga inviable la conservación del diente.

TERCERA: Beneficios esperados.
Entiendo que la extracción puede contribuir a eliminar focos de infección, dolor, inflamación, movilidad, apiñamiento o daño funcional, así como permitir la posterior rehabilitación del espacio edéntulo cuando corresponda.

CUARTA: Alternativas al procedimiento.
Se me han explicado, cuando clínicamente son viables, alternativas tales como tratamiento restaurador, tratamiento de conducto, cirugía periodontal, coronas, observación clínica o remisión a otra especialidad. También se me ha explicado la evolución probable y riesgos de no extraer el diente.

QUINTA: Riesgos y complicaciones específicas.
Entiendo y acepto que la extracción dental puede ocasionar, entre otras complicaciones conocidas, las siguientes:
a) dolor, inflamación y sangrado durante o después del procedimiento;
b) infección del sitio operatorio;
c) alveolitis seca o retraso en la cicatrización;
d) necesidad de realizar incisiones, colgajos, osteotomía, odontosección o suturas;
e) fractura del diente, de raíces o de restauraciones existentes;
f) lesión de dientes adyacentes, prótesis, coronas, puentes o tejidos blandos;
g) hematoma, limitación temporal de apertura bucal o dificultad para masticar;
h) comunicación bucosinusal u oroantral, especialmente en extracciones superiores posteriores;
i) alteraciones sensitivas temporales o permanentes, como parestesia, hipoestesia, disestesia o adormecimiento de labio, lengua, mentón o mejilla, particularmente en piezas inferiores posteriores;
j) desplazamiento de fragmentos radiculares o dentarios;
k) necesidad de cirugía adicional, remisión, hospitalización o atención de urgencia en casos poco frecuentes;
l) en casos excepcionales, fractura ósea o complicaciones mayores asociadas a condiciones médicas preexistentes.

SEXTA: Sobre anestesia y medicamentos.
Autorizo la aplicación de anestesia local y la prescripción de medicamentos relacionados con el procedimiento. Declaro haber informado completa y verazmente mis antecedentes médicos, alergias, embarazo, enfermedades sistémicas y uso de medicamentos.

SÉPTIMA: Hallazgos imprevistos y procedimientos complementarios.
Autorizo al profesional a realizar maniobras o procedimientos complementarios razonables que resulten clínicamente necesarios durante la extracción, incluyendo curetaje, regularización ósea, control de hemorragia, sutura, toma de radiografía adicional, remoción de tejido patológico visible o remisión inmediata a un especialista.

OCTAVA: Indicaciones postoperatorias.
Declaro que se me han explicado las instrucciones posteriores a la extracción, incluyendo medidas de higiene, dieta, reposo, control de sangrado, uso de medicamentos y asistencia a control. Entiendo que el incumplimiento de dichas indicaciones puede aumentar el riesgo de complicaciones.

NOVENA: Rehabilitación posterior.
Se me ha informado que la pérdida del diente puede requerir posteriormente tratamiento protésico, implantológico, ortodóntico u otra rehabilitación, lo cual constituye un procedimiento distinto y no está comprendido en esta autorización, salvo que se pacte por separado.

DÉCIMA: Ausencia de garantía absoluta.
Comprendo que no puede garantizarse un resultado exacto ni la ausencia absoluta de complicaciones, aun cuando el procedimiento sea ejecutado correctamente.

DÉCIMA PRIMERA: Consentimiento libre.
Habiéndoseme ofrecido oportunidad suficiente para hacer preguntas, manifiesto que he comprendido el procedimiento, sus riesgos, beneficios y alternativas, y que autorizo libremente su realización.

Pieza(s) a extraer: ${formData.pieces || '__________________'}
Observaciones clínicas relevantes: ${formData.observations || '__________________'}
          `.trim()
        };
      case 'endodontics':
        return {
          title: 'CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE CONDUCTO (ENDODONCIA)',
          icon: <Zap className="text-yellow-400" />,
          content: `
[${clinicName}]
CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE CONDUCTO (ENDODONCIA)

${commonHeader}

Yo, ${doctorName}, odontólogo(a), con número de colegiación/profesional ${formData.dentistLicense || '_______'}, informo al paciente que se recomienda realizar tratamiento de conducto en la(s) pieza(s) dental(es): **${formData.pieces || '__________________'}**.

DECLARACIONES

PRIMERA: Naturaleza del procedimiento.
El tratamiento de conducto consiste en el acceso al interior del diente, localización de los conductos radiculares, remoción parcial o total del tejido pulpar afectado, limpieza, conformación, desinfección y obturación de los conductos, con el fin de conservar el diente cuando ello sea clínicamente posible.

SEGUNDA: Indicación clínica.
Se me ha informado que el procedimiento se recomienda por pulpitis, necrosis pulpar, infección periapical, trauma dental, sensibilidad irreversible, lesión cariosa profunda, fractura o como parte de un plan restaurador o protésico.

TERCERA: Beneficios esperados.
Entiendo que el tratamiento tiene como finalidad aliviar dolor, controlar infección, preservar el órgano dentario y evitar, cuando sea posible, su extracción.

CUARTA: Alternativas razonables.
Se me han explicado las alternativas clínicamente viables, tales como observación limitada según el caso, tratamiento restaurador distinto cuando proceda, retratamiento, cirugía periapical, extracción dental y posterior rehabilitación protésica o implantológica. También se me ha explicado el riesgo de no tratar la pieza.

QUINTA: Riesgos y complicaciones específicas.
Comprendo que en endodoncia pueden presentarse, entre otras, las siguientes situaciones:
a) dolor, sensibilidad o inflamación durante o después del tratamiento;
b) persistencia o reagudización de infección, absceso o supuración;
c) dificultad para localizar todos los conductos por anatomía compleja, calcificación, curvaturas o limitaciones radiográficas;
d) separación o fractura de instrumentos dentro del conducto;
e) perforación radicular o cameral, creación de escalones o transportación del conducto;
f) sobreextensión o subobturación del material endodóntico;
g) necesidad de retratamiento, cirugía apical o extracción si no se logra el resultado biológico esperado;
h) debilitamiento estructural del diente, fractura coronaria o radicular posterior al tratamiento;
i) cambio de color del diente;
j) imposibilidad de completar el procedimiento en una sola cita;
k) molestias o reacciones relacionadas con anestesia, irrigantes, materiales o medicamentos.

SEXTA: Pronóstico y limitaciones.
Se me ha explicado que el éxito del tratamiento depende de múltiples factores, incluyendo el estado previo del diente, extensión de la infección, anatomía radicular, sellado coronal posterior, higiene oral, controles y respuesta biológica individual.

SÉPTIMA: Necesidad de restauración posterior.
Entiendo que, una vez finalizado el tratamiento de conducto, el diente deberá recibir la restauración definitiva que el profesional indique, pudiendo requerir reconstrucción, incrustación, corona u otro tipo de rehabilitación. Se me ha advertido que retrasar o no realizar dicha restauración puede comprometer seriamente el pronóstico del diente.

OCTAVA: Radiografías y controles.
Autorizo la toma de radiografías diagnósticas, de conductometría, prueba, obturación y control, así como las citas de seguimiento necesarias para evaluar la evolución del tratamiento.

NOVENA: Hallazgos imprevistos.
Autorizo la realización de maniobras complementarias razonables que resulten clínicamente necesarias durante el tratamiento, incluyendo medicación intraconducto, cambio de plan terapéutico, remisión a especialista en endodoncia o indicación de extracción si sobreviene imposibilidad técnica o biológica de conservar la pieza.

DÉCIMA: Ausencia de garantía absoluta.
Comprendo que, aun actuando conforme a la técnica y conocimientos científicos aceptados, no puede garantizarse en todos los casos el éxito definitivo ni la conservación permanente del diente tratado.

DÉCIMA PRIMERA: Consentimiento libre e informado.
Declaro que he recibido explicación suficiente, que he tenido oportunidad de formular preguntas y que autorizo libremente la realización del tratamiento de conducto antes descrito.

Pieza(s) dental(es): ${formData.pieces || '__________________'}
Observaciones clínicas relevantes: ${formData.observations || '__________________'}
          `.trim()
        };
      case 'orthodontics':
        return {
          title: 'CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE ORTODONCIA',
          icon: <Hash className="text-purple-400" />,
          content: `
[${clinicName}]
CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE ORTODONCIA

${commonHeader}

Yo, ${doctorName}, odontólogo(a) / especialista en ortodoncia, con número de colegiación/profesional ${formData.dentistLicense || '_______'}, informo que se propone iniciar tratamiento de ortodoncia en favor del paciente antes identificado.

DECLARACIONES

PRIMERA: Naturaleza del tratamiento.
La ortodoncia tiene por objeto corregir malposiciones dentarias, discrepancias de espacio, apiñamiento, mordidas alteradas y otros problemas funcionales o estéticos mediante el uso de aparatología fija, removible, alineadores, retenedores, elásticos, dispositivos auxiliares u otras técnicas aceptadas científicamente.

SEGUNDA: Estudios diagnósticos.
Autorizo la toma y uso clínico de radiografías, fotografías intraorales y extraorales, escaneos, impresiones, modelos y demás registros diagnósticos necesarios para planificación, seguimiento y control del tratamiento.

TERCERA: Alcance y finalidad.
Entiendo que el tratamiento busca mejorar función, alineación, mordida y estética dental/facial dentro de los límites biológicos y anatómicos de mi caso, y que el plan puede requerir modificaciones razonables durante su ejecución.

CUARTA: Alternativas y posibilidad de no tratamiento.
Se me ha informado sobre las alternativas disponibles, incluyendo observación, tratamiento parcial, otras modalidades de aparatología, extracción de piezas por indicación ortodóntica, stripping o reducción interproximal, cirugía ortognática cuando fuese necesaria, u omitir tratamiento, con explicación de las consecuencias funcionales, estéticas o periodontales de esa decisión.

QUINTA: Riesgos y efectos previsibles del tratamiento ortodóntico.
Comprendo y acepto que durante o después del tratamiento pueden presentarse, entre otros, los siguientes eventos:
a) dolor, presión, sensibilidad o molestias temporales al colocar o ajustar aparatos;
b) rozaduras, laceraciones o úlceras en labios, mejillas, lengua o mucosas;
c) caries, manchas blancas, descalcificación, gingivitis, periodontitis o mal aliento si no mantengo higiene oral adecuada;
d) reabsorción radicular externa en mayor o menor grado;
e) movilidad dentaria transitoria;
f) cambios no totalmente previsibles en el crecimiento facial, erupción dentaria o respuesta biológica;
g) recidiva o tendencia de los dientes a volver a su posición original, especialmente si no se utilizan retenedores según indicación;
h) fractura, despegue, pérdida, deformación o ingestión accidental de componentes del aparato;
i) necesidad de extracción dentaria, microtornillos, auxiliares, tratamiento periodontal, restaurador, endodóntico o quirúrgico complementario;
j) molestias o síntomas en la articulación temporomandibular;
k) prolongación del tiempo estimado de tratamiento por falta de cooperación, ausencias, pérdida o daño de aparatos, cambios biológicos o hallazgos clínicos imprevistos;
l) resultados estéticos o funcionales diferentes a la expectativa subjetiva del paciente.

SEXTA: Cooperación del paciente.
Se me ha explicado que el éxito de la ortodoncia depende en gran medida de mi colaboración o la de mi representado(a), incluyendo asistencia puntual a citas, uso disciplinado de elásticos, alineadores o retenedores, adecuada higiene oral, control dietético, cuidado de aparatos y cumplimiento estricto de instrucciones profesionales.

SÉPTIMA: Duración estimada.
Entiendo que toda duración indicada es aproximada y puede variar por factores biológicos, mecánicos y de cooperación, sin constituir plazo fatal ni garantía de finalización exacta en una fecha determinada.

OCTAVA: Retención posterior.
Comprendo que, al finalizar la fase activa, será necesario el uso de retenedores fijos o removibles por el tiempo que el profesional indique, y que la omisión, uso incorrecto o abandono de la fase de retención puede ocasionar recaída parcial o total.

NOVENA: Procedimientos complementarios.
Autorizo que, de ser clínicamente necesario, se realicen ajustes de plan, cambios de aparatología, reposición de aditamentos, interconsultas o remisiones a otras especialidades odontológicas o médicas relacionadas con mi tratamiento.

DÉCIMA: Ausencia de garantía absoluta.
Se me ha informado que no puede prometerse perfección estética, simetría ideal, estabilidad absoluta de por vida ni resultados idénticos a simulaciones, fotografías o expectativas subjetivas, puesto que la respuesta biológica varía en cada persona.

DÉCIMA PRIMERA: Consentimiento libre e informado.
Declaro que he comprendido los objetivos, limitaciones, riesgos, beneficios y alternativas del tratamiento ortodóntico, que he recibido oportunidad suficiente para hacer preguntas y que autorizo libremente su inicio.

Tipo de aparatología propuesta: ${formData.applianceType || '__________________'}
Observaciones diagnósticas relevantes: ${formData.observations || '__________________'}
          `.trim()
        };
      default:
        return {
          title: 'CONSENTIMIENTO GENERAL DE TRATAMIENTO DENTAL',
          icon: <FileText className="text-blue-400" />,
          content: `
[${clinicName}]
CONSENTIMIENTO GENERAL DE TRATAMIENTO DENTAL

${commonHeader}

Yo, ${doctorName}, odontólogo(a), con número de colegiación/profesional ${formData.dentistLicense || '_______'}, adscrito(a) a **${formData.affiliatedTo}**, hago constar que he informado al paciente, de manera clara, suficiente y comprensible, sobre su condición bucodental, el plan general de atención propuesto y los alcances del presente consentimiento.

DECLARACIONES

PRIMERA: Objeto del consentimiento. Evaluación y tratamiento odontológico general.
SEGUNDA: Información brindada. Se me ha explicado mi estado de salud bucodental y el propósito del tratamiento.
TERCERA: Riesgos y complicaciones generales. Entiendo que pueden presentarse molestias, dolor, inflamación, sangrado o infección.
CUARTA: Sobre anestesia local y medicamentos. Autorizo su aplicación y prescripción.
QUINTA: Exámenes auxiliares. Autorizo la toma de radiografías y fotografías clínicas.
SEXTA: Procedimientos no previstos inicialmente. Autorizo maniobras de urgencia si es necesario.
SÉPTIMA: Deber de colaboración. Me comprometo a proporcionar información veraz y seguir indicaciones.
OCTAVA: Limitación de resultados. Entiendo que no puede garantizarse un resultado estético perfecto.
NOVENA: Revocación. Puedo revocar este consentimiento antes de la realización del procedimiento.
DÉCIMA: Expediente clínico. Autorizo la incorporación de información a mi expediente.

Observaciones: ${formData.observations || 'Ninguna'}
          `.trim()
        };
    }
  }, [templateType, formData, patient, doctorName, clinicName]);

  const handleFinalSign = (signatureData: string) => {
    onSave({
      title: config.title,
      content: config.content,
      signatureData,
      witnessName: formData.witness1
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-300 shadow-xl overflow-hidden animate-in-up">
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
            {config.icon}
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">{config.title}</h3>
            <p className="text-slate-500 text-sm uppercase tracking-widest font-semibold">Expediente Clínico Oficial</p>
          </div>
        </div>
        <button onClick={onCancel} className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8 text-slate-700 leading-relaxed text-sm">
          
          <div className="text-center font-bold text-lg text-slate-900 border-b-2 border-slate-300 pb-4 mb-8">
            {clinicName.toUpperCase()} <br/>
            <span className="text-blue-600 tracking-wide uppercase text-sm">{config.title}</span>
          </div>

          <p>
            En la ciudad de {renderInlineInput("city", "Ciudad", "140px")}, a los {renderInlineInput("day", "00", "40px")} días del mes de {renderInlineInput("month", "Mes", "100px")} de {renderInlineInput("year", "Año", "60px")}, comparece el(la) paciente **{patient.identification.fullName}**, con Documento No. {renderInlineInput("patientID", "ID No.", "150px")}, con domicilio en {renderInlineInput("address", "Dirección completa", "300px")}; y en caso de actuar por representación, comparece además **{renderInlineInput("representativeName", "Nombre completo", "200px")}**, en su condición de padre, madre, tutor(a), curador(a) o representante legal, con Documento No. {renderInlineInput("representativeID", "ID Rep.", "150px")}, quien manifiesta actuar con facultades suficientes.
          </p>

          <p>
            Yo, **{doctorName}**, odontólogo(a), con número de colegiación/profesional {renderInlineInput("dentistLicense", "No. Col.", "120px")}, adscrito(a) a **{renderInlineInput("affiliatedTo", "Clínica", "150px")}**, certifico que he informado al paciente detalladamente sobre el procedimiento propuesto.
          </p>

          {/* Procedure Specific Section */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300">
            {(templateType === 'extraction' || templateType === 'endodontics') && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Pieza(s) dental(es)</label>
                  {renderInlineInput("pieces", "Indicar piezas...", "100%", "text-left font-bold text-lg")}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Observaciones relevantes</label>
                  {renderInlineInput("observations", "Detalles clínicos...", "100%", "text-left italic")}
                </div>
              </div>
            )}

            {templateType === 'orthodontics' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo de aparatología propuesta</label>
                  {renderInlineInput("applianceType", "Ej: Brackets metálicos...", "100%", "text-left font-bold text-lg")}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Observaciones diagnósticas</label>
                  {renderInlineInput("observations", "Clase I, apiñamiento...", "100%", "text-left italic")}
                </div>
              </div>
            )}

            {templateType === 'general' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Observaciones / Plan de atención</label>
                {renderInlineInput("observations", "Evaluación odontológica...", "100%", "text-left italic")}
              </div>
            )}
          </div>

          <div className="space-y-6 pt-4 border-t border-slate-300">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest border-l-4 border-blue-500 pl-3">Cláusulas de Consentimiento (Resumen Visual)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs text-slate-500 uppercase font-semibold">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                <span>Naturaleza del procedimiento</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                <span>Indicación clínica detallada</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                <span>Beneficios y evolución esperada</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                <span>Alternativas terapéuticas</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1" />
                <span>Riesgos y complicaciones específicas</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                <span>Anestesia y medicamentos</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                <span>Hallazgos e imprevistos</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                <span>Indicaciones post-operatorias</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl text-white italic text-sm text-center leading-relaxed">
            "Declaro que he recibido explicación suficiente, que he tenido oportunidad de formular preguntas y que autorizo libremente la realización del tratamiento antes descrito."
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-300">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center block">Testigo 1 (opcional)</label>
              {renderInlineInput("witness1", "Nombre completo", "100%", "text-left")}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center block">Testigo 2 (opcional)</label>
              {renderInlineInput("witness2", "Nombre completo", "100%", "text-left")}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-300">
        {showSigning ? (
          <div className="max-w-xl mx-auto">
            <SignatureCanvas
              onSave={handleFinalSign}
              onCancel={() => setShowSigning(false)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => setShowSigning(true)}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 size={18} /> Validar y Proceder a Firma
            </button>
            <button onClick={onCancel} className="px-8 py-4 text-slate-500 font-semibold hover:text-red-500 transition-all">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalConsentForm;
