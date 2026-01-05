import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Stage3_Sampling() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [formData, setFormData] = useState({
        sequence_start_num: '', // Numeric input
        lot_number: '',
        arrival_date: new Date().toISOString().split('T')[0],
        no_of_samples: '' // UI Only
    });
    const [sequenceEndNum, setSequenceEndNum] = useState('');

    useEffect(() => {
        fetchContract();
    }, [id]);

    useEffect(() => {
        // Auto Calculate End Number
        if (formData.sequence_start_num && formData.no_of_samples) {
            const start = parseInt(formData.sequence_start_num);
            const num = parseInt(formData.no_of_samples);
            if (!isNaN(start) && !isNaN(num)) {
                setSequenceEndNum(start + num - 1);
            }
        } else {
            setSequenceEndNum('');
        }
    }, [formData.sequence_start_num, formData.no_of_samples]);

    // Financial Year Helper
    const getFinancialYearSuffix = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.getMonth(); // 0-11
        const year = date.getFullYear();
        // If Month is Jan(0), Feb(1), Mar(2) -> FY is (Year-1)-Year (e.g., Jan 2026 -> 25-26)
        // If Month is Apr(3) onwards -> FY is Year-(Year+1) (e.g., Apr 2026 -> 26-27)
        let startYear = year;
        if (month < 3) startYear = year - 1;
        const fy = `/${(startYear % 100)}-${(startYear + 1) % 100}`;
        return fy;
    };

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            setContract(res.data);
            if (res.data.stage3_4) {
                // Pre-fill
                const { sequence_start, sequence_end, arrival_date, lot_number } = res.data.stage3_4;
                if (sequence_start) {
                    // Extract numeric part if formatted (e.g., '1/25-26' -> '1')
                    const startNum = sequence_start.split('/')[0];
                    const endNum = sequence_end ? sequence_end.split('/')[0] : '';

                    setFormData(prev => ({
                        ...prev,
                        sequence_start_num: startNum,
                        arrival_date,
                        lot_number: lot_number || ''
                    }));
                    setSequenceEndNum(endNum);

                    if (startNum && endNum) {
                        const num = parseInt(endNum) - parseInt(startNum) + 1;
                        setFormData(prev => ({ ...prev, no_of_samples: num }));
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!sequenceEndNum) return;

        const fySuffix = getFinancialYearSuffix(formData.arrival_date);
        const formattedStart = `${formData.sequence_start_num}${fySuffix}`;
        const formattedEnd = `${sequenceEndNum}${fySuffix}`;

        try {
            await api.post(`/contracts/${id}/stage3`, {
                sequence_start: formattedStart,
                sequence_end: formattedEnd,
                arrival_date: formData.arrival_date,
                lot_number: formData.lot_number
            });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    if (!contract) return <div>Loading...</div>;
    const isManager = user.role === 'Manager';
    // const isReadOnly = contract.stage > 3; // Simplified logic, check if S4 started?

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Sampling</h2>

            <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-2">Arrival Date</label>
                            <input type="date" name="arrival_date" value={formData.arrival_date} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3" required readOnly={!isManager} />
                        </div>
                        <div>
                            <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-2">Lot Number</label>
                            <input type="text" name="lot_number" value={formData.lot_number} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3" required readOnly={!isManager} placeholder="Enter Lot No" />
                        </div>
                        <div>
                            <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-2">Sequence Start No</label>
                            <input type="number" name="sequence_start_num" value={formData.sequence_start_num} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3" required readOnly={!isManager} placeholder="e.g. 1" />
                            {formData.sequence_start_num && formData.arrival_date && (
                                <p className="text-sm text-indigo-500 mt-1 font-medium">Formatted: {formData.sequence_start_num}{getFinancialYearSuffix(formData.arrival_date)}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-2">Number of Samples</label>
                            <input type="number" name="no_of_samples" placeholder="e.g. 50" value={formData.no_of_samples} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3" required readOnly={!isManager} />
                        </div>
                        <div>
                            <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-2">Sequence End <span className="text-xs text-slate-400 font-normal normal-case">(Auto)</span></label>
                            <input type="text" value={sequenceEndNum ? `${sequenceEndNum}${getFinancialYearSuffix(formData.arrival_date)}` : ''} className="w-full bg-slate-100 border border-slate-200 text-slate-700 rounded-lg p-3 cursor-not-allowed font-medium" readOnly />
                        </div>
                    </div>

                    {isManager && (
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all">Submit Sampling Data</button>
                    )}
                </form>
            </div>
        </div>
    );
}
