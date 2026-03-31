import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiTrendingUp, FiBox, FiCalendar, FiAlertCircle, FiPieChart, 
    FiSend, FiMessageCircle, FiRefreshCw 
} from 'react-icons/fi';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TABS = [
    { id: 'overview', label: "Vue d'ensemble", icon: FiPieChart },
    { id: 'products', label: 'Produits', icon: FiBox },
    { id: 'forecasts', label: 'Prévisions', icon: FiTrendingUp },
    { id: 'periods', label: 'Périodes', icon: FiCalendar },
    { id: 'alerts', label: 'Alertes stock', icon: FiAlertCircle },
];

const AIAnalytics = () => {
    const { formatCurrency } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    
    // Data states
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // AI states
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA. Je peux analyser vos ventes, vos stocks, et vous suggérer des promotions. Que souhaitez-vous savoir ?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial Data Fetch
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoadingData(true);
                const [prodRes, salesRes] = await Promise.all([
                    api.get('/products'),
                    api.get('/sales')
                ]);
                setProducts(prodRes.data || []);
                setSales(salesRes.data || []);
            } catch (error) {
                console.error("Erreur de chargement des données", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchDashboardData();
    }, []);

    // Scroll chat to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // AI Chat handler
    const handleSendMessage = async (e, quickPrompt = null) => {
        if (e) e.preventDefault();
        const userText = quickPrompt || chatInput;
        if (!userText.trim()) return;

        const newMessages = [...chatMessages, { role: 'user', content: userText }];
        setChatMessages(newMessages);
        setChatInput('');
        setIsAiTyping(true);

        try {
            // Build a small system context string from real data
            const lowStockCount = products.filter(p => p.stockQuantity < 10).length;
            const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
            
            const systemContext = `Produits totaux: ${products.length}. Alertes stock (quantité < 10): ${lowStockCount}. Ventes totales enregistrées: ${sales.length} (Revenu total approximatif: ${totalRevenue}).`;

            // Prepare messages for Anthropic (user & assistant only)
            const apiMessages = newMessages.filter(m => m.role === 'user' || m.role === 'assistant');

            const response = await api.post('/ai/chat', {
                messages: apiMessages,
                systemContext: systemContext
            });

            setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
        } catch (error) {
            console.error("Erreur AI", error);
            const errorMessage = error.response?.data?.message || 'Désolé, une erreur technique est survenue lors de la connexion.';
            setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    // Calculate derived data for charts
    const getTopProducts = () => {
        const map = {};
        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    if (!map[item.productId]) map[item.productId] = { id: item.productId, name: item.product?.name || `Produit ${item.productId}`, revenue: 0, qty: 0 };
                    map[item.productId].revenue += parseFloat(item.subtotal || 0);
                    map[item.productId].qty += item.quantity;
                });
            }
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    };

    const getSlowProducts = () => {
        // Find products with high stock but low sales
        const topIds = getTopProducts().map(p => p.id);
        return products
            .filter(p => !topIds.includes(p.id))
            .sort((a, b) => b.stockQuantity - a.stockQuantity)
            .slice(0, 5);
    };

    const getRevenueByProduct = () => {
        // Similar to getTopProducts but mapped for the chart
        const map = {};
        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    if (!map[item.productId]) map[item.productId] = { name: item.product?.name || `Produit ${item.productId}`, Revenu: 0, Marge: 0 };
                    let rev = parseFloat(item.subtotal || 0);
                    map[item.productId].Revenu += rev;
                    // Mock margin at 30% for demo visualization
                    map[item.productId].Marge += rev * 0.3; 
                });
            }
        });
        return Object.values(map).slice(0, 10);
    };

    const getForecastData = () => {
        // Mocking 6 months forecast based on current average sales
        const monthlyAvg = sales.length > 0 ? sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0) / Math.max(1, sales.length * 0.1) : 5000;
        const months = ['M+1', 'M+2', 'M+3', 'M+4', 'M+5', 'M+6'];
        return months.map((m, i) => ({
            name: m,
            Prédiction: monthlyAvg * (1 + (i * 0.05)) + (Math.random() * 500),
            Historique: monthlyAvg
        }));
    };

    const getPeriodsData = () => {
        // Heatmap/Bar data by hour of day (mocked distribution of real count)
        const hourCounts = Array(24).fill(0);
        sales.forEach(s => {
            const h = new Date(s.createdAt).getHours();
            if (!isNaN(h)) hourCounts[h]++;
        });
        return hourCounts.map((count, h) => ({ heure: `${h}h`, Ventes: count > 0 ? count : Math.floor(Math.random() * 5) })).filter((d, i) => i > 7 && i < 22);
    };

    // Render Content based on tab
    const renderTabContent = () => {
        if (loadingData) {
            return <div className="flex h-64 items-center justify-center"><FiRefreshCw className="animate-spin text-4xl text-blue-500" /></div>;
        }

        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Top Products */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><FiTrendingUp className="text-green-500" /> Top Produits</h3>
                                <div className="space-y-3">
                                    {getTopProducts().map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <span className="font-medium">{p.name}</span>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600 dark:text-green-400">{formatCurrency(p.revenue)}</div>
                                                <div className="text-xs text-gray-500">{p.qty} vendus</div>
                                            </div>
                                        </div>
                                    ))}
                                    {getTopProducts().length === 0 && <p className="text-gray-500 text-sm">Pas assez de données.</p>}
                                </div>
                            </div>
                            
                            {/* Slow Products */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><FiAlertCircle className="text-orange-500" /> Produits Lents</h3>
                                <p className="text-sm text-gray-500 mb-3">Suggestions de promotions IA</p>
                                <div className="space-y-3">
                                    {getSlowProducts().map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <div>
                                                <span className="font-medium block">{p.name}</span>
                                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">-20% conseillé</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-gray-700 dark:text-gray-300">Stock: {p.stockQuantity}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'products':
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px]">
                        <h3 className="text-lg font-bold mb-6">Revenus et Marges par Produit</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getRevenueByProduct()}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} />
                                <YAxis tick={{fill: '#6b7280', fontSize: 12}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                                <Bar dataKey="Revenu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Marge" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'forecasts':
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px]">
                        <h3 className="text-lg font-bold mb-6">Prédictions de ventes sur 6 mois</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getForecastData()}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="name" tick={{fill: '#6b7280'}} />
                                <YAxis tick={{fill: '#6b7280'}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                                <Line type="monotone" dataKey="Prédiction" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                <Line type="dashed" dataKey="Historique" stroke="#cbd5e1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'periods':
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px]">
                        <h3 className="text-lg font-bold mb-6">Activité par Heure (Heatmap via BarChart)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getPeriodsData()}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="heure" tick={{fill: '#6b7280'}} />
                                <YAxis tick={{fill: '#6b7280'}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: 'rgba(239, 68, 68, 0.1)'}} />
                                <Bar dataKey="Ventes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'alerts':
                const lowStock = products.filter(p => p.stockQuantity < 10);
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><FiAlertCircle className="text-red-500"/> Alertes Stock Critique</h3>
                        <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {lowStock.length === 0 ? (
                                <p className="text-green-500 font-medium">Tout va bien ! Aucun produit en alerte de stock.</p>
                            ) : (
                                lowStock.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-xl relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                        <div>
                                            <p className="font-bold text-red-700 dark:text-red-400">{p.name}</p>
                                            <p className="text-sm text-red-600 dark:text-red-500/80">Code: {p.barcode}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="px-3 py-1 bg-red-500 text-white font-bold rounded-lg text-sm">{p.stockQuantity} en stock</span>
                                            <button className="text-sm text-red-600 dark:text-red-400 hover:underline">Commander</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            
            {/* MAIN DASHBOARD PANEL */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Tabs */}
                <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                                activeTab === tab.id 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <tab.icon className={activeTab === tab.id ? "text-white" : "text-gray-400"} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderTabContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* AI ASSISTANT SIDE PANEL */}
            <div className="w-[380px] flex flex-col bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden shrink-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <FiMessageCircle className="text-xl" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">Assistant IA</h2>
                            <p className="text-blue-100 text-xs text-opacity-80">Connecté à vos données</p>
                        </div>
                    </div>
                </div>

                {/* Quick Prompts */}
                <div className="px-5 pt-4 pb-2 flex gap-2 overflow-x-auto custom-scrollbar hide-scrollbar">
                    <button onClick={(e) => handleSendMessage(e, "Quelles promotions dois-je lancer ?")} className="whitespace-nowrap px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors">🔥 Promotions</button>
                    <button onClick={(e) => handleSendMessage(e, "Analyse mes ventes du mois")} className="whitespace-nowrap px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors">📈 Ventes</button>
                    <button onClick={(e) => handleSendMessage(e, "Quelles sont les alertes stock urgentes ?")} className="whitespace-nowrap px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors">⚠️ Stock</button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-sm' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                            }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isAiTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                            </div>
                        </div>
                        )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Demandez à l'IA..."
                            className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-full pl-5 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || isAiTyping}
                            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <FiSend />
                        </button>
                    </div>
                    <div className="mt-2 text-center">
                        <span className="text-[10px] text-gray-400">L'IA accède en temps réel aux données du magasin</span>
                    </div>
                </form>
            </div>
            
        </div>
    );
};

export default AIAnalytics;
