import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import BookingConfiguration from './BookingConfiguration';

interface BookingConfigViewProps {
  onBack: () => void;
}

export const BookingConfigView: React.FC<BookingConfigViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-white rounded-xl transition-all"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <h1 className="text-3xl font-bold text-slate-900">
              Configuración de Agenda Pública
            </h1>
          </div>

          {/* Booking Configuration Component */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <BookingConfiguration onClose={onBack} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookingConfigView;