import 'media_download_types.dart';

Future<String> downloadMedia({
  required String url,
  required DownloadMediaType type,
  String? suggestedFileName,
  String? mimeType,
  DownloadProgressCallback? onProgress,
}) {
  throw const MediaDownloadException(
    'Downloading media is not supported on this device.',
  );
}
