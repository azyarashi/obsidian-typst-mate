use js_sys::{ArrayBuffer, Uint8Array};
use rustc_hash::FxHashMap;
use serde_wasm_bindgen::to_value;
use tylax::{
    latex_document_to_typst, latex_to_typst,
    tikz::{convert_cetz_to_tikz, convert_tikz_to_cetz},
    typst_document_to_latex, typst_to_latex,
};
use wasm_bindgen::prelude::*;

use typst::{
    World,
    diag::Warned,
    foundations::Bytes,
    layout::{Abs, PageRanges, PagedDocument, Point},
    syntax::{
        FileId, VirtualPath,
        package::{PackageSpec, PackageVersion},
    },
    text::FontInfo,
};

mod serde;
mod utils;
mod vfs;
mod world;

use crate::serde::{diagnostic, font, jump, options, package, pdfr, pngr, svg, svgp, svgr};
use crate::world::WasmWorld;

#[wasm_bindgen]
pub struct Typst {
    world: WasmWorld,
    offset: f64,

    basepath: String,

    last_kind: String,
    last_id: String,
    last_document: Option<PagedDocument>,
}

#[wasm_bindgen]
impl Typst {
    #[wasm_bindgen(constructor)]
    pub fn new(basepath: String, fetch: js_sys::Function, fontsize: f64, offset: f64) -> Self {
        #[cfg(debug_assertions)]
        console_error_panic_hook::set_once();

        Self {
            world: WasmWorld::new(fetch, fontsize),
            offset,

            basepath,

            last_kind: String::new(),
            last_id: String::new(),
            last_document: None,
        }
    }

    pub fn set_offset(&mut self, offset: f64) {
        self.offset = offset;
    }

    pub fn store(
        &mut self,
        fonts: Vec<ArrayBuffer>,
        packages: JsValue,
        files: JsValue,
    ) -> Result<(), JsValue> {
        let sources_serde: FxHashMap<String, Vec<u8>> = serde_wasm_bindgen::from_value(packages)
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize sources: {}", e)))?;

        let files: FxHashMap<String, String> = serde_wasm_bindgen::from_value(files)
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize files: {}", e)))?;

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

        for (path, text) in files {
            self.world.add_file_text(
                VirtualPath::new(format!("{}/{}", self.basepath, path)),
                text,
            );
        }

        Ok(())
    }

    pub fn list_packages(&self) -> JsValue {
        let packages = self.world.list_packages();
        let packages_ser: Vec<package::PackageSpecSer> = packages.iter().map(Into::into).collect();

        to_value(&packages_ser).unwrap_or(JsValue::NULL)
    }

    pub fn list_fonts(&self) -> JsValue {
        let families = self.world.book().families();
        let infos_ser: Vec<font::FontInfoSer> = families
            .flat_map(|(_, infos)| infos.map(Into::into))
            .collect();

        to_value(&infos_ser).unwrap_or(JsValue::NULL)
    }

    pub fn get_font_info(&self, buffer: JsValue) -> JsValue {
        let vec = Uint8Array::new(&buffer).to_vec();
        let bytes = Bytes::new(vec);

        let infos: Vec<font::FontInfoSer> =
            FontInfo::iter(&bytes).map(|info| (&info).into()).collect();

        to_value(&infos).unwrap_or(JsValue::NULL)
    }
}

#[wasm_bindgen]
impl Typst {
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

