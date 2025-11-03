import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  quantity: number;
}

export default function Movements() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    product_id: "",
    type: "entrada" as "entrada" | "saida",
    quantity: 1,
    notes: "",
  });

  useEffect(() => {
    fetchProducts();
    fetchProfile();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast.error("Erro ao carregar produtos");
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast.error("Usuário não autenticado");
      return;
    }

    const selectedProduct = products.find((p) => p.id === formData.product_id);
    if (!selectedProduct) {
      toast.error("Produto não encontrado");
      return;
    }

    // Validação de estoque para saída
    if (
      formData.type === "saida" &&
      formData.quantity > selectedProduct.quantity
    ) {
      toast.error("Quantidade insuficiente em estoque");
      return;
    }

    try {
      // Calcular nova quantidade
      const newQuantity =
        formData.type === "entrada"
          ? selectedProduct.quantity + formData.quantity
          : selectedProduct.quantity - formData.quantity;

      // Atualizar quantidade do produto
      const { error: updateError } = await supabase
        .from("products")
        .update({ quantity: newQuantity })
        .eq("id", formData.product_id);

      if (updateError) throw updateError;

      // Registrar movimentação
      const { error: insertError } = await supabase.from("movements").insert([
        {
          product_id: formData.product_id,
          type: formData.type,
          quantity: formData.quantity,
          responsible_id: user.id,
          responsible_name: profile.full_name,
          notes: formData.notes || null,
        },
      ]);

      if (insertError) throw insertError;

      toast.success("Movimentação registrada com sucesso!");
      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error("Erro ao registrar movimentação");
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      type: "entrada",
      quantity: 1,
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimentações</h1>
          <p className="text-muted-foreground">
            Registre entradas e saídas de produtos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
              <DialogDescription>
                Registre uma entrada ou saída de estoque
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Produto *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, product_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Estoque: {product.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Movimentação *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "entrada" | "saida") =>
                    setFormData({ ...formData, type: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        Entrada
                      </div>
                    </SelectItem>
                    <SelectItem value="saida">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        Saída
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Adicione observações sobre esta movimentação..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Movimentação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Clique no botão "Nova Movimentação" para registrar entradas ou saídas
            de produtos do estoque.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="rounded-full bg-success/10 p-3">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">Entrada</h3>
                <p className="text-sm text-muted-foreground">
                  Adiciona produtos ao estoque
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Saída</h3>
                <p className="text-sm text-muted-foreground">
                  Remove produtos do estoque
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
