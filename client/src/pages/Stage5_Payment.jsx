import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, RotateCcw } from 'lucide-react';

export default function Stage5_Payment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);

    // Payment Fields
    const [formData, setFormData] = useState({
        invoice_value: '', tds_amount: '0', cash_discount: '0', net_amount_paid: '',
        bank_name: '', branch: '', account_no: '', ifsc_code: '',
        payment_mode: 'RTGS', rtgs_reference_no: ''
    });

    const [approvalData, setApprovalData] = useState({ decision: 'Approve', remarks: '' });

    useEffect(() => { fetchContract(); }, [id]);

    useEffect(() => {
        // Auto-calculate TDS and Net Amount
        const invoice = parseFloat(formData.invoice_value) || 0;
        const discount = parseFloat(formData.cash_discount) || 0;

        // TDS = 0.10% of Invoice Value
        const tds = (invoice * 0.001).toFixed(2);

        // Net = Invoice - TDS - Discount
        const net = (invoice - parseFloat(tds) - discount).toFixed(2);

        // Only update if values differ to avoid loops, though strict mode might trigger twice. 
        // We set explicitly.
        setFormData(prev => ({
            ...prev,
            tds_amount: tds,
            net_amount_paid: net
        }));
    }, [formData.invoice_value, formData.cash_discount]);

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            setContract(res.data);
            if (res.data.stage5Payment) {
                setFormData(res.data.stage5Payment);
            }
        } catch (e) { console.error(e); }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmitManager = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/contracts/${id}/stage5`, formData);
            fetchContract();
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    const handleSubmitChairman = async (decision) => {
        try {
            // Decision: 'Approve' or 'Modify' (Rollback)
            await api.post(`/contracts/${id}/stage5/decision`, { decision, remarks: approvalData.remarks });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    if (!contract) return <div>Loading...</div>;
    const isManager = user.role === 'Manager';
    const isChairman = user.role === 'Chairman';

    const isApproved = contract.stage5Decision?.decision === 'Approve';
    const isRollbackRequest = contract.stage5Decision?.decision === 'Modify';
    const isPendingApproval = contract.stage5Payment && !isApproved && !isRollbackRequest;

    // Manager can edit if New OR Rollback Requested.
    const canEdit = isManager && (!contract.stage5Payment || isRollbackRequest);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900">Payment Requisition</h2>
                {isRollbackRequest && <span className="bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1 rounded-full text-sm font-bold animate-pulse px-4 shadow-sm">Rollback Requested</span>}
            </div>

            <div className={`bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8 ${!canEdit && !isPendingApproval && !isApproved ? '' : (!canEdit ? 'opacity-80 pointer-events-none' : '')}`}>
                <form onSubmit={handleSubmitManager} className="grid grid-cols-2 gap-6">
                    {/* Payment Form */}
                    {Object.keys(formData).map(key => key !== 'payment_id' && key !== 'contract_id' && key !== 'created_by' && key !== 'created_at' && (
                        <div key={key}>
                            <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1">{key.replace(/_/g, ' ')}</label>
                            <input
                                type={key.includes('amount') || key.includes('value') ? "number" : "text"}
                                name={key}
                                value={formData[key] || ''}
                                onChange={handleChange}
                                placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                readOnly={!canEdit}
                            />
                        </div>
                    ))}

                    {canEdit && (
                        <div className="col-span-2">
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all">
                                {isRollbackRequest ? "Resubmit Payment Requisition" : "Submit Payment Requisition"}
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {/* Chairman Actions */}
            {isChairman && isPendingApproval && (
                <div className="bg-white border border-amber-200 p-6 rounded-xl shadow-lg ring-1 ring-amber-100">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Chairman Review</h3>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => handleSubmitChairman('Approve')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold flex justify-center items-center shadow-md"><Check className="mr-2" /> Approve & Close</button>
                        <button onClick={() => handleSubmitChairman('Modify')} className="flex-1 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 py-3 rounded-lg font-bold flex justify-center items-center shadow-sm"><RotateCcw className="mr-2" /> Rollback (Modify)</button>
                    </div>
                </div>
            )}

            {/* View Decision Remarks if Rollback */}
            {isRollbackRequest && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg mt-4">
                    <p className="text-rose-700 font-bold mb-1">Rollback Remarks by Chairman:</p>
                    <p className="text-slate-700">{contract.stage5Decision?.remarks}</p>
                </div>
            )}
        </div>
    );
}
