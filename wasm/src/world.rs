use std::{path::PathBuf, str::FromStr, sync::Mutex};

use chrono::{DateTime, Datelike, FixedOffset, Local, Utc};
use rustc_hash::{FxHashMap, FxHashSet};
use send_wrapper::SendWrapper;

use wasm_bindgen::{JsCast, JsValue};

use typst::foundations::{
    Bytes, Content, Datetime, Element, NativeElement, Property, Recipe, Selector, Smart, Style,
    Styles, Transformation, Value, func,
};

use typst::layout::{Abs, BoxElem, Em, Length, Rel, Sides};
use typst::syntax::{FileId, Source, Span, VirtualPath, package::PackageSpec};
use typst::text::{Font, FontBook, FontList, SmallcapsElem, TextElem};
use typst::{
    Library, LibraryExt, World,
    diag::{FileError, FileResult, PackageError},
    utils::LazyHash,
    visualize::{Color, Paint, Stroke},
};

use typst_ide::IdeWorld;

use crate::vfs::FileSlot;

pub struct WasmWorld {
    main: FileId,
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    slots: Mutex<FxHashMap<FileId, FileSlot>>,
    now: DateTime<Utc>,

    read: SendWrapper<js_sys::Function>,
    packages: FxHashSet<PackageSpec>,
}

impl WasmWorld {
    pub fn new(read: js_sys::Function, fontsize: f64) -> Self {
        // ファイルシステムを設定
        let main = FileId::new(None, VirtualPath::new("main.typ"));
        let mut slots = FxHashMap::default();
        slots.insert(main, FileSlot::new_from_text(main, "".into()));

        // フォントを登録
        let mut book = LazyHash::new(FontBook::new());
        let mut fonts = Vec::new();
        for data in typst_assets::fonts() {
            for font in Font::iter(Bytes::new(data)) {
                book.push(font.info().clone());
                fonts.push(font);
            }
        }

        // ライブラリを設定
        let mut library = Library::default();

        // ライブラリのグローバル・数学定義
        // #let fontsize = (16 / 1.25) * 1pt
        let fontsize_abs = Abs::pt(fontsize / 1.25);
        let fontsize_val = Value::Length(Length::from(fontsize_abs));
        library.global.scope_mut().define("fontsize", fontsize_val);

        // #let CURSOR = text(fill: rgb("#44f"))[▮]
        let cursor_elem = TextElem::new("▮".into());
        let cursor_paint = Paint::Solid(Color::from_str("#44f").unwrap());
        let cursor_style = Style::Property(Property::new(TextElem::fill, cursor_paint));
        let cursor_val = Value::Content(Content::new(cursor_elem).styled(cursor_style));
        library.global.scope_mut().define("CURSOR", cursor_val);

        // #let boxed(it) = box(if type(it) == content {it} else [#it], inset: 0.25em, stroke: black + 1pt)
        #[func]
        pub fn boxed(it: Value) -> Content {
            let content = if let Value::Content(c) = it {
                c
            } else {
                it.display()
            };

            let inset = Rel::from(Length::from(Em::new(0.25)));
            let inset_sides = Sides::splat(Some(inset));

            let paint = Paint::Solid(Color::BLACK);
            let thickness = Length::from(Abs::pt(1.0));
            let stroke = Stroke {
                paint: Smart::Custom(paint),
                thickness: Smart::Custom(thickness),
                ..Default::default()
            };
            let stroke_sides = Sides::splat(Some(Some(stroke)));

            BoxElem::new()
                .with_body(Some(content))
                .with_inset(inset_sides)
                .with_stroke(stroke_sides)
                .pack()
        }
        library.global.scope_mut().define_func::<boxed>();
        library.math.scope_mut().define_func::<boxed>();

        // ライブラリのスタイル定義
        // #show smallcaps: set text(font: "")
        // ? math モードで smallcap を使えた方が便利
        let font_list = FontList(Vec::new());
        let text_style = Style::Property(Property::new(TextElem::font, font_list));
        let selector = Selector::Elem(Element::of::<SmallcapsElem>(), None);
        let transformation = Transformation::Style(Styles::from(text_style));
        let recipe = Style::Recipe(Recipe::new(
            Some(selector),
            transformation,
            Span::detached(),
        ));
        library.styles.push(recipe);

        Self {
            main,
            library: LazyHash::new(library),
            book,
            fonts,
            slots: Mutex::new(slots),
            now: Utc::now(),

            read: SendWrapper::new(read),
            packages: FxHashSet::default(),
        }
    }

    pub fn set_main(&mut self, id: FileId) {
        self.main = id;
    }

    // ? 差分コンパイルのため
    pub fn replace(&mut self, new: &str) {
        let mut m = self.slots.lock().unwrap();

        m.get_mut(&self.main).unwrap().replace(new);
    }

    pub fn add_file_text(&self, vpath: VirtualPath, text: String) {
        let mut m = self.slots.lock().unwrap();
        let file_id = FileId::new(None, vpath);

        m.insert(file_id, FileSlot::new_from_text(file_id, text));
    }

