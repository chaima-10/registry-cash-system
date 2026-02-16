import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ProfilePage = () => {
    const { user } = useAuth();
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Profile</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">{user?.username}</h3>
                        <p className="text-blue-400">{user?.role}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
