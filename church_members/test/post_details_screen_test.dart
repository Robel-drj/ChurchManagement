import 'package:church_members/screens/posts/post_details_screen.dart';
import 'package:church_members/widgets/content_media_gallery.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('post previews use a centered cover crop by default', () {
    const gallery = ContentMediaGallery(media: []);

    expect(gallery.imageFit, BoxFit.cover);
    expect(gallery.imageAlignment, Alignment.center);
    expect(gallery.enableDownload, isFalse);
  });

  testWidgets('post details show the full message and uncropped media', (
    tester,
  ) async {
    const fullMessage =
        'This is the complete church announcement shown on the detail page.';

    await tester.pumpWidget(
      const MaterialApp(
        home: PostDetailsScreen(
          post: {
            'title': 'Community Gathering',
            'content': fullMessage,
            'post_type': 'announcement',
            'published_at': '2026-11-24T10:30:00.000Z',
            'media': [
              {
                'media_type': 'image',
                // Invalid on purpose so this widget test performs no network IO.
                'media_url': 'not-a-network-url',
              },
            ],
          },
        ),
      ),
    );

    expect(find.text('Community Gathering'), findsOneWidget);
    expect(find.text(fullMessage), findsOneWidget);
    expect(find.text('Read full post'), findsNothing);

    final gallery = tester.widget<ContentMediaGallery>(
      find.byType(ContentMediaGallery),
    );
    expect(gallery.imageFit, BoxFit.contain);
    expect(gallery.enableFullScreenImage, isTrue);
    expect(gallery.enableDownload, isTrue);
  });
}
