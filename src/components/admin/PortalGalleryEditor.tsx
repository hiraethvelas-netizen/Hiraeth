import { useMemo, useState } from "react";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { uploadSiteImage } from "@/lib/admin-edit";
import { galleryDraftFromTheme, isSafePortalUrl, updatePortalGallery, type PortalGalleryItem } from "@/lib/portal-experience";
import { toast } from "sonner";

type Props={ themeJson:string; onChange:(json:string)=>void };

export function PortalGalleryEditor({themeJson,onChange}:Props) {
  const [cropping,setCropping]=useState<{index:number;source:File}|null>(null);
  const [uploading,setUploading]=useState(false);
  const theme=useMemo(()=>{
    try {return JSON.parse(themeJson||"{}") as unknown;} catch {return null;}
  },[themeJson]);
  const items=useMemo(()=>galleryDraftFromTheme(theme),[theme]);

  function saveItems(next:PortalGalleryItem[]) {
    if(theme===null){
      toast.error("Abra “Configurações avançadas” e corrija o JSON antes de editar as fotos.");
      return;
    }
    onChange(JSON.stringify(updatePortalGallery(theme,next),null,2));
  }
  function patch(index:number,updates:Partial<PortalGalleryItem>) {
    saveItems(items.map((item,i)=>i===index?{...item,...updates}:item));
  }
  function move(index:number,direction:-1|1) {
    const target=index+direction;
    if(target<0||target>=items.length)return;
    const next=[...items];
    [next[index],next[target]]=[next[target]!,next[index]!];
    saveItems(next);
  }

  return <section className="relative z-10 rounded-lg border border-primary/35 bg-card p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-2xl text-foreground">Fotos da edição de Natal</h3>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Adicione as fotos do carrossel. Você pode mudar a ordem, as legendas e os links.
        </p>
      </div>
      <button type="button"
        className="rounded border border-primary/60 px-4 py-2 text-sm text-foreground hover:bg-primary/10"
        onClick={()=>saveItems([...items,{
          id:crypto.randomUUID(),title:"",image_url:"",description:"",url:"",
        }])}>+ Adicionar foto</button>
    </div>
    {items.length===0 && <p className="mt-5 rounded border border-dashed border-primary/35 p-5 text-sm text-muted-foreground">
      Nenhuma foto cadastrada. Toque em “Adicionar foto” para começar.
    </p>}
    <div className="mt-4 space-y-4">
      {items.map((item,index)=><div key={item.id} className="rounded border border-primary/25 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-foreground">Foto {index+1}</p>
          <div className="flex gap-2">
            <button type="button" aria-label={`Mover foto ${index+1} para a esquerda`}
              disabled={index===0} onClick={()=>move(index,-1)}
              className="rounded border border-primary/35 px-3 py-1 text-sm text-foreground disabled:opacity-50">←</button>
            <button type="button" aria-label={`Mover foto ${index+1} para a direita`}
              disabled={index===items.length-1} onClick={()=>move(index,1)}
              className="rounded border border-primary/35 px-3 py-1 text-sm text-foreground disabled:opacity-50">→</button>
            <button type="button" onClick={()=>saveItems(items.filter((_,i)=>i!==index))}
              className="rounded border border-destructive/50 px-3 py-1 text-sm text-destructive">Excluir</button>
          </div>
        </div>
        {item.image_url&&isSafePortalUrl(item.image_url)&&<img
          src={item.image_url} alt={item.title||`Prévia da foto ${index+1}`}
          className="my-3 aspect-square w-32 rounded object-cover" />}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-foreground">Título/legenda da foto
            <input value={item.title} onChange={e=>patch(index,{title:e.target.value})}
              placeholder="Ex.: Natal entre as páginas"
              className="mt-1 w-full rounded border border-[#878e47] bg-[#fbf7eb] px-3 py-2 text-sm text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:border-[#59612f] focus:outline-none focus:ring-2 focus:ring-[#59612f]/35"/>
          </label>
          <label className="text-xs text-foreground">Link (opcional)
            <input value={item.url} onChange={e=>patch(index,{url:e.target.value})}
              placeholder="/loja?categoria=harry-potter"
              className="mt-1 w-full rounded border border-[#878e47] bg-[#fbf7eb] px-3 py-2 text-sm text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:border-[#59612f] focus:outline-none focus:ring-2 focus:ring-[#59612f]/35"/>
          </label>
          <label className="text-xs text-foreground md:col-span-2">Descrição curta (opcional)
            <input value={item.description} onChange={e=>patch(index,{description:e.target.value})}
              className="mt-1 w-full rounded border border-[#878e47] bg-[#fbf7eb] px-3 py-2 text-sm text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:border-[#59612f] focus:outline-none focus:ring-2 focus:ring-[#59612f]/35"/>
          </label>
          <label className="text-xs text-foreground md:col-span-2">Imagem da coleção
            <input type="file" accept="image/jpeg,image/png,image/webp"
              onChange={e=>{
                const file=e.target.files?.[0];
                if(file)setCropping({index,source:file});
                e.currentTarget.value="";
              }}
              className="mt-1 w-full rounded border border-[#878e47] bg-[#fbf7eb] px-3 py-2 text-sm text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:border-[#59612f] focus:outline-none focus:ring-2 focus:ring-[#59612f]/35 file:mr-3 file:rounded file:border-0 file:bg-[#e9e7d2] file:px-3 file:py-1.5 file:text-[#34402b]"/>
            <span className="mt-1 block text-xs text-muted-foreground">JPG, PNG ou WebP até 5 MB. Você poderá ajustar o recorte quadrado antes de enviar.</span>
          </label>
          <label className="text-xs text-foreground md:col-span-2">Ou cole a URL da imagem
            <input value={item.image_url} onChange={e=>patch(index,{image_url:e.target.value})}
              placeholder="https://..."
              className="mt-1 w-full rounded border border-[#878e47] bg-[#fbf7eb] px-3 py-2 text-sm text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light] focus:border-[#59612f] focus:outline-none focus:ring-2 focus:ring-[#59612f]/35"/>
          </label>
        </div>
      </div>)}
    </div>
    {cropping&&<div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Recortar foto natalina">
      <div className="my-auto max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-lg bg-[#f7efda] p-5 text-[#22372b]">
        <ImageCropEditor source={cropping.source} aspect="square" squarePreview="square"
          onCancel={()=>setCropping(null)}
          onApply={async file=>{
            if(uploading)return;
            setUploading(true);
            try{
              const url=await uploadSiteImage(file,"nfc-natal");
              patch(cropping.index,{image_url:url});
              setCropping(null);
              toast.success("Foto enviada! Salve o portal para publicar a alteração.");
            }catch(err){
              toast.error(err instanceof Error?err.message:"Não foi possível enviar a foto.");
            }finally{setUploading(false);}
          }}/>
        {uploading && <p className="mt-2 text-sm">Enviando a foto...</p>}
      </div>
    </div>}
  </section>;
}
