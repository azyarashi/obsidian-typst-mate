#[cfg(all(feature = "legacy", feature = "latest"))]
compile_error!(";;");

#[cfg(feature = "legacy")]
pub use typst_assets_legacy as typst_assets;
#[cfg(feature = "legacy")]
pub use typst_html_legacy as typst_html;
#[cfg(feature = "legacy")]
pub use typst_ide_legacy as typst_ide;
#[cfg(feature = "legacy")]
pub use typst_legacy as typst;
#[cfg(feature = "legacy")]
pub use typst_pdf_legacy as typst_pdf;
#[cfg(feature = "legacy")]
pub use typst_svg_legacy as typst_svg;
#[cfg(feature = "legacy")]
pub use typst_timing_legacy as typst_timing;

#[cfg(feature = "latest")]
pub use typst_assets_latest as typst_assets;
#[cfg(feature = "latest")]
pub use typst_html_latest as typst_html;
#[cfg(feature = "latest")]
pub use typst_ide_latest as typst_ide;
#[cfg(feature = "latest")]
pub use typst_latest as typst;
#[cfg(feature = "latest")]
pub use typst_pdf_latest as typst_pdf;
#[cfg(feature = "latest")]
pub use typst_svg_latest as typst_svg;
#[cfg(feature = "latest")]
pub use typst_timing_latest as typst_timing;

use std::ops::Range;

use ::serde::Serialize;
use js_sys::{ArrayBuffer, Uint8Array};
use mitex::convert_math;
use rustc_hash::{FxHashMap, FxHashSet};
use serde_wasm_bindgen::to_value;
use wasm_bindgen::prelude::*;

use typst::{
    World,
    diag::Warned,
    foundations::Bytes,
    layout::PagedDocument,
    syntax::{
        FileId, LinkedNode, Side, SyntaxKind, VirtualPath, highlight,
        package::{PackageSpec, PackageVersion},
    },
    text::FontInfo,
};
use typst_html::HtmlDocument;
use typst_pdf::PdfOptions;

mod lexer;
mod parser;
mod serde;
mod utils;
mod vfs;
mod world;

use serde::{definition, diagnostic, font, html, package, pdf, processor, svg};
use world::WasmWorld;

#[wasm_bindgen]
pub struct Typst {
    world: WasmWorld,

    last_kind: String,
    last_id: String,
    last_document: Option<PagedDocument>,

    next_highlight_id: usize,
    last_highlights: FxHashMap<usize, (Range<usize>, String)>, // id, (range, css_class)
    last_bracket_pairs: FxHashSet<(usize, usize)>,             // 開き括弧の右側, 閉じ括弧の左側
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

            next_highlight_id: 0,
            last_highlights: FxHashMap::default(),
            last_bracket_pairs: FxHashSet::default(),
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
                VirtualPath::new(format!("{}_{}.typ", p.kind, p.id)),
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

    // ? ちらつき防止のためカーソルの親括弧の計算は TS 側でする
    pub fn find_bracket_pairs(&mut self, code: &str) -> JsValue {
        let tokens = lexer::bracket::bracket_lexer(code);
        let pairs = parser::bracket::paren_parse(&tokens);

        let pairs_ser: Vec<serde::bracket::BracketPairSer> = pairs.iter().map(Into::into).collect();

        to_value(&pairs_ser).unwrap()
    }

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
                self.last_document = Some(document.clone());

                // ? typst_svg::svg は背景が透過しない
                let svg = typst_svg::svg_frame(&document.pages[0].frame)
                    .replace("<svg class", "<svg style=\"overflow: visible;\" class");

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

