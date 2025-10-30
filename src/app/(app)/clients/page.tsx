import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientsPage() {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
          <CardDescription>
            Manage your client information and credit details.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Clients Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Client management functionality is coming soon.
              </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
