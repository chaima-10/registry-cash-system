import { motion } from 'framer-motion';
import { FiDollarSign, FiShoppingBag, FiUsers, FiActivity } from 'react-icons/fi';

const StatCard = ({ title, value, change, icon: Icon, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl"
    >
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-opacity-20 ${color} bg-white`}>
                <Icon className={`text-2xl ${color.replace('bg-', 'text-')}`} />
            </div>
            <span className={`text-sm font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change > 0 ? '+' : ''}{change}%
            </span>
        </div>
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </motion.div>
);

const Dashboard = () => {
    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Revenue" value="$12,543.00" change={12.5} icon={FiDollarSign} color="bg-green-500" />
                <StatCard title="Total Orders" value="156" change={8.2} icon={FiShoppingBag} color="bg-blue-500" />
                <StatCard title="Active Users" value="12" change={-2.4} icon={FiUsers} color="bg-purple-500" />
                <StatCard title="Inventory Value" value="$45,230.00" change={5.1} icon={FiActivity} color="bg-orange-500" />
            </div>

            {/* Recent Activity Section (Placeholder) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <FiShoppingBag />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Order #{1000 + i}</p>
                                        <p className="text-sm text-gray-500">Just now</p>
                                    </div>
                                </div>
                                <span className="text-white font-bold">$125.00</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Stock Alerts</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-red-400 font-medium">Low Stock: Coca Cola</p>
                                <p className="text-sm text-red-500/70">Only 5 items remaining</p>
                            </div>
                            <button className="px-3 py-1 bg-red-500/20 text-red-300 text-sm rounded-lg hover:bg-red-500/30">Restock</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
