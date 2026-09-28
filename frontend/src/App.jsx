import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { NewOrderForm } from './components/NewOrderForm';
import { MyOrders } from './components/MyOrders';
import { OwnerDashboard } from './components/OwnerDashboard';
import { AuthModal } from './components/AuthModal';
import { QRCodeModal } from './components/QRCodeModal';
import { Printer, ShieldCheck, Zap, Clock, Sparkles } from 'lucide-react';

const MainContent = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('new-order');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [createdOrderPass, setCreatedOrderPass] = useState(null);

  // Sync tab if user logs in as owner
  React.useEffect(() => {
    if (user?.role === 'owner') {
      setActiveTab('owner-dashboard');
    }
  }, [user]);

  const handleOrderCreated = (orderData) => {
    setCreatedOrderPass(orderData);
    setActiveTab('my-orders');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Guest Hero Banner when not logged in */}
        {!user && (
          <div className="mb-8 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-bold border border-blue-400/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero Shop Crowding • Smart ML Queueing</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Skip College Xerox Shop Crowds with <span className="text-cyan-400">PrintQ</span>
              </h1>
              <p className="text-xs sm:text-sm text-blue-200">
                Upload your assignments and manuals online, pick single/double sides & color options, get live wait predictions, and collect directly at the counter when marked Ready!
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
                >
                  Sign In / Quick Register
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content Display */}
        {user?.role === 'owner' ? (
          <OwnerDashboard />
        ) : activeTab === 'my-orders' ? (
          <MyOrders activeOrderFromCreated={createdOrderPass} />
        ) : (
          <NewOrderForm
            onOrderCreated={handleOrderCreated}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-800">PrintQ Smart Campus Xerox System</span>
          </div>
          <div>Powered by FastAPI, React, SQLite & Scikit-Learn ML</div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Order Created QR Pass Modal */}
      {createdOrderPass && (
        <QRCodeModal
          isOpen={!!createdOrderPass}
          onClose={() => setCreatedOrderPass(null)}
          order={createdOrderPass}
        />
      )}

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
