import 'package:web/web.dart' as web;

import 'media_download_types.dart';

Future<String> downloadMedia({
  required String url,
  required DownloadMediaType type,
  String? suggestedFileName,
  String? mimeType,
  DownloadProgressCallback? onProgress,
}) async {
  final anchor = web.HTMLAnchorElement()
    ..href = url
    ..download = buildMediaDownloadFileName(
      url: url,
      type: type,
      suggestedFileName: suggestedFileName,
      mimeType: mimeType,
    )
    ..target = '_blank'
    ..rel = 'noopener'
    ..style.display = 'none';

  web.document.body?.append(anchor);
  anchor.click();
  anchor.remove();
  onProgress?.call(1);

  return 'Download started in your browser.';
}
