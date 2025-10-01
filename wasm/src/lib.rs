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
        FileId, LinkedNode, Side, SyntaxKind, Tag, VirtualPath, highlight,
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

use serde::{definition, diagnostic, font, package, pdf, processor, svg};
use world::WasmWorld;

#[wasm_bindgen]
pub struct Typst {
    world: WasmWorld,

    last_kind: String,
    last_id: String,
    last_document: Option<PagedDocument>,

    last_highlights: Option<FxHashSet<(Range<usize>, Tag)>>,
    last_bracket_pairs: Option<FxHashSet<(Range<usize>, String)>>,
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
            last_highlights: None,
            last_bracket_pairs: None,
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

    pub fn autocomplete(&mut self, cursor: usize) -> JsValue {
        let source = self.world.source(self.world.main()).unwrap();
        let byte_idx = source.utf16_to_byte(cursor).unwrap();

        let result = typst_ide::autocomplete(
            &self.world,
            self.last_document.as_ref(),
            &source,
            byte_idx,
            false,
        );

        to_value(&result).unwrap()
    }

    pub fn definition(&mut self, cursor: usize) -> JsValue {
        let source = self.world.source(self.world.main()).unwrap();
        let byte_idx = source.utf16_to_byte(cursor).unwrap();

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
        self.last_highlights = None;
        self.last_bracket_pairs = None;
    }

    pub fn get_cursor_enclosing_bracket(&self, cursor_offset: usize) -> JsValue {
        #[derive(Serialize)]
        struct EnclosingBracket {
            range: (usize, usize),
            bracket_type: String,
        }

        let mut cursor_enclosing_bracket: Option<EnclosingBracket> = None;

        if let Some(ref bracket_pairs) = self.last_bracket_pairs {
            for (range, bracket_type) in bracket_pairs {
                let start = range.start;
                let end = range.end;

                if start < cursor_offset && cursor_offset <= end {
                    if let Some(ref existing) = cursor_enclosing_bracket {
                        if start > existing.range.0 {
                            cursor_enclosing_bracket = Some(EnclosingBracket {
                                range: (start, end),
                                bracket_type: bracket_type.clone(),
                            });
                        }
                    } else {
                        cursor_enclosing_bracket = Some(EnclosingBracket {
                            range: (start, end),
                            bracket_type: bracket_type.clone(),
                        });
                    }
                }
            }
        }

        to_value(&cursor_enclosing_bracket).unwrap()
    }

