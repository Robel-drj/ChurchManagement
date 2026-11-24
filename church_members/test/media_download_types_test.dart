import 'package:church_members/services/media_download_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('buildMediaDownloadFileName', () {
    test('uses and sanitizes the server file name', () {
      final name = buildMediaDownloadFileName(
        url: 'https://cdn.example.com/random-id',
        type: DownloadMediaType.image,
        suggestedFileName: 'Sunday Service 01.JPG',
      );

      expect(name, 'Sunday_Service_01.jpg');
    });

    test('uses the MIME type when the URL has no extension', () {
      final name = buildMediaDownloadFileName(
        url: 'https://cdn.example.com/church-message',
        type: DownloadMediaType.video,
        mimeType: 'video/mp4',
      );

      expect(name, 'church-message.mp4');
    });

    test('falls back to a safe photo name and extension', () {
      final name = buildMediaDownloadFileName(
        url: 'https://cdn.example.com',
        type: DownloadMediaType.image,
      );

      expect(name, 'church_post_photo.jpg');
    });
  });
}
