import React from 'react';
import { FiPrinter, FiDownload, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Payslip = ({ payment, onClose }) => {
    const { formatCurrency } = useAuth();

    if (!payment) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white text-gray-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl my-8">
                {/* Modal Header (Hidden during print) */}
                <div className="print:hidden p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-tighter">Fiche de Paie</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={handlePrint}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 font-bold text-sm"
                        >
                            <FiPrinter /> Imprimer
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-bold text-sm"
                        >
                            Fermer
                        </button>
                    </div>
                </div>

                {/* Payslip Content (Visible during print) */}
                <div className="p-12 print:p-0 print:m-0 bg-white" id="printable-payslip">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-12 border-b-4 border-blue-600 pb-8">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-blue-600 mb-1">REGISTRY CASH</h1>
                            <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">Système de Gestion de Caisse</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-gray-900 mb-1">Paiement #{payment.id}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                Date: {new Date(payment.paidAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Employee Info Section */}
                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Employé</h3>
                            <p className="text-xl font-black text-gray-900 mb-1">{payment.user?.fullName || payment.user?.username}</p>
                            <p className="text-sm font-bold text-blue-600 uppercase tracking-tighter mb-4">{payment.user?.role}</p>
                            <div className="text-xs text-gray-500 font-medium space-y-1">
                                <p>Période: {payment.month}</p>
                                <p>Méthode: {payment.paymentMethod}</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Administrateur</h3>
                            <p className="text-lg font-black text-gray-900 mb-1">{payment.adminName}</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Responsable Distribution</p>
                        </div>
                    </div>

                    {/* Salary Breakdown Table */}
                    <div className="mb-12">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-100">
                                    <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</th>
                                    <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Montant (TND)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <tr>
                                    <td className="py-6">
                                        <p className="font-bold text-gray-900">Salaire de Base</p>
                                        <p className="text-xs text-gray-400">Calculé sur les jours de présence</p>
                                    </td>
                                    <td className="py-6 text-right font-black text-gray-900">
                                        {formatCurrency(payment.baseSalary, 'TND', false)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-6">
                                        <p className="font-bold text-gray-900">Primes Exceptionnelles</p>
                                        <p className="text-xs text-gray-400">Période : {payment.month}</p>
                                    </td>
                                    <td className="py-6 text-right font-black text-green-600">
                                        + {formatCurrency(payment.primeAmount, 'TND', false)}
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="border-t-4 border-blue-600 bg-blue-50/50">
                                    <td className="py-8 pl-6">
                                        <p className="text-xl font-black uppercase tracking-tighter text-blue-900">Total Net Payé</p>
                                    </td>
                                    <td className="py-8 pr-6 text-right">
                                        <p className="text-3xl font-black text-blue-700">{formatCurrency(payment.amount, 'TND', false)}</p>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-24 mt-24">
                        <div className="text-center pt-8 border-t border-dashed border-gray-300">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-12">Signature Employé</p>
                            <div className="h-1 bg-gray-100 w-1/2 mx-auto rounded-full"></div>
                        </div>
                        <div className="text-center pt-8 border-t border-dashed border-gray-300">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-12">Cachet & Signature Admin</p>
                            <div className="h-1 bg-gray-100 w-1/2 mx-auto rounded-full"></div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 text-center text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                        Document généré numériquement par Registry Cash System — {new Date().getFullYear()}
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-payslip, #printable-payslip * {
                            visibility: visible;
                        }
                        #printable-payslip {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 20mm;
                            background: white !important;
                        }
                        .print\\:hidden {
                            display: none !important;
                        }
                    }
                `}} />
            </div>
        </div>
    );
};

export default Payslip;
