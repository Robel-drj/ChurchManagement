import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../services/post_service.dart';
import '../../widgets/content_media_gallery.dart';
import '../../widgets/post_like_button.dart';

class PostDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> post;
  final String? churchId;
  final PostService? postService;

  const PostDetailsScreen({
    super.key,
    required this.post,
    this.churchId,
    this.postService,
  });

  @override
  Widget build(BuildContext context) {
    final title = _firstPostValue(post, const [
      'title',
      'post_title',
      'name',
    ], 'Church Post');
    final content = _firstPostValue(post, const [
      'content',
      'description',
      'body',
      'message',
    ], '');
    final postType = _firstPostValue(post, const ['post_type', 'type'], 'Post');
    final publishedAt = _firstPostValue(post, const [
      'published_at',
      'created_at',
    ], '');
    final creator = _firstPostValue(post, const [
      'creator_name',
      'author_name',
      'created_by_name',
    ], '');
    final postId = _firstPostValue(post, const ['id', 'post_id', 'postId'], '');
    final canLike =
        postId.isNotEmpty && churchId != null && postService != null;
    final media = post['media'];
    final hasMedia = media is List && media.isNotEmpty;
    final hasImage = _containsImage(media);
    final screenHeight = MediaQuery.sizeOf(context).height;
    final galleryHeight = (screenHeight * 0.48).clamp(300.0, 520.0);

    final displayAuthor = creator.isNotEmpty ? creator : 'Church Community';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0.5,
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        title: const Text(
          'Post',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.3,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(
            height: 1,
            color: AppColors.border.withValues(alpha: 0.7),
          ),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
              children: [
                // Main Social Post Card
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: AppColors.border.withValues(alpha: 0.85),
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x08101828),
                        blurRadius: 20,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Author & Metadata Header
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: const BoxDecoration(
                                gradient: AppColors.primaryGradient,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.church_rounded,
                                color: Colors.white,
                                size: 21,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          displayAuthor,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: AppColors.textPrimary,
                                            fontSize: 15,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(
                                        Icons.verified_rounded,
                                        color: AppColors.primary,
                                        size: 15,
                                      ),
                                    ],
                                  ),
                                  if (publishedAt.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      _formatPostDate(publishedAt),
                                      style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            _PostTypeBadge(label: _titleCase(postType)),
                          ],
                        ),
                      ),

                      // 2. Post Headline
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                        child: Text(
                          title,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 23,
                            height: 1.26,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                          ),
                        ),
                      ),

                      // 3. Full Media Showcase
                      if (hasMedia) ...[
                        const SizedBox(height: 16),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(18),
                            child: ContentMediaGallery(
                              media: media,
                              height: galleryHeight,
                              imageFit: BoxFit.contain,
                              imageBackgroundColor: const Color(0xFF111827),
                              enableFullScreenImage: true,
                              enableDownload: true,
                            ),
                          ),
                        ),
                        if (hasImage) ...[
                          const SizedBox(height: 10),
                          Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceMuted,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.pinch_rounded,
                                    size: 14,
                                    color: AppColors.primary,
                                  ),
                                  SizedBox(width: 6),
                                  Text(
                                    'Tap image to view full screen & zoom',
                                    style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],

                      // 4. Full Article / Message Body
                      Padding(
                        padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
                        child: Text(
                          content.isEmpty
                              ? 'No additional message was provided.'
                              : content,
                          style: TextStyle(
                            color: content.isEmpty
                                ? AppColors.textSecondary
                                : AppColors.textPrimary,
                            fontSize: 15.5,
                            height: 1.68,
                          ),
                        ),
                      ),

                      // 5. Social Engagement Bar
                      if (canLike) ...[
                        Divider(
                          height: 1,
                          color: AppColors.border.withValues(alpha: 0.75),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          child: Row(
                            children: [
                              PostLikeButton(
                                churchId: churchId!,
                                postId: postId,
                                postService: postService!,
                                initiallyLiked: _postBoolValue(post, const [
                                  'liked_by_me',
                                  'likedByMe',
                                ]),
                                initialLikeCount: _postIntValue(post, const [
                                  'like_count',
                                  'likeCount',
                                ]),
                                onChanged: _applyLikeState,
                              ),
                              const Spacer(),
                              const Row(
                                children: [
                                  Icon(
                                    Icons.favorite_border_rounded,
                                    size: 15,
                                    color: AppColors.textSecondary,
                                  ),
                                  SizedBox(width: 5),
                                  Text(
                                    'Show appreciation',
                                    style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _applyLikeState(PostLikeState state) {
    post['liked_by_me'] = state.liked;
    post['like_count'] = state.likeCount;
  }
}

class _PostTypeBadge extends StatelessWidget {
  final String label;

  const _PostTypeBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          color: AppColors.primary,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.7,
        ),
      ),
    );
  }
}

String _firstPostValue(
  Map<String, dynamic> data,
  List<String> keys,
  String fallback,
) {
  for (final key in keys) {
    final value = data[key];
    if (value != null && value.toString().trim().isNotEmpty) {
      return value.toString().trim();
    }
  }

  return fallback;
}

String _formatPostDate(String value) {
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;

  return DateFormat('MMMM d, y • h:mm a').format(parsed.toLocal());
}

bool _postBoolValue(Map<String, dynamic> data, List<String> keys) {
  for (final key in keys) {
    final value = data[key];
    if (value is bool) return value;
    if (value != null) return value.toString().toLowerCase() == 'true';
  }

  return false;
}

int _postIntValue(Map<String, dynamic> data, List<String> keys) {
  for (final key in keys) {
    final value = data[key];
    if (value is num) return value.toInt();
    final parsed = int.tryParse(value?.toString() ?? '');
    if (parsed != null) return parsed;
  }

  return 0;
}

String _titleCase(String value) {
  if (value.trim().isEmpty) return value;

  return value
      .replaceAll('_', ' ')
      .split(' ')
      .where((word) => word.isNotEmpty)
      .map(
        (word) => '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
      )
      .join(' ');
}

bool _containsImage(Object? media) {
  if (media is! List) return false;

  return media.any((entry) {
    if (entry is! Map) return false;
    final type = (entry['media_type'] ?? entry['mediaType'] ?? entry['type'])
        ?.toString()
        .toLowerCase();
    return type == 'image';
  });
}