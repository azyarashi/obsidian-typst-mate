use js_sys::{ArrayBuffer, Uint8Array};
use mitex::convert_math;
use rustc_hash::FxHashMap;
use serde_wasm_bindgen::to_value;
use wasm_bindgen::prelude::*;

use typst::{
    World,
    diag::Warned,
    foundations::Bytes,
    layout::{Abs, PagedDocument, Point},
    syntax::{
        FileId, VirtualPath,
        package::{PackageSpec, PackageVersion},
    },
    text::FontInfo,
};
use typst_pdf::PdfOptions;

mod lexer;
mod parser;
mod serde;
mod utils;
mod vfs;
mod world;

use crate::serde::{diagnostic, font, jump, package, pdf, processor, svg};
use crate::world::WasmWorld;

#[wasm_bindgen]
pub struct Typst {
    world: WasmWorld,

    last_kind: String,
    last_id: String,
    last_document: Option<PagedDocument>,
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
            last_document: None,
        }
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
                // unwrap は TS 側で保証
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
                    namespace: namespace.into(),
                    name: name.into(),
                    version: PackageVersion {
                        major,
                        minor,
                        patch,
                    },
                };

                self.world.add_package_file(spec, vpath, bytes);
            } else {
                self.world.add_file_bytes(VirtualPath::new(rpath), bytes);
            }
        }

        // プロセッサー
        for p in procs_serde {
            self.world.add_file_text(
                VirtualPath::new(format!("{}-{}.typ", p.kind, p.id)),
                p.format,
            );
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

        let infos: Vec<font::FontInfoSer> =
            FontInfo::iter(&bytes).map(|info| (&info).into()).collect();

        to_value(&infos).unwrap()
    }

    pub fn find_bracket_pairs(&mut self, code: &str) -> JsValue {
        let tokens = lexer::bracket::bracket_lexer(code);
        let pairs = parser::bracket::paren_parse(&tokens);

        let pairs_ser: Vec<serde::bracket::BracketPairSer> = pairs.iter().map(Into::into).collect();

        to_value(&pairs_ser).unwrap()
    }

    // ? ちらつき防止のためカーソルの親括弧の計算は TS 側でする
    pub fn mitex(&mut self, code: &str) -> Result<JsValue, JsValue> {
        match convert_math(code, None) {
            Ok(result) => Ok(JsValue::from_str(&result)),
            Err(error) => Err(JsValue::from_str(&error)),
        }
    }

    fn update_source(&mut self, vpath: VirtualPath, code: &str) {
        let file_id = FileId::new(None, vpath.clone());
        let result = self.world.source(file_id);

        match result {
            Ok(_source) => {
                self.world.set_main(file_id);
                self.world.replace(code);
            }
            Err(_e) => {
                self.world.add_file_text(vpath.clone(), code.into());
                self.world.set_main(file_id);
            }
        }
    }

    pub fn svg(&mut self, code: &str, kind: &str, id: &str) -> Result<JsValue, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            self.update_source(VirtualPath::new(format!("{}_{}.typ", kind, id)), code);
        }

        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(document) => {
                if document.pages.is_empty() {
                    return Err(JsValue::from_str("document has no pages"));
                }

                // ? typst_svg::svg は背景が透過しない
                let svg = typst_svg::svg_frame(&document.pages[0].frame)
                    .replace("#000000", "var(--typst-base-color)")
                    .replace("#ffffff", "var(--typst-bg-color)")
                    .replacen("<svg class", "<svg style=\"overflow: visible;\" class", 1);
                self.last_document = Some(document);

                svg::svg(svg, warnings, &self.world)
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                    .iter()
                    .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                    .collect();
                Err(to_value(&diags).unwrap())
            }
        }
    }

    pub fn pdf(&mut self, filename: &str, code: &str) -> Result<JsValue, JsValue> {
        self.update_source(VirtualPath::new(filename), code);
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(mut document) => {
                document.info.title.get_or_insert_with(|| filename.into());
                let options = PdfOptions::default();

                match typst_pdf::pdf(&document, &options) {
                    Ok(pdf_data) => pdf::pdf(pdf_data, warnings, &self.world),
                    Err(errs) => {
                        let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                            .iter()
                            .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                            .collect();
                        Err(to_value(&diags).unwrap())
                    }
                }
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                    .iter()
                    .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                    .collect();
                Err(to_value(&diags).unwrap())
            }
        }
    }

    pub fn jump_from_click(&mut self, x: f64, y: f64) -> JsValue {
        match &self.last_document {
            Some(document) => {
                let frame = &document.pages[0].frame;
                let point = Point::new(Abs::pt(x), Abs::pt(y));
                let point = typst_ide::jump_from_click(&self.world, document, frame, point);
                match point {
                    Some(point) => {
                        let jump_ser = jump::JumpSer::from_jump(&point, &self.world);
                        to_value(&jump_ser).unwrap()
                    }
                    None => JsValue::NULL,
                }
            }
            None => JsValue::NULL,
        }
    }
}
