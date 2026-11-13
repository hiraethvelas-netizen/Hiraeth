import type { Tables } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";

type Product = Tables<"products">;
type Props = {
  products: readonly Product[];
  search: string;
  onSearchChange: (value: string) => void;
  categoryLabel: (id: string | null) => string;
  loading: boolean;
  onEdit: (product: Product) => void | Promise<void>;
  onRemove: (id: string, name: string) => void | Promise<void>;
};

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
const statusLabel = (status: string) =>
  status === "published" ? "Publicado" : status === "draft" ? "Rascunho" : "Arquivado";

export function AdminProductList({
  products,
  search,
  onSearchChange,
  categoryLabel,
  loading,
  onEdit,
  onRemove,
}: Props) {
  const terms = fold(search).trim().split(/\s+/).filter(Boolean);
  const filtered = products.filter((product) => {
    const text = fold(`${product.name} ${product.sku ?? ""} ${categoryLabel(product.category_id)}`);
    return terms.every((term) => text.includes(term));
  });

  return (
    <section className="mt-6 space-y-4" aria-label="Lista de produtos">
      <div className="rounded-lg border border-primary/35 bg-card p-4 text-card-foreground">
        <label className="block text-sm font-medium text-foreground" htmlFor="admin-product-search">
          Pesquisar velas e produtos
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="admin-product-search"
            type="search"
            value={search}
            disabled={loading && products.length === 0}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nome, SKU ou categoria"
            className="min-w-0 flex-1 rounded border border-[#878e47] bg-[#fbf7eb] px-3 py-3 text-base text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:outline-2 focus:outline-offset-2 focus:outline-[#59612f]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="rounded border border-primary/45 px-3 py-2 text-sm text-foreground hover:bg-primary/10"
            >
              Limpar busca
            </button>
          )}
        </div>
        {(!loading || products.length > 0) && (
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            {filtered.length} de {products.length} produto(s)
            {loading ? " · Atualizando..." : ""}
          </p>
        )}
      </div>
      {loading && products.length === 0 ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : products.length === 0 ? (
        <p className="text-foreground">Nenhum produto cadastrado ainda.</p>
      ) : filtered.length === 0 ? (
        <p className="text-foreground">Nenhum produto encontrado para essa pesquisa.</p>
      ) : (
        <div className="lg:overflow-x-auto lg:rounded-lg lg:border lg:border-primary/30 lg:bg-card lg:p-3 lg:text-card-foreground">
          <table className="block w-full text-left text-sm lg:table lg:min-w-[880px] lg:table-fixed">
            <caption className="sr-only">Produtos cadastrados e ações de edição</caption>
            <colgroup className="hidden lg:table-column-group">
              <col className="w-[29%]" />
              <col className="w-[21%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead className="sr-only lg:not-sr-only lg:table-header-group">
              <tr className="border-b text-xs uppercase tracking-widest text-muted-foreground">
                {["Produto", "Categoria", "Preço", "Estoque", "Status", "Ações"].map((label) => (
                  <th key={label} scope="col" className="py-3 pr-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="grid gap-4 lg:table-row-group lg:divide-y">
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-primary/30 bg-card p-4 text-card-foreground lg:table-row lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
                >
                  <td className="col-span-2 block min-w-0 lg:table-cell lg:py-4 lg:pr-4">
                    <div className="flex min-w-0 items-start gap-3">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt=""
                          className="h-20 w-14 shrink-0 object-contain lg:h-14 lg:w-11"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="block break-words font-display text-lg leading-snug text-foreground lg:text-base">
                          {product.name}
                        </span>
                        {product.sku && (
                          <span className="mt-1 block break-all text-xs text-muted-foreground">
                            SKU: {product.sku}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="col-span-2 block min-w-0 break-words text-muted-foreground lg:table-cell lg:py-4 lg:pr-4">
                    <span className="mb-1 block text-xs font-medium text-foreground lg:hidden">
                      Categoria
                    </span>
                    {categoryLabel(product.category_id)}
                  </td>
                  <td className="block text-foreground lg:table-cell lg:py-4 lg:pr-4">
                    <span className="mb-1 block text-xs font-medium lg:hidden">Preço</span>
                    <span className="whitespace-nowrap">
                      {brl(Number(product.sale_price ?? product.price))}
                    </span>
                  </td>
                  <td className="block lg:table-cell lg:py-4 lg:pr-4">
                    <span className="mb-1 block text-xs font-medium text-foreground lg:hidden">
                      Estoque
                    </span>
                    <span
                      className={
                        product.stock <= 5
                          ? "inline-block rounded bg-[#fff1d0] px-2 py-1 font-semibold text-[#5b1d04]"
                          : "text-foreground"
                      }
                    >
                      {product.stock}
                      {product.stock <= 5 ? " · Baixo" : ""}
                    </span>
                  </td>
                  <td className="block text-muted-foreground lg:table-cell lg:py-4 lg:pr-4">
                    <span className="mb-1 block text-xs font-medium text-foreground lg:hidden">
                      Status
                    </span>
                    {statusLabel(product.status)}
                  </td>
                  <td className="col-span-2 block lg:table-cell lg:py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void onEdit(product)}
                        aria-label={`Editar ${product.name}`}
                        className="rounded border border-primary/50 px-3 py-2 font-semibold text-foreground hover:bg-primary/10"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRemove(product.id, product.name)}
                        aria-label={`Remover ${product.name}`}
                        className="rounded border border-primary/35 px-3 py-2 text-foreground hover:bg-primary/10"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
