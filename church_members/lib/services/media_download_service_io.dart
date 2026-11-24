import 'dart:io';

import 'package:dio/dio.dart';
import 'package:gal/gal.dart';

import 'media_download_types.dart';

Future<String> downloadMedia({
  required String url,
  required DownloadMediaType type,
  String? suggestedFileName,
  String? mimeType,
  DownloadProgressCallback? onProgress,
}) async {
  if (!Platform.isAndroid &&
      !Platform.isIOS &&
      !Platform.isMacOS &&
      !Platform.isWindows) {
    throw const MediaDownloadException(
      'Saving media is not supported on this device.',
    );
  }

  final tempDirectory = await Directory.systemTemp.createTemp(
    'church_member_media_',
  );
  final fileName = buildMediaDownloadFileName(
    url: url,
    type: type,
    suggestedFileName: suggestedFileName,
    mimeType: mimeType,
  );
  final file = File('${tempDirectory.path}${Platform.pathSeparator}$fileName');

  try {
    await Dio().download(
      url,
      file.path,
      onReceiveProgress: (received, total) {
        onProgress?.call(total > 0 ? received / total : null);
      },
    );

    if (type == DownloadMediaType.video) {
      await Gal.putVideo(file.path);
      return 'Video saved to your gallery.';
    }

    await Gal.putImage(file.path);
    return 'Photo saved to your gallery.';
  } on DioException {
    throw const MediaDownloadException(
      'The media could not be downloaded. Check your connection and try again.',
    );
  } on GalException catch (error) {
    throw MediaDownloadException(_galleryErrorMessage(error));
  } on MediaDownloadException {
    rethrow;
  } catch (_) {
    throw const MediaDownloadException(
      'The media could not be saved. Please try again.',
    );
  } finally {
    if (await tempDirectory.exists()) {
      await tempDirectory.delete(recursive: true);
    }
  }
}

String _galleryErrorMessage(GalException error) {
  return switch (error.type.name) {
    'accessDenied' || 'permissionDenied' =>
      'Photo library access was denied. Allow access in Settings and try again.',
    'notEnoughSpace' => 'There is not enough storage space to save this media.',
    'notSupportedFormat' =>
      'This photo or video format is not supported by your device.',
    _ => 'The media could not be saved to your gallery. Please try again.',
  };
}
