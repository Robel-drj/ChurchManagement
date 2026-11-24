enum DownloadMediaType { image, video }

typedef DownloadProgressCallback = void Function(double? progress);

class MediaDownloadException implements Exception {
  final String message;

  const MediaDownloadException(this.message);

  @override
  String toString() => message;
}

String buildMediaDownloadFileName({
  required String url,
  required DownloadMediaType type,
  String? suggestedFileName,
  String? mimeType,
}) {
  final sourceName = _sourceFileName(url, suggestedFileName);
  final extension = _mediaExtension(
    sourceName: sourceName,
    url: url,
    mimeType: mimeType,
    type: type,
  );
  final dotIndex = sourceName.lastIndexOf('.');
  final sourceBase = dotIndex > 0
      ? sourceName.substring(0, dotIndex)
      : sourceName;
  final safeBase = sourceBase
      .replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_')
      .replaceAll(RegExp(r'_+'), '_')
      .replaceAll(RegExp(r'^_|_$'), '');
  final fallback = type == DownloadMediaType.video
      ? 'church_post_video'
      : 'church_post_photo';

  return '${safeBase.isEmpty ? fallback : safeBase}.$extension';
}

String _sourceFileName(String url, String? suggestedFileName) {
  final suggested = suggestedFileName?.trim();
  if (suggested != null && suggested.isNotEmpty) return suggested;

  final uri = Uri.tryParse(url);
  if (uri == null || uri.pathSegments.isEmpty) return '';

  final segment = uri.pathSegments.last;
  try {
    return Uri.decodeComponent(segment);
  } catch (_) {
    return segment;
  }
}

String _mediaExtension({
  required String sourceName,
  required String url,
  required String? mimeType,
  required DownloadMediaType type,
}) {
  final allowed = type == DownloadMediaType.video
      ? const {'mp4', 'mov', 'm4v', 'webm', 'avi', 'mpeg', 'mpg'}
      : const {
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'bmp',
          'heic',
          'heif',
          'avif',
        };
  final candidates = <String>[
    _extensionFromName(sourceName),
    _extensionFromName(Uri.tryParse(url)?.path ?? ''),
    _extensionFromMimeType(mimeType),
  ];

  for (final candidate in candidates) {
    if (allowed.contains(candidate)) return candidate;
  }

  return type == DownloadMediaType.video ? 'mp4' : 'jpg';
}

String _extensionFromName(String value) {
  final dotIndex = value.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex == value.length - 1) return '';
  return value.substring(dotIndex + 1).toLowerCase();
}

String _extensionFromMimeType(String? value) {
  return switch (value?.trim().toLowerCase()) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
    'image/bmp' => 'bmp',
    'image/heic' => 'heic',
    'image/heif' => 'heif',
    'image/avif' => 'avif',
    'video/quicktime' => 'mov',
    'video/x-m4v' => 'm4v',
    'video/webm' => 'webm',
    'video/x-msvideo' => 'avi',
    'video/mpeg' => 'mpeg',
    'video/mp4' => 'mp4',
    _ => '',
  };
}
