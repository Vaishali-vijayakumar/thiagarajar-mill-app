import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit3, ArrowRight, Search, CheckCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('default');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        try {
            const res = await api.get('/contracts');
            setContracts(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        if (status.includes('Pending')) return 'text-amber-700 bg-amber-50 border-amber-200';
        if (status === 'Closed' || status.includes('Approved')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        if (status.includes('Rollback') || status.includes('Rejected')) return 'text-rose-700 bg-rose-50 border-rose-200';
        return 'text-slate-600 bg-slate-100 border-slate-200';
    };

    const handleAction = (c) => {
        switch (c.stage) {
            case 2: navigate(`/contracts/${c.contract_id}/stage2`); break;
            case 3: navigate(`/contracts/${c.contract_id}/stage3`); break;
            case 4: navigate(`/contracts/${c.contract_id}/stage4`); break;
            case 5: navigate(`/contracts/${c.contract_id}/stage5`); break;
            default: navigate(`/contracts/${c.contract_id}/view`); break;
        }
    };

    // Derived State
    const filteredContracts = contracts.filter(c =>
        c.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contract_id.toString().includes(searchTerm)
    );

    const sortedContracts = [...filteredContracts].sort((a, b) => {
        if (sortBy === 'default') return 0;
        const getScore = (status) => {
            if (sortBy === 'pending' && status.includes('Pending')) return 2;
            if (sortBy === 'approved' && (status.includes('Approved') || status === 'Closed')) return 2;
            if (sortBy === 'rejected' && (status.includes('Rollback') || status.includes('Rejected'))) return 2;
            return 1;
        };
        return getScore(b.status) - getScore(a.status);
    });

    // Stats Logic
    const stats = {
        total: contracts.length,
        pending: contracts.filter(c => c.status.includes('Pending')).length,
        completed: contracts.filter(c => c.status === 'Closed' || c.status.includes('Approved')).length,
        attention: contracts.filter(c => c.status.includes('Rollback')).length
    };

    return (
        <div className="space-y-8">
            {/* Header & Stats */}
            <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Dashboard Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Edit3 size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Contracts</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Eye size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Pending Action</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Completed</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><AlertCircle size={24} /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Nav. Attention</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.attention}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search contracts or vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                </div>

                <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-slate-500">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        <option value="default">Default</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                            <th className="px-6 py-4">Contract ID</th>
                            <th className="px-6 py-4">Vendor</th>
                            <th className="px-6 py-4">GST No</th>
                            <th className="px-6 py-4">Stage</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedContracts.map(c => (
                            <tr key={c.contract_id} className="hover:bg-indigo-50/30 transition-colors group cursor-default">
                                <td className="px-6 py-4 font-mono text-indigo-600 font-bold">#{c.contract_id}</td>
                                <td className="px-6 py-4 font-medium text-slate-900">{c.vendor_name}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{c.gst_number || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                        Stage {c.stage}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm ${getStatusColor(c.status)}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Closed' ? 'bg-emerald-500' : c.status.includes('Pending') ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                                        <span>{c.status}</span>
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleAction(c)}
                                        className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-100 active:scale-95 transform"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sortedContracts.length === 0 && !loading && (
                            <tr>
                                <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                            <Search size={24} />
                                        </div>
                                        <p className="text-lg font-medium text-slate-500">No contracts found</p>
                                        <p className="text-sm">Try adjusting your search or filters</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