    pub fn add_file_bytes(&self, vpath: VirtualPath, bytes: Vec<u8>) {
        let mut m = self.slots.lock().unwrap();
        let file_id = FileId::new(None, vpath);

        m.insert(file_id, FileSlot::new_from_bytes(file_id, bytes));
    }

    pub fn add_package_file(&mut self, spec: PackageSpec, vpath: &str, bytes: Vec<u8>) {
        let mut m = self.slots.lock().unwrap();
        let file_id = FileId::new(Some(spec.clone()), VirtualPath::new(vpath));
        m.insert(file_id, FileSlot::new_from_bytes(file_id, bytes));

        self.packages.insert(spec);
    }

    pub fn list_packages(&self) -> Vec<PackageSpec> {
        self.packages.iter().cloned().collect()
    }

    pub fn add_font(&mut self, data: Bytes) {
        for f in Font::iter(data) {
            self.book.push(f.info().clone());
            self.fonts.push(f);
        }
    }

    fn fetch(&self, rpath: String) -> Result<JsValue, JsValue> {
        return self.read.call1(&JsValue::NULL, &rpath.into());
    }

    fn fetch_file(&self, rpath: String, spec: Option<&PackageSpec>) -> FileResult<Bytes> {
        let f = |e: JsValue| {
            if let Some(value) = e.as_f64() {
                return match value as i64 {
                    0 => FileError::Other(Some("implementation constraints".into())),

                    10 => FileError::AccessDenied,
                    11 => FileError::IsDirectory,
                    12 => FileError::NotFound(PathBuf::from(rpath.clone())),

                    20 => FileError::Package(PackageError::MalformedArchive(Some(
                        "invalid package format".into(),
                    ))),
                    21 => FileError::Package(PackageError::NetworkFailed(Some(
                        "network connection error".into(),
                    ))),
                    22 => FileError::Package(PackageError::NotFound(spec.unwrap().clone())),
                    _ => FileError::Other(Some("unexpected error".into())),
                };
            }
            FileError::Other(e.as_string().map(Into::into))
        };

        self.fetch(rpath.clone()).map_err(f).and_then(|js_value| {
            if let Some(u8arr) = js_value.dyn_ref::<js_sys::Uint8Array>() {
                Ok(Bytes::new(u8arr.to_vec()))
            } else {
                Err(FileError::Other(Some("unexpected error".into())))
            }
        })
    }

    fn read<F, T>(&self, id: FileId, f: F) -> FileResult<T>
    where
        F: FnOnce(&mut FileSlot) -> FileResult<T>,
    {
        let mut m = self.slots.lock().unwrap();

        if m.get(&id).map_or(true, |slot| slot.bytes().is_err()) {
            let result = match id.package() {
                Some(spec) => self.fetch_file(
                    format!(
                        "@{}/{}/{}/{}",
                        spec.namespace,
                        spec.name,
                        spec.version,
                        id.vpath().as_rootless_path().to_str().unwrap()
                    ),
                    Some(&spec),
                ),
                None => self.fetch_file(
                    id.vpath().as_rootless_path().to_str().unwrap().to_string(),
                    None,
                ),
            };

            m.insert(id, FileSlot::new_from_result(id, result));
        }

        f(m.get_mut(&id).unwrap())
    }
}

#[comemo::track]
impl World for WasmWorld {
    // Symbol など
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    // フォントの情報
    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    // コンパイル対象の FileId を返す
    fn main(&self) -> FileId {
        self.main
    }

    // ? .typ ファイル
    fn source(&self, id: FileId) -> FileResult<Source> {
        self.read(id, |f| f.source())
    }

    // ? アセットファイル (画像や wasm など)
    fn file(&self, id: FileId) -> FileResult<Bytes> {
        self.read(id, |f| f.bytes())
    }

    // ? 登録されていないフォントにアクセスを試みると，Warning(severity: 2) が発生するる
    fn font(&self, index: usize) -> Option<Font> {
        Some(self.fonts[index].clone())
    }

    fn today(&self, offset: Option<i64>) -> Option<Datetime> {
        let local_datetime = match offset {
            None => self.now.with_timezone(&Local).fixed_offset(),
            Some(hours) => {
                let seconds = i32::try_from(hours).ok()?.checked_mul(3600)?;
                self.now.with_timezone(&FixedOffset::east_opt(seconds)?)
            }
        };

        let year = local_datetime.year();
        let month = local_datetime.month().try_into().ok()?;
        let day = local_datetime.day().try_into().ok()?;

        // ? 起動時の値に固定するので，hms は不要。
        Datetime::from_ymd(year, month, day)
    }
}

impl IdeWorld for WasmWorld {
    fn upcast(&self) -> &dyn World {
        self
    }

    fn packages(&self) -> &[(PackageSpec, Option<typst::ecow::EcoString>)] {
        &[]
    }

    fn files(&self) -> Vec<FileId> {
        std::vec![]
    }
}