    pub fn html(&mut self, code: &str, kind: &str, id: &str) -> Result<JsValue, JsValue> {
        if self.last_kind == kind && self.last_id == id {
            self.world.replace(code);
        } else {
            self.last_kind = kind.to_string();
            self.last_id = id.to_string();

            self.update_source(VirtualPath::new(format!("{}_{}.typ", kind, id)), code);
        }

        let Warned { output, warnings } = typst::compile::<HtmlDocument>(&mut self.world);

        match output {
            Ok(document) => {
                let document = typst_html::html(&document);

                match document {
                    Ok(html) => html::html(html, warnings, &self.world),
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

    pub fn pdf(&mut self, filename: &str, code: &str) -> Result<JsValue, JsValue> {
        self.update_source(VirtualPath::new(filename), code);
        let Warned { output, warnings } = typst::compile::<PagedDocument>(&mut self.world);

        match output {
            Ok(mut document) => {
                if document.pages.is_empty() {
                    return Err(JsValue::from_str("document has no pages"));
                }
                self.last_document = Some(document.clone());

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

    pub fn autocomplete(&mut self, local_offset: usize) -> JsValue {
        let source = self.world.source(self.world.main()).unwrap();

        #[cfg(feature = "legacy")]
        let byte_idx = source.utf16_to_byte(local_offset).unwrap();
        #[cfg(feature = "latest")]
        let byte_idx = source.lines().utf16_to_byte(local_offset).unwrap();

        let result = typst_ide::autocomplete(
            &self.world,
            self.last_document.as_ref(),
            &source,
            byte_idx,
            false,
        );

        to_value(&result).unwrap()
    }

    pub fn definition(&mut self, local_offset: usize) -> JsValue {
        let source = self.world.source(self.world.main()).unwrap();

        #[cfg(feature = "legacy")]
        let byte_idx = source.utf16_to_byte(local_offset).unwrap();
        #[cfg(feature = "latest")]
        let byte_idx = source.lines().utf16_to_byte(local_offset).unwrap();

        let tokens = typst_ide::definition(
            &self.world,
            self.last_document.as_ref(),
            &source,
            byte_idx,
            Side::Before,
        );

        let tokens_ser: Option<definition::DefinitionSer> = tokens
            .as_ref()
            .map(|def| definition::DefinitionSer::from_def_with_world(def, &self.world));

        to_value(&tokens_ser).unwrap()
    }

    pub fn reset_highlights(&mut self) {
        self.last_highlights = FxHashMap::default();
        self.last_bracket_pairs = FxHashSet::default();
    }

    pub fn get_cursor_enclosing_bracket(&self, cm_offset: usize) -> JsValue {
        #[derive(Serialize)]
        struct EnclosingBracket {
            range: (usize, usize),
        }

        let mut cursor_enclosing_bracket: Option<EnclosingBracket> = None;

        for (start, end) in &self.last_bracket_pairs {
            if &cm_offset < start {
                break;
            }
            if start <= &cm_offset && &cm_offset <= end {
                if let Some(ref existing) = cursor_enclosing_bracket {
                    if start > &existing.range.0 {
                        cursor_enclosing_bracket = Some(EnclosingBracket {
                            range: (*start, *end),
                        });
                    }
                } else {
                    cursor_enclosing_bracket = Some(EnclosingBracket {
                        range: (*start, *end),
                    });
                }
            }
        }

        to_value(&cursor_enclosing_bracket).unwrap()
    }

    pub fn highlight(
        &mut self,
        local_offset: usize,
        start_offset: usize,
        end_offset: usize,
        cursor_offset: usize,
    ) -> JsValue {
        let source = self.world.source(self.world.main()).unwrap();
        let needs_colon = !self.last_id.is_empty() && self.last_kind == "inline";
        let id_length = self.last_id.len() + usize::from(needs_colon);
        let code_length = end_offset - start_offset; // id を含む
        let cursor_local_offset = cursor_offset - start_offset + local_offset;

        #[cfg(feature = "legacy")]
        let get_raw_offset = |byte_pos: usize| -> Option<usize> {
            let raw = source.byte_to_utf16(byte_pos)?;
            // ? idは特別にハイライト処理をするため判定から除外
            if local_offset + id_length <= raw && raw <= local_offset + id_length + code_length {
                Some(raw - local_offset)
            } else {
                None
            }
        };
        #[cfg(feature = "latest")]
        let lines = source.lines();
        #[cfg(feature = "latest")]
        let get_raw_offset = |byte_pos: usize| -> Option<usize> {
            let raw = lines.byte_to_utf16(byte_pos)?;
            // ? idは特別にハイライト処理をするため判定から除外
            if local_offset + id_length <= raw && raw <= local_offset + id_length + code_length {
                Some(raw - local_offset)
            } else {
                None
            }
        };
        let get_cm_offset = |local_pos: usize| -> usize { local_pos + start_offset };

        // ! 探索
        let mut new_bracket_pairs: FxHashSet<(usize, usize)> = FxHashSet::default();
        let mut enclosing_bracket_pair: Option<(usize, usize)> = None;
        let mut enclosing_bracket_length = 0;
        let mut current_highlights_without_id: FxHashSet<(Range<usize>, String)> =
            FxHashSet::default();

        let mut bracket_stack: Vec<(usize, String)> = Vec::new();
        let mut node_stack = vec![LinkedNode::new(&source.root())];
        while let Some(node) = node_stack.pop() {
            let kind = node.kind();
            let range = node.range();

            if kind.is_grouping() {
                // 括弧
                match kind {
                    SyntaxKind::LeftBracket | SyntaxKind::LeftBrace | SyntaxKind::LeftParen => {
                        let bracket_type = match kind {
                            SyntaxKind::LeftBracket => "typ-bracket",
                            SyntaxKind::LeftBrace => "typ-brace",
                            SyntaxKind::LeftParen => "typ-paren",
                            _ => unreachable!(),
                        };
                        bracket_stack.push((range.end, bracket_type.to_string()));
                    }
                    SyntaxKind::RightBracket | SyntaxKind::RightBrace | SyntaxKind::RightParen => {
                        if let Some((left_end, bracket_type)) = bracket_stack.pop() {
                            let expected_left_type = match kind {
                                SyntaxKind::RightBracket => "typ-bracket",
                                SyntaxKind::RightBrace => "typ-brace",
                                SyntaxKind::RightParen => "typ-paren",
                                _ => unreachable!(),
                            };

                            if bracket_type == expected_left_type {
                                let bracket_range = Range {
                                    start: left_end,  // 開き括弧文字の右側
                                    end: range.start, // 閉じ括弧文字の左側
                                };

                                if left_end <= cursor_local_offset
                                    && cursor_local_offset <= range.start
                                {
                                    let length = range.start - left_end;
                                    if enclosing_bracket_length < length {
                                        enclosing_bracket_length = length;
                                        enclosing_bracket_pair = Some((left_end, range.start));
                                    }
                                }

                                current_highlights_without_id.insert((
                                    bracket_range.start - 1..bracket_range.start,
                                    bracket_type.to_string(),
                                ));
                                current_highlights_without_id.insert((
                                    bracket_range.end..bracket_range.end + 1,
                                    bracket_type.to_string(),
                                ));

                                if let (Some(local_start), Some(local_end)) =
                                    (get_raw_offset(left_end), get_raw_offset(range.start))
                                {
                                    new_bracket_pairs.insert((
                                        get_cm_offset(local_start),
                                        get_cm_offset(local_end),
                                    ));
                                }
                            }
                        }
                    }
                    _ => {}
                }
            } else {
                if let Some(tag) = highlight(&node) {
                    current_highlights_without_id.insert((
                        Range {
                            start: range.start,
                            end: range.end,
                        },
                        tag.css_class().to_string(),
                    ));
                }
            }

            for child in node.children().rev() {
                node_stack.push(child);
            }
        }

        // ! 差分計算
        let mut changes = HighlightChanges {
            adds: Vec::new(),
            removes: Vec::new(),
        };
        let mut new_highlights: FxHashMap<usize, (Range<usize>, String)> = FxHashMap::default();

        let mut old_map: FxHashMap<(Range<usize>, String), usize> = FxHashMap::default();
        for (id, (range, class)) in self.last_highlights.iter() {
            old_map.insert((range.clone(), class.clone()), *id);
        }

        for (range, class) in current_highlights_without_id.iter() {
            if let Some(&id) = old_map.get(&(range.clone(), class.clone())) {
                // 既存idの利用
                new_highlights.insert(id, (range.clone(), class.clone()));
            } else {
                // 新規idを割当
                let id = self.next_highlight_id;
                self.next_highlight_id += 1;
                new_highlights.insert(id, (range.clone(), class.clone()));

                if let (Some(local_start), Some(local_end)) =
                    (get_raw_offset(range.start), get_raw_offset(range.end))
                {
                    changes.adds.push((
                        id,
                        get_cm_offset(local_start),
                        get_cm_offset(local_end),
                        class.clone(),
                    ));
                }
            }
        }

        if let Some((enclosing_start, enclosing_end)) = enclosing_bracket_pair {
            if let (Some(local_start), Some(local_end)) = (
                get_raw_offset(enclosing_start),
                get_raw_offset(enclosing_end),
            ) {
                changes.adds.push((
                    2147483645,
                    get_cm_offset(local_start - 1),
                    get_cm_offset(local_start),
                    "typ-enclosing".to_string(),
                ));
                changes.adds.push((
                    2147483646,
                    get_cm_offset(local_end),
                    get_cm_offset(local_end + 1),
                    "typ-enclosing".to_string(),
                ));
            }
        }

        for (id, (range, class)) in self.last_highlights.iter() {
            if class == "typ-enclosing" {
                changes.removes.push(*id);
            } else if !current_highlights_without_id.contains(&(range.clone(), class.clone())) {
                changes.removes.push(*id);
            }
        }

        // ! 更新
        self.last_highlights = new_highlights;
        self.last_bracket_pairs = new_bracket_pairs;
        to_value(&changes).unwrap()
    }
}

#[derive(Serialize)]
struct HighlightChanges {
    adds: Vec<(usize, usize, usize, String)>,
    removes: Vec<usize>,
}
