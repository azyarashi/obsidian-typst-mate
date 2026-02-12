use std::cell::RefCell; // ? シングルスレッドのため

use typst::{
    diag::{FileError, FileResult},
    foundations::Bytes,
    syntax::{FileId, Source},
};

pub struct FileSlot {
    source: RefCell<FileResult<Source>>,
    bytes: RefCell<FileResult<Bytes>>,
}

impl FileSlot {
    pub fn new_from_text(id: FileId, text: String) -> Self {
        let source_result = Ok(Source::new(id, text.clone()));
        let bytes_result = Ok(Bytes::from_string(text));

        Self {
            source: RefCell::new(source_result),
            bytes: RefCell::new(bytes_result),
        }
    }

    pub fn new_from_bytes(id: FileId, bytes: Vec<u8>) -> Self {
        let bytes_result = Ok(Bytes::new(bytes.clone()));
        let source_result = match std::str::from_utf8(&bytes) {
            Ok(s) => Ok(Source::new(id, s.to_string())),
            Err(_) => Err(FileError::InvalidUtf8),
        };

        Self {
            source: RefCell::new(source_result),
            bytes: RefCell::new(bytes_result),
        }
    }

    pub fn new_from_result(id: FileId, result: FileResult<Bytes>) -> Self {
        let source_result = match result.clone() {
            Ok(bytes) => match std::str::from_utf8(&bytes) {
                Ok(s) => Ok(Source::new(id, s.to_string())),
                Err(_) => Err(FileError::InvalidUtf8),
            },
            Err(e) => Err(e),
        };

        Self {
            source: RefCell::new(source_result),
            bytes: RefCell::new(result),
        }
    }

    pub fn source(&self) -> FileResult<Source> {
        self.source.borrow().clone()
    }

    pub fn bytes(&self) -> FileResult<Bytes> {
        self.bytes.borrow().clone()
    }
}