    // Markdown 用
    pub fn svg(
        &mut self,
        code: &str,
        ndir: &str, // ndir starts and ends with "/"
        kind: &str,
        id: &str,
    ) -> Result<JsValue, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            self.update_source(
                VirtualPath::new(format!("{}{}{}_{}.typ", self.basepath, ndir, kind, id)),
                code,
            );
        }
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(mut document) => {
                if document.pages.is_empty() {
                    return Err(JsValue::from_str("document has no pages"));
                }

                let page = &mut document.pages[0];
                if None == page.fill_or_transparent() {
                    page.fill = typst::foundations::Smart::Custom(None);
                };
                let frame = &page.frame;
                let descent = if kind == "inline" {
                    (match utils::find_baseline(frame, Abs::zero()) {
                        Some(b) => (b - frame.height()).to_pt(),
                        None => -frame.height().to_pt(),
                    }) + self.offset
                } else {
                    0.0
                };

                let svg = typst_svg::svg(&page)
                    .replace("#000000", "var(--typst-base-color)")
                    .replacen(
                        "<svg class",
                        format!(
                            "<svg style=\"overflow: visible; vertical-align: {:.2}pt;\" class",
                            descent
                        )
                        .as_str(),
                        1,
                    );

                self.last_document = Some(document);

                svg::svg(svg, warnings, &self.world)
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                    .iter()
                    .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                    .collect();
                Err(to_value(&diags).unwrap_or(JsValue::NULL))
            }
        }
    }

    // プレビュー用
    pub fn svgp(&mut self, ndir: &str, filename: &str, code: &str) -> Result<JsValue, JsValue> {
        self.update_source(
            VirtualPath::new(format!("{}{}{}", self.basepath, ndir, filename)),
            code,
        );
        self.world.update_now();
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(mut document) => {
                let mut svgs = Vec::new();
                for page in &mut document.pages {
                    let svg = typst_svg::svg(page);
                    svgs.push(svg);
                }
                self.last_document = Some(document);
                svgp::svgp(svgs, warnings, &self.world)
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                    .iter()
                    .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                    .collect();
                Err(to_value(&diags).unwrap_or(JsValue::NULL))
            }
        }
    }
}

#[wasm_bindgen]
impl Typst {
    pub fn jump_from_click(&self, x: f64, y: f64) -> JsValue {
        match &self.last_document {
            Some(document) => {
                let frame = &document.pages[0].frame;
                let point = Point::new(Abs::pt(x), Abs::pt(y));
                let point = typst_ide::jump_from_click(&self.world, document, frame, point);
                match point {
                    Some(point) => {
                        let jump_ser = jump::JumpSer::from_jump(&point, &self.world);
                        to_value(&jump_ser).unwrap_or(JsValue::NULL)
                    }
                    None => JsValue::NULL,
                }
            }
            None => JsValue::NULL,
        }
    }

    pub fn jump_from_click_p(&self, page: usize, x: f64, y: f64) -> JsValue {
        match &self.last_document {
            Some(document) => {
                if document.pages.len() <= page {
                    return JsValue::NULL;
                }
                let frame = &document.pages[page].frame;
                let point = Point::new(Abs::pt(x), Abs::pt(y));
                let point = typst_ide::jump_from_click(&self.world, document, frame, point);
                match point {
                    Some(point) => {
                        let jump_ser = jump::JumpSer::from_jump(&point, &self.world);
                        to_value(&jump_ser).unwrap_or(JsValue::NULL)
                    }
                    None => JsValue::NULL,
                }
            }
            None => JsValue::NULL,
        }
    }

    pub fn jump_from_cursor_p(&self, cursor: usize) -> JsValue {
        match &self.last_document {
            Some(document) => {
                let result = self.world.source(self.world.main());
                if let Ok(source) = result {
                    let positions = typst_ide::jump_from_cursor(document, &source, cursor);

                    let positions_ser: Vec<jump::JumpSer> = positions
                        .into_iter()
                        .map(jump::JumpSer::from_position)
                        .collect();
                    return to_value(&positions_ser).unwrap_or(JsValue::NULL);
                }
                JsValue::NULL
            }
            None => JsValue::NULL,
        }
    }
}

