use std::{
    path::PathBuf,
    sync::{Mutex, atomic::Ordering},
};

use chrono::{DateTime, Datelike, FixedOffset, Local, Timelike, Utc};
use rustc_hash::{FxHashMap, FxHashSet};
use send_wrapper::SendWrapper;

use wasm_bindgen::{JsCast, JsValue};

pub mod library;
pub mod state;

use self::library::build_library;
use self::state::PENDING;

use typst::foundations::{Bytes, Datetime};

use typst::syntax::{FileId, Source, VirtualPath, package::PackageSpec as TypstPackageSpec};
use typst::text::{Font, FontBook};
use typst::{
    Library, World,
    diag::{FileError, FileResult, PackageError},
    utils::LazyHash,
};

use typst_ide::IdeWorld;

use crate::serde::package::PackageSpec;
use crate::vfs::FileSlot;

pub struct WasmWorld {
    main: FileId,
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    slots: Mutex<FxHashMap<FileId, FileSlot>>,
    now: DateTime<Utc>,

    read_file: SendWrapper<js_sys::Function>,
    read_package_file: SendWrapper<js_sys::Function>,
    download_package: SendWrapper<js_sys::Function>,

    packages: FxHashSet<TypstPackageSpec>,
}

impl WasmWorld {
    pub fn new(
        read_file: js_sys::Function,
        read_package_file: js_sys::Function,
        download_package: js_sys::Function,
        fontsize: f64,
    ) -> Self {
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
        let library = build_library(fontsize);

        Self {
            main,
            library: LazyHash::new(library),
            book,
            fonts,
            slots: Mutex::new(slots),
            now: Utc::now(),

            read_file: SendWrapper::new(read_file),
            read_package_file: SendWrapper::new(read_package_file),
            download_package: SendWrapper::new(download_package),

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

    pub fn add_package_file(&mut self, spec: TypstPackageSpec, vpath: &str, bytes: Vec<u8>) {
        let mut m = self.slots.lock().unwrap();
        let file_id = FileId::new(Some(spec.clone()), VirtualPath::new(vpath));
        m.insert(file_id, FileSlot::new_from_bytes(file_id, bytes));

        self.packages.insert(spec);
    }

    pub fn list_packages(&self) -> Vec<TypstPackageSpec> {
        self.packages.iter().cloned().collect()
    }

    pub fn add_font(&mut self, data: Bytes) {
        for f in Font::iter(data) {
            self.book.push(f.info().clone());
            self.fonts.push(f);
        }
    }

    pub fn take_pending(&mut self) -> bool {
        PENDING.swap(false, Ordering::Relaxed)
    }

    fn map_js_err(&self, e: JsValue, path: &str, spec: Option<&TypstPackageSpec>) -> FileError {
        if let Some(value) = e.as_f64() {
            return match value as i64 {
                0 => {
                    PENDING.store(true, Ordering::Relaxed);
                    FileError::Other(Some("pending async load".into()))
                }

                10 => FileError::NotFound(PathBuf::from(path)),
                11 => FileError::AccessDenied,
                12 => FileError::IsDirectory,
                13 => FileError::NotSource,
                14 => FileError::InvalidUtf8,
                15 => FileError::Other(Some("unknown file error".into())),

                20 => FileError::Package(PackageError::NotFound(
                    spec.ok_or_else(|| FileError::Other(Some("package spec missing".into())))
                        .unwrap()
                        .clone(),
                )),
                21 => FileError::Package(PackageError::VersionNotFound(
                    spec.ok_or_else(|| FileError::Other(Some("package spec missing".into())))
                        .unwrap()
                        .clone(),
                    spec.unwrap().version.clone(),
                )),
                22 => FileError::Package(PackageError::NetworkFailed(Some(
                    "network connection error".into(),
                ))),
                23 => FileError::Package(PackageError::MalformedArchive(Some(
                    "invalid package format".into(),
                ))),
                24 => FileError::Package(PackageError::Other(Some("unknown package error".into()))),

                _ => FileError::Other(Some("unexpected error".into())),
            };
        }
        FileError::Other(e.as_string().map(Into::into))
    }

    fn call_read_file_result(&self, path: String) -> FileResult<Bytes> {
        self.read_file
            .call1(&JsValue::NULL, &path.clone().into())
            .map_err(|e| self.map_js_err(e, &path, None))
            .and_then(|v| {
                if let Some(u8arr) = v.dyn_ref::<js_sys::Uint8Array>() {
                    Ok(Bytes::new(u8arr.to_vec()))
                } else {
                    Err(FileError::Other(Some("unexpected result type".into())))
                }
            })
    }

    fn call_read_package_file_result(
        &self,
        vpath: String,
        spec: &TypstPackageSpec,
    ) -> FileResult<Bytes> {
        let pkg_spec_ser = PackageSpec::from(spec);
        let pkg_spec_js = serde_wasm_bindgen::to_value(&pkg_spec_ser).unwrap();

        let display_path = format!("@{}/{}", spec, vpath);
        self.read_package_file
            .call2(&JsValue::NULL, &pkg_spec_js, &vpath.into())
            .map_err(|e| self.map_js_err(e, &display_path, Some(spec)))
            .and_then(|v| {
                if let Some(u8arr) = v.dyn_ref::<js_sys::Uint8Array>() {
                    Ok(Bytes::new(u8arr.to_vec()))
                } else {
                    Err(FileError::Other(Some("unexpected result type".into())))
                }
            })
    }

    fn request_download(&self, spec: &TypstPackageSpec) -> FileResult<Bytes> {
        let pkg_spec_ser = PackageSpec::from(spec);
        let pkg_spec_js = serde_wasm_bindgen::to_value(&pkg_spec_ser).unwrap();

        match self.download_package.call1(&JsValue::NULL, &pkg_spec_js) {
            Ok(_) => {
                PENDING.store(true, Ordering::Relaxed);
                Err(FileError::Other(Some("pending async load".into())))
            }
            Err(_) => Err(FileError::Package(PackageError::NetworkFailed(Some(
                "download request failed".into(),
            )))),
        }
    }

    fn read<F, T>(&self, id: FileId, f: F) -> FileResult<T>
    where
        F: FnOnce(&mut FileSlot) -> FileResult<T>,
    {
        let mut m = self.slots.lock().unwrap();

        // スロットが存在してかつ bytes が Ok ならキャッシュを使う。
        // エラーの場合は再取得して最新の状態を反映する。
        let needs_fetch = m.get(&id).map_or(true, |slot| slot.bytes().is_err());

        if needs_fetch {
            let result = if let Some(spec) = id.package() {
                // パッケージファイル:
                //   まず readPackageFile でローカルキャッシュを参照し、
                //   NotFound なら downloadPackage でネットワーク取得を要求する。
                //   @ プレフィックスや path 組み立ては JS 側の責務。
                let vpath = id.vpath().as_rootless_path().to_str().unwrap().to_string();
                match self.call_read_package_file_result(vpath, &spec) {
                    Err(FileError::NotFound(_)) => self.request_download(&spec),
                    other => other,
                }
            } else {
                // 通常ファイル: readFile のみ。
                // @ プレフィックスなし、パス解決も JS 側が行う。
                let path = id.vpath().as_rooted_path().to_str().unwrap().to_string();
                self.call_read_file_result(path)
            };

            // pending の場合はスロットを挿入しない。
            // downloadPackage / readFile の Promise が解決後、
            // compileWithRetry が再コンパイルするので、その時点で正常取得できる。
            let is_pending = matches!(
                &result,
                Err(FileError::Other(Some(msg))) if msg.as_str() == "pending async load"
            );
            if is_pending {
                return Err(FileError::Other(Some("pending async load".into())));
            }

            m.insert(id, FileSlot::new_from_result(id, result));
        }

        f(m.get_mut(&id).unwrap())
    }

    pub fn update_now(&mut self) {
        use chrono::TimeZone;
        let now_ms = js_sys::Date::now();
        let seconds = (now_ms / 1000.0) as i64;
        let nanos = ((now_ms % 1000.0) * 1_000_000.0) as u32;
        if let Some(dt) = Utc.timestamp_opt(seconds, nanos).single() {
            self.now = dt;
        }
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
        let hour = local_datetime.hour().try_into().ok()?;
        let minute = local_datetime.minute().try_into().ok()?;
        let second = local_datetime.second().try_into().ok()?;

        Datetime::from_ymd_hms(year, month, day, hour, minute, second)
    }
}

impl IdeWorld for WasmWorld {
    fn upcast(&self) -> &dyn World {
        self
    }

    fn packages(&self) -> &[(TypstPackageSpec, Option<typst::ecow::EcoString>)] {
        &[]
    }

    fn files(&self) -> Vec<FileId> {
        std::vec![]
    }
}
