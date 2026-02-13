use js_sys::{ArrayBuffer, Uint8Array};
use rustc_hash::FxHashMap;
use serde_wasm_bindgen::to_value;
use tylax::{
    latex_document_to_typst, latex_to_typst,
    tikz::{convert_cetz_to_tikz, convert_tikz_to_cetz},
    typst_document_to_latex, typst_to_latex,
};
use typst_ide::Tooltip;
use wasm_bindgen::prelude::*;

use typst::{
    World,
    diag::Warned,
    foundations::{Bytes, Module, Version},
    layout::{Abs, PagedDocument, Point, Position},
    syntax::{
        FileId, RootedPath, Side, VirtualPath, VirtualRoot,
        package::{PackageSpec, PackageVersion},
    },
    text::FontInfo,
};
use typst_pdf::PdfOptions;

mod serde;
mod vfs;
mod world;

use crate::serde::{
    definition, diagnostic, font, jump, package, pdf, processor, svg, values::VersionSer,
};
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

                self.world
                    .add_package_file(spec, VirtualPath::new(vpath).unwrap(), bytes);
            } else {
                self.world
                    .add_file_bytes(VirtualPath::new(rpath).unwrap(), bytes);
            }
        }

        // プロセッサー
        for p in procs_serde {
            self.world.add_file_text(
                VirtualPath::new(format!("{}-{}.typ", p.kind, p.id)).unwrap(),
                p.format,
            );
        }

        Ok(())
    }

    pub fn list_packages(&self) -> JsValue {
        let packages = self.world.list_packages();
        let packages_ser: Vec<package::PackageSpecSer> = packages.iter().map(Into::into).collect();

        to_value(&packages_ser).unwrap()
    }

    pub fn list_fonts(&self) -> JsValue {
        let families = self.world.book().families();
        let infos_ser: Vec<font::FontInfoSer> = families
            .flat_map(|(_, infos)| {
                infos.filter_map(|i| self.world.font(i).map(|f| f.info().into()))
            })
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

    pub fn latex_to_typst(&self, code: &str) -> String {
        latex_document_to_typst(code)
    }
    pub fn typst_to_latex(&self, code: &str) -> String {
        typst_document_to_latex(code)
    }

    pub fn latexeq_to_typm(&self, code: &str) -> String {
        latex_to_typst(code)
    }
    pub fn typm_to_latexeq(&self, code: &str) -> String {
        typst_to_latex(code)
    }

    pub fn tikz_to_cetz(&self, code: &str) -> String {
        convert_tikz_to_cetz(code)
    }
    pub fn cetz_to_tikz(&self, code: &str) -> String {
        convert_cetz_to_tikz(code)
    }

    fn update_source(&mut self, vpath: VirtualPath, code: &str) {
        let file_id = FileId::new(RootedPath::new(VirtualRoot::Project, vpath.clone()));
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

            self.update_source(
                VirtualPath::new(format!("{}-{}.typ", kind, id)).unwrap(),
                code,
            );
        }

        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(document) => {
                if document.pages.is_empty() {
                    return Err(JsValue::from_str("document has no pages"));
                }

                // ? typst_svg::svg は背景が透過しない
                let mut svg = typst_svg::svg_frame(&document.pages[0].frame)
                    .replace("#000000", "var(--typst-base-color)");
                svg.replace_range(0..4, "<svg style=\"overflow: visible;\"");
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
        self.update_source(VirtualPath::new(filename).unwrap(), code);
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

    pub fn jump_from_click(&self, x: f64, y: f64) -> JsValue {
        match &self.last_document {
            Some(document) => {
                let point = Point::new(Abs::pt(x), Abs::pt(y));
                let position = Position {
                    page: std::num::NonZeroUsize::new(1).unwrap(),
                    point,
                };
                let point = typst_ide::jump_from_click(&self.world, document, &position);
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

    pub fn tooltip(&self, cursor: usize, side: bool) -> Option<String> {
        match &self.last_document {
            Some(document) => {
                let tooltip = typst_ide::tooltip(
                    &self.world,
                    Some(document),
                    &self.world.source(self.world.main()).unwrap(),
                    cursor,
                    match side {
                        false => Side::Before,
                        true => Side::After,
                    },
                );
                match tooltip {
                    Some(tooltip) => match tooltip {
                        Tooltip::Text(value) => Some(value.into()),
                        Tooltip::Code(code) => Some(code.into()),
                    },
                    None => None,
                }
            }
            None => None,
        }
    }

    pub fn definition(&self, cursor: usize, side: bool) -> JsValue {
        match &self.last_document {
            Some(document) => {
                let definition = typst_ide::definition(
                    &self.world,
                    Some(document),
                    &self.world.source(self.world.main()).unwrap(),
                    cursor,
                    match side {
                        false => Side::Before,
                        true => Side::After,
                    },
                );
                match definition {
                    Some(definition) => {
                        definition::DefinitionSer::from_definition(&definition, &self.world)
                            .map(|s| to_value(&s).unwrap())
                            .unwrap_or(JsValue::NULL)
                    }
                    None => JsValue::NULL,
                }
            }
            None => JsValue::NULL,
        }
    }

    pub fn get_typst_version(&self) -> Option<JsValue> {
        let std_scope = self.world.library().std.read().scope()?;
        let sys_binding = std_scope.get("sys")?;
        let sys_module = sys_binding.read().clone().cast::<Module>().ok()?;
        let version_binding = sys_module.scope().get("version")?;
        let version = version_binding.read().clone().cast::<Version>().ok()?;

        Some(to_value(&VersionSer::from(&version)).unwrap())
    }
}
