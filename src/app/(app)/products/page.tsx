import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Manage your product catalog, including SKUs and pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Products Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Product management functionality is coming soon.
              </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
