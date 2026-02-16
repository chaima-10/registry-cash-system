import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading System...</div>}>
            <App />
        </React.Suspense>
    </React.StrictMode>,
)
