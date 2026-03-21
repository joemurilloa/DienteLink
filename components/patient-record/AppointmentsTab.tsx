import React from 'react';
import { PatientRecord as PatientRecordType, Appointment } from '../../types';
import { cn } from '../../lib/utils';
import { useAppointments } from '../../hooks/useAppointments';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    patient: PatientRecordType;
}

const AppointmentsTab: React.FC<Props> = ({ patient }) => {
    const { data: allAppointments = [] } = useAppointments();
    const navigate = useNavigate();

    const patientAppointments = allAppointments.filter(
        apt => apt.patientId === patient.id || apt.patientName.toLowerCase().trim() === patient.identification.fullName.toLowerCase().trim()
    );

    const handleNewAppointment = () => {
        navigate(`/calendar?patient=${encodeURIComponent(patient.identification.fullName)}&id=${patient.id}`);
    };

    return (
        <div className="space-y-8 animate-in-up duration-500">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Próximas Visitas</h3>
                    <p className="text-slate-400 text-sm mt-1">Seguimiento de citas programadas</p>
                </div>
                <button
                    onClick={handleNewAppointment}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
                >
                    <Calendar size={14} /> Agendar Cita
                </button>
            </div>
            {patientAppointments.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Calendar size={28} className="text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-700 mb-1">Sin citas programadas</h4>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">No hay citas registradas para este paciente.</p>
                    <button onClick={handleNewAppointment} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20">
                        Ir al Calendario
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {patientAppointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(apt => (
                        <div key={apt.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-11 h-11 rounded-xl flex items-center justify-center",
                                    apt.status === 'Completada' ? "bg-emerald-50 text-emerald-600" :
                                        apt.status === 'Retrasada' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                )}>
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 text-sm">{apt.type}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                        {apt.date} &middot; {apt.time}
                                    </p>
                                </div>
                            </div>
                            <span className={cn(
                                "px-3 py-1 rounded-lg text-[11px] font-semibold",
                                apt.status === 'Completada' ? "bg-emerald-50 text-emerald-700" :
                                    apt.status === 'Retrasada' ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                            )}>
                                {apt.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AppointmentsTab;
