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
    diag::{SourceResult, Warned},
    foundations::{Bytes, Module, Version as TypstVersion},
    layout::{Abs, PageRanges, PagedDocument, Point},
    syntax::{FileId, Side, VirtualPath},
    text::FontInfo,
};

mod serde;
mod utils;
mod vfs;
mod world;

use crate::serde::{
    completion, definition, diagnostic, font, format, htmle, htmlm, jump, package, pdfe, pnge,
    svge, svgm, svgp, tooltip, values::Version,
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

/// post
#[wasm_bindgen]
impl Wasm {
    #[wasm_bindgen(constructor)]
    pub fn new(
        read_file: js_sys::Function,
        read_package_file: js_sys::Function,
        download_package: js_sys::Function,
        fontsize: f64,
        offset: f64,
    ) -> Self {
        #[cfg(debug_assertions)]
        console_error_panic_hook::set_once();

        Self {
            world: WasmWorld::new(read_file, read_package_file, download_package, fontsize),
            offset,

            last_kind: String::new(),
            last_id: String::new(),
            last_document: None,
        }
    }

    pub fn store(&mut self, fonts: Vec<ArrayBuffer>, files: JsValue) -> Result<(), JsValue> {
        for f in fonts.iter() {
            let u8arr = Uint8Array::new(&f);
            let mut vec = vec![0u8; u8arr.length() as usize];
            u8arr.copy_to(&mut vec);

            self.world.add_font(Bytes::new(vec));
        }

        let files: FxHashMap<String, String> = serde_wasm_bindgen::from_value(files)
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize files: {}", e)))?;
        for (path, text) in files {
            self.world.add_file_text(VirtualPath::new(path), text);
        }

        Ok(())
    }

    pub fn set_offset(&mut self, offset: f64) {
        self.offset = offset;
    }

    fn export_result<T>(&self, result: SourceResult<T>) -> Result<T, JsValue> {
        result.map_err(|errs| {
            let diags: Vec<diagnostic::Diagnostic> = errs
                .iter()
                .map(|d| diagnostic::Diagnostic::from_diag(d, &self.world))
                .collect();
            to_value(&diags).unwrap_or(JsValue::NULL)
        })
    }
}

/// get
#[wasm_bindgen]
impl Wasm {
    /* package / font */

    pub fn list_packages(&self) -> JsPackageSpecArray {
        let packages = self.world.list_packages();
        let packages_ser: Vec<package::PackageSpec> = packages.iter().map(Into::into).collect();

        to_value(&packages_ser)
            .unwrap_or(JsValue::NULL)
            .unchecked_into()
    }

    pub fn list_fonts(&self) -> JsFontInfoArray {
        let families = self.world.book().families();
        let infos_ser: Vec<font::FontInfo> = families
            .flat_map(|(_, infos)| infos.map(Into::into))
            .collect();

        to_value(&infos_ser)
            .unwrap_or(JsValue::NULL)
            .unchecked_into()
    }

    pub fn get_font_info(&self, buffer: JsValue) -> JsFontInfoArray {
        let vec = Uint8Array::new(&buffer).to_vec();
        let bytes = Bytes::new(vec);

        let infos: Vec<font::FontInfo> =
            FontInfo::iter(&bytes).map(|info| (&info).into()).collect();

        to_value(&infos).unwrap_or(JsValue::NULL).unchecked_into()
    }

    /* typst_pdf */

    pub fn get_pdf_standards(&self) -> JsValue {
        use typst_pdf::PdfStandard;
        let mut map = std::collections::BTreeMap::new();
        map.insert("".to_string(), "Default (PDF 1.7)".to_string());

        let all = [
            (PdfStandard::V_1_4, "PDF 1.4"),
            (PdfStandard::V_1_5, "PDF 1.5"),
            (PdfStandard::V_1_6, "PDF 1.6"),
            (PdfStandard::V_1_7, "PDF 1.7"),
            (PdfStandard::V_2_0, "PDF 2.0"),
            (PdfStandard::A_1b, "PDF/A-1b"),
            (PdfStandard::A_1a, "PDF/A-1a"),
            (PdfStandard::A_2b, "PDF/A-2b"),
            (PdfStandard::A_2u, "PDF/A-2u"),
            (PdfStandard::A_2a, "PDF/A-2a"),
            (PdfStandard::A_3b, "PDF/A-3b"),
            (PdfStandard::A_3u, "PDF/A-3u"),
            (PdfStandard::A_3a, "PDF/A-3a"),
            (PdfStandard::A_4, "PDF/A-4"),
            (PdfStandard::A_4f, "PDF/A-4f"),
            (PdfStandard::A_4e, "PDF/A-4e"),
            (PdfStandard::Ua_1, "PDF/UA-1"),
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

    /* misc */

    pub fn get_typst_version(&self) -> Option<JsVersion> {
        let std_scope = self.world.library().std.read().scope()?;
        let sys_binding = std_scope.get("sys")?;
        let sys_module = sys_binding.read().clone().cast::<Module>().ok()?;
        let version_binding = sys_module.scope().get("version")?;
        let version = version_binding.read().clone().cast::<TypstVersion>().ok()?;

        Some(to_value(&Version::from(&version)).unwrap().unchecked_into())
    }
}

/// typst_ide
#[wasm_bindgen]
impl Wasm {
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

        let completions_ser: Vec<completion::Completion> = completions
            .into_iter()
            .filter(|c| c.kind != typst_ide::CompletionKind::Syntax)
            .map(completion::Completion::from_completion)
            .collect();
        let result_ser = completion::CompletionResult {
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
            to_value(&tooltip::Tooltip::from(t))
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
            let definition_ser = definition::Definition::from_definition(d, &self.world);
            to_value(&definition_ser)
                .unwrap_or(JsValue::NULL)
                .unchecked_into()
        })
    }

    pub fn jump_from_clickm(&self, x: f64, y: f64) -> Option<JsJump> {
        match &self.last_document {
            Some(document) => {
                let frame = &document.pages[0].frame;
                let point = Point::new(Abs::pt(x), Abs::pt(y));
                let point = typst_ide::jump_from_click(&self.world, document, frame, point);
                point.map(|point| {
                    let jump_ser = jump::Jump::from_jump(&point, &self.world);
                    to_value(&jump_ser)
                        .unwrap_or(JsValue::NULL)
                        .unchecked_into()
                })
            }
            None => None,
        }
    }

    pub fn jump_from_clickp(&self, page: usize, x: f64, y: f64) -> Option<JsJump> {
        match &self.last_document {
            Some(document) => {
                if document.pages.len() <= page {
                    return None;
                }
                let frame = &document.pages[page].frame;
                let point = Point::new(Abs::pt(x), Abs::pt(y));
                let point = typst_ide::jump_from_click(&self.world, document, frame, point);
                point.map(|point| {
                    let jump_ser = jump::Jump::from_jump(&point, &self.world);
                    to_value(&jump_ser)
                        .unwrap_or(JsValue::NULL)
                        .unchecked_into()
                })
            }
            None => None,
        }
    }

    pub fn jump_from_cursorp(&self, cursor: usize) -> JsJumpArray {
        match &self.last_document {
            Some(document) => {
                let result = self.world.source(self.world.main());
                if let Ok(source) = result {
                    let cursor_byte = source.lines().utf16_to_byte(cursor).unwrap_or(cursor);
                    let positions = typst_ide::jump_from_cursor(document, &source, cursor_byte);

                    let positions_ser: Vec<jump::Jump> = positions
                        .into_iter()
                        .map(jump::Jump::from_position)
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

/// compile
#[wasm_bindgen]
impl Wasm {
    pub fn take_pending(&mut self) -> bool {
        self.world.take_pending()
    }
}

/// markdown
#[wasm_bindgen]
impl Wasm {
    pub fn svgm(
        &mut self,
        path: &str,
        code: &str,
        kind: &str,
        id: &str,
    ) -> Result<JsSvgMResult, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            self.update_source(VirtualPath::new(path), code);
        }
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        let document = self.export_result(output)?;

        if document.pages.is_empty() {
            return Err(JsValue::from_str("document has no pages"));
        }

        let mut document = document;
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
                    "<svg style=\"overflow: visible; vertical-align: {:.3}pt;\" class",
                    descent
                )
                .as_str(),
                1,
            );

        self.last_document = Some(document);

        Ok(svgm::svgm(svg, warnings, &self.world)?.unchecked_into())
    }

    pub fn htmlm(
        &mut self,
        path: &str,
        code: &str,
        kind: &str,
        id: &str,
    ) -> Result<JsHtmlMResult, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            self.update_source(VirtualPath::new(path), code);
        }
        let Warned { output, warnings } =
            typst::compile::<typst_html::HtmlDocument>(&mut self.world);

        let document = self.export_result(output)?;
        let html_str = self.export_result(typst_html::html(&document))?;
        let body = Wasm::extract_body(&html_str).unwrap_or(&html_str);
        Ok(htmlm::htmlm(body.to_string(), warnings, &self.world)?.unchecked_into())
    }
}

