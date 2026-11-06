import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PortalIntro } from "@/components/PortalIntro";
import {
  carouselFromTheme,galleryDraftFromTheme,isSafePortalUrl,
  magicWorldTitle,portalCatalogDestination,spotifyPlaylistUrl,updatePortalGallery,
} from "@/lib/portal-experience";

afterEach(()=>cleanup());

describe("Portal NFC: vídeo de abertura obrigatório",()=>{
  it("não mostra o botão antes do vídeo terminar, mesmo com vídeo carregado",()=>{
    const enter=vi.fn();
    const {container}=render(<PortalIntro title="O Mundo da Magia" videoUrl="/video-da-colecao.mp4" onEnter={enter}/>);
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();
    const video=container.querySelector("video");
    expect(video).not.toBeNull();
    fireEvent.timeUpdate(video!,{currentTime:9.8});
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();
    fireEvent.ended(video!);
    fireEvent.click(screen.getByRole("button",{name:/atravesse o portal/i}));
    expect(enter).toHaveBeenCalledTimes(1);
  });
  it("não permite pular a abertura em caso de erro no vídeo",()=>{
    const enter=vi.fn();
    const {container}=render(<PortalIntro title="O Mundo da Magia" videoUrl="/video.mp4" onEnter={enter}/>);
    const video=container.querySelector("video")!;
    fireEvent.error(video);
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível");
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();
    expect(enter).not.toHaveBeenCalled();
  });
  it("sem vídeo configurado exige conteúdo, em vez de liberar a passagem",()=>{
    render(<PortalIntro title="O Mundo da Magia" videoUrl={null} onEnter={vi.fn()}/>);
    expect(screen.getByText(/ainda está sendo preparado/i)).toBeTruthy();
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();
  });
});

describe("Portal NFC: botões e catálogo",()=>{
  it("leva diretamente à subcategoria de magia na loja",()=>{
    expect(portalCatalogDestination("o-mundo-de-magia","/loja")).toBe("/loja?categoria=harry-potter");
    expect(magicWorldTitle("o-mundo-de-magia","Nome antigo")).toBe("O Mundo da Magia");
    expect(portalCatalogDestination("outra-colecao","/loja?categoria=outra")).toBe("/loja?categoria=outra");
  });
  it("só habilita playlist autêntica do Spotify",()=>{
    expect(spotifyPlaylistUrl("https://open.spotify.com/playlist/123abc?si=xyz"))
      .toBe("https://open.spotify.com/playlist/123abc");
    expect(spotifyPlaylistUrl("https://evil.com/playlist/123abc")).toBeNull();
    expect(spotifyPlaylistUrl("javascript:alert(1)")).toBeNull();
    expect(spotifyPlaylistUrl("")).toBeNull();
  });
  it("nunca publica links javascript ou imagens HTTP inseguras",()=>{
    expect(isSafePortalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafePortalUrl("http://inseguro.example/foto.png")).toBe(false);
    expect(isSafePortalUrl("//outro-site.example")).toBe(false);
    expect(isSafePortalUrl("/loja?categoria=harry-potter")).toBe(true);
    expect(isSafePortalUrl("https://example.com/foto.png")).toBe(true);
  });
});

describe("Portal NFC: fotos de Natal configuráveis",()=>{
  const theme={palette:{background:"#10251d"},layout:"legacy",carousel_items:[]};
  it("mantém a paleta e outras configurações enquanto adiciona fotos",()=>{
    const photos=[{id:"a",title:"Natal entre as páginas",
      image_url:"https://example.com/natal.jpg",description:"Coleção natalina",url:"/loja"}];
    const updated=updatePortalGallery(theme,photos);
    expect(updated["palette"]).toEqual(theme.palette);
    expect(updated["layout"]).toBe("legacy");
    expect(galleryDraftFromTheme(updated)).toEqual(photos);
    expect(carouselFromTheme(updated)).toEqual(photos);
  });
  it("permite cadastrar rascunho de foto antes da URL definitiva",()=>{
    const edited=updatePortalGallery(theme,[{id:"b",title:"",description:"",image_url:"https://",url:""}]);
    expect(galleryDraftFromTheme(edited)[0]?.image_url).toBe("https://");
    expect(carouselFromTheme(edited)[0]?.image_url).toBe("");
  });
});
