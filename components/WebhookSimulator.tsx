
import React, { useState } from 'react';
import { whatsappService } from '../services/whatsappService';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle2, Zap } from 'lucide-react';

const WebhookSimulator: React.FC<{ appointments: { id: string, patientName: string }[] }> = ({ appointments }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-24 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="glass-panel p-6 rounded-[32px] shadow-2xl border-white/60 w-72 mb-4"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="text-amber-500" size={18} />
                            <h4 className="font-black text-slate-800 text-sm tracking-tight">Simulador de Webhook</h4>
                        </div>

                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">Simular Confirmación:</p>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 hide-scrollbar">
                            {appointments.map(apt => (
                                <button
                                    key={apt.id}
                                    onClick={() => {
                                        whatsappService.simulateIncomingConfirmation(apt.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all text-left group"
                                >
                                    <span className="text-xs font-bold text-slate-700 truncate mr-2">{apt.patientName}</span>
                                    <CheckCircle2 size={14} className="text-slate-300 group-hover:text-blue-500" />
                                </button>
                            ))}
                            {appointments.length === 0 && (
                                <p className="text-[10px] text-slate-400 italic">No hay citas activas hoy.</p>
                            )}
                        </div>

                        <p className="mt-4 text-[9px] leading-relaxed text-slate-400">
                            Al hacer clic, se emitirá un evento que notificará al Dashboard en tiempo real, emulando la respuesta del paciente vía WhatsApp.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group"
            >
                <MessageSquare className={isOpen ? "rotate-12" : "group-hover:-rotate-12 transition-transform"} />
            </button>
        </div>
    );
};

export default WebhookSimulator;
