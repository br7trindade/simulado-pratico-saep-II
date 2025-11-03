import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_stock: number;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  responsible_name: string;
  created_at: string;
  products: {
    name: string;
  };
}

export default function Dashboard() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total products
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      setTotalProducts(productCount || 0);

      // Fetch low stock products
      const { data: allProducts } = await supabase
        .from("products")
        .select("*");

      const lowStock = (allProducts || [])
        .filter(p => p.quantity <= p.min_stock)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 5);

      setLowStockProducts(lowStock || []);

      // Fetch recent movements
      const { data: movements } = await supabase
        .from("movements")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentMovements(movements || []);
    } catch (error) {
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: "Crítico", variant: "destructive" as const };
    if (quantity <= minStock) return { label: "Baixo", variant: "warning" as const };
    return { label: "Normal", variant: "success" as const };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu estoque de equipamentos eletrônicos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Produtos"
          value={totalProducts}
          icon={Package}
          description="Produtos cadastrados"
        />
        <StatsCard
          title="Estoque Baixo"
          value={lowStockProducts.length}
          icon={AlertTriangle}
          description="Produtos com estoque crítico"
          variant={lowStockProducts.length > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Produtos com Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto com estoque baixo
              </p>
            ) : (
              <div className="space-y-4">
                {lowStockProducts.map((product) => {
                  const status = getStockStatus(product.quantity, product.min_stock);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <span className="text-sm font-medium">
                          {product.quantity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Últimas Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma movimentação registrada
              </p>
            ) : (
              <div className="space-y-4">
                {recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {movement.products.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {movement.responsible_name} •{" "}
                        {new Date(movement.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {movement.type === "entrada" ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-sm font-medium">
                        {movement.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