/// preview
#[wasm_bindgen]
impl Wasm {
    pub fn svgp(&mut self, path: &str, code: &str) -> Result<JsSvgPResult, JsValue> {
        self.update_source(VirtualPath::new(path), code);
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        let mut document = self.export_result(output)?;

        let mut svgs = Vec::new();
        for page in &mut document.pages {
            let svg = typst_svg::svg(page);
            svgs.push(svg);
        }
        self.last_document = Some(document);
        Ok(svgp::svgp(svgs, warnings, &self.world)?.unchecked_into())
    }
}

/// export
#[wasm_bindgen]
impl Wasm {
    pub fn pdfe(
        &mut self,
        path: &str,
        code: &str,
        options: JsPdfEOptions,
    ) -> Result<JsPdfEResult, JsValue> {
        let filename: String = Path::new(path)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("document")
            .to_string();
        let options_ser: pdfe::PdfEOptions = serde_wasm_bindgen::from_value(options.into())
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(VirtualPath::new(path), code);
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        let mut document = self.export_result(output)?;
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
            let tz =
                FixedOffset::east_opt(offset_min * 60).unwrap_or(FixedOffset::east_opt(0).unwrap());
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
                        options.timestamp = typst_pdf::Timestamp::new_local(datetime, offset_min);
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

        let pdf_data = self.export_result(typst_pdf::pdf(&document, &options))?;
        Ok(pdfe::pdfe(pdf_data, warnings, &self.world)?.unchecked_into())
    }

