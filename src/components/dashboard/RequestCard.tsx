
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Request } from "@/types/profileTypes";
import { format } from "date-fns";

interface RequestCardProps {
  request: Request;
  isProfileView?: boolean;
  isCreatorView?: boolean;
  onUpdate?: () => void;
}

const RequestCard = ({ 
  request, 
  isProfileView = false, 
  isCreatorView = false,
  onUpdate
}: RequestCardProps) => {
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  // Determine the badge color based on status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case "in process":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };
  
  // Get participants count
  const getParticipantsCount = () => {
    if (!request.acceptedBy) return 0;
    if (Array.isArray(request.acceptedBy)) return request.acceptedBy.length;
    if (typeof request.acceptedBy === 'string') {
      try {
        return JSON.parse(request.acceptedBy).length;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  };

  return (
    <Card className="overflow-hidden border border-jd-card">
      <CardHeader className="bg-jd-card py-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium">{request.title}</h3>
            <p className="text-xs text-jd-mutedText mt-1">
              {request.type === "project" ? "Project" : "Request"} · Created on {formatDate(request.createdAt || request.dateCreated)}
            </p>
          </div>
          <Badge className={getStatusColor(request.status)}>
            {request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-4">
        <p className="text-sm">{request.description}</p>
        
        <div className="mt-4">
          <div className="flex flex-wrap gap-2 mt-2">
            {request.department && (
              <Badge variant="outline" className="text-xs">
                {request.department}
              </Badge>
            )}
            {Array.isArray(request.departments) &&
              request.departments.map((dept, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {dept}
                </Badge>
              ))}
          </div>
        </div>
        
        {(request.type === "project" || request.multiDepartment) && (
          <div className="mt-4 text-xs text-jd-mutedText">
            <div className="flex items-center justify-between">
              <span>Participants:</span>
              <span>
                {getParticipantsCount()} / {request.usersNeeded || 2} joined
              </span>
            </div>
          </div>
        )}
      </CardContent>
      
      <Separator />
      
      <CardFooter className="py-3 bg-jd-card">
        <div className="w-full flex justify-end gap-2">
          <Button variant="outline" size="sm">
            View Details
          </Button>
          {isCreatorView && request.status === "Pending" && (
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default RequestCard;
