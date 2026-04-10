use js_sys::{ArrayBuffer, Uint8Array};
use rustc_hash::FxHashMap;
use serde_wasm_bindgen::to_value;
use std::path::Path;
use tylax::{
    latex_document_to_typst, latex_to_typst,
    tikz::{convert_cetz_to_tikz, convert_tikz_to_cetz},
    typst_document_to_latex, typst_to_latex,
};
use typstyle_core::{Config as TypstyleConfig, Typstyle};
use wasm_bindgen::prelude::*;

use typst::{
    World,
    diag::Warned,
    foundations::{Bytes, Module, Version},
    layout::{Abs, PageRanges, PagedDocument, Point},
    syntax::{
        FileId, Side, VirtualPath,
        package::{PackageSpec, PackageVersion},
    },
    text::FontInfo,
};

mod serde;
mod utils;
mod vfs;
mod world;

use crate::serde::{
    completion, definition, diagnostic, font, html, jump, options, package, pdfr, pngr, svg, svgp,
    svgr, tooltip, values::VersionSer,
};
use crate::world::WasmWorld;

#[wasm_bindgen]
pub struct Wasm {
    world: WasmWorld,
    offset: f64,

    last_kind: String,
    last_id: String,
    last_document: Option<PagedDocument>,
}

#[wasm_bindgen]
impl Wasm {
    #[wasm_bindgen(constructor)]
    pub fn new(
        read_file: js_sys::Function,
        read_package_file: js_sys::Function,
        download_package: js_sys::Function,
        fontsize: f64,
        offset: f64,
        call_obsidian: js_sys::Function,
    ) -> Self {
        #[cfg(debug_assertions)]
        console_error_panic_hook::set_once();

        Self {
            world: WasmWorld::new(
                read_file,
                read_package_file,
                download_package,
                fontsize,
                call_obsidian,
            ),
            offset,

            last_kind: String::new(),
            last_id: String::new(),
            last_document: None,
        }
    }

    pub fn set_offset(&mut self, offset: f64) {
        self.offset = offset;
    }

    pub fn get_pdf_standards(&self) -> JsValue {
        use typst_pdf::PdfStandard::*;
        let mut map = std::collections::BTreeMap::new();
        map.insert("".to_string(), "Default (PDF 1.7)".to_string());

        let all = [
            (V_1_4, "PDF 1.4"),
            (V_1_5, "PDF 1.5"),
            (V_1_6, "PDF 1.6"),
            (V_1_7, "PDF 1.7"),
            (V_2_0, "PDF 2.0"),
            (A_1b, "PDF/A-1b"),
            (A_1a, "PDF/A-1a"),
            (A_2b, "PDF/A-2b"),
            (A_2u, "PDF/A-2u"),
            (A_2a, "PDF/A-2a"),
            (A_3b, "PDF/A-3b"),
            (A_3u, "PDF/A-3u"),
            (A_3a, "PDF/A-3a"),
            (A_4, "PDF/A-4"),
            (A_4f, "PDF/A-4f"),
            (A_4e, "PDF/A-4e"),
            (Ua_1, "PDF/UA-1"),
        ];

        for (variant, desc) in all {
            if let Ok(key) = serde_json::to_value(variant) {
                if let Some(s) = key.as_str() {
                    map.insert(s.to_string(), desc.to_string());
                }
            }
        }

        let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
        <std::collections::BTreeMap<String, String> as ::serde::Serialize>::serialize(
            &map,
            &serializer,
        )
        .unwrap_or(JsValue::NULL)
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
            self.world.add_file_text(VirtualPath::new(path), text);
        }

        Ok(())
    }

    pub fn list_packages(&self) -> JsPackageSpecArray {
        let packages = self.world.list_packages();
        let packages_ser: Vec<package::PackageSpecSer> = packages.iter().map(Into::into).collect();

        to_value(&packages_ser)
            .unwrap_or(JsValue::NULL)
            .unchecked_into()
    }

    pub fn list_fonts(&self) -> JsFontInfoArray {
        let families = self.world.book().families();
        let infos_ser: Vec<font::FontInfoSer> = families
            .flat_map(|(_, infos)| infos.map(Into::into))
            .collect();

        to_value(&infos_ser)
            .unwrap_or(JsValue::NULL)
            .unchecked_into()
    }

    pub fn get_font_info(&self, buffer: JsValue) -> JsFontInfoArray {
        let vec = Uint8Array::new(&buffer).to_vec();
        let bytes = Bytes::new(vec);

        let infos: Vec<font::FontInfoSer> =
            FontInfo::iter(&bytes).map(|info| (&info).into()).collect();

        to_value(&infos).unwrap_or(JsValue::NULL).unchecked_into()
    }

    pub fn get_typst_version(&self) -> Option<JsVersionSer> {
        let std_scope = self.world.library().std.read().scope()?;
        let sys_binding = std_scope.get("sys")?;
        let sys_module = sys_binding.read().clone().cast::<Module>().ok()?;
        let version_binding = sys_module.scope().get("version")?;
        let version = version_binding.read().clone().cast::<Version>().ok()?;

        Some(
            to_value(&VersionSer::from(&version))
                .unwrap()
                .unchecked_into(),
        )
    }
}

