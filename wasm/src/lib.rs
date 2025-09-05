use ecow::EcoString;
use js_sys::{ArrayBuffer, Uint8Array};
use rustc_hash::FxHashMap;
use serde_wasm_bindgen::to_value;
use typst_html::HtmlDocument;
use wasm_bindgen::prelude::*;

use typst::{
    World,
    diag::Warned,
    ecow,
    foundations::Bytes,
    layout::PagedDocument,
    syntax::{
        FileId, VirtualPath,
        package::{PackageSpec, PackageVersion},
    },
    text::FontInfo,
};

mod serde;
mod vfs;
mod world;

use crate::serde::{diagnostic, font, html, package, processor, svg};
use crate::world::WasmWorld;

#[wasm_bindgen]
pub struct Typst {
    world: WasmWorld,

    last_kind: String,
    last_id: String,
}

#[wasm_bindgen]
impl Typst {
    #[wasm_bindgen(constructor)]
    pub fn new(fetch: js_sys::Function, fontsize: f64) -> Self {
        #[cfg(debug_assertions)]
        console_error_panic_hook::set_once();

        Self {
            world: WasmWorld::new(fetch, fontsize),

            last_kind: String::new(),
            last_id: String::new(),
        }
    }

    pub fn set_fontsize(&mut self, fontsize: f64) {
        self.world.set_fontsize(fontsize);
    }

    pub fn store(
        &mut self,
        fonts: Vec<ArrayBuffer>,
        sources: JsValue,
        processors: JsValue,
    ) -> Result<(), JsValue> {
        let sources_serde: FxHashMap<String, Vec<u8>> = serde_wasm_bindgen::from_value(sources)
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize sources: {}", e)))?;
        let procs_serde: Vec<processor::ProcessorDes> = serde_wasm_bindgen::from_value(processors)
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize processors: {}", e)))?;

        for f in fonts.iter() {
            let u8arr = Uint8Array::new(&f);
            let mut vec = vec![0u8; u8arr.length() as usize];
            u8arr.copy_to(&mut vec);

            self.world.add_font(Bytes::new(vec));
        }

        // ソース
        for (rpath, bytes) in sources_serde {
            if rpath.starts_with('@') {
                // unwrapはTS側で保証
                let p = rpath.strip_prefix('@').unwrap();

                let mut p_parts = p.splitn(4, '/');
                let namespace = p_parts.next().unwrap();
                let name = p_parts.next().unwrap();
                let version_str = p_parts.next().unwrap();
                let vpath = p_parts.next().unwrap();

                let mut v_parts = version_str.split('.');
                let major: u32 = v_parts.next().unwrap().parse().unwrap();
                let minor: u32 = v_parts.next().unwrap().parse().unwrap();
                let patch: u32 = v_parts.next().unwrap().parse().unwrap();

                let spec = PackageSpec {
                    namespace: EcoString::from(namespace),
                    name: EcoString::from(name),
                    version: PackageVersion {
                        major,
                        minor,
                        patch,
                    },
                };

                self.world.add_package(spec, vpath, bytes);
            } else {
                self.world.add_file_bytes(&rpath, bytes);
            }
        }

        // プロセッサー
        for p in procs_serde {
            self.world
                .add_file_text(&format!("{}--{}.typ", p.kind, p.id), p.format);
        }

        Ok(())
    }

    pub fn list_packages(&mut self) -> JsValue {
        let packages = self.world.list_packages();
        let packages_ser: Vec<package::PackageSpecSer> = packages.iter().map(Into::into).collect();

        to_value(&packages_ser).unwrap()
    }

    pub fn list_fonts(&mut self) -> JsValue {
        let families = self.world.book().families();
        let infos_ser: Vec<font::FontInfoSer> = families
            .flat_map(|(_, infos)| infos.map(Into::into))
            .collect();

        to_value(&infos_ser).unwrap()
    }

    pub fn get_font_info(&self, buffer: JsValue) -> JsValue {
        let vec = Uint8Array::new(&buffer).to_vec();
        let bytes = Bytes::new(vec);

        let infos: Vec<font::FontInfoSer> = FontInfo::iter(&bytes)
            .map(|info| font::FontInfoSer::from(&info)) // あるいは .map(|info| (&info).into())
            .collect();

        to_value(&infos).unwrap()
    }

    pub fn svg(&mut self, code: &str, kind: &str, id: &str) -> Result<JsValue, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            let result = self.world.source(FileId::new(
                None,
                VirtualPath::new(&format!("{}--{}.typ", kind, id)),
            ));

            match result {
                Ok(mut source) => {
                    source.replace(code);
                    self.world.set_main(source);
                }
                Err(_e) => {
                    self.world.replace(code);
                }
            }
        }

        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(document) => {
                if document.pages.is_empty() {
                    return Err(JsValue::from_str("document has no pages"));
                }

                // ? typst_svg::svg は背景が透過しない
                let svg = typst_svg::svg_frame(&document.pages[0].frame)
                    .replace("<svg class", "<svg style=\"overflow: visible;\" class");

                svg::svg(svg, warnings)
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> =
                    errs.iter().map(|d| d.into()).collect();
                Err(to_value(&diags).unwrap())
            }
        }
    }

    pub fn html(&mut self, code: &str, kind: &str, id: &str) -> Result<JsValue, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            let result = self.world.source(FileId::new(
                None,
                VirtualPath::new(&format!("{}--{}.typ", kind, id)),
            ));

            match result {
                Ok(mut source) => {
                    source.replace(code);
                    self.world.set_main(source);
                }
                Err(_e) => {
                    self.world.replace(code);
                }
            }
        }

        let Warned { output, warnings } = typst::compile::<HtmlDocument>(&mut self.world);

        match output {
            Ok(document) => {
                let document = typst_html::html(&document);

                match document {
                    Ok(html) => html::html(html, warnings),
                    Err(errs) => {
                        let diags: Vec<diagnostic::SourceDiagnosticSer> =
                            errs.iter().map(|d| d.into()).collect();
                        return Err(to_value(&diags).unwrap());
                    }
                }
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> =
                    errs.iter().map(|d| d.into()).collect();
                Err(to_value(&diags).unwrap())
            }
        }
    }
}
