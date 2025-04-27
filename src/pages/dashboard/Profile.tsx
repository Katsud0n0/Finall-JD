
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RequestCard from "@/components/dashboard/RequestCard";
import AdminControls from "@/components/dashboard/AdminControls";
import { v4 as uuidv4 } from 'uuid';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("accepted");

  // Function to load user requests from DB/localStorage
  const loadUserRequests = async () => {
    setIsLoading(true);
    try {
      // Try to get from API
      const response = await fetch(`http://localhost:3000/api/requests`);
      let requests = [];

      if (response.ok) {
        requests = await response.json();
        console.log("Loaded requests from API:", requests);
      } else {
        // Fallback to localStorage
        requests = JSON.parse(localStorage.getItem("jd-requests") || "[]");
        console.log("Loaded requests from localStorage:", requests);
      }

      // Filter requests based on user's involvement
      if (user) {
        // For accepted tab: show requests this user has accepted
        const accepted = requests.filter((req: any) => {
          let acceptedBy = [];
          try {
            acceptedBy = Array.isArray(req.acceptedBy) 
              ? req.acceptedBy 
              : (req.acceptedBy ? JSON.parse(req.acceptedBy) : []);
          } catch (e) {
            acceptedBy = [];
          }
          
          // Show if user created the project or accepted it
          return (
            (req.type === 'project' && req.creator === user.username) ||
            acceptedBy.includes(user.username)
          );
        });
        
        // For history tab: show requests this user created but hasn't accepted
        const history = requests.filter((req: any) => {
          return req.creator === user.username && req.type !== 'project';
        });
        
        // Filter out items that would appear in the accepted tab
        const uniqueHistory = history.filter((historyItem: any) => {
          return !accepted.some((acceptedItem: any) => acceptedItem.id === historyItem.id);
        });
        
        // Combine and sort by date created (newest first)
        setUserRequests([...accepted, ...uniqueHistory].sort((a, b) => {
          return new Date(b.createdAt || b.dateCreated).getTime() - 
                 new Date(a.createdAt || a.dateCreated).getTime();
        }));
      }
    } catch (error) {
      console.error("Error loading user requests:", error);
      toast({
        title: "Error",
        description: "Failed to load your requests. Please try again.",
        variant: "destructive",
      });
      // Fallback to localStorage
      const requests = JSON.parse(localStorage.getItem("jd-requests") || "[]");
      setUserRequests(requests.filter((req: any) => req.creator === user?.username));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserRequests();
    }
  }, [user]);

  const handleClearRequests = () => {
    loadUserRequests(); // Reload after clearing
  };

  // Filter requests for the active tab
  const getFilteredRequests = () => {
    if (activeTab === "accepted") {
      return userRequests.filter((req) => {
        let acceptedBy = [];
        try {
          acceptedBy = Array.isArray(req.acceptedBy) 
            ? req.acceptedBy 
            : (req.acceptedBy ? JSON.parse(req.acceptedBy) : []);
        } catch (e) {
          acceptedBy = [];
        }
        
        return acceptedBy.includes(user?.username) ||
               (req.type === 'project' && req.creator === user?.username);
      });
    } else {
      return userRequests.filter((req) => {
        let acceptedBy = [];
        try {
          acceptedBy = Array.isArray(req.acceptedBy) 
            ? req.acceptedBy 
            : (req.acceptedBy ? JSON.parse(req.acceptedBy) : []);
        } catch (e) {
          acceptedBy = [];
        }
        
        return req.creator === user?.username && 
               req.type !== 'project' &&
               !acceptedBy.includes(user?.username);
      });
    }
  };
  
  const filteredRequests = getFilteredRequests();
  
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-jd-mutedText">
          Manage your requests and projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="accepted" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="accepted">Accepted Items</TabsTrigger>
              <TabsTrigger value="history">Your Requests</TabsTrigger>
            </TabsList>
            <TabsContent value="accepted" className="mt-6">
              <h3 className="text-xl font-medium mb-4">Items You're Working On</h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <p>Loading...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="bg-jd-card rounded-lg p-6 text-center">
                  <p>You have not accepted any requests or projects.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <RequestCard
                      key={request.id || uuidv4()}
                      request={request}
                      isProfileView={true}
                      onUpdate={loadUserRequests}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              <h3 className="text-xl font-medium mb-4">Your Submitted Requests</h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <p>Loading...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="bg-jd-card rounded-lg p-6 text-center">
                  <p>You have not submitted any requests yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <RequestCard
                      key={request.id || uuidv4()}
                      request={request}
                      isCreatorView={true}
                      onUpdate={loadUserRequests}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <div className="bg-jd-card rounded-lg p-6 border border-jd-card">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-jd-purple flex items-center justify-center text-white text-lg font-semibold">
                {user?.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="font-medium">{user?.fullName}</h3>
                <p className="text-sm">{user?.email}</p>
                <p className="text-sm text-jd-mutedText mt-1">
                  {user?.department} - {user?.role}
                </p>
              </div>
            </div>
          </div>

          {user?.role === "admin" && <AdminControls onClearRequests={handleClearRequests} />}
          
          <div className="bg-jd-card rounded-lg p-6 border border-jd-card">
            <h3 className="font-medium mb-4">Recent Activity</h3>
            <div className="text-sm text-jd-mutedText">
              <p>
                {filteredRequests.length > 0
                  ? `You have ${filteredRequests.length} active ${
                      filteredRequests.length === 1 ? "item" : "items"
                    } in your profile.`
                  : "No recent activity to display."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