    pub fn pnge(
        &mut self,
        path: &str,
        code: &str,
        options: JsPngEOptions,
    ) -> Result<JsPngEResult, JsValue> {
        let options_ser: pnge::PngEOptions = serde_wasm_bindgen::from_value(options.into())
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(VirtualPath::new(path), code);
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        let document = self.export_result(output)?;
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
        Ok(pnge::pnge(images, warnings, &self.world)?.unchecked_into())
    }

    pub fn svge(
        &mut self,
        path: &str,
        code: &str,
        options: JsSvgEOptions,
    ) -> Result<JsSvgEResult, JsValue> {
        let options_ser: svge::SvgEOptions = serde_wasm_bindgen::from_value(options.into())
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(VirtualPath::new(path), code);
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        let document = self.export_result(output)?;
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
            let mut svg = typst_svg::svg(page);
            if options_ser.overflow.unwrap_or(false) {
                svg = svg.replacen("<svg class", "<svg style=\"overflow: visible;\" class", 1);
            }
            svgs.push(svg);
        }
        Ok(svge::svge(svgs, warnings, &self.world)?.unchecked_into())
    }

    pub fn htmle(
        &mut self,
        path: &str,
        code: &str,
        options: JsHtmlEOptions,
    ) -> Result<JsHtmlEResult, JsValue> {
        let options_ser: htmle::HtmlEOptions = serde_wasm_bindgen::from_value(options.into())
            .map_err(|e| JsValue::from_str(&format!("failed to deserialize options: {}", e)))?;

        self.world.update_now();
        self.update_source(VirtualPath::new(path), code);
        let Warned { output, warnings } =
            typst::compile::<typst_html::HtmlDocument>(&mut self.world);

        let document = self.export_result(output)?;
        let html_str = self.export_result(typst_html::html(&document))?;
        let html = if options_ser.extract_body.unwrap_or(true) {
            Wasm::extract_body(&html_str)
                .unwrap_or(&html_str)
                .trim()
                .to_string()
        } else {
            html_str
        };
        Ok(htmle::htmle(html, warnings, &self.world)?.unchecked_into())
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

/// Typstyle
#[wasm_bindgen]
impl Wasm {
    pub fn format(&self, code: &str, options: JsFormatOptions) -> Result<JsFormatResult, JsValue> {
        let options_ser: format::FormatOptions = serde_wasm_bindgen::from_value(options.into())
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
        let res_ser = format::FormatResult {
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

/// utils
impl Wasm {
    fn update_source(&mut self, vpath: VirtualPath, code: &str) {
        let file_id = FileId::new(None, vpath.clone());
        let result = self.world.source(file_id);

        match result {
            Ok(_) => {
                self.world.set_main(file_id);
                self.world.replace(code);
            }
            Err(_) => {
                self.world.add_file_text(vpath.clone(), code.into());
                self.world.set_main(file_id);
            }
        }
    }

    fn extract_body(html: &str) -> Option<&str> {
        let (_, rest) = html.split_once("<body")?;
        let (_, rest) = rest.split_once('>')?;
        let (body, _) = rest.split_once("</body>")?;
        Some(body.trim())
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Version")]
    pub type JsVersion;
    #[wasm_bindgen(typescript_type = "CompletionResult")]
    pub type JsCompletionResult;
    #[wasm_bindgen(typescript_type = "Tooltip")]
    pub type JsTooltipResult;
    #[wasm_bindgen(typescript_type = "Definition")]
    pub type JsDefinitionResult;
    #[wasm_bindgen(typescript_type = "FontInfo[]")]
    pub type JsFontInfoArray;
    #[wasm_bindgen(typescript_type = "PackageSpec[]")]
    pub type JsPackageSpecArray;
    #[wasm_bindgen(typescript_type = "Jump")]
    pub type JsJump;
    #[wasm_bindgen(typescript_type = "Jump[]")]
    pub type JsJumpArray;

    #[wasm_bindgen(typescript_type = "SvgMResult")]
    pub type JsSvgMResult;
    #[wasm_bindgen(typescript_type = "HtmlMResult")]
    pub type JsHtmlMResult;

    #[wasm_bindgen(typescript_type = "SvgPResult")]
    pub type JsSvgPResult;

    #[wasm_bindgen(typescript_type = "PdfEOptions")]
    pub type JsPdfEOptions;
    #[wasm_bindgen(typescript_type = "PngEOptions")]
    pub type JsPngEOptions;
    #[wasm_bindgen(typescript_type = "SvgEOptions")]
    pub type JsSvgEOptions;
    #[wasm_bindgen(typescript_type = "HtmlEOptions")]
    pub type JsHtmlEOptions;
    #[wasm_bindgen(typescript_type = "FormatOptions")]
    pub type JsFormatOptions;
    #[wasm_bindgen(typescript_type = "FormatResult")]
    pub type JsFormatResult;

    #[wasm_bindgen(typescript_type = "PdfEResult")]
    pub type JsPdfEResult;
    #[wasm_bindgen(typescript_type = "PngEResult")]
    pub type JsPngEResult;
    #[wasm_bindgen(typescript_type = "SvgEResult")]
    pub type JsSvgEResult;
    #[wasm_bindgen(typescript_type = "HtmlEResult")]
    pub type JsHtmlEResult;

}