#[wasm_bindgen]
impl Wasm {
    pub fn take_pending(&mut self) -> bool {
        self.world.take_pending()
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

    /// Markdown 用
    pub fn svg(
        &mut self,
        code: &str,
        path: &str,
        kind: &str,
        id: &str,
    ) -> Result<JsSvgResult, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            self.update_source(VirtualPath::new(path), code);
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

                Ok(svg::svg(svg, warnings, &self.world)?.unchecked_into())
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

    pub fn html(
        &mut self,
        code: &str,
        path: &str,
        kind: &str,
        id: &str,
    ) -> Result<JsHtmlResult, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            self.update_source(VirtualPath::new(path), code);
        }
        let Warned { output, warnings } =
            typst::compile::<typst_html::HtmlDocument>(&mut self.world);

        match output {
            Ok(document) => match typst_html::html(&document) {
                Ok(html_str) => {
                    let body = extract_body(&html_str).unwrap_or(&html_str);
                    Ok(html::html(body.to_string(), warnings, &self.world)?.unchecked_into())
                }
                Err(errs) => {
                    let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                        .iter()
                        .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                        .collect();
                    Err(to_value(&diags).unwrap_or(JsValue::NULL))
                }
            },
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
    /// `path` = JS 側で組み立てた完全パス (baseDirPath + ndir + filename)
    pub fn svgp(&mut self, path: &str, code: &str) -> Result<JsSvgpResult, JsValue> {
        self.update_source(VirtualPath::new(path), code);
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
                Ok(svgp::svgp(svgs, warnings, &self.world)?.unchecked_into())
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

    pub fn autocomplete(&mut self, cursor: usize, code: &str) -> Option<JsCompletionResult> {
        self.world.replace(code);
        let result = self.world.source(self.world.main());
        let Ok(source) = result else {
            return None;
        };

        let cursor_byte = source.lines().utf16_to_byte(cursor).unwrap_or(cursor);

        let document_ref = self.last_document.as_ref();
        let Some((from_byte, completions)) =
            typst_ide::autocomplete(&self.world, document_ref, &source, cursor_byte, false)
        else {
            return None;
        };

        let from_utf16 = source.lines().byte_to_utf16(from_byte).unwrap_or(from_byte);

        let completions_ser: Vec<completion::CompletionSer> = completions
            .into_iter()
            .filter(|c| c.kind != typst_ide::CompletionKind::Syntax)
            .map(completion::CompletionSer::from_completion)
            .collect();
        let result_ser = completion::CompletionResultSer {
            from: from_utf16,
            completions: completions_ser,
        };

        Some(
            to_value(&result_ser)
                .unwrap_or(JsValue::NULL)
                .unchecked_into(),
        )
    }

    pub fn tooltip(
        &mut self,
        cursor: usize,
        code: &str,
        side_after: bool,
    ) -> Option<JsTooltipResult> {
        self.world.replace(code);
        let Ok(source) = self.world.source(self.world.main()) else {
            return None;
        };
        let cursor_byte = source.lines().utf16_to_byte(cursor).unwrap_or(cursor);
        let document_ref = self.last_document.as_ref();

        let side = if side_after {
            Side::After
        } else {
            Side::Before
        };
        let tooltip = typst_ide::tooltip(&self.world, document_ref, &source, cursor_byte, side);
        tooltip.map(|t| {
            to_value(&tooltip::TooltipSer::from(t))
                .unwrap_or(JsValue::NULL)
                .unchecked_into()
        })
    }

    pub fn definition(
        &mut self,
        cursor: usize,
        code: &str,
        side_after: bool,
    ) -> Option<JsDefinitionResult> {
        self.world.replace(code);
        let Ok(source) = self.world.source(self.world.main()) else {
            return None;
        };
        let cursor_byte = source.lines().utf16_to_byte(cursor).unwrap_or(cursor);
        let document_ref = self.last_document.as_ref();
        let side = if side_after {
            Side::After
        } else {
            Side::Before
        };

        let definition =
            typst_ide::definition(&self.world, document_ref, &source, cursor_byte, side);
        definition.map(|d| {
            let definition_ser = definition::DefinitionSer::from_definition(d, &self.world);
            to_value(&definition_ser)
                .unwrap_or(JsValue::NULL)
                .unchecked_into()
        })
    }
}

#[wasm_bindgen]
impl Wasm {
    pub fn jump_from_click(&self, x: f64, y: f64) -> Option<JsJump> {
        match &self.last_document {
            Some(document) => {
                let frame = &document.pages[0].frame;
                let point = Point::new(Abs::pt(x), Abs::pt(y));
                let point = typst_ide::jump_from_click(&self.world, document, frame, point);
                point.map(|point| {
                    let jump_ser = jump::JumpSer::from_jump(&point, &self.world);
                    to_value(&jump_ser)
                        .unwrap_or(JsValue::NULL)
                        .unchecked_into()
                })
            }
            None => None,
        }
    }

    pub fn jump_from_click_p(&self, page: usize, x: f64, y: f64) -> Option<JsJump> {
        match &self.last_document {
            Some(document) => {
                if document.pages.len() <= page {
                    return None;
                }
                let frame = &document.pages[page].frame;
                let point = Point::new(Abs::pt(x), Abs::pt(y));
                let point = typst_ide::jump_from_click(&self.world, document, frame, point);
                point.map(|point| {
                    let jump_ser = jump::JumpSer::from_jump(&point, &self.world);
                    to_value(&jump_ser)
                        .unwrap_or(JsValue::NULL)
                        .unchecked_into()
                })
            }
            None => None,
        }
    }

    pub fn jump_from_cursor_p(&self, cursor: usize) -> JsJumpArray {
        match &self.last_document {
            Some(document) => {
                let result = self.world.source(self.world.main());
                if let Ok(source) = result {
                    let positions = typst_ide::jump_from_cursor(document, &source, cursor);

                    let positions_ser: Vec<jump::JumpSer> = positions
                        .into_iter()
                        .map(jump::JumpSer::from_position)
                        .collect();
                    return to_value(&positions_ser)
                        .unwrap_or(JsValue::NULL)
                        .unchecked_into();
                }
                JsValue::NULL.unchecked_into()
            }
            None => JsValue::NULL.unchecked_into(),
        }
    }
}

#[wasm_bindgen]
impl Wasm {
    pub fn pdfr(
        &mut self,
        path: &str,
        code: &str,
        options: JsPdfOptions,
    ) -> Result<JsPdfrResult, JsValue> {
        let filename: String = Path::new(path)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("document")
            .to_string();
        let options_ser: options::PdfOptionsSer = serde_wasm_bindgen::from_value(options.into())
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(VirtualPath::new(path), code);
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
                    Ok(pdf_data) => {
                        Ok(pdfr::pdfr(pdf_data, warnings, &self.world)?.unchecked_into())
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
        path: &str,
        code: &str,
        options: JsSvgOptions,
    ) -> Result<JsSvgrResult, JsValue> {
        let options_ser: options::SvgOptionsSer = serde_wasm_bindgen::from_value(options.into())
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(VirtualPath::new(path), code);
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
                Ok(svgr::svgr(svgs, warnings, &self.world)?.unchecked_into())
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
        path: &str,
        code: &str,
        options: JsPngOptions,
    ) -> Result<JsPngrResult, JsValue> {
        let options_ser: options::PngOptionsSer = serde_wasm_bindgen::from_value(options.into())
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(VirtualPath::new(path), code);
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
                Ok(pngr::pngr(images, warnings, &self.world)?.unchecked_into())
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

    pub fn htmlr(
        &mut self,
        path: &str,
        code: &str,
        options: JsHtmlOptions,
    ) -> Result<JsHtmlResult, JsValue> {
        let options_ser: options::HtmlOptionsSer =
            serde_wasm_bindgen::from_value(options.into())
                .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(VirtualPath::new(path), code);
        let Warned { output, warnings } =
            typst::compile::<typst_html::HtmlDocument>(&mut self.world);

        match output {
            Ok(document) => match typst_html::html(&document) {
                Ok(html_str) => {
                    let html = if options_ser.extract_body.unwrap_or(true) {
                        extract_body(&html_str)
                            .unwrap_or(&html_str)
                            .trim()
                            .to_string()
                    } else {
                        html_str
                    };
                    Ok(html::html(html, warnings, &self.world)?.unchecked_into())
                }
                Err(errs) => {
                    let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                        .iter()
                        .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                        .collect();
                    Err(to_value(&diags).unwrap_or(JsValue::NULL))
                }
            },
            Err(errs) => {
                let diags: Vec<diagnostic::SourceDiagnosticSer> = errs
                    .iter()
                    .map(|d| diagnostic::SourceDiagnosticSer::from_diag(d, &self.world))
                    .collect();
                Err(to_value(&diags).unwrap_or(JsValue::NULL))
            }
        }
    }

    pub fn format(&self, code: &str, options: JsFormatOptions) -> Result<JsFormatResult, JsValue> {
        let options_ser: options::FormatOptionsSer = serde_wasm_bindgen::from_value(options.into())
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        let config = TypstyleConfig {
            tab_spaces: options_ser.tab_spaces,
            max_width: options_ser.max_width,
            blank_lines_upper_bound: options_ser.blank_lines_upper_bound,
            collapse_markup_spaces: options_ser.collapse_markup_spaces,
            reorder_import_items: options_ser.reorder_import_items,
            wrap_text: options_ser.wrap_text,
        };

        let typstyle = Typstyle::new(config);
        let source = typst::syntax::Source::detached(code);

        let range = if let Some([start, end]) = options_ser.range {
            let lines = source.lines();
            let start_byte = lines.utf16_to_byte(start).unwrap_or(start);
            let end_byte = lines.utf16_to_byte(end).unwrap_or(end);
            start_byte..end_byte
        } else {
            0..code.len()
        };

        let result = typstyle
            .format_source_range(source.clone(), range)
            .map_err(|e| JsValue::from_str(&format!("failed to format: {}", e)))?;

        let lines = source.lines();
        let res_ser = options::FormatResultSer {
            content: result.content,
            range: [
                lines
                    .byte_to_utf16(result.source_range.start)
                    .unwrap_or(result.source_range.start),
                lines
                    .byte_to_utf16(result.source_range.end)
                    .unwrap_or(result.source_range.end),
            ],
        };

        Ok(to_value(&res_ser).unwrap_or(JsValue::NULL).into())
    }
}

/// TyLax
#[wasm_bindgen]
impl Wasm {
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

fn extract_body(html: &str) -> Option<&str> {
    let (_, rest) = html.split_once("<body")?;
    let (_, rest) = rest.split_once('>')?;
    let (body, _) = rest.split_once("</body>")?;
    Some(body.trim())
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "VersionSer")]
    pub type JsVersionSer;
    #[wasm_bindgen(typescript_type = "CompletionResultSer")]
    pub type JsCompletionResult;
    #[wasm_bindgen(typescript_type = "TooltipSer")]
    pub type JsTooltipResult;
    #[wasm_bindgen(typescript_type = "DefinitionSer")]
    pub type JsDefinitionResult;
    #[wasm_bindgen(typescript_type = "FontInfoSer[]")]
    pub type JsFontInfoArray;
    #[wasm_bindgen(typescript_type = "PackageSpecSer[]")]
    pub type JsPackageSpecArray;
    #[wasm_bindgen(typescript_type = "JumpSer")]
    pub type JsJump;
    #[wasm_bindgen(typescript_type = "JumpSer[]")]
    pub type JsJumpArray;

    #[wasm_bindgen(typescript_type = "PdfOptionsSer")]
    pub type JsPdfOptions;
    #[wasm_bindgen(typescript_type = "SvgOptionsSer")]
    pub type JsSvgOptions;
    #[wasm_bindgen(typescript_type = "PngOptionsSer")]
    pub type JsPngOptions;
    #[wasm_bindgen(typescript_type = "HtmlOptionsSer")]
    pub type JsHtmlOptions;
    #[wasm_bindgen(typescript_type = "FormatOptionsSer")]
    pub type JsFormatOptions;
    #[wasm_bindgen(typescript_type = "FormatResultSer")]
    pub type JsFormatResult;

    #[wasm_bindgen(typescript_type = "PdfrResultSer")]
    pub type JsPdfrResult;
    #[wasm_bindgen(typescript_type = "SvgrResultSer")]
    pub type JsSvgrResult;
    #[wasm_bindgen(typescript_type = "PngrResultSer")]
    pub type JsPngrResult;
    #[wasm_bindgen(typescript_type = "HtmlResultSer")]
    pub type JsHtmlResult;
    #[wasm_bindgen(typescript_type = "SvgResultSer")]
    pub type JsSvgResult;
    #[wasm_bindgen(typescript_type = "SvgpResultSer")]
    pub type JsSvgpResult;
}
