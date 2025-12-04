import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tag as TagIcon, Trash2, Plus, Check } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SUGGESTED_CATEGORIES } from "@/utils/security/constants";
import { useAuth } from "@/contexts/AuthContext";

interface UserTag {
  id: string;
  name: string;
}

const Tags = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customTags, setCustomTags] = useState<UserTag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTags();
    }
  }, [user]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase.from("user_tags").select("*").order("name", { ascending: true });

      if (error) throw error;
      setCustomTags(data || []);
    } catch (error) {
      console.error("Erro ao buscar tags:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent | null, tagName?: string) => {
    if (e) e.preventDefault();
    const tagToAdd = tagName || newTag;

    if (!tagToAdd.trim() || !user) return;

    const lowerName = tagToAdd.trim().toLowerCase();
    const isCustom = customTags.some((t) => t.name.toLowerCase() === lowerName);

    if (isCustom) {
      toast({
        title: "Categoria já existe",
        description: "Você já possui esta categoria.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("user_tags").insert({
        user_id: user.id,
        name: tagToAdd.trim(),
      });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Categoria adicionada!" });
      if (!tagName) setNewTag("");
      fetchTags();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao adicionar categoria", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      const { error } = await supabase.from("user_tags").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Removido", description: "Categoria excluída com sucesso." });
      fetchTags();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover categoria", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground mt-2">Personalize as categorias usadas nos seus lançamentos.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Criar Nova Tag */}
          <Card>
            <CardHeader>
              <CardTitle>Nova Categoria</CardTitle>
              <CardDescription>Crie uma categoria personalizada.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => handleAddTag(e)} className="flex gap-2">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="tag">Nome</Label>
                  <Input
                    id="tag"
                    placeholder="Ex: Uber, Freelance..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="mt-auto" disabled={loading || !newTag.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tags Sugeridas */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Sugestões</CardTitle>
              <CardDescription>Clique para adicionar às suas categorias.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_CATEGORIES.map((cat) => {
                  const isAdded = customTags.some((t) => t.name.toLowerCase() === cat.toLowerCase());
                  return (
                    <Badge
                      key={cat}
                      variant={isAdded ? "secondary" : "outline"}
                      className={`text-sm font-normal cursor-pointer transition-colors ${
                        isAdded ? "opacity-50 cursor-default" : "hover:bg-primary hover:text-primary-foreground"
                      }`}
                      onClick={() => !isAdded && handleAddTag(null, cat)}
                    >
                      {cat}
                      {isAdded && <Check className="ml-1 h-3 w-3" />}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tags Personalizadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-primary" />
              Minhas Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : customTags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Você ainda não possui categorias. Adicione uma acima.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {customTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <span className="font-medium">{tag.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Tags;
