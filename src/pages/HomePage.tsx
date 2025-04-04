
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuotes } from "@/hooks/useQuotes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import QuoteCard from "@/components/shared/QuoteCard";
import { Skeleton } from "@/components/ui/skeleton";

const HomePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("create");
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const { quotes, loading, error, fetchQuotes } = useQuotes();

  // Check authentication status
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch quotes when the "existing" tab becomes active
  useEffect(() => {
    if (activeTab === "existing") {
      fetchQuotes();
    }
  }, [activeTab, fetchQuotes]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleStartNewQuote = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleQuoteCreated = (newQuoteId: string) => {
    navigate(`/quote/${newQuoteId}/input`);
  };

  if (!user) return null; // Don't render anything if not authenticated

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">SysQuote Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Welcome, {user.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs
          defaultValue="create"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="bg-gray-800 border-b border-gray-700 w-full justify-start mb-6">
            <TabsTrigger value="create" className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-blue-400">
              Create New Quote
            </TabsTrigger>
            <TabsTrigger value="existing" className="text-gray-300 data-[state=active]:bg-gray-700 data-[state=active]:text-blue-400">
              Existing Quotes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Start Creating a New Quote</h2>
              <p className="text-gray-400 mb-6 text-center">
                Create a new quote for your client and start calculating costs for training plans.
              </p>
              <Button 
                onClick={handleStartNewQuote}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6"
              >
                Start New Quote
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="mt-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-1" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-center">
                <p className="text-red-400">{error}</p>
                <Button 
                  onClick={fetchQuotes} 
                  variant="outline" 
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : quotes.length === 0 ? (
              <div className="p-8 bg-gray-800 rounded-lg border border-gray-700 text-center">
                <p className="text-gray-400 mb-4">You haven't created any quotes yet.</p>
                <Button 
                  onClick={() => setActiveTab("create")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Your First Quote
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotes.map((quote) => (
                  <QuoteCard
                    key={quote.quote_id}
                    quote_id={quote.quote_id}
                    quote_name={quote.quote_name}
                    client_name={quote.client_name}
                    created_at={quote.created_at}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Placeholder for the New Quote popup */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">New Quote Info</h2>
            <p className="text-gray-400 mb-4">This is a placeholder for the New Quote popup component.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClosePopup}>
                Cancel
              </Button>
              <Button onClick={() => handleQuoteCreated("placeholder-id")}>
                Create (Demo)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
