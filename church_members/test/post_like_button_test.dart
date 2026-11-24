import 'package:church_members/core/network/api_exceptions.dart';
import 'package:church_members/services/post_service.dart';
import 'package:church_members/widgets/post_like_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('likes a post and displays the authoritative count', (
    tester,
  ) async {
    final service = _FakePostService(
      onSetLiked: (liked) async {
        expect(liked, isTrue);
        return const PostLikeState(liked: true, likeCount: 8);
      },
    );

    await tester.pumpWidget(
      _testApp(
        PostLikeButton(
          churchId: 'church-1',
          postId: 'post-1',
          postService: service,
          initiallyLiked: false,
          initialLikeCount: 6,
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.favorite_border_rounded));
    await tester.pumpAndSettle();

    expect(service.calls, 1);
    expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);
    expect(find.text('Liked'), findsOneWidget);
    expect(find.text('8'), findsOneWidget);
  });

  testWidgets('rolls back the optimistic like when the request fails', (
    tester,
  ) async {
    final service = _FakePostService(
      onSetLiked: (_) async => throw ApiException(message: 'Like failed.'),
    );

    await tester.pumpWidget(
      _testApp(
        PostLikeButton(
          churchId: 'church-1',
          postId: 'post-1',
          postService: service,
          initiallyLiked: false,
          initialLikeCount: 3,
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.favorite_border_rounded));
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.favorite_border_rounded), findsOneWidget);
    expect(find.text('Like'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('Like failed.'), findsOneWidget);
  });

  testWidgets('handles the tap without triggering the surrounding post', (
    tester,
  ) async {
    var parentTapped = false;
    final service = _FakePostService(
      onSetLiked: (_) async => const PostLikeState(liked: true, likeCount: 1),
    );

    await tester.pumpWidget(
      _testApp(
        Material(
          child: InkWell(
            onTap: () => parentTapped = true,
            child: PostLikeButton(
              churchId: 'church-1',
              postId: 'post-1',
              postService: service,
              initiallyLiked: false,
              initialLikeCount: 0,
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.favorite_border_rounded));
    await tester.pumpAndSettle();

    expect(parentTapped, isFalse);
    expect(service.calls, 1);
  });
}

Widget _testApp(Widget child) {
  return MaterialApp(
    home: Scaffold(body: Center(child: child)),
  );
}

class _FakePostService implements PostService {
  final Future<PostLikeState> Function(bool liked) onSetLiked;
  int calls = 0;

  _FakePostService({required this.onSetLiked});

  @override
  Future<List<Map<String, dynamic>>> getPublishedPosts(String churchId) async {
    return const [];
  }

  @override
  Future<PostLikeState> setPostLiked({
    required String churchId,
    required String postId,
    required bool liked,
  }) {
    calls += 1;
    return onSetLiked(liked);
  }
}
