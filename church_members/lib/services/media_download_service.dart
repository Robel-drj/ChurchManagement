import 'media_download_service_stub.dart'
    if (dart.library.io) 'media_download_service_io.dart'
    if (dart.library.js_interop) 'media_download_service_web.dart'
    as platform;
import 'media_download_types.dart';

export 'media_download_types.dart';

class MediaDownloadService {
  const MediaDownloadService();

  Future<String> download({
    required String url,
    required DownloadMediaType type,
    String? suggestedFileName,
    String? mimeType,
    DownloadProgressCallback? onProgress,
  }) {
    return platform.downloadMedia(
      url: url,
      type: type,
      suggestedFileName: suggestedFileName,
      mimeType: mimeType,
      onProgress: onProgress,
    );
  }
}