#[wasm_bindgen]
impl Typst {
    pub fn pdfr(
        &mut self,
        ndir: &str,
        filename: &str,
        code: &str,
        options: JsValue,
    ) -> Result<JsValue, JsValue> {
        let options_ser: options::PdfOptionsSer = serde_wasm_bindgen::from_value(options)
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(
            VirtualPath::new(format!("{}{}{}", self.basepath, ndir, filename)),
            code,
        );
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(mut document) => {
                document.info.title.get_or_insert_with(|| filename.into());

                let mut options = typst_pdf::PdfOptions::default();
                options.tagged = options_ser.tagged;
                if let Some(ident) = &options_ser.ident {
                    options.ident = typst::foundations::Smart::Custom(ident.as_str());
                }

                if !options_ser.standards.is_empty() {
                    options.standards = typst_pdf::PdfStandards::new(&options_ser.standards)
                        .map_err(|e| JsValue::from_str(&e))?;
                }

                if let Some(timestamp) = options_ser.timestamp {
                    use chrono::{Datelike, FixedOffset, TimeZone, Timelike, Utc};
                    let offset_min = options_ser.offset.unwrap_or(0);
                    let tz = FixedOffset::east_opt(offset_min * 60)
                        .unwrap_or(FixedOffset::east_opt(0).unwrap());
                    if let Some(dt) = Utc.timestamp_opt(timestamp, 0).single() {
                        let local_dt = dt.with_timezone(&tz);
                        let datetime = typst::foundations::Datetime::from_ymd_hms(
                            local_dt.year(),
                            local_dt.month() as u8,
                            local_dt.day() as u8,
                            local_dt.hour() as u8,
                            local_dt.minute() as u8,
                            local_dt.second() as u8,
                        );
                        if let Some(datetime) = datetime {
                            if options_ser.offset.is_some() {
                                options.timestamp =
                                    typst_pdf::Timestamp::new_local(datetime, offset_min);
                            } else {
                                options.timestamp = Some(typst_pdf::Timestamp::new_utc(datetime));
                            }
                        }
                    }
                }

                if let Some(page_ranges) = &options_ser.page_ranges {
                    if let Some(ranges) = utils::parse_page_ranges(page_ranges) {
                        options.page_ranges = Some(ranges);
                    }
                }

                match typst_pdf::pdf(&document, &options) {
                    Ok(pdf_data) => pdfr::pdfr(pdf_data, warnings, &self.world),
                    Err(errs) => {
                        let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                            .iter()
                            .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                            .collect();
                        Err(to_value(&diags).unwrap_or(JsValue::NULL))
                    }
                }
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                    .iter()
                    .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                    .collect();
                Err(to_value(&diags).unwrap_or(JsValue::NULL))
            }
        }
    }

    pub fn svgr(
        &mut self,
        ndir: &str,
        filename: &str,
        code: &str,
        options: JsValue,
    ) -> Result<JsValue, JsValue> {
        let options_ser: options::SvgOptionsSer = serde_wasm_bindgen::from_value(options)
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(
            VirtualPath::new(format!("{}{}{}", self.basepath, ndir, filename)),
            code,
        );
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(document) => {
                let page_ranges: Option<PageRanges> = options_ser
                    .page_ranges
                    .as_ref()
                    .and_then(|s| utils::parse_page_ranges(s));
                let mut svgs = Vec::new();
                for (i, page) in document.pages.iter().enumerate() {
                    if let Some(ranges) = &page_ranges {
                        if !ranges.includes_page_index(i) {
                            continue;
                        }
                    }
                    let svg = typst_svg::svg(page);
                    svgs.push(svg);
                }
                svgr::svgr(svgs, warnings, &self.world)
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                    .iter()
                    .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                    .collect();
                Err(to_value(&diags).unwrap_or(JsValue::NULL))
            }
        }
    }

    pub fn pngr(
        &mut self,
        ndir: &str,
        filename: &str,
        code: &str,
        options: JsValue,
    ) -> Result<JsValue, JsValue> {
        let options_ser: options::PngOptionsSer = serde_wasm_bindgen::from_value(options)
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(
            VirtualPath::new(format!("{}{}{}", self.basepath, ndir, filename)),
            code,
        );
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(document) => {
                let ppi = options_ser.ppi;
                let page_ranges: Option<PageRanges> = options_ser
                    .page_ranges
                    .as_ref()
                    .and_then(|s| utils::parse_page_ranges(s));
                let mut images = Vec::new();
                for (i, page) in document.pages.iter().enumerate() {
                    if let Some(ranges) = &page_ranges {
                        if !ranges.includes_page_index(i) {
                            continue;
                        }
                    }
                    let pixmap = typst_render::render(page, ppi / 72.0);
                    let png = pixmap
                        .encode_png()
                        .map_err(|e| JsValue::from_str(&e.to_string()))?;
                    images.push(png);
                }
                pngr::pngr(images, warnings, &self.world)
            }
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                    .iter()
                    .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                    .collect();
                Err(to_value(&diags).unwrap_or(JsValue::NULL))
            }
        }
    }
}

#[wasm_bindgen]
impl Typst {
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
}
