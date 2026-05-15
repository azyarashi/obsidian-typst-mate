/** https://docs.rs/typst/latest/typst/diag/enum.FileError.html */
export enum ErrorCode {
  /** ファイル読み込みなど */
  Pending = 0,

  FileErrorNotFound = 10,
  FileErrorAccessDenied,
  FileErrorIsDirectory,
  FileErrorNotSource,
  FileErrorInvalidUtf8,
  FileErrorOther,

  PackageErrorNotFound = 20,
  PackageErrorVersionNotFound,
  PackageErrorNetworkFailed,
  PackageErrorMalformedArchive,
  PackageErrorOther,
}
