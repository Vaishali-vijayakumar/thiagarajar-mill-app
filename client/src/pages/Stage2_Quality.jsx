import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, X } from 'lucide-react';

export default function Stage2_Quality() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        variety: '', price: '', report_date: '', report_document_path: '',
        uhml: '', ui: '', strength: '', elongation: '',
        mic: '', rd: '', plus_b: '',
        remarks: ''
    });

    const [approvalData, setApprovalData] = useState({ decision: 'Approve', remarks: '' });

    useEffect(() => {
        fetchContract();
    }, [id]);

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            setContract(res.data);
            if (res.data.stage2) {
                setFormData(res.data.stage2); // Pre-fill if exists
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmitManager = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/contracts/${id}/stage2`, formData);
            fetchContract(); // Refresh
        } catch (e) { alert(e.response?.data?.error || e.message); }
    };

    const handleSubmitChairman = async (decision) => {
        try {
            await api.post(`/contracts/${id}/stage2/decision`, {
                decision,
                remarks: approvalData.remarks
            });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error || e.message); }
    };

    if (loading) return <div>Loading...</div>;
    if (!contract) return <div>Contract not found</div>;

    const isManager = user.role === 'Manager';
    const isChairman = user.role === 'Chairman';
    const isApproved = contract.stage2Decision?.decision === 'Approve';
    const isPendingApproval = contract.stage2 && !isApproved;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Quality & Approval</h2>
                    <p className="text-slate-500 font-medium">Contract #{contract.contract_id} - {contract.vendor_name}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg text-sm font-bold border ${isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    {contract.stage2Decision?.decision || (contract.stage2 ? 'Pending Approval' : 'Pending Entry')}
                </div>
            </div>

            {/* Manager Form */}
            <div className={`bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8 ${isPendingApproval || isApproved ? 'opacity-75 pointer-events-none' : ''}`}>
                <h3 className="text-xl font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-2">Manager Quality Entry</h3>
                <form onSubmit={handleSubmitManager} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Iterate fields */}
                    {['variety', 'price', 'report_date', 'report_document_path', 'uhml', 'ui', 'strength', 'elongation', 'mic', 'rd', 'plus_b'].map(field => (
                        <div key={field}>
                            <label className="block text-slate-500 text-xs uppercase mb-1 font-bold tracking-wide">
                                {field === 'report_date' ? 'Date' : field.includes('uhml') || field.includes('ui') || field.includes('strength') || field.includes('elongation') || field.includes('mic') || field.includes('rd') || field.includes('plus_b') ? `Avg ${field.replace(/_/g, ' ')}` : field.replace(/_/g, ' ')}
                            </label>
                            <input
                                type={field === 'report_date' ? 'date' : field === 'price' || field === 'variety' || field === 'report_document_path' ? "text" : "number"}
                                name={field}
                                value={formData[field] || ''}
                                onChange={handleChange}
                                placeholder={field === 'report_date' ? '' : `Enter ${field.replace(/_/g, ' ')}`}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                readOnly={!isManager}
                                step="any"
                            />
                        </div>
                    ))}
                    <div className="col-span-3">
                        <label className="block text-slate-500 text-xs uppercase mb-1 font-bold tracking-wide">Remarks</label>
                        <textarea name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" readOnly={!isManager}></textarea>
                    </div>

                    {isManager && !isPendingApproval && !isApproved && (
                        <div className="col-span-3">
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-indigo-500/30 transition-all">Submit Quality Report</button>
                        </div>
                    )}
                </form>
            </div>

            {/* Chairman Approval */}
            {isChairman && isPendingApproval && !isApproved && (
                <div className="bg-white border border-amber-200 p-6 rounded-xl shadow-lg ring-1 ring-amber-100">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Chairman Action</h3>
                    <div className="flex space-x-4 items-center">
                        <button onClick={() => handleSubmitChairman('Approve')} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transform hover:-translate-y-0.5 transition-all shadow-md">
                            <Check /> <span>Approve</span>
                        </button>
                        <button onClick={() => handleSubmitChairman('Reject')} className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold transform hover:-translate-y-0.5 transition-all shadow-md">
                            <X /> <span>Reject</span>
                        </button>
                        <input
                            type="text"
                            placeholder="Decision Remarks (Optional)"
                            className="bg-slate-50 border border-slate-300 text-slate-900 p-3 rounded-lg flex-1"
                            value={approvalData.remarks}
                            onChange={(e) => setApprovalData({ ...approvalData, remarks: e.target.value })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