    pub fn highlight(&mut self, start_offset: usize, cursor_offset: usize) -> JsValue {
        // offsetは start_offset と preamble? と formatの{CODE}までのindex} を足したものから id (+1) を引いたもの あと width
        let source = self.world.source(self.world.main()).unwrap();

        let get_cm_offset = |byte_pos: usize| -> usize {
            source.byte_to_utf16(byte_pos).unwrap_or(byte_pos) + start_offset
        };

        fn range_key(range: &Range<usize>) -> (usize, usize) {
            (range.start, range.end)
        }

        // 探索
        let mut current_tag_ranges: FxHashSet<Range<usize>> = FxHashSet::default();
        let mut current_tag_info: FxHashMap<Range<usize>, Tag> = FxHashMap::default();
        let mut current_bracket_ranges: FxHashSet<Range<usize>> = FxHashSet::default();
        let mut current_bracket_info: FxHashMap<Range<usize>, String> = FxHashMap::default();
        let mut pos_stack: Vec<(usize, String)> = Vec::new();
        let mut cursor_enclosing_bracket: Option<(Range<usize>, String)> = None;
        let mut stack = vec![LinkedNode::new(&source.root())];
        while let Some(node) = stack.pop() {
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
                        pos_stack.push((range.start, bracket_type.to_string()));
                    }
                    SyntaxKind::RightBracket | SyntaxKind::RightBrace | SyntaxKind::RightParen => {
                        if let Some((left_range, bracket_type)) = pos_stack.pop() {
                            let expected_left_type = match kind {
                                SyntaxKind::RightBracket => "typ-bracket",
                                SyntaxKind::RightBrace => "typ-brace",
                                SyntaxKind::RightParen => "typ-paren",
                                _ => unreachable!(),
                            };

                            if bracket_type == expected_left_type {
                                let bracket_range = Range {
                                    start: left_range,
                                    end: range.start,
                                };

                                // カーソルを含むかつ前のより長さが短いなら変更
                                let start_cm = get_cm_offset(bracket_range.start);
                                let end_cm = get_cm_offset(bracket_range.end);

                                if start_cm < cursor_offset && cursor_offset <= end_cm {
                                    if let Some((existing_range, _)) = &cursor_enclosing_bracket {
                                        if existing_range.start < bracket_range.start {
                                            cursor_enclosing_bracket =
                                                Some((bracket_range.clone(), bracket_type.clone()));
                                        }
                                    } else {
                                        cursor_enclosing_bracket =
                                            Some((bracket_range.clone(), bracket_type.clone()));
                                    }
                                }

                                current_bracket_ranges.insert(bracket_range.clone());
                                current_bracket_info.insert(bracket_range, bracket_type);
                            }
                        }
                    }
                    _ => {}
                }
            } else {
                // ハイライト
                if let Some(tag) = highlight(&node) {
                    current_tag_ranges.insert(range.clone());
                    current_tag_info.insert(range, tag);
                }
            }

            for child in node.children().rev() {
                stack.push(child);
            }
        }

        // 更新
        let last_highlights = self.last_highlights.take();
        let last_bracket_pairs = self.last_bracket_pairs.take();

        #[derive(Serialize)]
        struct HighlightChanges {
            adds: Vec<(usize, usize, String)>,
            removes: Vec<(usize, usize, String)>,
        }

        let mut changes = HighlightChanges {
            adds: Vec::new(),
            removes: Vec::new(),
        };


        if let Some(ref last_highlights) = last_highlights {
            let last_highlight_keys: FxHashSet<(usize, usize)> = last_highlights
                .iter()
                .map(|(range, _)| range_key(range))
                .collect();

            changes
                .adds
                .extend(current_tag_ranges.iter().filter_map(|range| {
                    if !last_highlight_keys.contains(&range_key(range)) {
                        current_tag_info.get(range).map(|tag| {
                            let start = get_cm_offset(range.start);
                            let end = get_cm_offset(range.end);
                            let css_class = tag.css_class().to_string();
                            (start, end, css_class)
                        })
                    } else {
                        None
                    }
                }));

            changes
                .removes
                .extend(last_highlights.iter().filter_map(|(range, tag)| {
                    if !current_tag_ranges.contains(range) {
                        let start = get_cm_offset(range.start);
                        let end = get_cm_offset(range.end);
                        let css_class = tag.css_class().to_string();
                        Some((start, end, css_class))
                    } else {
                        None
                    }
                }));
        } else {
            changes
                .adds
                .extend(current_tag_ranges.iter().filter_map(|range| {
                    current_tag_info.get(range).map(|tag| {
                        let start = get_cm_offset(range.start);
                        let end = get_cm_offset(range.end);
                        let css_class = tag.css_class().to_string();
                        (start, end, css_class)
                    })
                }));
        }

        if let Some(ref last_bracket_pairs) = last_bracket_pairs {
            let last_bracket_keys: FxHashSet<(usize, usize)> = last_bracket_pairs
                .iter()
                .map(|(range, _)| range_key(range))
                .collect();

            changes
                .adds
                .extend(current_bracket_ranges.iter().filter_map(|range| {
                    if !last_bracket_keys.contains(&range_key(range)) {
                        current_bracket_info.get(range).map(|bracket_type| {
                            let start = get_cm_offset(range.start);
                            let end = get_cm_offset(range.end);
                            (start, end, bracket_type.clone())
                        })
                    } else {
                        None
                    }
                }));

            changes.removes.extend(last_bracket_pairs.iter().filter_map(
                |(range, bracket_type)| {
                    if !current_bracket_ranges.contains(range) {
                        let start = get_cm_offset(range.start);
                        let end = get_cm_offset(range.end);
                        Some((start, end, bracket_type.clone()))
                    } else {
                        None
                    }
                },
            ));
        } else {
            changes
                .adds
                .extend(current_bracket_ranges.iter().filter_map(|range| {
                    current_bracket_info.get(range).map(|bracket_type| {
                        let start = get_cm_offset(range.start);
                        let end = get_cm_offset(range.end);
                        (start, end, bracket_type.clone())
                    })
                }));
        }

        if let Some((range, bracket_type)) = cursor_enclosing_bracket {
            let start = get_cm_offset(range.start);
            let end = get_cm_offset(range.end);
            changes.adds.push((start, end, bracket_type));
        }

        self.last_highlights = Some(
            current_tag_ranges
                .into_iter()
                .filter_map(|range| current_tag_info.remove(&range).map(|tag| (range, tag)))
                .collect(),
        );
        self.last_bracket_pairs = Some(
            current_bracket_ranges
                .into_iter()
                .filter_map(|range| {
                    current_bracket_info
                        .remove(&range)
                        .map(|bracket_type| (range, bracket_type))
                })
                .collect(),
        );

        to_value(&changes).unwrap()
    }
}
