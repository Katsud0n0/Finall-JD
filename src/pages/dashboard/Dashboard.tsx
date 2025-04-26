
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import RecentActivities from "@/components/dashboard/RecentActivities";
import StatCard from "@/components/dashboard/StatCard";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import RequestForm from "@/components/dashboard/RequestForm";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/api";

const Dashboard = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    // Load requests from localStorage
    const storedRequests = localStorage.getItem("jd-requests");
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    }
    
    // Check for expired requests on component mount
    checkExpiredRequests();
  }, []);

  // Function to check for expired requests
  const checkExpiredRequests = () => {
    const now = new Date();
    const storedRequests = JSON.parse(localStorage.getItem("jd-requests") || "[]");
    
    let updated = false;
    
    const updatedRequests = storedRequests.map((req: any) => {
      // Check for completed/rejected items to mark as expired after 1 day
      if ((req.status === "Completed" || req.status === "Rejected") && req.lastStatusUpdate) {
        const statusUpdateDate = new Date(req.lastStatusUpdate);
        const oneDayLater = new Date(statusUpdateDate);
        oneDayLater.setDate(oneDayLater.getDate() + 1);
        
        if (now > oneDayLater && !req.isExpired) {
          updated = true;
          return { ...req, isExpired: true };
        }
      } 
      
      // Auto-delete expired items
      if (req.isExpired) {
        updated = true;
        return null; // Mark for deletion
      }
      
      return req;
    }).filter(Boolean); // Remove null items (deleted requests)
    
    if (updated) {
      localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
      setRequests(updatedRequests);
    }
  };

  const handleRequestSuccess = () => {
    setIsDialogOpen(false);
    // Reload requests to show the new one
    const storedRequests = localStorage.getItem("jd-requests");
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    }
  };

  // For debugging only - ensure proper structure
  const fixRequestsStructure = () => {
    const storedRequests = JSON.parse(localStorage.getItem("jd-requests") || "[]");
    
    // Make sure each request has correct structure
    const fixedRequests = storedRequests.map((req: any) => {
      // Ensure acceptedBy is consistent
      if (req.status === "In Process" && (!req.acceptedBy || req.acceptedBy === true)) {
        return {
          ...req,
          acceptedBy: user?.username || "unknown" // Fix missing acceptedBy
        };
      }
      
      // Ensure that multi-department requests and projects always have an array for acceptedBy
      if ((req.multiDepartment || req.type === "project") && req.acceptedBy && !Array.isArray(req.acceptedBy)) {
        return {
          ...req,
          acceptedBy: [req.acceptedBy]
        };
      }
      
      // Make sure In Process status only applies when 2+ users have accepted for multi/project
      if ((req.multiDepartment || req.type === "project") && req.status === "In Process") {
        const acceptedUsers = Array.isArray(req.acceptedBy) ? req.acceptedBy : [];
        if (acceptedUsers.length < 2) {
          return {
            ...req,
            status: "Pending" // Revert to pending if not enough users
          };
        }
      }
      
      return req;
    });
    
    localStorage.setItem("jd-requests", JSON.stringify(fixedRequests));
    setRequests(fixedRequests);
    console.log("Fixed requests structure:", fixedRequests);
  };

  useEffect(() => {
    // Run the fix on initial load
    fixRequestsStructure();
  }, [user]);

  // Count requests by status
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === "Pending").length;
  const completedRequests = requests.filter(r => r.status === "Completed").length;
  const rejectedRequests = requests.filter(r => r.status === "Rejected").length;

  const getUserRequests = () => {
    // Filter requests created by the current user or where the user is a participant
    return requests.filter(req => {
      // For requests the user created
      const userIsCreator = req.creator === user?.username;
      
      // For requests the user accepted
      let userIsParticipant = false;
      if (Array.isArray(req.acceptedBy)) {
        userIsParticipant = req.acceptedBy.includes(user?.username);
      } else if (typeof req.acceptedBy === 'string') {
        userIsParticipant = req.acceptedBy === user?.username;
      }
      
      return userIsCreator || userIsParticipant;
    }).slice(0, 3); // Get only the first 3
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-medium">Welcome back, {user?.username || 'user'}</h2>
      
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Requests"
          value={totalRequests}
          description="All department requests"
          icon={<FileText size={18} />}
          color="jd-blue"
        />
        
        <StatCard 
          title="Pending"
          value={pendingRequests}
          description="Awaiting action"
          icon={<Clock size={18} />}
          color="jd-orange"
        />
        
        <StatCard 
          title="Completed"
          value={completedRequests}
          description="Request completed"
          icon={<CheckCircle size={18} />}
          color="jd-green"
        />
        
        <StatCard 
          title="Rejected"
          value={rejectedRequests}
          description="Request denied"
          icon={<XCircle size={18} />}
          color="jd-red"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities Component */}
        <div className="lg:col-span-1">
          <RecentActivities />
        </div>
        
        {/* Recent Requests */}
        <div className="lg:col-span-2 bg-jd-card rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium">Your Recent Requests</h3>
            <a href="/requests" className="text-sm text-jd-purple hover:underline">
              View All
            </a>
          </div>
          
          {getUserRequests().length > 0 ? (
            <div className="space-y-4">
              {getUserRequests().map((request, index) => (
                <div 
                  key={index} 
                  className={`p-4 bg-jd-bg rounded-lg ${
                    (request.status === "Completed" || request.status === "Rejected") ? 'opacity-50' : ''
                  } ${request.isExpired ? 'opacity-30' : ''}`}
                >
                  <div className="flex justify-between">
                    <h4 className="font-medium">{request.title}</h4>
                    <div className="flex flex-col">
                      <span className={`px-2 py-1 rounded text-xs ${
                        request.status === "Pending" 
                          ? "bg-jd-orange/20 text-jd-orange"
                          : request.status === "In Process"
                            ? "bg-blue-500/20 text-blue-500" 
                            : request.status === "Completed" 
                              ? "bg-jd-green/20 text-jd-green"
                              : "bg-jd-red/20 text-jd-red"
                      }`}>
                        {request.status}
                      </span>
                      {(request.status === "Completed" || request.status === "Rejected") && (
                        <span className="text-xs text-jd-mutedText mt-1">Expires in 1 day</span>
                      )}
                      {request.type === "project" && request.usersNeeded && (
                        <span className="text-xs text-jd-mutedText mt-1">
                          Accepted by {request.usersAccepted || 0}/{request.usersNeeded} users
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-jd-mutedText mt-1">
                    Submitted to: {
                      Array.isArray(request.departments) 
                      ? request.departments.join(", ") 
                      : request.department
                    }
                  </p>
                  <p className="text-sm text-jd-mutedText mt-1">{request.dateCreated}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-20 w-20 bg-jd-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-jd-mutedText" />
              </div>
              <h4 className="text-xl mb-2">No Requests Yet</h4>
              <p className="text-jd-mutedText mb-6">
                You haven't created any interdepartmental requests yet.
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-jd-purple hover:bg-jd-darkPurple">
                    Create Your First Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-jd-card border-jd-card">
                  <DialogHeader>
                    <DialogTitle>Create New Request</DialogTitle>
                    <DialogDescription>
                      Submit a new request to another department
                    </DialogDescription>
                  </DialogHeader>
                  <RequestForm onSuccess={handleRequestSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
